"""Run the stage 1.75 LLM rubric judge on production articles from `write_outputs`.

Reuses `scripts.stage_1_75.rubric.judge_one` (Gemini 2.5 Flash, voice/flow/seo/hook)
so the scores are directly comparable to the discovery-era scores.

Scores persist to a new table `write_judge_scores` keyed by write_run_id and
write_output_id. Live log streams per article as soon as the judge returns.

CLI:
    python scripts/judge_articles.py                            # latest write_run
    python scripts/judge_articles.py --write-run-id 5
    python scripts/judge_articles.py --judge-model gemini-2.5-pro
    python scripts/judge_articles.py --concurrency 2            # default 3
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.stage_1_75 import rubric as _rubric  # noqa: E402
from scripts.topic_research.llm.gemini import GeminiError  # noqa: E402


DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
LOGS_DIR = REPO_ROOT / "pipeline-data" / "logs"
ENV_PATH = REPO_ROOT / ".env"

DEFAULT_JUDGE_MODEL = _rubric.DEFAULT_JUDGE_MODEL  # gemini-2.5-flash
DEFAULT_CONCURRENCY = 3
DEFAULT_TIMEOUT = 90


SCHEMA = """
CREATE TABLE IF NOT EXISTS write_judge_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    write_run_id INTEGER NOT NULL,
    judge_model TEXT NOT NULL,
    article_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS write_judge_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES write_judge_runs(id),
    write_run_id INTEGER NOT NULL,
    write_output_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    category TEXT NOT NULL,
    topic_rank INTEGER NOT NULL,
    voice_score INTEGER,
    flow_score INTEGER,
    seo_score INTEGER,
    hook_score INTEGER,
    quality_score INTEGER,
    judge_reasoning TEXT,
    judge_model TEXT NOT NULL,
    judge_status TEXT NOT NULL,
    judge_error TEXT,
    judge_latency_ms INTEGER,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_write_judge_scores_run
    ON write_judge_scores(run_id);
"""


_LOG_LOCK = threading.Lock()
_DB_LOCK = threading.Lock()


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))


def connect_db(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA)
    return conn


def latest_write_run_id(conn: sqlite3.Connection) -> int | None:
    row = conn.execute(
        "SELECT id FROM write_runs ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return int(row["id"]) if row else None


def fetch_written_articles(conn: sqlite3.Connection, write_run_ids: list[int]) -> list[sqlite3.Row]:
    placeholders = ",".join("?" for _ in write_run_ids)
    rows = conn.execute(
        f"SELECT id, run_id, topic_rank, topic, category, slug, markdown "
        f"FROM write_outputs "
        f"WHERE run_id IN ({placeholders}) AND status='written' AND markdown IS NOT NULL "
        f"ORDER BY topic_rank",
        tuple(write_run_ids),
    ).fetchall()
    return list(rows)


def insert_run(conn, *, write_run_id, judge_model, article_count) -> int:
    cur = conn.execute(
        "INSERT INTO write_judge_runs (started_at, status, write_run_id, judge_model, article_count) "
        "VALUES (?, 'running', ?, ?, ?)",
        (now_utc_iso(), write_run_id, judge_model, article_count),
    )
    conn.commit()
    return int(cur.lastrowid)


def finish_run(conn, run_id: int, status: str) -> None:
    conn.execute(
        "UPDATE write_judge_runs SET finished_at=?, status=? WHERE id=?",
        (now_utc_iso(), status, run_id),
    )
    conn.commit()


def insert_score(conn, row: dict[str, Any]) -> int:
    cols = [
        "run_id", "write_run_id", "write_output_id", "slug", "category", "topic_rank",
        "voice_score", "flow_score", "seo_score", "hook_score", "quality_score",
        "judge_reasoning", "judge_model", "judge_status", "judge_error",
        "judge_latency_ms", "created_at",
    ]
    placeholders = ",".join("?" for _ in cols)
    cur = conn.execute(
        f"INSERT INTO write_judge_scores ({','.join(cols)}) VALUES ({placeholders})",
        tuple(row.get(c) for c in cols),
    )
    conn.commit()
    return int(cur.lastrowid)


def log(msg: str, fh) -> None:
    stamped = f"[{now_utc_iso()}] {msg}"
    with _LOG_LOCK:
        print(stamped, flush=True)
        fh.write(stamped + "\n")
        fh.flush()


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Judge production articles with the stage 1.75 rubric.")
    p.add_argument("--write-run-id", type=str, default=None,
                   help="write_runs.id to judge, or comma-separated list like '5,6' (default: latest)")
    p.add_argument("--judge-model", type=str, default=DEFAULT_JUDGE_MODEL,
                   help=f"Gemini judge model (default: {DEFAULT_JUDGE_MODEL})")
    p.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY)
    p.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    load_env_file(ENV_PATH)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set (env var or .env file).", file=sys.stderr)
        return 2

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    log_path = LOGS_DIR / f"judge_articles_{log_ts}.log"
    fh = log_path.open("a", encoding="utf-8")

    try:
        conn = connect_db(args.db)
        if args.write_run_id:
            write_run_ids = [int(x.strip()) for x in args.write_run_id.split(",") if x.strip()]
        else:
            latest = latest_write_run_id(conn)
            if latest is None:
                log("no write_runs found; run scripts/write.py first", fh)
                return 1
            write_run_ids = [latest]

        articles = fetch_written_articles(conn, write_run_ids)
        if not articles:
            log(f"no 'written' articles found for write_run_id(s)={write_run_ids}", fh)
            return 1

        # For the run record, use the first (lowest) write_run_id as the anchor.
        write_run_id = write_run_ids[0]
        log(f"judge_articles starting. write_run_id(s)={write_run_ids} "
            f"judge={args.judge_model} concurrency={args.concurrency}", fh)
        log(f"log file: {log_path}", fh)
        log(f"articles to judge: {len(articles)}", fh)
        for a in articles:
            log(f"  #{a['topic_rank']:>3} [{a['category']:<9}] {a['slug']}", fh)

        run_id = insert_run(
            conn,
            write_run_id=write_run_id,
            judge_model=args.judge_model,
            article_count=len(articles),
        )
        log(f"write_judge_runs.id = {run_id}", fh)

        def _task(art: sqlite3.Row) -> dict[str, Any]:
            try:
                r = _rubric.judge_one(
                    article_markdown=art["markdown"] or "",
                    api_key=api_key,
                    model=args.judge_model,
                    timeout=args.timeout,
                )
                return {
                    "art": art, "status": "ok",
                    "voice": r["voice_score"], "flow": r["flow_score"],
                    "seo": r["seo_score"], "hook": r["hook_score"],
                    "quality": r["quality_score"], "reasoning": r["reasoning"],
                    "latency": r["latency_ms"], "error": None,
                }
            except GeminiError as exc:
                return {
                    "art": art, "status": "error",
                    "voice": None, "flow": None, "seo": None, "hook": None,
                    "quality": None, "reasoning": None, "latency": None,
                    "error": str(exc)[:500],
                }

        completed = ok_count = err_count = 0
        total = len(articles)
        start_all = time.monotonic()
        scored: list[dict[str, Any]] = []

        with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
            futures = [pool.submit(_task, a) for a in articles]
            for fut in as_completed(futures):
                try:
                    r = fut.result()
                except Exception as exc:
                    completed += 1
                    err_count += 1
                    log(f"[{completed}/{total}] UNHANDLED worker error: {exc}", fh)
                    continue

                art = r["art"]
                row = {
                    "run_id": run_id,
                    "write_run_id": write_run_id,
                    "write_output_id": art["id"],
                    "slug": art["slug"],
                    "category": art["category"],
                    "topic_rank": art["topic_rank"],
                    "voice_score": r["voice"],
                    "flow_score": r["flow"],
                    "seo_score": r["seo"],
                    "hook_score": r["hook"],
                    "quality_score": r["quality"],
                    "judge_reasoning": r["reasoning"],
                    "judge_model": args.judge_model,
                    "judge_status": r["status"],
                    "judge_error": r["error"],
                    "judge_latency_ms": r["latency"],
                    "created_at": now_utc_iso(),
                }
                with _DB_LOCK:
                    insert_score(conn, row)
                scored.append(row)

                completed += 1
                if r["status"] == "ok":
                    ok_count += 1
                    log(f"[{completed}/{total}] OK  #{art['topic_rank']:>2} "
                        f"[{art['category'][:3]}] {art['slug'][:42]:<42} "
                        f"v={r['voice']:>2} f={r['flow']:>2} s={r['seo']:>2} h={r['hook']:>2} "
                        f"Q={r['quality']:>2}/60  lat={r['latency']}ms", fh)
                else:
                    err_count += 1
                    log(f"[{completed}/{total}] ERR #{art['topic_rank']} "
                        f"{art['slug']}: {r['error']}", fh)

        elapsed = time.monotonic() - start_all
        finish_run(conn, run_id, "done" if err_count == 0 else "partial")

        oks = [s for s in scored if s["judge_status"] == "ok"]
        log("", fh)
        log("=" * 72, fh)
        log(f"DONE. write_judge_runs.id={run_id}  judged {ok_count}/{total}  "
            f"errors={err_count}  elapsed={elapsed:.1f}s", fh)

        if oks:
            by_cat: dict[str, list[dict]] = {}
            for s in oks:
                by_cat.setdefault(s["category"], []).append(s)
            log("", fh)
            log(f"{'slug':<46}{'cat':<10}{'v':>3}{'f':>3}{'s':>3}{'h':>3}{'Q':>4}", fh)
            log("-" * 72, fh)
            for s in sorted(oks, key=lambda x: x["topic_rank"]):
                log(f"{s['slug'][:46]:<46}{s['category']:<10}"
                    f"{s['voice_score']:>3}{s['flow_score']:>3}"
                    f"{s['seo_score']:>3}{s['hook_score']:>3}"
                    f"{s['quality_score']:>4}", fh)

            def avg(vals):
                return sum(vals) / len(vals) if vals else 0.0
            log("", fh)
            log(f"{'ALL':<46}{'':<10}"
                f"{avg([s['voice_score'] for s in oks]):>3.0f}"
                f"{avg([s['flow_score'] for s in oks]):>3.0f}"
                f"{avg([s['seo_score'] for s in oks]):>3.0f}"
                f"{avg([s['hook_score'] for s in oks]):>3.0f}"
                f"{avg([s['quality_score'] for s in oks]):>4.1f}", fh)
            for cat, rows in sorted(by_cat.items()):
                log(f"{('[' + cat + ']'):<46}{len(rows):<10}"
                    f"{avg([s['voice_score'] for s in rows]):>3.0f}"
                    f"{avg([s['flow_score'] for s in rows]):>3.0f}"
                    f"{avg([s['seo_score'] for s in rows]):>3.0f}"
                    f"{avg([s['hook_score'] for s in rows]):>3.0f}"
                    f"{avg([s['quality_score'] for s in rows]):>4.1f}", fh)
        log("=" * 72, fh)

        return 0 if err_count == 0 else 1
    finally:
        fh.close()


if __name__ == "__main__":
    raise SystemExit(main())
