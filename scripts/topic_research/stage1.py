"""Stage 1 orchestrator — audience insights → fetch signals → Gemini rank → 20+20 keywords.

Flow
----
1. Fetch audience insights from Pinterest API (interests, countries, age, gender, device)
2. Extract seed keywords from top interests
3. Fetch Reddit top posts (10 subreddits, 25 posts each)
4. Fetch Google Autocomplete expansions for seed keywords
5. Fetch Pinterest Trends for all 4 trend types
6. Persist all raw signals to DB
7. Call Gemini to rank and select 20 content keywords + 20 board keywords
8. Write stage1_output rows to DB, close run, return JSON result

The function is fully deterministic — no global state.
All network calls are real unless caller patches them (TDD).
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

# Allow running as a script from repo root without installing
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from scripts.topic_research.db import (
    open_db,
    init_schema,
    create_run,
    close_run,
    insert_audience_interests,
    insert_reddit_posts,
    insert_autocomplete,
    insert_pinterest_trends,
    insert_stage1_output,
    read_stage1_output,
)
from scripts.topic_research.sources.audience_insights import fetch_audience_insights
from scripts.topic_research.sources.reddit import fetch_all_subreddits
from scripts.topic_research.sources.google_autocomplete import expand_seeds
from scripts.topic_research.sources.pinterest_trends import (
    fetch_all_trend_types,
    DEFAULT_FILTERS,
)
from scripts.topic_research.llm.gemini import generate, GeminiError

# ── constants ──────────────────────────────────────────────────────────────────

_DB_PATH = str(_REPO_ROOT / "pipeline-data" / "topic-research.sqlite")

# Number of top interests to use as autocomplete/reddit seeds
_SEED_LIMIT = 12

# Gemini output schema for stage 1
_STAGE1_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "content_keywords": {
            "type": "array",
            "description": "20 best article/content topic keywords, ranked #1 first",
            "items": {
                "type": "object",
                "properties": {
                    "rank": {"type": "integer"},
                    "keyword": {"type": "string"},
                    "score": {"type": "number"},
                    "rationale": {"type": "string"},
                },
                "required": ["rank", "keyword", "score", "rationale"],
            },
        },
        "board_keywords": {
            "type": "array",
            "description": "20 best Pinterest board name keywords, ranked #1 first",
            "items": {
                "type": "object",
                "properties": {
                    "rank": {"type": "integer"},
                    "keyword": {"type": "string"},
                    "score": {"type": "number"},
                    "rationale": {"type": "string"},
                },
                "required": ["rank", "keyword", "score", "rationale"],
            },
        },
    },
    "required": ["content_keywords", "board_keywords"],
}


# ── helpers ────────────────────────────────────────────────────────────────────

def _extract_seeds(interests: list[dict[str, Any]], limit: int = _SEED_LIMIT) -> list[str]:
    """Extract the top interests (by affinity desc) as seed keyword strings.

    Cleans up Pinterest category labels like "Food & Drinks" → "healthy recipes".
    We prefer the 'interest' field (most specific) over 'category'.
    """
    # Sort by affinity desc, then percent desc
    sorted_interests = sorted(
        interests,
        key=lambda r: (-(r.get("affinity") or 0), -(r.get("percent") or 0)),
    )
    seen: set[str] = set()
    seeds: list[str] = []
    for row in sorted_interests:
        interest = (row.get("interest") or "").strip()
        if not interest or interest in seen:
            continue
        seen.add(interest)
        seeds.append(interest)
        if len(seeds) >= limit:
            break
    return seeds


def _build_stage1_prompt(
    seeds: list[str],
    reddit_titles: list[str],
    autocomplete_terms: list[str],
    trending_keywords: list[str],
    audience_summary: str,
) -> str:
    """Build the Gemini ranking prompt for stage 1."""
    seeds_str = "\n".join(f"- {s}" for s in seeds[:20])
    reddit_str = "\n".join(f"- {t}" for t in reddit_titles[:50])
    autocomplete_str = "\n".join(f"- {t}" for t in autocomplete_terms[:60])
    trending_str = "\n".join(f"- {t}" for t in trending_keywords[:60])

    return f"""You are a Pinterest SEO expert helping a food and healthy-eating blog (daily-life-hacks.com) find its best content opportunities.

AUDIENCE: {audience_summary}

SEED INTERESTS FROM AUDIENCE CSV (highest affinity first):
{seeds_str}

REDDIT TRENDING TITLES (healthy eating subreddits, last 30 days):
{reddit_str}

GOOGLE AUTOCOMPLETE EXPANSIONS:
{autocomplete_str}

PINTEREST TRENDING KEYWORDS (US, female 25-44, food & drinks):
{trending_str}

TASK: Analyze all signals above and output exactly:
- 20 content_keywords: the best long-tail keyword phrases for writing blog articles (aim for 3-6 words, high search intent, practical / recipe / nutrition angle, suitable for American women 25-44 who cook at home). Score 0-100.
- 20 board_keywords: the best Pinterest board name keywords for creating/joining boards in this niche (2-4 words, broad enough to hold many pins but specific enough to attract the right audience). Score 0-100.

Rank each list #1 (best) to #20. Avoid YMYL medical claims. Avoid duplicate meanings. Prefer specific over generic."""


# ── main orchestrator ──────────────────────────────────────────────────────────

def run_stage1(
    audience_csv_path: str | None = None,
    db_path: str = _DB_PATH,
    gemini_api_key: str | None = None,
    pinterest_access_token: str | None = None,
    run_id: int | None = None,
) -> dict[str, Any]:
    """Run stage 1 end-to-end.

    Args:
        audience_csv_path: Deprecated — ignored. Kept for backwards compatibility.
        db_path: SQLite DB path. Defaults to pipeline-data/topic-research.sqlite.
        gemini_api_key: Gemini API key. Falls back to GEMINI_API_KEY env var.
        pinterest_access_token: Pinterest API token. Falls back to PINTEREST_ACCESS_TOKEN env var.
        run_id: If provided, use this run_id (for testing). Otherwise creates a new run.

    Returns:
        dict with keys: run_id, content_keywords (list), board_keywords (list)
    """
    # Resolve API keys
    api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is required (env var or gemini_api_key arg)")

    pinterest_token = pinterest_access_token or os.environ.get("PINTEREST_ACCESS_TOKEN", "")

    # Open DB
    conn = open_db(db_path)
    init_schema(conn)

    # Create run
    if run_id is None:
        run_id = create_run(conn, stage=1)
    print(f"[stage1] run_id={run_id}", file=sys.stderr)

    try:
        # 1. Fetch audience insights from Pinterest API
        print("[stage1] Fetching Pinterest Audience Insights...", file=sys.stderr)
        if pinterest_token:
            audience = fetch_audience_insights(pinterest_token)
        else:
            audience = {}
            print("[stage1] No Pinterest token — skipping audience insights", file=sys.stderr)
        interests = audience.get("interests", [])
        print(f"[stage1] {len(interests)} interests fetched", file=sys.stderr)

        # Persist audience interests
        insert_audience_interests(conn, run_id, interests)

        # 2. Extract seeds
        seeds = _extract_seeds(interests)
        print(f"[stage1] {len(seeds)} seeds extracted: {seeds[:5]}...", file=sys.stderr)

        # 3. Fetch Reddit
        print("[stage1] Fetching Reddit...", file=sys.stderr)
        reddit_posts = fetch_all_subreddits(per_subreddit=25)
        insert_reddit_posts(conn, run_id, reddit_posts)
        print(f"[stage1] {len(reddit_posts)} Reddit posts fetched", file=sys.stderr)

        # 4. Fetch Google Autocomplete
        print("[stage1] Fetching Google Autocomplete...", file=sys.stderr)
        autocomplete_rows = expand_seeds(seeds)
        insert_autocomplete(conn, run_id, autocomplete_rows)
        print(f"[stage1] {len(autocomplete_rows)} autocomplete suggestions", file=sys.stderr)

        # 5. Fetch Pinterest Trends
        print("[stage1] Fetching Pinterest Trends...", file=sys.stderr)
        if pinterest_token:
            trend_rows = fetch_all_trend_types(
                access_token=pinterest_token,
                interests=DEFAULT_FILTERS["interests"],
                genders=DEFAULT_FILTERS["genders"],
                ages=DEFAULT_FILTERS["ages"],
            )
        else:
            trend_rows = []
            print("[stage1] No Pinterest token — skipping trends", file=sys.stderr)
        insert_pinterest_trends(conn, run_id, trend_rows)
        print(f"[stage1] {len(trend_rows)} Pinterest trend keywords", file=sys.stderr)

        # 6. Build prompt inputs
        reddit_titles = [p["title"] for p in reddit_posts if p.get("title")]
        autocomplete_terms = [r["expanded"] for r in autocomplete_rows]
        trending_keywords = [r["keyword"] for r in trend_rows]

        age_dist = ", ".join(
            f"{r['value']} ({r['percent']}%)" for r in audience.get("age", [])[:3]
        ) or "25-44 female"

        audience_summary = (
            f"Female-leaning Pinterest users, age {age_dist}. "
            f"Top interests: {', '.join(seeds[:5])}."
        )

        # 7. Gemini ranking
        print("[stage1] Calling Gemini for keyword ranking...", file=sys.stderr)
        prompt = _build_stage1_prompt(
            seeds=seeds,
            reddit_titles=reddit_titles,
            autocomplete_terms=autocomplete_terms,
            trending_keywords=trending_keywords,
            audience_summary=audience_summary,
        )

        gemini_result = generate(
            prompt=prompt,
            api_key=api_key,
            schema=_STAGE1_SCHEMA,
            temperature=0.2,
        )

        # 8. Persist stage1 output
        content_kws = gemini_result.get("content_keywords", [])
        board_kws = gemini_result.get("board_keywords", [])

        output_rows: list[dict[str, Any]] = []
        for item in content_kws:
            output_rows.append({
                "keyword": item["keyword"],
                "keyword_type": "content",
                "rank": item["rank"],
                "score": item.get("score"),
                "rationale": item.get("rationale", ""),
            })
        for item in board_kws:
            output_rows.append({
                "keyword": item["keyword"],
                "keyword_type": "board",
                "rank": item["rank"],
                "score": item.get("score"),
                "rationale": item.get("rationale", ""),
            })

        insert_stage1_output(conn, run_id, output_rows)

        # 9. Close run
        close_run(conn, run_id, status="done")
        print(f"[stage1] Done. {len(content_kws)} content + {len(board_kws)} board keywords.", file=sys.stderr)

        return {
            "run_id": run_id,
            "content_keywords": content_kws,
            "board_keywords": board_kws,
        }

    except Exception as e:
        close_run(conn, run_id, status="failed")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Topic Research Stage 1")
    parser.add_argument("--db", default=_DB_PATH, help="SQLite DB path")
    args = parser.parse_args()

    # Load .env
    env_path = _REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))

    result = run_stage1(db_path=args.db)
    print(json.dumps(result, indent=2, ensure_ascii=False))
