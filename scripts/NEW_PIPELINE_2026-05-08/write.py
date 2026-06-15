"""Production article writer.

Reads approved topics from filtered_topics (topic-research.sqlite), generates
articles via OpenRouter using gemini-2.5-flash, runs the Layer A compliance
gate, and saves accepted articles to the write_outputs SQL table only (no MD
files -- those are generated later by the deploy stage).

Reuses the already-proven stage 1.5 OpenRouter client + prompt and the stage
1.75 deterministic compliance checker, so voice and rules stay identical to
what the discovery pipeline evaluated.

Telemetry persists to two new tables in the same SQLite DB:
  write_runs     -- one row per invocation
  write_outputs  -- one row per topic

CLI examples:
  python scripts/write.py --count 5
  python scripts/write.py --ranks 1,3,7
  python scripts/write.py --count 3 --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from stage_1_5 import openrouter as _or  # noqa: E402
from lib.prompt_builder import build_write_system, build_write_user  # noqa: E402
from lib.validator import validate as _validate_fn, Violation as _Violation  # noqa: E402
from lib.medical_validator import check_article as _medical_check  # noqa: E402
from polish_article_text import ArticlePolishError, normalize_punctuation, polish_article_text  # noqa: E402

DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
LOGS_DIR = REPO_ROOT / "pipeline-data" / "logs"
ENV_PATH = REPO_ROOT / ".env"

DEFAULT_MODEL = "google/gemini-2.5-flash"
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 10000
DEFAULT_TIMEOUT = 240
DEFAULT_MAX_ATTEMPTS = 3


SCHEMA = """
CREATE TABLE IF NOT EXISTS write_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    stage2_run_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    target_words INTEGER NOT NULL,
    article_count INTEGER NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS write_outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES write_runs(id),
    topic_id INTEGER NOT NULL,
    topic_rank INTEGER NOT NULL,
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    slug TEXT NOT NULL,
    model_id TEXT NOT NULL,
    markdown TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_usd REAL,
    latency_ms INTEGER,
    status TEXT NOT NULL,
    error TEXT,
    finish_reason TEXT,
    compliance_score REAL,
    compliance_details TEXT,
    disqualified INTEGER NOT NULL DEFAULT 0,
    disqualify_reason TEXT,
    file_path TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_write_outputs_run ON write_outputs(run_id);
"""


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_env_file(path: Path) -> None:
    """Populate os.environ from a dotenv-style file if it exists.

    Uses setdefault so real environment variables win."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip("'").strip('"'))


def connect_db(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA)
    return conn


def _existing_slugs(conn: sqlite3.Connection) -> set[str]:
    """Return slugs that already have a written article in the DB."""
    rows = conn.execute(
        "SELECT DISTINCT slug FROM write_outputs WHERE status = 'written'"
    ).fetchall()
    return {r[0] for r in rows}


def _table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def fetch_topics(
    conn: sqlite3.Connection,
    *,
    ranks: list[int] | None,
    count: int | None,
) -> list[sqlite3.Row]:
    existing = _existing_slugs(conn)
    rationale_expr = "'' as rationale"
    if _table_exists(conn, "stage2_output"):
        rationale_expr = (
            "COALESCE((SELECT s.rationale FROM stage2_output s "
            "WHERE s.slug = f.slug LIMIT 1), '') as rationale"
        )
    base = (
        "SELECT f.id, f.slug, f.topic, f.score, f.rank, f.category, "
        f"{rationale_expr} "
        "FROM filtered_topics f "
        "WHERE f.status = 'approved'"
    )
    if existing:
        placeholders = ",".join("?" for _ in existing)
        base += f" AND f.slug NOT IN ({placeholders})"

    if ranks:
        rank_ph = ",".join("?" for _ in ranks)
        sql = base + f" AND f.rank IN ({rank_ph}) ORDER BY f.rank"
        params = (*existing, *ranks) if existing else tuple(ranks)
        rows = conn.execute(sql, params).fetchall()
        return list(rows)

    limit = count if count is not None else 1
    sql = base + " ORDER BY f.score DESC LIMIT ?"
    params = (*existing, limit) if existing else (limit,)
    rows = conn.execute(sql, params).fetchall()
    return list(rows)


def insert_run(
    conn: sqlite3.Connection,
    *,
    model_id: str,
    target_words: int,
    article_count: int,
    notes: str = "",
) -> int:
    cur = conn.execute(
        "INSERT INTO write_runs (started_at, status, stage2_run_id, model_id, "
        "target_words, article_count, notes) VALUES (?, 'running', 0, ?, ?, ?, ?)",
        (now_utc_iso(), model_id, target_words, article_count, notes),
    )
    conn.commit()
    return int(cur.lastrowid)


def finish_run(conn: sqlite3.Connection, run_id: int, status: str) -> None:
    conn.execute(
        "UPDATE write_runs SET finished_at=?, status=? WHERE id=?",
        (now_utc_iso(), status, run_id),
    )
    conn.commit()


def insert_output(conn: sqlite3.Connection, row: dict[str, Any]) -> int:
    cols = [
        "run_id", "topic_id", "topic_rank", "topic", "category", "slug",
        "model_id", "markdown", "tokens_in", "tokens_out", "cost_usd",
        "latency_ms", "status", "error", "finish_reason",
        "compliance_score", "compliance_details", "disqualified",
        "disqualify_reason", "file_path", "created_at",
    ]
    placeholders = ",".join("?" for _ in cols)
    cur = conn.execute(
        f"INSERT INTO write_outputs ({','.join(cols)}) VALUES ({placeholders})",
        tuple(row.get(c) for c in cols),
    )
    conn.commit()
    return int(cur.lastrowid)


def parse_ranks(raw: str) -> list[int]:
    out: list[int] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            a, b = chunk.split("-", 1)
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(chunk))
    return out


def log(msg: str, fh) -> None:
    stamped = f"[{now_utc_iso()}] {msg}"
    print(stamped, flush=True)
    fh.write(stamped + "\n")
    fh.flush()


def _mechanical_fix(markdown: str) -> str:
    """Apply deterministic fixes that cannot change article meaning."""
    return normalize_punctuation(markdown)


def _body_word_count(markdown: str) -> int:
    if "---" not in markdown:
        return 0
    try:
        body = markdown.split("---", 2)[2]
    except IndexError:
        return 0
    return len(body.split())


def _format_repair_issues(issues: list[dict[str, str]]) -> str:
    lines: list[str] = []
    for i, issue in enumerate(issues, start=1):
        rule = issue.get("rule", "unknown")
        detail = issue.get("detail", "").strip()
        lines.append(f"{i}. {rule}: {detail}")
    return "\n".join(lines)


def _retry_instruction(violations: list[_Violation]) -> str:
    """Return compact repair guidance for legacy tests and diagnostics."""
    lines = ["Fix the listed validation failures before returning the article:"]
    for violation in violations:
        lines.append(f"- {violation.rule_id}: {violation.detail}")

    rule_ids = {violation.rule_id for violation in violations}
    if "S-10" in rule_ids:
        lines.extend([
            "Recipe frontmatter must use prepTime/cookTime/totalTime as quoted strings.",
            "Recipe frontmatter must use servings and calories as plain integers.",
            "Recipe frontmatter must use ingredients as a non-empty list of strings.",
            "Recipe frontmatter must use steps as a non-empty list of strings.",
        ])
    if any(rule_id.startswith("CP-") for rule_id in rule_ids):
        lines.extend([
            "Use plain food and cooking language only.",
            "Remove supplement references.",
            "Remove or hedge hard-banned health terms according to the content policy.",
        ])

    return "\n".join(lines)


def _build_repair_user(
    *,
    topic: str,
    category: str,
    slug: str,
    markdown: str,
    issues: list[dict[str, str]],
) -> str:
    """Build a focused repair request for the same article-writing stage."""
    issue_text = _format_repair_issues(issues)
    return f"""The article below failed validation. Repair the same article.

Topic: {topic}
Category: {category}
Slug: {slug}

Validation failures to fix:
{issue_text}

Repair rules:
- Return the complete corrected markdown article only.
- Keep the same topic, category, slug, image path, author, and overall angle.
- Fix only the listed validation failures.
- Preserve valid frontmatter, body structure, and approximate length unless a listed failure requires a local change.
- Do not summarize, shorten, or rewrite unrelated sections.
- Fix every listed validation failure directly in the text or frontmatter.
- If recipe fields are missing or invalid, add valid recipe frontmatter fields.
- If body length is flagged, expand the article body with useful, topic-specific sections and practical detail until it clears the listed minimum.
- If health, detox, stale phrase, or sign-off language is flagged, rewrite those sentences plainly.
- Do not add commentary, code fences, or a second article.

Article to repair:
{markdown}"""


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate production articles from filtered_topics (approved).")
    group = p.add_mutually_exclusive_group()
    group.add_argument("--count", type=int,
                       help="Write the top-N approved topics by score")
    group.add_argument("--ranks", type=str,
                       help='Comma-separated ranks to write, e.g. "1,3,7" or "1-5,10"')
    p.add_argument("--model", type=str, default=DEFAULT_MODEL,
                   help=f"OpenRouter model id (default: {DEFAULT_MODEL})")
    p.add_argument("--temperature", type=float, default=DEFAULT_TEMPERATURE)
    p.add_argument("--max-tokens", type=int, default=DEFAULT_MAX_TOKENS)
    p.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    p.add_argument("--max-attempts", type=int, default=DEFAULT_MAX_ATTEMPTS,
                   help=f"Regenerate on tier-1 validator failure, up to N attempts per topic (default: {DEFAULT_MAX_ATTEMPTS})")
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--dry-run", action="store_true",
                   help="Print the topics that would be written, then exit without API calls")
    args = p.parse_args(argv)

    if not args.count and not args.ranks:
        args.count = 1
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_env_file(ENV_PATH)

    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not args.dry_run and not api_key:
        print("ERROR: OPENROUTER_API_KEY not set (env var or .env file).", file=sys.stderr)
        return 2

    ranks = parse_ranks(args.ranks) if args.ranks else None

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = LOGS_DIR / f"write_{log_ts}.log"
    fh = log_path.open("a", encoding="utf-8")

    try:
        log(f"write.py starting. model={args.model} dry_run={args.dry_run}", fh)
        log(f"log file: {log_path}", fh)

        conn = connect_db(args.db)
        topics = fetch_topics(
            conn,
            ranks=ranks,
            count=args.count,
        )
        if not topics:
            log(f"no approved topics found in filtered_topics "
                f"(ranks={ranks or 'top-' + str(args.count)})", fh)
            return 1

        log(f"topics selected: {len(topics)}", fh)
        for t in topics:
            log(f"  #{t['rank']:>3} [{t['category']:<9}] {t['topic']}  (slug={t['slug']})", fh)

        if args.dry_run:
            log("dry-run: exiting before any API calls", fh)
            return 0

        run_id = insert_run(
            conn,
            model_id=args.model,
            target_words=0,  # category-based per topic; see write_prompt.CATEGORY_TARGETS
            article_count=len(topics),
        )
        log(f"write_runs.id = {run_id}", fh)

        ok = dq = err = skipped = 0
        total_cost = 0.0
        total_in = 0
        total_out = 0
        start_all = time.monotonic()

        for t in topics:
            slug = t["slug"]

            system = build_write_system(
                category=t["category"],
                slug=slug,
            )
            user = build_write_user(
                topic=t["topic"],
                category=t["category"],
                slug=slug,
                rationale=t["rationale"] or "",
            )

            attempts_log: list[dict[str, Any]] = []
            success: dict[str, Any] | None = None
            repair_markdown: str | None = None
            repair_issues: list[dict[str, str]] = []

            for attempt in range(1, args.max_attempts + 1):
                attempt_mode = "repair" if repair_markdown else "generate"
                attempt_user = user
                attempt_temperature = args.temperature
                if repair_markdown:
                    attempt_user = _build_repair_user(
                        topic=t["topic"],
                        category=t["category"],
                        slug=slug,
                        markdown=repair_markdown,
                        issues=repair_issues,
                    )
                    attempt_temperature = min(args.temperature, 0.3)

                try:
                    resp, latency_ms = _or.call_with_retry(
                        api_key=api_key,
                        model_id=args.model,
                        system=system,
                        user=attempt_user,
                        temperature=attempt_temperature,
                        max_tokens=args.max_tokens,
                        timeout=args.timeout,
                        retries=2,
                    )
                except _or.OpenRouterError as exc:
                    attempts_log.append({"attempt": attempt, "kind": "api_error",
                                         "detail": str(exc)[:300]})
                    if attempt < args.max_attempts:
                        log(f"RETRY #{t['rank']} {slug} attempt {attempt}/{args.max_attempts}: "
                            f"api_error {str(exc)[:140]}", fh)
                    continue

                markdown, finish_reason = _or.extract_text(resp)
                markdown = _mechanical_fix(markdown)
                tokens_in, tokens_out, cost = _or.usage_cost(resp)
                total_in += tokens_in or 0
                total_out += tokens_out or 0
                total_cost += cost or 0.0

                if not markdown:
                    attempts_log.append({"attempt": attempt, "kind": "empty",
                                         "detail": f"empty response (finish={finish_reason})"})
                    if attempt < args.max_attempts:
                        log(f"RETRY #{t['rank']} {slug} attempt {attempt}/{args.max_attempts}: "
                            f"empty response", fh)
                    continue

                draft_body_words = _body_word_count(markdown)
                try:
                    polished = polish_article_text(
                        markdown,
                        api_key=api_key,
                        model_id=args.model,
                        max_tokens=args.max_tokens,
                        timeout=args.timeout,
                    )
                except (ArticlePolishError, _or.OpenRouterError) as exc:
                    attempts_log.append({
                        "attempt": attempt,
                        "kind": "polish_error",
                        "mode": attempt_mode,
                        "detail": str(exc)[:300],
                    })
                    if attempt < args.max_attempts:
                        log(f"RETRY #{t['rank']} {slug} attempt {attempt}/{args.max_attempts}: "
                            f"article polish failed ({str(exc)[:140]})", fh)
                    continue

                markdown = _mechanical_fix(polished.markdown)
                total_in += polished.tokens_in or 0
                total_out += polished.tokens_out or 0
                total_cost += polished.cost or 0.0
                attempts_log.append({
                    "attempt": attempt,
                    "kind": "polish",
                    "mode": attempt_mode,
                    "detail": "em dash normalization + YMYL/medical language pass",
                })
                polished_body_words = _body_word_count(markdown)
                log(
                    f"POLISH #{t['rank']} {slug}: em dash + YMYL/medical pass "
                    f"body_words={draft_body_words}->{polished_body_words}",
                    fh,
                )

                violations = _validate_fn(
                    markdown,
                    context="article",
                    slug=slug,
                    require_image_alt=False,
                )
                tier1 = [v for v in violations if v.tier == 1]

                if tier1:
                    t1_ids = ",".join(v.rule_id for v in tier1)
                    repair_markdown = markdown
                    repair_issues = [{"rule": v.rule_id, "detail": v.detail} for v in tier1]
                    attempts_log.append({
                        "attempt": attempt, "kind": "tier1", "mode": attempt_mode,
                        "detail": t1_ids, "violations": repair_issues,
                    })
                    if attempt < args.max_attempts:
                        log(f"RETRY #{t['rank']} {slug} attempt {attempt}/{args.max_attempts}: "
                            f"{attempt_mode} tier1 {t1_ids} -> repair same draft", fh)
                    continue

                # Layer 2: LLM medical validator
                try:
                    med_violations = _medical_check(
                        markdown, api_key=api_key,
                        model="google/gemini-2.5-flash",
                        temperature=0.1, timeout=60,
                    )
                    unhedged = [v for v in med_violations if not v.hedged]
                    if unhedged:
                        terms = ", ".join(v.term for v in unhedged[:3])
                        repair_markdown = markdown
                        repair_issues = [
                            {
                                "rule": "medical",
                                "detail": f"unhedged medical term '{v.term}' in: {v.sentence}",
                            }
                            for v in unhedged
                        ]
                        attempts_log.append({
                            "attempt": attempt,
                            "kind": "medical",
                            "mode": attempt_mode,
                            "detail": f"post-polish unhedged medical terms: {terms}",
                        })
                        if attempt < args.max_attempts:
                            log(f"RETRY #{t['rank']} {slug} attempt {attempt}/{args.max_attempts}: "
                                f"post-polish medical validator: {terms} -> repair same draft", fh)
                        continue
                except Exception as exc:
                    log(f"WARN #{t['rank']} {slug}: medical validator error (non-blocking): {exc}", fh)

                success = {
                    "attempt": attempt,
                    "markdown": markdown,
                    "latency_ms": latency_ms,
                    "tokens_in": tokens_in,
                    "tokens_out": tokens_out,
                    "cost": cost,
                    "finish_reason": finish_reason,
                    "violations": violations,
                }
                break

            if success is None:
                last = attempts_log[-1] if attempts_log else {"kind": "unknown", "detail": "no attempts"}
                details_json = json.dumps({"attempts": attempts_log}, ensure_ascii=False, default=str)
                if last["kind"] == "tier1":
                    dq += 1
                    all_ids = sorted({vi["rule"] for a in attempts_log
                                      if a["kind"] == "tier1" for vi in a["violations"]})
                    reason = f"exhausted {args.max_attempts} attempts, tier1={','.join(all_ids)}"
                    log(f"DQ   #{t['rank']} {slug}: {reason}", fh)
                    for a in attempts_log:
                        log(f"       attempt{a['attempt']} {a['kind']}: {a['detail'][:180]}", fh)
                    insert_output(conn, {
                        "run_id": run_id, "topic_id": t["id"], "topic_rank": t["rank"],
                        "topic": t["topic"], "category": t["category"], "slug": slug,
                        "model_id": args.model, "markdown": None,
                        "tokens_in": None, "tokens_out": None, "cost_usd": None,
                        "latency_ms": None, "status": "dq", "error": None,
                        "finish_reason": None, "compliance_score": None,
                        "compliance_details": details_json, "disqualified": 1,
                        "disqualify_reason": reason[:500], "file_path": None,
                        "created_at": now_utc_iso(),
                    })
                else:
                    err += 1
                    reason = f"exhausted {args.max_attempts} attempts; last: {last['detail']}"
                    log(f"ERR  #{t['rank']} {slug}: {reason}", fh)
                    for a in attempts_log:
                        log(f"       attempt{a['attempt']} {a['kind']}: {a['detail'][:180]}", fh)
                    insert_output(conn, {
                        "run_id": run_id, "topic_id": t["id"], "topic_rank": t["rank"],
                        "topic": t["topic"], "category": t["category"], "slug": slug,
                        "model_id": args.model, "markdown": None,
                        "tokens_in": None, "tokens_out": None, "cost_usd": None,
                        "latency_ms": None, "status": "error", "error": reason[:500],
                        "finish_reason": None, "compliance_score": None,
                        "compliance_details": details_json, "disqualified": 0,
                        "disqualify_reason": None, "file_path": None,
                        "created_at": now_utc_iso(),
                    })
                continue

            markdown = success["markdown"]
            tier2 = [v for v in success["violations"] if v.tier == 2]
            details_json = json.dumps({
                "attempts": attempts_log + [{"attempt": success["attempt"], "kind": "ok"}],
                "tier2": [{"rule": v.rule_id, "detail": v.detail} for v in tier2],
            }, ensure_ascii=False, default=str)

            ok += 1
            t2_summary = f" tier2={','.join(v.rule_id for v in tier2)}" if tier2 else ""
            attempt_label = (f" [attempt {success['attempt']}/{args.max_attempts}]"
                             if success["attempt"] > 1 else "")
            body_words = _body_word_count(markdown)
            log(f"OK   #{t['rank']} {slug}  body_words={body_words}{t2_summary}{attempt_label} "
                f"lat={success['latency_ms']}ms cost=${success['cost'] or 0:.4f}", fh)
            insert_output(conn, {
                "run_id": run_id, "topic_id": t["id"], "topic_rank": t["rank"],
                "topic": t["topic"], "category": t["category"], "slug": slug,
                "model_id": args.model, "markdown": markdown,
                "tokens_in": success["tokens_in"], "tokens_out": success["tokens_out"],
                "cost_usd": success["cost"], "latency_ms": success["latency_ms"],
                "status": "written", "error": None,
                "finish_reason": success["finish_reason"], "compliance_score": None,
                "compliance_details": details_json, "disqualified": 0,
                "disqualify_reason": None, "file_path": None,
                "created_at": now_utc_iso(),
            })

        elapsed = time.monotonic() - start_all
        status = "done" if err == 0 else "partial"
        finish_run(conn, run_id, status)

        log("", fh)
        log("=" * 60, fh)
        log(f"DONE. write_runs.id={run_id} status={status}", fh)
        log(f"written={ok} dq={dq} errors={err} skipped={skipped}", fh)
        log(f"tokens in={total_in:,} out={total_out:,} cost=${total_cost:.4f}", fh)
        log(f"elapsed: {elapsed:.1f}s ({elapsed/60:.1f} min)", fh)
        log("=" * 60, fh)

        return 0 if err == 0 and ok > 0 else (1 if ok == 0 else 0)
    finally:
        fh.close()


if __name__ == "__main__":
    raise SystemExit(main())
