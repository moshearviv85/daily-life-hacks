import json
import os

TRACKER_FILE = "pipeline-data/content-tracker.json"
ARTICLES = [
    {"slug": "easy-one-pot-chicken-and-rice-dinner", "category": "recipes", "title": "Easy One-Pot Chicken and Rice Dinner"},
    {"slug": "healthy-turkey-meatballs-meal-prep", "category": "recipes", "title": "Healthy Turkey Meatballs for Meal Prep"},
    {"slug": "sheet-pan-salmon-and-vegetables-30-minutes", "category": "recipes", "title": "Sheet Pan Salmon and Vegetables in 30 Minutes"},
    {"slug": "easy-black-bean-tacos-weeknight-dinner", "category": "recipes", "title": "Easy Black Bean Tacos for Weeknight Dinner"},
    {"slug": "how-much-protein-do-you-need-per-day", "category": "nutrition", "title": "How Much Protein Do You Need Per Day?"},
    {"slug": "plant-based-protein-sources-complete-guide", "category": "nutrition", "title": "Plant-Based Protein Sources: A Complete Guide"},
    {"slug": "healthy-fats-list-foods-to-eat-daily", "category": "nutrition", "title": "Healthy Fats: A List of Foods to Eat Daily"},
    {"slug": "best-breakfast-foods-for-sustained-energy", "category": "nutrition", "title": "Best Breakfast Foods for Sustained Energy"},
    {"slug": "kitchen-tools-that-save-time-and-money", "category": "tips", "title": "Kitchen Tools That Save Time and Money"},
    {"slug": "how-to-use-leftover-rice-creative-ideas", "category": "tips", "title": "How to Use Leftover Rice: Creative Ideas"},
    {"slug": "how-to-cook-dried-beans-from-scratch", "category": "tips", "title": "How to Cook Dried Beans From Scratch"},
    {"slug": "how-to-season-cast-iron-skillet-properly", "category": "tips", "title": "How to Season a Cast Iron Skillet Properly"}
]

with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
    tracker = json.load(f)

existing_slugs = {item['slug'] for item in tracker}
max_id = max(item['id'] for item in tracker) if tracker else 100

added = 0
for article in ARTICLES:
    if article['slug'] not in existing_slugs:
        max_id += 1
        new_item = {
            "id": max_id,
            "category": article["category"],
            "keyword": article["title"].lower(),
            "pin_title": article["title"],
            "description": f"Practical tips and recipes for {article['title'].lower()}.",
            "hashtags": ["DailyLifeHacks", article["category"].capitalize()],
            "alt_text": f"{article['title']} - practical guide",
            "slug": article["slug"],
            "status": "article_written",
            "date_created": "",
            "draft_path": f"src/data/articles/{article['slug']}.md",
            "validated_path": f"src/data/articles/{article['slug']}.md",
            "image_web": f"/images/{article['slug']}-main.jpg",
            "image_pins": [
                f"public/images/pins/{article['slug']}_v1.jpg",
                f"public/images/pins/{article['slug']}_v2.jpg",
                f"public/images/pins/{article['slug']}_v3.jpg",
                f"public/images/pins/{article['slug']}_v4.jpg"
            ],
            "published": True,
            "deployed": False,
            "qc_notes": ""
        }
        tracker.append(new_item)
        added += 1

with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
    json.dump(tracker, f, indent=2, ensure_ascii=False)

print(f"Added {added} articles to tracker.")
