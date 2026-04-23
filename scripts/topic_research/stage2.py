"""Stage 2 orchestrator — Pin Inspector CSVs + stage1 output → N ranked topics.

Flow
----
1. Parse Pin Inspector keywords CSV + boards CSV
2. Persist to DB
3. Read stage1_output from DB (latest stage-1 run or explicit run_id)
4. Read published articles from src/data/articles/
5. Read pending topics from pipeline-data/topics-to-write.md
6. Call Gemini to generate + rank topics (de-duped vs existing). When
   ``balance='recipes:nutrition:tips'`` is set (CLI default '20:15:15'),
   the prompt requests an exact per-category quota and a post-processing
   step trims over-filled categories and tops up under-filled ones via
   a single additional Gemini call per missing category.
7. Write stage2_output rows to DB, close run, return JSON result

The function is fully deterministic — no global state.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from scripts.topic_research.db import (
    open_db,
    init_schema,
    create_run,
    close_run,
    get_latest_run_id,
    insert_pin_inspector_keywords,
    insert_pin_inspector_boards,
    read_stage1_output,
    insert_stage2_output,
    read_stage2_output,
)
from scripts.topic_research.sources.pin_inspector import (
    parse_pin_inspector_keywords,
    parse_pin_inspector_boards,
)
from scripts.topic_research.sources.site_articles import (
    read_published_articles,
    read_pending_topics,
)
from scripts.topic_research.llm.gemini import generate, GeminiError

# ── constants ──────────────────────────────────────────────────────────────────

_DB_PATH = str(_REPO_ROOT / "pipeline-data" / "topic-research.sqlite")
_ARTICLES_DIR = str(_REPO_ROOT / "src" / "data" / "articles")
_TOPICS_FILE = str(_REPO_ROOT / "pipeline-data" / "topics-to-write.md")

_STAGE2_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "topics": {
            "type": "array",
            "description": "50 ranked article topics, #1 being the highest priority",
            "items": {
                "type": "object",
                "properties": {
                    "rank": {"type": "integer"},
                    "topic": {"type": "string", "description": "Full article title / topic phrase"},
                    "category": {
                        "type": "string",
                        "enum": ["recipes", "nutrition", "tips"],
                    },
                    "slug": {
                        "type": "string",
                        "description": "URL-friendly slug, lowercase, hyphens only",
                    },
                    "score": {"type": "number", "description": "Priority score 0-100"},
                    "rationale": {
                        "type": "string",
                        "description": "1-sentence explanation of why this ranks here",
                    },
                },
                "required": ["rank", "topic", "category", "slug", "score", "rationale"],
            },
        }
    },
    "required": ["topics"],
}


# ── helpers ────────────────────────────────────────────────────────────────────

_CATEGORIES = ("recipes", "nutrition", "tips")


def _slugify(text: str) -> str:
    """Simple ASCII slug — lowercase, hyphens, no special chars."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


def _parse_balance(balance: str) -> dict[str, int]:
    """Parse a balance string 'recipes:nutrition:tips' (e.g. '20:15:15') into quota dict.

    Raises ValueError if malformed or any part is not a non-negative integer.
    """
    parts = balance.split(":")
    if len(parts) != 3:
        raise ValueError(
            f"balance must be 'recipes:nutrition:tips' (three colon-separated ints), got {balance!r}"
        )
    try:
        recipes, nutrition, tips = (int(p) for p in parts)
    except ValueError as e:
        raise ValueError(f"balance values must be integers, got {balance!r}") from e
    if min(recipes, nutrition, tips) < 0:
        raise ValueError(f"balance values must be >= 0, got {balance!r}")
    return {"recipes": recipes, "nutrition": nutrition, "tips": tips}


def _build_stage2_prompt(
    stage1_content_kws: list[str],
    stage1_board_kws: list[str],
    pin_inspector_kws: list[str],
    pin_inspector_boards: list[str],
    published_titles: list[str],
    published_slugs: list[str],
    pending_topics: list[str],
    balance: dict[str, int] | None = None,
) -> str:
    """Build the Gemini ranking prompt for stage 2.

    When *balance* is provided, the prompt enforces an exact per-category
    quota (e.g. 20 recipes, 15 nutrition, 15 tips). When None, falls back
    to the legacy "50 topics" request with no explicit per-category target.
    """
    content_str = "\n".join(f"- {k}" for k in stage1_content_kws[:20])
    board_str = "\n".join(f"- {k}" for k in stage1_board_kws[:20])
    pi_kw_str = "\n".join(f"- {k}" for k in pin_inspector_kws[:80])
    pi_board_str = "\n".join(f"- {k}" for k in pin_inspector_boards[:40])
    published_str = "\n".join(f"- {t}" for t in published_titles[:100])
    pending_str = "\n".join(f"- {t}" for t in pending_topics[:100])

    if balance is not None:
        total = sum(balance.values())
        quota_block = f"""
CATEGORY QUOTA (STRICT — you MUST match these counts exactly):
- recipes: {balance['recipes']} topics
- nutrition: {balance['nutrition']} topics
- tips: {balance['tips']} topics
TOTAL: {total} topics

Do NOT exceed any category count. Do NOT fall short. If a category has fewer obvious opportunities than requested, still return long-tail topics that match the niche — do not substitute across categories.
"""
        count_line = f"Generate exactly {total} new article topics ranked by opportunity (hot → cold)"
        closing = f"Return all {total} topics sorted rank 1 (best) to {total} (lowest of the {total}), with the category mix above."
    else:
        quota_block = ""
        count_line = "Generate exactly 50 new article topics ranked by opportunity (hot → cold)"
        closing = "Return all 50 topics sorted rank 1 (best) to 50 (lowest priority of the 50)."

    return f"""You are a Pinterest SEO strategist for a healthy-eating food blog (daily-life-hacks.com) targeting American women aged 25-44.

STAGE 1 CONTENT KEYWORDS (ranked by audience demand):
{content_str}

STAGE 1 BOARD KEYWORDS (Pinterest board themes):
{board_str}

PIN INSPECTOR — TOP SEARCHED KEYWORDS ON PINTEREST:
{pi_kw_str}

PIN INSPECTOR — TOP BOARDS IN THIS NICHE:
{pi_board_str}

ALREADY PUBLISHED ARTICLES (do not duplicate these):
{published_str}

PENDING TOPICS ALREADY IN QUEUE (do not duplicate these either):
{pending_str}
{quota_block}
TASK: {count_line}. Each topic must:
1. NOT duplicate any published article or pending topic (check slugs too)
2. Fit one of: "recipes" (practical food recipes, meal prep), "nutrition" (educational, food facts, comparisons), or "tips" (kitchen tips, storage, hacks, how-to guides)
3. Be specific and long-tail (4-8 words) — e.g. "high fiber breakfast recipes for weight loss"
4. Have genuine Pinterest search volume potential based on the keyword signals above
5. Avoid YMYL: no diet plans, no "lose X pounds", no detox/cleanse, no absolute health promises. Weight-related topics are OK only when framed as a healthy recipe ("high fiber dinner recipes") — never as a weight loss program or medical advice
6. Score 0-100 where 100 = highest demand + lowest competition + best fit

{closing}"""


def _build_topup_schema(category: str) -> dict[str, Any]:
    """Schema for per-category top-up Gemini calls — pinned to a single category enum."""
    return {
        "type": "object",
        "properties": {
            "topics": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "rank": {"type": "integer"},
                        "topic": {"type": "string"},
                        "category": {"type": "string", "enum": [category]},
                        "slug": {"type": "string"},
                        "score": {"type": "number"},
                        "rationale": {"type": "string"},
                    },
                    "required": ["rank", "topic", "category", "slug", "score", "rationale"],
                },
            }
        },
        "required": ["topics"],
    }


_CATEGORY_DEFINITIONS = {
    "recipes": "practical food recipes, meal prep, one-pan dinners, snacks, breakfasts",
    "nutrition": "educational posts, food facts, ingredient comparisons, macro/fiber/protein explainers",
    "tips": "kitchen tips, storage, prep hacks, how-to guides, shopping guides",
}


def _topup_category(
    category: str,
    needed: int,
    existing_topics: list[str],
    stage1_content_kws: list[str],
    stage1_board_kws: list[str],
    pin_inspector_kws: list[str],
    pin_inspector_boards: list[str],
    published_titles: list[str],
    pending_topics: list[str],
    api_key: str,
    gen_fn: Any,
) -> list[dict[str, Any]]:
    """Ask Gemini for *needed* additional topics in one category, excluding duplicates."""
    if needed <= 0:
        return []

    content_str = "\n".join(f"- {k}" for k in stage1_content_kws[:20])
    board_str = "\n".join(f"- {k}" for k in stage1_board_kws[:20])
    pi_kw_str = "\n".join(f"- {k}" for k in pin_inspector_kws[:80])
    pi_board_str = "\n".join(f"- {k}" for k in pin_inspector_boards[:40])
    exclusion_pool = (published_titles or []) + (pending_topics or []) + (existing_topics or [])
    exclude_str = "\n".join(f"- {t}" for t in exclusion_pool[:200])

    prompt = f"""You are a Pinterest SEO strategist for daily-life-hacks.com (healthy eating, American women 25-44).

STAGE 1 CONTENT KEYWORDS:
{content_str}

STAGE 1 BOARD KEYWORDS:
{board_str}

PIN INSPECTOR — TOP SEARCHED KEYWORDS:
{pi_kw_str}

PIN INSPECTOR — TOP BOARDS:
{pi_board_str}

DO NOT duplicate any of these titles / topics:
{exclude_str}

TASK: Generate exactly {needed} NEW article topics in the "{category}" category only.
Category definition: {_CATEGORY_DEFINITIONS.get(category, category)}.

Rules:
- Long-tail titles (4-8 words).
- Genuine Pinterest search demand based on the signals above.
- No YMYL: no diet plans, no "lose X pounds", no detox/cleanse, no absolute health promises.
- Score 0-100. rank 1 (best) through {needed}.
- category field must be exactly "{category}".

Return exactly {needed} topics."""

    result = gen_fn(
        prompt=prompt,
        api_key=api_key,
        schema=_build_topup_schema(category),
        temperature=0.3,
        timeout=120,
    )
    topics = result.get("topics", []) if isinstance(result, dict) else []
    cleaned: list[dict[str, Any]] = []
    for t in topics:
        if not isinstance(t, dict):
            continue
        t["category"] = category  # force, in case of drift
        if not t.get("slug"):
            t["slug"] = _slugify(t.get("topic", ""))
        cleaned.append(t)
    return cleaned


def _enforce_balance(
    topics: list[dict[str, Any]],
    balance: dict[str, int],
    stage1_content_kws: list[str],
    stage1_board_kws: list[str],
    pin_inspector_kws: list[str],
    pin_inspector_boards: list[str],
    published_titles: list[str],
    pending_topics: list[str],
    api_key: str,
    gen_fn: Any,
) -> list[dict[str, Any]]:
    """Enforce per-category quota on *topics*.

    Trims categories that are over quota (keeps top-N by score).
    Tops up categories that are under quota with a targeted Gemini call (best-effort;
    a GeminiError is logged but does not stop the run).
    Returns the combined list re-ranked 1..N globally by score DESC.
    """
    by_cat: dict[str, list[dict[str, Any]]] = {c: [] for c in _CATEGORIES}
    for t in topics:
        cat = t.get("category")
        if cat in by_cat:
            by_cat[cat].append(t)

    # 1. Trim over-quota
    for cat in _CATEGORIES:
        quota = balance.get(cat, 0)
        by_cat[cat].sort(key=lambda r: (r.get("score") or 0), reverse=True)
        if len(by_cat[cat]) > quota:
            print(
                f"[stage2] balance: trimming {cat} {len(by_cat[cat])} → {quota}",
                file=sys.stderr,
            )
            by_cat[cat] = by_cat[cat][:quota]

    # 2. Top up under-quota (best-effort)
    existing_topics = [t.get("topic", "") for lst in by_cat.values() for t in lst]
    existing_slugs = {t.get("slug") for lst in by_cat.values() for t in lst}

    for cat in _CATEGORIES:
        quota = balance.get(cat, 0)
        current = len(by_cat[cat])
        if current >= quota:
            continue
        needed = quota - current
        print(
            f"[stage2] balance: topping up {cat} {current} → {quota} (need {needed})",
            file=sys.stderr,
        )
        try:
            topup = _topup_category(
                category=cat,
                needed=needed,
                existing_topics=existing_topics,
                stage1_content_kws=stage1_content_kws,
                stage1_board_kws=stage1_board_kws,
                pin_inspector_kws=pin_inspector_kws,
                pin_inspector_boards=pin_inspector_boards,
                published_titles=published_titles,
                pending_topics=pending_topics,
                api_key=api_key,
                gen_fn=gen_fn,
            )
        except GeminiError as e:
            print(f"[stage2] balance: topup for {cat} failed: {e}", file=sys.stderr)
            topup = []

        for t in topup:
            slug = t.get("slug")
            if not slug or slug in existing_slugs:
                continue
            if len(by_cat[cat]) >= quota:
                break
            by_cat[cat].append(t)
            existing_slugs.add(slug)
            existing_topics.append(t.get("topic", ""))

    # 3. Combine + re-rank globally by score DESC
    combined: list[dict[str, Any]] = []
    for lst in by_cat.values():
        combined.extend(lst)
    combined.sort(key=lambda r: (r.get("score") or 0), reverse=True)
    for i, t in enumerate(combined, 1):
        t["rank"] = i
    return combined


# ── main orchestrator ──────────────────────────────────────────────────────────

def run_stage2(
    keywords_csv_path: str,
    boards_csv_path: str | None = None,
    stage1_run_id: int | None = None,
    db_path: str = _DB_PATH,
    articles_dir: str = _ARTICLES_DIR,
    topics_file: str = _TOPICS_FILE,
    gemini_api_key: str | None = None,
    run_id: int | None = None,
    balance: str | None = None,
) -> dict[str, Any]:
    """Run stage 2 end-to-end.

    Args:
        keywords_csv_path: Path to Pin Inspector keywords CSV.
        boards_csv_path: Path to Pin Inspector boards CSV.
        stage1_run_id: run_id from stage 1 to read keywords from. Defaults to latest.
        db_path: SQLite DB path.
        articles_dir: Path to src/data/articles/ directory.
        topics_file: Path to pipeline-data/topics-to-write.md.
        gemini_api_key: Gemini API key. Falls back to GEMINI_API_KEY env var.
        run_id: If provided, use this run_id (for testing). Otherwise creates a new run.
        balance: Optional per-category quota in 'recipes:nutrition:tips' form
            (e.g. '20:15:15'). When set, the prompt enforces the quota and a
            post-processing step trims over-filled categories + tops up
            under-filled ones via a targeted Gemini call. When None, legacy
            top-50-by-score behaviour is preserved.

    Returns:
        dict with keys: run_id, topics (list of ranked topics; length equals the
        balance total when balance is set, otherwise 50 or whatever Gemini returned)
    """
    api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is required (env var or gemini_api_key arg)")

    quota: dict[str, int] | None = _parse_balance(balance) if balance else None

    conn = open_db(db_path)
    init_schema(conn)

    if run_id is None:
        run_id = create_run(conn, stage=2)
    print(f"[stage2] run_id={run_id}", file=sys.stderr)

    try:
        # 1. Parse Pin Inspector CSVs
        print("[stage2] Parsing Pin Inspector keywords...", file=sys.stderr)
        pi_keywords = parse_pin_inspector_keywords(keywords_csv_path)
        insert_pin_inspector_keywords(conn, run_id, pi_keywords)
        print(f"[stage2] {len(pi_keywords)} keywords from Pin Inspector", file=sys.stderr)

        if boards_csv_path:
            print("[stage2] Parsing Pin Inspector boards...", file=sys.stderr)
            pi_boards = parse_pin_inspector_boards(boards_csv_path)
            insert_pin_inspector_boards(conn, run_id, pi_boards)
            print(f"[stage2] {len(pi_boards)} boards from Pin Inspector", file=sys.stderr)
        else:
            pi_boards = []
            print("[stage2] No boards CSV — skipping", file=sys.stderr)

        # 2. Read stage1 output
        s1_run = stage1_run_id or get_latest_run_id(conn, stage=1)
        s1_rows: list[dict[str, Any]] = []
        if s1_run is not None:
            s1_rows = read_stage1_output(conn, s1_run)
            print(f"[stage2] Read {len(s1_rows)} stage1 output rows (run_id={s1_run})", file=sys.stderr)
        else:
            print("[stage2] No stage1 run found — proceeding without stage1 signals", file=sys.stderr)

        stage1_content_kws = [
            r["keyword"] for r in s1_rows if r.get("keyword_type") == "content"
        ]
        stage1_board_kws = [
            r["keyword"] for r in s1_rows if r.get("keyword_type") == "board"
        ]

        # 3. Read existing content inventory
        print("[stage2] Reading published articles...", file=sys.stderr)
        articles = read_published_articles(articles_dir)
        published_titles = [a["title"] for a in articles if a.get("title")]
        published_slugs = [a["slug"] for a in articles if a.get("slug")]
        print(f"[stage2] {len(articles)} published articles", file=sys.stderr)

        print("[stage2] Reading pending topics...", file=sys.stderr)
        pending_topics = read_pending_topics(topics_file)
        print(f"[stage2] {len(pending_topics)} pending topics", file=sys.stderr)

        # 4. Build prompt inputs from Pin Inspector
        pi_kw_list = [r["keyword"] for r in pi_keywords if r.get("keyword")]
        pi_board_list = [r["board_name"] for r in pi_boards if r.get("board_name")]

        # 5. Gemini ranking
        print("[stage2] Calling Gemini for topic ranking...", file=sys.stderr)
        prompt = _build_stage2_prompt(
            stage1_content_kws=stage1_content_kws,
            stage1_board_kws=stage1_board_kws,
            pin_inspector_kws=pi_kw_list,
            pin_inspector_boards=pi_board_list,
            published_titles=published_titles,
            published_slugs=published_slugs,
            pending_topics=pending_topics,
            balance=quota,
        )

        gemini_result = generate(
            prompt=prompt,
            api_key=api_key,
            schema=_STAGE2_SCHEMA,
            temperature=0.2,
            timeout=180,
        )

        topics = gemini_result.get("topics", [])

        # 6. Ensure slugs are present (fallback if Gemini omits)
        for item in topics:
            if not item.get("slug"):
                item["slug"] = _slugify(item.get("topic", ""))

        # 6b. Enforce per-category balance if requested
        if quota is not None:
            before_counts: dict[str, int] = {}
            for t in topics:
                c = t.get("category")
                before_counts[c] = before_counts.get(c, 0) + 1
            print(f"[stage2] balance target: {quota}", file=sys.stderr)
            print(f"[stage2] counts pre-enforcement: {before_counts}", file=sys.stderr)

            topics = _enforce_balance(
                topics=topics,
                balance=quota,
                stage1_content_kws=stage1_content_kws,
                stage1_board_kws=stage1_board_kws,
                pin_inspector_kws=pi_kw_list,
                pin_inspector_boards=pi_board_list,
                published_titles=published_titles,
                pending_topics=pending_topics,
                api_key=api_key,
                gen_fn=generate,
            )

            after_counts: dict[str, int] = {}
            for t in topics:
                c = t.get("category")
                after_counts[c] = after_counts.get(c, 0) + 1
            print(f"[stage2] counts post-enforcement: {after_counts}", file=sys.stderr)

        # 7. Persist stage2 output
        output_rows: list[dict[str, Any]] = [
            {
                "rank": item["rank"],
                "topic": item["topic"],
                "category": item["category"],
                "slug": item["slug"],
                "score": item.get("score"),
                "rationale": item.get("rationale", ""),
            }
            for item in topics
        ]
        insert_stage2_output(conn, run_id, output_rows)

        close_run(conn, run_id, status="done")
        print(f"[stage2] Done. {len(topics)} topics ranked.", file=sys.stderr)

        return {
            "run_id": run_id,
            "topics": topics,
        }

    except Exception as e:
        close_run(conn, run_id, status="failed")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Topic Research Stage 2")
    parser.add_argument("--keywords-csv", required=True, help="Pin Inspector keywords CSV path")
    parser.add_argument("--boards-csv", required=True, help="Pin Inspector boards CSV path")
    parser.add_argument("--stage1-run-id", type=int, default=None, help="Stage 1 run_id (default: latest)")
    parser.add_argument("--db", default=_DB_PATH, help="SQLite DB path")
    parser.add_argument(
        "--balance",
        default="20:15:15",
        help="Per-category quota recipes:nutrition:tips (default: 20:15:15). Pass empty string to disable.",
    )
    args = parser.parse_args()

    env_path = _REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))

    result = run_stage2(
        keywords_csv_path=args.keywords_csv,
        boards_csv_path=args.boards_csv,
        stage1_run_id=args.stage1_run_id,
        db_path=args.db,
        balance=args.balance or None,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
