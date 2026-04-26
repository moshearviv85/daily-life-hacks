"""
1c-import-comet.py - Import Comet Reddit findings into pipeline.db
"""

import sys
import sqlite3
from pathlib import Path
from datetime import datetime

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DB_PATH = Path(__file__).resolve().parent.parent / "pipeline-data" / "pipeline.db"


def main():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    now = datetime.now().isoformat()

    existing = db.execute(
        "SELECT COUNT(*) FROM research_sources WHERE source_name='comet_reddit'"
    ).fetchone()[0]
    if existing:
        print("Comet Reddit data already imported.")
        return

    source_id = db.execute(
        "INSERT INTO research_sources (source_type, source_name, raw_file, imported_at) VALUES (?, ?, ?, ?)",
        ("reddit", "comet_reddit", "3.md", now)
    ).lastrowid

    topics = [
        ("Best health products that are ACTUALLY worth it?", "r/nutrition", "150", "health products worth it", "nutrition"),
        ("Any ideas for food goals for 2025?", "r/nutrition", "120", "food goals new year", "nutrition"),
        ("Next dietary guidelines 2025 - what can we expect?", "r/nutrition", "90", "dietary guidelines update", "nutrition"),
        ("Trying to avoid eating out in 2025 - ideas for car-friendly foods?", "r/EatCheapAndHealthy", "60", "car friendly healthy foods", "tips"),
        ("Trying to eat healthy on a cheap budget - what are your staple foods?", "r/EatCheapAndHealthy", "100", "cheap healthy staples", "nutrition"),
        ("Any ideas for simple ways to get more fiber in every meal?", "r/EatCheapAndHealthy", "80", "increase fiber intake", "nutrition"),
        ("What food keeps you sane on 1200 calories?", "r/1200isplenty", "100", "1200 calorie meal ideas", "recipes"),
    ]

    for topic, subreddit, engagement, keyword, cat in topics:
        db.execute(
            "INSERT INTO research_topics (source_id, topic, suggested_keyword, category, engagement, relevance, notes, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (source_id, topic, keyword, cat, engagement, "high", f"from {subreddit}", now)
        )

    db.commit()
    print(f"Imported {len(topics)} Comet Reddit topics.")

    # Now expand new keywords
    from importlib import import_module
    # Just run autocomplete expansion
    db.close()


if __name__ == "__main__":
    main()
