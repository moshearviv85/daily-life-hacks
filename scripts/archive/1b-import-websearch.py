"""
1b-import-websearch.py - Import WebSearch research findings into pipeline.db

One-time script to add findings from WebSearch research (Reddit, trends, niches).
"""

import sys
import sqlite3
from pathlib import Path
from datetime import datetime

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DB_PATH = Path(__file__).resolve().parent.parent / "pipeline-data" / "pipeline.db"


def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def main():
    db = get_db()
    now = datetime.now().isoformat()

    # Check if already imported
    existing = db.execute(
        "SELECT COUNT(*) FROM research_sources WHERE source_name='websearch_deep_research'"
    ).fetchone()[0]
    if existing:
        print("WebSearch data already imported. Delete source to re-import.")
        return

    # --- Source ---
    source_id = db.execute(
        "INSERT INTO research_sources (source_type, source_name, raw_file, imported_at) VALUES (?, ?, ?, ?)",
        ("websearch", "websearch_deep_research", "1b-import-websearch.py", now)
    ).lastrowid

    # --- Reddit topics (from WebSearch findings) ---
    reddit_topics = [
        # r/EatCheapAndHealthy popular topics
        ("Canned beans and frozen veggies chili that lasts a week", "budget chili recipe", "recipes", "high"),
        ("Rotisserie chicken shredded for tortillas and salads", "leftover rotisserie chicken meals", "recipes", "high"),
        ("Lentils with pasta for filling budget meals", "lentil pasta recipe", "recipes", "high"),
        ("Fried rice with eggs frozen veggies and various sauces", "easy fried rice recipe", "recipes", "high"),
        ("Sheet pan chicken sausage broccoli sweet potatoes", "sheet pan dinner recipes", "recipes", "high"),
        ("What is your actual go-to easy dinner?", "easy weeknight dinners", "recipes", "high"),
        # r/MealPrepSunday popular topics
        ("Grilled chicken with rice and veggies meal prep", "chicken rice meal prep", "recipes", "high"),
        ("Beef stew over rice meal prep", "beef stew meal prep", "recipes", "medium"),
        ("Southwest burrito bowls meal prep", "burrito bowl meal prep", "recipes", "high"),
        ("Overnight oats beginner meal prep", "overnight oats meal prep", "recipes", "high"),
        ("Rotating low calorie sauces for meal prep variety", "meal prep sauces", "tips", "medium"),
        # r/loseit / r/volumeeating
        ("Hidden calories in healthy packaged foods", "hidden calories healthy food", "nutrition", "high"),
        ("Macro tracking app accuracy problems", "macro tracking tips", "tips", "medium"),
        ("Homemade food calorie estimation challenges", "calorie counting homemade meals", "tips", "medium"),
        # r/Cooking beginners
        ("How do I properly sear meat?", "how to sear meat", "tips", "high"),
        ("Why didn't my sauce thicken?", "how to thicken sauce", "tips", "high"),
    ]

    for topic, keyword, cat, relevance in reddit_topics:
        db.execute(
            "INSERT INTO research_topics (source_id, topic, suggested_keyword, category, relevance, imported_at) VALUES (?, ?, ?, ?, ?, ?)",
            (source_id, topic, keyword, cat, relevance, now)
        )

    # --- 2026 Trend Topics ---
    trend_topics = [
        # Fibermaxxing
        ("Fibermaxxing - deliberately increasing daily fiber to 25-38g+", "fibermaxxing recipes", "nutrition", "rising", "high"),
        ("Fiber triggers natural GLP-1 appetite suppression", "fiber glp-1 weight loss", "nutrition", "rising", "high"),
        ("7-day fibermaxxing meal plan with fiber counts", "high fiber meal plan", "nutrition", "rising", "high"),
        ("Fiber diversity - variety of fiber sources not just volume", "fiber diversity foods", "nutrition", "rising", "high"),
        # Volume eating
        ("Volume eating - high volume low calorie meals for fullness", "volume eating recipes", "recipes", "rising", "high"),
        ("Cruciferous vegetables for volume eating", "low calorie high volume vegetables", "nutrition", "rising", "high"),
        # Functional foods
        ("Gut health fermented foods kimchi pickled onions yogurt", "gut health fermented foods", "nutrition", "rising", "high"),
        ("Mood boosting foods dark chocolate adaptogens", "mood boosting foods", "nutrition", "rising", "medium"),
        ("Brain health foods blueberries matcha turmeric", "brain health foods", "nutrition", "rising", "medium"),
        # Trending recipe formats
        ("Leftover makeovers - rebuild leftovers into new dishes", "leftover makeover recipes", "recipes", "rising", "high"),
        ("High protein snacks that feel like treats", "high protein snacks", "recipes", "rising", "high"),
        ("Root to stem zero waste cooking", "zero waste cooking tips", "tips", "rising", "high"),
        ("Pantry staple meals using canned and shelf stable foods", "pantry staple meals", "recipes", "rising", "high"),
        ("Protein focused satisfying meals fitness friendly", "high protein meals", "recipes", "rising", "high"),
        # Low competition niches
        ("Meal prep with specific calorie counts and structured data", "calorie counted meal prep", "recipes", "rising", "high"),
        ("Seasonal content calendar - back to school meal prep in July", "seasonal meal prep", "tips", "rising", "medium"),
        ("Gut healthy on a budget - fiber rich affordable meals", "gut healthy budget meals", "recipes", "rising", "high"),
    ]

    for topic, keyword, cat, direction, relevance in trend_topics:
        db.execute(
            "INSERT INTO research_topics (source_id, topic, suggested_keyword, category, direction, relevance, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (source_id, topic, keyword, cat, direction, relevance, now)
        )

    # --- Insights ---
    insights = [
        ("pattern", "Fibermaxxing is THE #1 wellness trend of 2026 - our site is perfectly positioned with existing high-fiber content", 1),
        ("pattern", "Volume eating (high volume low calorie) is surging - overlaps perfectly with our fiber/gut health focus", 1),
        ("pattern", "Protein remains king in 2026 - high protein + high fiber combo is underserved niche", 1),
        ("gap", "Most competitors frame fiber around blood sugar/weight only - we can own the gut health + microbiome angle", 2),
        ("gap", "Budget-friendly gut health content is a gap - Budget Bytes does budget, EatingWell does gut, nobody does both well", 1),
        ("gap", "Zero waste / leftover makeover recipes with a health angle - trending on Pinterest, few quality blogs cover it", 2),
        ("opportunity", "Seasonal content: summer salads are up 1000% on Pinterest RIGHT NOW - publish immediately", 1),
        ("opportunity", "Cabbage crush trend on Pinterest - fermented cabbage, cabbage dumplings - fits our gut health niche perfectly", 2),
        ("opportunity", "Volume eating content attracts r/loseit and r/volumeeating audiences (2.8M+ combined members)", 2),
        ("opportunity", "Functional shots (ginger-lemon-turmeric) up 300% on Pinterest - simple recipe content, high search volume", 2),
        ("action", "Create a fibermaxxing content series - meal plans, recipes, fiber counting guides", 1),
        ("action", "Publish summer salad recipes ASAP - seasonal trend peaking now", 1),
        ("action", "Add fiber counts to all existing recipes - unique differentiator", 2),
        ("action", "Build gut-healthy-on-a-budget angle - combines Budget Bytes appeal with our expertise", 2),
        ("action", "Create leftover makeover recipe series - trending + low competition", 3),
        ("action", "Target volume eating keywords - underserved in healthy food blog space", 2),
    ]

    for itype, insight, priority in insights:
        db.execute(
            "INSERT INTO research_insights (insight_type, insight, priority, source, created_at) VALUES (?, ?, ?, ?, ?)",
            (itype, insight, priority, "websearch_2026-04-20", now)
        )

    db.commit()
    print(f"Imported {len(reddit_topics)} Reddit topics, {len(trend_topics)} trend topics, {len(insights)} insights.")
    print(f"Database: {DB_PATH}")


if __name__ == "__main__":
    main()
