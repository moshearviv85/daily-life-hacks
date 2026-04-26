"""
1d-import-audience.py - Import Pinterest Audience Insights into pipeline.db

Imports audience interest affinities, demographics, and geo data
from Pinterest Analytics CSV export.
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

    # Create audience tables
    db.executescript("""
        CREATE TABLE IF NOT EXISTS audience_interests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            interest TEXT NOT NULL,
            percent_of_audience REAL,
            affinity REAL,
            imported_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS audience_demographics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dimension TEXT NOT NULL,      -- gender, age, country, metro, device
            value TEXT NOT NULL,
            percent_of_audience REAL,
            imported_at TEXT NOT NULL
        );
    """)

    # Check if already imported
    existing = db.execute("SELECT COUNT(*) FROM audience_interests").fetchone()[0]
    if existing:
        print("Audience data already imported. Delete tables to re-import.")
        return

    # --- Food & Drink interests (relevant to our site) ---
    food_interests = [
        ("Food and Drinks", "Meal Planning", 0.968, 1.294),
        ("Food and Drinks", "Desserts", 0.897, 1.228),
        ("Food and Drinks", "Appetizers", 0.766, 3.922),
        ("Food and Drinks", "Fruit", 0.710, 2.247),
        ("Food and Drinks", "Salad", 0.660, 7.604),
        ("Food and Drinks", "World Cuisine", 0.648, 2.465),
        ("Food and Drinks", "Special Diet", 0.565, 3.922),
        ("Food and Drinks", "Drinks", 0.553, 1.415),
        ("Food and Drinks", "Cooking Method", 0.472, 3.156),
        ("Food and Drinks", "Bread", 0.416, 4.897),
        ("Food and Drinks", "Meat", 0.414, 6.597),
        ("Food and Drinks", "Soup", 0.337, 8.558),
        ("Food and Drinks", "Snacks", 0.328, 2.455),
        ("Food and Drinks", "Seafood", 0.224, 6.356),
        ("Food and Drinks", "Condiments", 0.192, 7.899),
        ("Food and Drinks", "Sandwich", 0.191, 9.434),
        ("Food and Drinks", "Pizza", 0.180, 9.545),
        ("Food and Drinks", "Vegetables", 0.154, 6.034),
        ("Food and Drinks", "Food For Special Event", 0.112, 2.816),
        ("Food and Drinks", "Grain", 0.064, None),
        ("Food and Drinks", "Dairy", 0.062, None),
        ("Food and Drinks", "Beans", 0.021, None),
        ("Food and Drinks", "Frozen Food", 0.015, None),
        ("Food and Drinks", "Seasoning and Spice", 0.014, None),
        ("Food and Drinks", "Spread", 0.013, None),
    ]

    # Health interests
    health_interests = [
        ("Health", "Diet and Nutrition", 0.939, 1.476),
        ("Health", "Lifestyle", 0.232, 0.523),
        ("Health", "Medical", 0.189, 2.058),
        ("Health", "Weight Loss", 0.064, 1.461),
    ]

    # Other relevant categories (top-level only)
    other_interests = [
        ("Home Decor", "Home Decor", 0.895, 1.331),
        ("Beauty", "Beauty", 0.850, 1.433),
        ("Sport", "Fitness and Exercises", 0.586, 1.346),
        ("Gardening", "Gardening", 0.712, 1.722),
        ("Parenting", "Parenting", 0.670, 1.642),
        ("Finance", "Financial Planning", 0.052, 0.968),
    ]

    all_interests = food_interests + health_interests + other_interests
    for cat, interest, pct, affinity in all_interests:
        db.execute(
            "INSERT INTO audience_interests (category, interest, percent_of_audience, affinity, imported_at) VALUES (?, ?, ?, ?, ?)",
            (cat, interest, pct, affinity, now)
        )

    # --- Demographics ---
    demographics = [
        # Gender
        ("gender", "Female", 0.802),
        ("gender", "Male", 0.095),
        ("gender", "Unspecified", 0.103),
        # Age
        ("age", "18-24", 0.086),
        ("age", "25-34", 0.222),
        ("age", "35-44", 0.215),
        ("age", "45-49", 0.082),
        ("age", "50-54", 0.077),
        ("age", "55-64", 0.155),
        ("age", "65+", 0.148),
        # Country
        ("country", "United States", 0.545),
        ("country", "Canada", 0.114),
        ("country", "United Kingdom", 0.051),
        ("country", "Germany", 0.030),
        ("country", "Australia", 0.029),
        ("country", "India", 0.019),
        ("country", "Other", 0.169),
        # Metro
        ("metro", "Los Angeles", 0.043),
        ("metro", "New York", 0.040),
        ("metro", "Seattle-Tacoma", 0.029),
        ("metro", "Dallas-Ft. Worth", 0.029),
        ("metro", "Chicago", 0.024),
        ("metro", "Phoenix", 0.021),
        ("metro", "Denver", 0.019),
        ("metro", "Washington DC", 0.018),
        ("metro", "Minneapolis-St. Paul", 0.018),
        ("metro", "Portland OR", 0.017),
        # Device
        ("device", "iPhone", 0.636),
        ("device", "Web", 0.269),
        ("device", "Android Mobile", 0.244),
        ("device", "iPad", 0.188),
        ("device", "Mobile Web", 0.068),
        ("device", "Android Tablet", 0.034),
    ]

    for dim, value, pct in demographics:
        db.execute(
            "INSERT INTO audience_demographics (dimension, value, percent_of_audience, imported_at) VALUES (?, ?, ?, ?)",
            (dim, value, pct, now)
        )

    # --- Add insights based on audience data ---
    insights = [
        ("pattern", "Pinterest audience affinity is HIGHEST for Sandwich (9.4x), Pizza (9.5x), Soup (8.6x), Condiments (7.9x), Salad (7.6x) - these are underserved on our site", 1),
        ("pattern", "96.8% of audience interested in Meal Planning - confirms meal prep content is core strategy", 1),
        ("pattern", "Audience is 80% female, 25-44 core age group - content tone and topics should match", 2),
        ("gap", "Soup has 8.6x affinity but we have almost no soup recipes - huge opportunity", 1),
        ("gap", "Sandwich has 9.4x affinity - we have zero sandwich content", 1),
        ("gap", "Condiments/sauces have 7.9x affinity - homemade dressing/sauce recipes are a gap", 1),
        ("opportunity", "Special Diet interest (3.9x affinity) aligns perfectly with our high-fiber/gut-health positioning", 1),
        ("opportunity", "Bread has 4.9x affinity - healthy bread recipes (whole grain, high fiber) would perform well", 2),
        ("action", "Create soup recipes series - highest affinity food category (8.6x) with minimal existing content", 1),
        ("action", "Add healthy sandwich and wrap recipes - 9.4x affinity, zero current content", 1),
        ("action", "Create homemade condiment/sauce recipes - 7.9x affinity, pairs with meal prep content", 2),
    ]

    for itype, insight, priority in insights:
        db.execute(
            "INSERT INTO research_insights (insight_type, insight, priority, source, created_at) VALUES (?, ?, ?, ?, ?)",
            (itype, insight, priority, "pinterest_audience_2026-04-18", now)
        )

    db.commit()
    print(f"Imported {len(all_interests)} audience interests, {len(demographics)} demographics, {len(insights)} insights.")
    print(f"Database: {DB_PATH}")


if __name__ == "__main__":
    main()
