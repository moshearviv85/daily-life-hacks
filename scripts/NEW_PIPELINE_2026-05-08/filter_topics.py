"""Filter stage2 topics — semantic dedup against published articles via LLM.

Reads unused topics from stage2_output, checks each against published_articles
via LLM for semantic similarity, writes results to filtered_topics table.

Usage:
    python scripts/NEW_PIPELINE_2026-05-08/filter_topics.py
    python scripts/NEW_PIPELINE_2026-05-08/filter_topics.py --model google/gemini-2.5-flash
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Callable

_REPO_ROOT = Path(__file__).resolve().parents[2]
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from stage_1_5.openrouter import chat_completion, extract_text, OpenRouterError
from lib.content_policy import MEDICAL_TERMS_HARD_BAN

DEFAULT_DB = str(_REPO_ROOT / "pipeline-data" / "topic-research.sqlite")
DEFAULT_MODEL = "google/gemini-2.5-flash"

_FILTERED_SCHEMA = """
CREATE TABLE IF NOT EXISTS filtered_topics (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    slug       TEXT    NOT NULL UNIQUE,
    topic      TEXT    NOT NULL,
    score      REAL,
    rank       INTEGER,
    category   TEXT    NOT NULL CHECK (category IN ('recipes', 'nutrition', 'tips')),
    status     TEXT    NOT NULL CHECK (status IN ('approved', 'rejected')),
    reason     TEXT,
    checked_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""

_DEDUP_SCHEMA = {
    "type": "object",
    "properties": {
        "is_similar": {"type": "boolean"},
        "category": {"type": "string", "enum": ["recipes", "nutrition", "tips"]},
        "reason": {"type": "string"},
    },
    "required": ["is_similar", "category", "reason"],
}


def init_filtered_table(conn: sqlite3.Connection) -> None:
    conn.executescript(_FILTERED_SCHEMA)
    conn.commit()


def read_published_titles(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("SELECT title FROM published_articles ORDER BY slug").fetchall()
    return [r["title"] for r in rows]


def read_unused_topics(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("""
        SELECT DISTINCT s.slug, s.topic, s.category, s.score, s.rank
        FROM stage2_output s
        WHERE s.slug NOT IN (SELECT slug FROM published_articles)
          AND s.slug NOT IN (SELECT slug FROM filtered_topics)
        GROUP BY s.slug
        ORDER BY s.score DESC
    """).fetchall()
    return [dict(r) for r in rows]


def write_result(conn: sqlite3.Connection, slug: str, topic: str,
                 score: float, rank: int, category: str, status: str, reason: str) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO filtered_topics (slug, topic, score, rank, category, status, reason) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (slug, topic, score, rank, category, status, reason),
    )
    conn.commit()


def build_dedup_prompt(candidate_topic: str, published_titles: list[str]) -> str:
    if published_titles:
        titles_block = "\n".join(f"- {t}" for t in published_titles)
    else:
        titles_block = "(none)"

    return f"""You are a content deduplication checker for a healthy-eating blog.

PUBLISHED ARTICLES:
{titles_block}

CANDIDATE TOPIC: "{candidate_topic}"

TASK: Is the candidate topic semantically similar to ANY published article above?
"Semantically similar" means covering the same core idea even with different wording.
For example, "best high fiber breads" and "top fiber-rich bread options" are similar.

Also classify the candidate into one of these categories:
- "recipes" — practical food recipes, meal prep, one-pan dinners, snacks, breakfasts
- "nutrition" — educational posts, food facts, ingredient comparisons, macro/fiber/protein explainers
- "tips" — kitchen tips, storage, prep hacks, how-to guides, shopping guides

Return JSON with:
- is_similar: true/false
- category: "recipes" | "nutrition" | "tips"
- reason: one sentence explaining your decision"""


def parse_llm_response(resp: dict[str, Any]) -> dict[str, Any]:
    is_similar = bool(resp.get("is_similar", False))
    category = str(resp.get("category", "tips")).lower().strip()
    if category not in ("recipes", "nutrition", "tips"):
        category = "tips"
    reason = str(resp.get("reason", ""))
    return {"is_similar": is_similar, "category": category, "reason": reason}


def topic_contains_hard_banned_term(topic: str) -> str | None:
    """Return the first hard-banned medical term found in the topic, or None."""
    lower = topic.lower()
    for term in MEDICAL_TERMS_HARD_BAN:
        if term in lower:
            return term
    return None


def call_llm(
    prompt: str,
    api_key: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.1,
    timeout: int = 60,
) -> dict[str, Any]:
    system = "You are a JSON-only assistant. Return valid JSON. No markdown fences."
    user_msg = prompt + f"\n\nReturn JSON matching this schema:\n{json.dumps(_DEDUP_SCHEMA, indent=2)}"

    resp = chat_completion(
        api_key=api_key, model_id=model, system=system, user=user_msg,
        temperature=temperature, max_tokens=200, timeout=timeout,
    )
    text, _ = extract_text(resp)
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    return json.loads(cleaned)


def filter_all_topics(
    db_path: str,
    api_key: str,
    model: str = DEFAULT_MODEL,
    llm_fn: Callable | None = None,
) -> tuple[int, int]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    init_filtered_table(conn)

    published_titles = read_published_titles(conn)
    already_approved = [r["topic"] for r in conn.execute(
        "SELECT topic FROM filtered_topics WHERE status = 'approved'"
    ).fetchall()]
    all_titles = published_titles + already_approved

    unused = read_unused_topics(conn)
    total = len(unused)

    if llm_fn is None:
        llm_fn = call_llm

    print(f"[filter] {len(published_titles)} published, {len(already_approved)} previously approved, "
          f"{total} to check", file=sys.stderr)

    approved = 0
    rejected = 0

    for i, topic in enumerate(unused, 1):
        banned_term = topic_contains_hard_banned_term(topic["topic"])
        if banned_term:
            rejected += 1
            reason = f"hard-banned medical term: {banned_term}"
            write_result(conn, topic["slug"], topic["topic"], topic["score"],
                         topic["rank"], topic.get("category", "tips"), "rejected", reason)
            print(f"[filter] [{i}/{total}] REJECT (deterministic) '{topic['topic']}': {reason}", file=sys.stderr)
            continue

        prompt = build_dedup_prompt(topic["topic"], all_titles)
        try:
            raw = llm_fn(prompt=prompt, api_key=api_key, model=model, temperature=0.1, timeout=60)
            parsed = parse_llm_response(raw)
        except Exception as e:
            print(f"[filter] [{i}/{total}] ERROR '{topic['slug']}': {e}", file=sys.stderr)
            continue

        status = "rejected" if parsed["is_similar"] else "approved"
        write_result(conn, topic["slug"], topic["topic"], topic["score"],
                     topic["rank"], parsed["category"], status, parsed["reason"])

        if status == "rejected":
            rejected += 1
            print(f"[filter] [{i}/{total}] REJECT '{topic['topic']}'", file=sys.stderr)
        else:
            approved += 1
            all_titles.append(topic["topic"])
            print(f"[filter] [{i}/{total}] APPROVE '{topic['topic']}' [{parsed['category']}]", file=sys.stderr)

    conn.close()
    print(f"\n[filter] Done. {approved} approved, {rejected} rejected, "
          f"{total - approved - rejected} errors.", file=sys.stderr)
    return approved, rejected


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Filter stage2 topics via semantic dedup (OpenRouter)")
    parser.add_argument("--db", default=DEFAULT_DB, help="SQLite DB path")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="OpenRouter model")
    args = parser.parse_args()

    env_path = _REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))

    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        print("OPENROUTER_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    a, r = filter_all_topics(db_path=args.db, api_key=api_key, model=args.model)
    print(json.dumps({"approved": a, "rejected": r}))
