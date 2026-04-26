"""
1-research.py - Keyword Research & Competitor Analysis Pipeline

Reads raw research data (Reddit questions, competitor analysis, Pinterest trends),
expands keywords via Google Autocomplete, and stores everything in SQLite.

Usage:
    python scripts/1-research.py process          # Process all raw research files
    python scripts/1-research.py expand            # Expand keywords via Google Autocomplete
    python scripts/1-research.py report            # Print summary report
    python scripts/1-research.py all               # Run all steps
"""

import sys
import os
import csv
import json
import re
import sqlite3
import time
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# --- Paths ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "pipeline-data" / "pipeline.db"
RAW_DIR = PROJECT_ROOT / "pipeline-data" / "research-raw"

# --- Database Setup ---

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    init_tables(db)
    return db


def init_tables(db):
    db.executescript("""
        CREATE TABLE IF NOT EXISTS research_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_type TEXT NOT NULL,       -- reddit, competitor, pinterest_trend
            source_name TEXT,                -- subreddit name, site name, trend category
            raw_file TEXT,                   -- original filename
            imported_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS research_topics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER REFERENCES research_sources(id),
            topic TEXT NOT NULL,
            suggested_keyword TEXT,
            category TEXT,                   -- nutrition, recipes, tips
            engagement TEXT,                 -- upvotes/comments for reddit
            direction TEXT,                  -- rising/stable/declining for trends
            relevance TEXT,                  -- high/medium/low
            notes TEXT,
            imported_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS research_competitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER REFERENCES research_sources(id),
            site TEXT NOT NULL,
            top_topics TEXT,
            content_gaps TEXT,
            opportunity TEXT,
            imported_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS research_keywords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seed_keyword TEXT NOT NULL,
            expanded_keyword TEXT NOT NULL,
            source TEXT,                     -- autocomplete, reddit, pinterest
            category TEXT,
            expanded_at TEXT NOT NULL,
            UNIQUE(seed_keyword, expanded_keyword)
        );

        CREATE TABLE IF NOT EXISTS research_insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            insight_type TEXT NOT NULL,      -- pattern, gap, opportunity, action
            insight TEXT NOT NULL,
            priority INTEGER DEFAULT 3,     -- 1=highest, 5=lowest
            source TEXT,
            created_at TEXT NOT NULL
        );
    """)
    db.commit()


# --- Import Functions ---

def import_reddit(db):
    """Import Reddit questions from raw data."""
    reddit_data = [
        ("What are easy healthy snacks to keep at my desk at work?", "r/HealthyFood", "780", "healthy office snacks"),
        ("What are the best quick meals to cook when you're exhausted?", "r/Cooking", "760", "quick healthy meals"),
        ("Which frozen veggies and fruits are worth buying for cheap healthy eating?", "r/EatCheapAndHealthy", "740", "best frozen produce"),
        ("Is it okay to eat the same meals every day if they're balanced?", "r/nutrition", "720", "eat same meals every day"),
        ("What are some high-protein desserts that still fit my calories?", "r/fitmeals", "700", "high protein dessert ideas"),
        ("What are good prep-ahead breakfasts I can grab and go?", "r/MealPrepSunday", "680", "grab and go breakfast prep"),
        ("How do I handle social events and eating out while sticking to 1200-1500 calories?", "r/1200isplenty", "660", "eating out on low calories"),
        ("How can I make my salads more filling and less boring?", "r/HealthyFood", "640", "make salads more filling"),
        ("How do I transition from takeout all the time to mostly home-cooked meals?", "r/Cooking", "620", "transition to home cooking"),
    ]

    now = datetime.now().isoformat()

    # Check if already imported
    existing = db.execute("SELECT COUNT(*) FROM research_sources WHERE source_type='reddit'").fetchone()[0]
    if existing:
        print("  Reddit data already imported, skipping.")
        return

    source_id = db.execute(
        "INSERT INTO research_sources (source_type, source_name, raw_file, imported_at) VALUES (?, ?, ?, ?)",
        ("reddit", "multiple_subreddits", "inline_data", now)
    ).lastrowid

    for topic, subreddit, engagement, keyword in reddit_data:
        # Guess category from keyword
        cat = guess_category(keyword)
        db.execute(
            "INSERT INTO research_topics (source_id, topic, suggested_keyword, category, engagement, relevance, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (source_id, topic, keyword, cat, engagement, "high", now)
        )

    db.commit()
    print(f"  Imported {len(reddit_data)} Reddit topics.")


def import_competitors(db):
    """Import competitor analysis from CSV."""
    csv_path = RAW_DIR / "competitors.csv"
    if not csv_path.exists():
        print(f"  File not found: {csv_path}")
        return

    existing = db.execute("SELECT COUNT(*) FROM research_sources WHERE source_type='competitor'").fetchone()[0]
    if existing:
        print("  Competitor data already imported, skipping.")
        return

    now = datetime.now().isoformat()
    source_id = db.execute(
        "INSERT INTO research_sources (source_type, source_name, raw_file, imported_at) VALUES (?, ?, ?, ?)",
        ("competitor", "top_5_sites", "competitors.csv", now)
    ).lastrowid

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            site = row.get("site", "").strip()
            if not site:
                continue
            db.execute(
                "INSERT INTO research_competitors (source_id, site, top_topics, content_gaps, opportunity, imported_at) VALUES (?, ?, ?, ?, ?, ?)",
                (source_id, site, row.get("top_topics (from homepage)", ""),
                 row.get("content_gaps (weak/less surfaced)", ""),
                 row.get("opportunity_for_us (given your focus)", ""), now)
            )
            count += 1

    db.commit()
    print(f"  Imported {count} competitor analyses.")


def import_pinterest_trends(db):
    """Import Pinterest trends from CSV files."""
    trend_files = [
        ("pinterest-trends-now.csv", "pinterest_now"),
        ("pinterest-trends-seasonal.csv", "pinterest_seasonal"),
        ("pinterest-trends-recipes.csv", "pinterest_recipes"),
    ]

    now = datetime.now().isoformat()

    for filename, source_name in trend_files:
        csv_path = RAW_DIR / filename
        if not csv_path.exists():
            print(f"  File not found: {csv_path}")
            continue

        existing = db.execute(
            "SELECT COUNT(*) FROM research_sources WHERE source_type='pinterest_trend' AND source_name=?",
            (source_name,)
        ).fetchone()[0]
        if existing:
            print(f"  {filename} already imported, skipping.")
            continue

        source_id = db.execute(
            "INSERT INTO research_sources (source_type, source_name, raw_file, imported_at) VALUES (?, ?, ?, ?)",
            ("pinterest_trend", source_name, filename, now)
        ).lastrowid

        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                # Handle varying column names across the 3 files
                trend = (row.get("trend") or row.get("trend (2-3 month horizon)")
                         or row.get("trend / recipe type")
                         or row.get("trend (2\u20133 month horizon)", "")).strip()
                if not trend:
                    # Try first column
                    first_key = list(row.keys())[0] if row else None
                    trend = row.get(first_key, "").strip() if first_key else ""
                if not trend:
                    continue

                category = row.get("category", "").strip()
                direction = row.get("direction", "").strip()
                relevance = row.get("relevance_to_healthy_food_blog", "").strip()

                db.execute(
                    "INSERT INTO research_topics (source_id, topic, suggested_keyword, category, direction, relevance, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (source_id, trend, trend.lower(), guess_category(trend), direction, relevance, now)
                )
                count += 1

        db.commit()
        print(f"  Imported {count} trends from {filename}.")


def guess_category(text):
    """Guess category from keyword text."""
    text = text.lower()
    recipe_signals = ["recipe", "meal", "cook", "breakfast", "dinner", "lunch", "soup",
                      "salad", "snack", "dessert", "prep", "bowl", "shot", "drink",
                      "mocktail", "yogurt", "board", "stew", "mains"]
    tip_signals = ["how to", "how do", "tips", "transition", "handle", "budget",
                   "basics", "beginner", "store", "save", "waste"]

    for s in recipe_signals:
        if s in text:
            return "recipes"
    for s in tip_signals:
        if s in text:
            return "tips"
    return "nutrition"


# --- Google Autocomplete Expansion ---

def google_autocomplete(query):
    """Get Google Autocomplete suggestions for a query."""
    url = "https://suggestqueries.google.com/complete/search"
    params = urllib.parse.urlencode({
        "client": "firefox",
        "q": query,
        "hl": "en",
        "gl": "us"
    })
    full_url = f"{url}?{params}"

    req = urllib.request.Request(full_url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    })

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data[1] if len(data) > 1 else []
    except Exception as e:
        print(f"    Autocomplete failed for '{query}': {e}")
        return []


def clean_keyword(kw):
    """Clean a keyword for autocomplete: remove parenthetical examples, fix unicode."""
    # Remove parenthetical parts like "(e.g., frozen yogurt bowls)"
    kw = re.sub(r'\s*\(.*?\)', '', kw)
    # Replace unicode dashes/quotes with ASCII
    kw = kw.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-')
    kw = kw.replace('\u201c', '"').replace('\u201d', '"')
    kw = kw.replace('\u2018', "'").replace('\u2019', "'")
    # Remove quotes
    kw = kw.replace('"', '').replace("'", '')
    # Clean extra spaces
    kw = re.sub(r'\s+', ' ', kw).strip()
    return kw


def expand_keywords(db):
    """Expand all seed keywords via Google Autocomplete."""
    # Get all unique suggested keywords
    rows = db.execute("""
        SELECT DISTINCT suggested_keyword FROM research_topics
        WHERE suggested_keyword IS NOT NULL AND suggested_keyword != ''
    """).fetchall()

    seeds = [clean_keyword(row["suggested_keyword"]) for row in rows]
    # Remove empty/duplicate after cleaning
    seeds = list(dict.fromkeys(s for s in seeds if s and len(s) > 3))
    print(f"  Found {len(seeds)} seed keywords to expand.")

    now = datetime.now().isoformat()
    total_new = 0

    for i, seed in enumerate(seeds):
        # Check if already expanded
        existing = db.execute(
            "SELECT COUNT(*) FROM research_keywords WHERE seed_keyword=?", (seed,)
        ).fetchone()[0]
        if existing:
            continue

        suggestions = google_autocomplete(seed)
        for suggestion in suggestions:
            suggestion = suggestion.strip()
            if not suggestion or suggestion.lower() == seed.lower():
                continue
            try:
                db.execute(
                    "INSERT OR IGNORE INTO research_keywords (seed_keyword, expanded_keyword, source, category, expanded_at) VALUES (?, ?, ?, ?, ?)",
                    (seed, suggestion, "google_autocomplete", guess_category(suggestion), now)
                )
                total_new += 1
            except sqlite3.IntegrityError:
                pass

        db.commit()
        print(f"    [{i+1}/{len(seeds)}] '{seed}' -> {len(suggestions)} suggestions")

        # Rate limiting
        time.sleep(1.5)

    print(f"  Added {total_new} expanded keywords.")


# --- Report ---

def print_report(db):
    """Print a summary report of all research data."""
    print("\n" + "=" * 60)
    print("  RESEARCH REPORT")
    print("=" * 60)

    # Sources
    sources = db.execute("SELECT source_type, COUNT(*) as cnt FROM research_sources GROUP BY source_type").fetchall()
    print(f"\n--- Sources ---")
    for s in sources:
        print(f"  {s['source_type']}: {s['cnt']}")

    # Topics by category
    topics = db.execute("""
        SELECT category, COUNT(*) as cnt FROM research_topics
        GROUP BY category ORDER BY cnt DESC
    """).fetchall()
    print(f"\n--- Topics by Category ---")
    for t in topics:
        print(f"  {t['category']}: {t['cnt']}")

    # Top Reddit topics
    reddit = db.execute("""
        SELECT topic, suggested_keyword, engagement FROM research_topics
        WHERE source_id IN (SELECT id FROM research_sources WHERE source_type='reddit')
        ORDER BY CAST(engagement AS INTEGER) DESC LIMIT 10
    """).fetchall()
    if reddit:
        print(f"\n--- Top Reddit Questions ---")
        for r in reddit:
            print(f"  [{r['engagement']}] {r['suggested_keyword']}")

    # Pinterest trends (high relevance only)
    trends = db.execute("""
        SELECT topic, direction, relevance FROM research_topics
        WHERE source_id IN (SELECT id FROM research_sources WHERE source_type='pinterest_trend')
        AND relevance='high'
    """).fetchall()
    if trends:
        print(f"\n--- Pinterest Trends (High Relevance) ---")
        for t in trends:
            print(f"  [{t['direction']}] {t['topic']}")

    # Competitor opportunities
    competitors = db.execute("SELECT site, opportunity FROM research_competitors").fetchall()
    if competitors:
        print(f"\n--- Competitor Opportunities ---")
        for c in competitors:
            opp = c['opportunity'][:100] + "..." if len(c['opportunity']) > 100 else c['opportunity']
            print(f"  {c['site']}: {opp}")

    # Keywords
    kw_count = db.execute("SELECT COUNT(*) FROM research_keywords").fetchone()[0]
    seed_count = db.execute("SELECT COUNT(DISTINCT seed_keyword) FROM research_keywords").fetchone()[0]
    print(f"\n--- Keywords ---")
    print(f"  {seed_count} seeds expanded to {kw_count} total keywords")

    # Top expanded keywords by seed
    top_seeds = db.execute("""
        SELECT seed_keyword, COUNT(*) as cnt FROM research_keywords
        GROUP BY seed_keyword ORDER BY cnt DESC LIMIT 10
    """).fetchall()
    if top_seeds:
        print(f"\n--- Most Expandable Seeds ---")
        for s in top_seeds:
            print(f"  '{s['seed_keyword']}' -> {s['cnt']} expansions")

    print("\n" + "=" * 60)
    print(f"  Database: {DB_PATH}")
    print("=" * 60 + "\n")


# --- Main ---

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1].lower()
    db = get_db()

    if command in ("process", "all"):
        print("\n[1/3] Importing raw research data...")
        import_reddit(db)
        import_competitors(db)
        import_pinterest_trends(db)

    if command in ("expand", "all"):
        print("\n[2/3] Expanding keywords via Google Autocomplete...")
        expand_keywords(db)

    if command in ("report", "all"):
        print("\n[3/3] Generating report...")
        print_report(db)

    if command not in ("process", "expand", "report", "all"):
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)

    db.close()


if __name__ == "__main__":
    main()
