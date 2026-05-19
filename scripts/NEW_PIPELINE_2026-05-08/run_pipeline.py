"""End-to-end pipeline orchestrator — run all stages on a single topic.

Seeds a topic into filtered_topics, writes an article, reviews it via LLM,
generates hero + pin briefs/images, and deploys to disk. Each stage is a
subprocess so failures are isolated and logs are visible.

Requires: OPENROUTER_API_KEY and FAL_KEY in .env or environment.

Usage:
    python scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py "crispy baked falafel with tahini sauce" --category recipes
    python scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py "best ways to store fresh herbs" --category tips
    python scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py "chickpea nutrition facts" --category nutrition --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
ENV_PATH = REPO_ROOT / ".env"


def load_env() -> None:
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))


def slug_from_topic(topic: str) -> str:
    s = topic.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s[:80]


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(msg: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def run_step(label: str, cmd: list[str], *, timeout: int = 600) -> bool:
    log(f"--- {label} ---")
    log(f"  cmd: {' '.join(cmd)}")
    start = time.monotonic()
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    elapsed = time.monotonic() - start

    if result.stdout:
        for line in result.stdout.strip().splitlines():
            print(f"  {line}")
    if result.stderr:
        for line in result.stderr.strip().splitlines():
            print(f"  [err] {line}")

    if result.returncode != 0:
        log(f"  FAILED (exit {result.returncode}) in {elapsed:.1f}s")
        return False
    log(f"  OK in {elapsed:.1f}s")
    return True


def seed_topic(db_path: str, topic: str, category: str, slug: str) -> int:
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS filtered_topics (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            slug       TEXT    NOT NULL UNIQUE,
            topic      TEXT    NOT NULL,
            score      REAL,
            rank       INTEGER,
            category   TEXT    NOT NULL,
            status     TEXT    NOT NULL,
            reason     TEXT,
            checked_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%%H:%M:%SZ', 'now'))
        )
    """)
    existing = conn.execute(
        "SELECT id, rank FROM filtered_topics WHERE slug = ?", (slug,)
    ).fetchone()
    if existing:
        log(f"Topic already in filtered_topics (id={existing[0]}, rank={existing[1]})")
        conn.close()
        return existing[1]

    max_rank = conn.execute("SELECT COALESCE(MAX(rank), 0) FROM filtered_topics").fetchone()[0]
    rank = max_rank + 1
    conn.execute(
        "INSERT INTO filtered_topics (slug, topic, score, rank, category, status, reason, checked_at) "
        "VALUES (?, ?, ?, ?, ?, 'approved', 'manual seed for pipeline test', ?)",
        (slug, topic, 100.0, rank, category, now_iso()),
    )
    conn.commit()
    conn.close()
    log(f"Seeded topic into filtered_topics: rank={rank}, slug={slug}")
    return rank


REVIEW_SCHEMA = """
CREATE TABLE IF NOT EXISTS review_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    review_model TEXT NOT NULL,
    article_count INTEGER NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS review_outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES review_runs(id),
    original_write_output_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    category TEXT NOT NULL,
    original_markdown TEXT,
    reviewed_markdown TEXT,
    changes_json TEXT,
    changes_count INTEGER,
    review_model TEXT NOT NULL,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_usd REAL,
    latency_ms INTEGER,
    tier1_pass INTEGER,
    tier2_warnings TEXT,
    status TEXT NOT NULL,
    error TEXT,
    attempts INTEGER,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_outputs_slug
    ON review_outputs(slug);
"""


def init_brief_schema(db_path: str) -> None:
    sys.path.insert(0, str(SCRIPT_DIR))
    from lib import brief_store

    con = brief_store.connect(db_path)
    try:
        brief_store.init_schema(con)
    finally:
        con.close()


def run_review(db_path: str, slug: str, api_key: str) -> bool:
    """LLM review stage: reads write_outputs, reviews via OpenRouter, writes review_outputs."""
    log("--- Stage 2: LLM Review ---")
    sys.path.insert(0, str(SCRIPT_DIR))

    from review_prompt import build_system, build_user
    from stage_1_5.openrouter import chat_completion, extract_text, usage_cost

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(REVIEW_SCHEMA)
    conn.commit()

    row = conn.execute(
        "SELECT id, slug, category, markdown FROM write_outputs "
        "WHERE slug = ? AND status = 'written' ORDER BY id DESC LIMIT 1",
        (slug,),
    ).fetchone()
    if not row:
        log(f"  No written article found for slug={slug}")
        conn.close()
        return False

    system = build_system()
    user = build_user(markdown=row["markdown"], slug=row["slug"], category=row["category"])

    log(f"  Calling LLM for review ({len(row['markdown'])} chars)...")
    start = time.monotonic()
    try:
        resp = chat_completion(
            api_key=api_key, model_id="google/gemini-2.5-flash",
            system=system, user=user,
            temperature=0.2, max_tokens=8000, timeout=300,
        )
        reviewed_md, finish_reason = extract_text(resp)
        tokens_in, tokens_out, cost = usage_cost(resp)
    except Exception as e:
        log(f"  Review LLM call failed: {e}")
        conn.close()
        return False
    latency = int((time.monotonic() - start) * 1000)

    if not reviewed_md or len(reviewed_md) < 500:
        log(f"  Review returned empty/short response ({len(reviewed_md or '')} chars)")
        conn.close()
        return False

    cleaned = reviewed_md.strip()
    if cleaned.startswith("```"):
        first_nl = cleaned.index("\n") if "\n" in cleaned else len(cleaned)
        cleaned = cleaned[first_nl + 1:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
        reviewed_md = cleaned

    for marker in ("===CHANGES===", "===CHANGELOG===", "---CHANGES---"):
        idx = reviewed_md.find(marker)
        if idx != -1:
            reviewed_md = reviewed_md[:idx].rstrip()

    run_id = conn.execute(
        "INSERT INTO review_runs (started_at, finished_at, status, review_model, article_count, notes) "
        "VALUES (?, ?, 'done', 'google/gemini-2.5-flash', 1, 'pipeline orchestrator')",
        (now_iso(), now_iso()),
    ).lastrowid

    conn.execute(
        "INSERT INTO review_outputs "
        "(run_id, original_write_output_id, slug, category, original_markdown, "
        " reviewed_markdown, changes_json, changes_count, review_model, "
        " tokens_in, tokens_out, cost_usd, latency_ms, tier1_pass, "
        " tier2_warnings, status, error, attempts, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, '[]', 0, 'google/gemini-2.5-flash', "
        "        ?, ?, ?, ?, 1, '', 'ok', NULL, 1, ?)",
        (run_id, row["id"], slug, row["category"], row["markdown"],
         reviewed_md, tokens_in, tokens_out, cost, latency, now_iso()),
    )

    conn.execute(
        "UPDATE write_outputs SET status = 'reviewed' WHERE id = ?",
        (row["id"],),
    )
    conn.commit()
    conn.close()

    log(f"  Review done: {tokens_in}+{tokens_out} tokens, ${cost or 0:.4f}, {latency}ms")
    return True


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Run the full article pipeline on a single topic.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="Example:\n  python scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py "
               '"crispy baked falafel with tahini sauce" --category recipes',
    )
    p.add_argument("topic", help="Topic string, e.g. 'crispy baked falafel with tahini sauce'")
    p.add_argument("--category", required=True, choices=["recipes", "nutrition", "tips"])
    p.add_argument("--db", default=str(DEFAULT_DB))
    p.add_argument("--dry-run", action="store_true", help="Seed topic + write + review only, no images")
    p.add_argument("--skip-images", action="store_true", help="Skip hero + pin image generation (saves API cost)")
    p.add_argument("--skip-deploy", action="store_true", help="Stop before deploying to disk")
    p.add_argument("--model", default="google/gemini-2.5-flash")
    args = p.parse_args(argv)

    load_env()
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    fal_key = os.environ.get("FAL_KEY", "")
    if not api_key:
        log("ERROR: OPENROUTER_API_KEY not set")
        return 1
    if not fal_key and not args.dry_run and not args.skip_images:
        log("ERROR: FAL_KEY not set (needed for image generation)")
        return 1

    slug = slug_from_topic(args.topic)
    log(f"Pipeline start: '{args.topic}'")
    log(f"  slug:     {slug}")
    log(f"  category: {args.category}")
    log(f"  db:       {args.db}")
    log(f"  model:    {args.model}")
    print()

    py = sys.executable
    total_start = time.monotonic()

    # Stage 0: Seed topic
    rank = seed_topic(args.db, args.topic, args.category, slug)
    print()

    # Stage 1: Write article
    ok = run_step("Stage 1: Write Article", [
        py, str(SCRIPT_DIR / "write.py"),
        "--ranks", str(rank),
        "--model", args.model,
        "--db", args.db,
        "--max-attempts", "3",
    ], timeout=600)
    if not ok:
        log("PIPELINE FAILED at write stage")
        return 1
    print()

    # Stage 2: LLM Review
    ok = run_review(args.db, slug, api_key)
    if not ok:
        log("PIPELINE FAILED at review stage")
        return 1
    print()

    if args.dry_run:
        log("DRY RUN: stopping after write + review (no images, no deploy)")
        log(f"Total time: {time.monotonic() - total_start:.1f}s")
        return 0

    init_brief_schema(args.db)

    # Stage 3: Generate hero brief
    ok = run_step("Stage 3: Hero Brief", [
        py, str(SCRIPT_DIR / "generate_hero_brief.py"),
        "--slug", slug,
    ], timeout=120)
    if not ok:
        log("PIPELINE FAILED at hero brief stage")
        return 1
    print()

    # Stage 4: Generate pin briefs
    ok = run_step("Stage 4: Pin Briefs", [
        py, str(SCRIPT_DIR / "generate_pin_briefs.py"),
        "--slug", slug,
    ], timeout=180)
    if not ok:
        log("PIPELINE FAILED at pin briefs stage")
        return 1
    print()

    if not args.skip_images:
        # Stage 5: Generate hero image
        ok = run_step("Stage 5: Hero Image", [
            py, str(SCRIPT_DIR / "generate_images.py"),
            "--slug", slug,
        ], timeout=300)
        if not ok:
            log("PIPELINE FAILED at hero image stage")
            return 1
        print()

        # Stage 6: Generate pin images
        ok = run_step("Stage 6: Pin Images", [
            py, str(SCRIPT_DIR / "generate_pin_images.py"),
            "--slug", slug,
        ], timeout=600)
        if not ok:
            log("PIPELINE FAILED at pin images stage")
            return 1
        print()

    if not args.skip_deploy:
        # Stage 7: Deploy to disk
        ok = run_step("Stage 7: Deploy Article", [
            py, str(SCRIPT_DIR / "bulk_deploy_articles.py"),
            "--slug", slug,
            "--db", args.db,
        ], timeout=30)
        if not ok:
            log("PIPELINE FAILED at deploy stage")
            return 1
        print()

    total = time.monotonic() - total_start
    log("=" * 60)
    log(f"PIPELINE COMPLETE: {slug}")
    log(f"Total time: {total:.1f}s ({total/60:.1f}m)")
    log(f"Article: src/data/articles/{slug}.md")
    log(f"Hero:    public/images/{slug}-main.jpg")
    log(f"Pins:    public/images/pins/{{pin_slug}}.jpg (4 unique slugs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
