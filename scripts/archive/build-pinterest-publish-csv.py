"""
Build a Publer-format Pinterest CSV based on the REAL Pinterest audit.
Only includes articles NOT yet on Pinterest, with pin images on disk.
Schedules 5 pins/day starting today, US active hours.

For image-level dedupe against live Pinterest, run first:
  python scripts/pinterest-dedupe-publish.py
That overwrites pinterest-publish-queue.csv using the API.
"""

import json, csv, re
from datetime import datetime, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

# --- 1. Load the real Pinterest audit (source of truth) ---

audit = json.loads((BASE / "pipeline-data" / "pinterest-clean-audit.json").read_text(encoding="utf-8"))
already_on_pinterest = set(audit["published_on_pinterest"])
not_on_pinterest = audit["not_on_pinterest_with_images"]

print(f"Already on Pinterest: {len(already_on_pinterest)} articles")
print(f"NOT on Pinterest (with images): {len(not_on_pinterest)} articles")

# --- 2. Build pin data for each candidate ---

articles_dir = BASE / "src" / "data" / "articles"
pins_dir = BASE / "public" / "images" / "pins"

pins_json_data = json.loads((BASE / "pipeline-data" / "pins.json").read_text(encoding="utf-8"))
pins_by_slug = {}
for p in pins_json_data:
    pins_by_slug[p["slug"]] = p

def get_frontmatter(slug):
    path = articles_dir / f"{slug}.md"
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8")
    fm = {}
    in_fm = False
    for line in text.split("\n"):
        if line.strip() == "---":
            if in_fm:
                break
            in_fm = True
            continue
        if in_fm and ":" in line:
            key = line.split(":")[0].strip()
            val = line.split(":", 1)[1].strip().strip('"').strip("'")
            fm[key] = val
    return fm

def get_variants(slug):
    files = sorted(pins_dir.glob(f"{slug}_v*.jpg"))
    variants = []
    for f in files:
        m = re.match(r".+_v(\d+)\.jpg", f.name)
        if m:
            variants.append(int(m.group(1)))
    return variants

BOARD_MAP = {
    "recipes": "High Fiber Dinner and Gut Health Recipes",
    "nutrition": "Gut Health Tips and Nutrition Charts",
    "tips": "Healthy Breakfast, Smoothies and Snacks",
}

# --- 3. Build pin rows ---

pin_rows = []

for slug in sorted(not_on_pinterest):
    variants = get_variants(slug)
    if not variants:
        continue

    pin_data = pins_by_slug.get(slug)
    fm = get_frontmatter(slug)
    title = fm.get("title", slug.replace("-", " ").title())
    excerpt = fm.get("excerpt", "")
    category = fm.get("category", "tips")
    board = BOARD_MAP.get(category, "Healthy Breakfast, Smoothies and Snacks")
    alt_base = fm.get("imageAlt", f"{title} - healthy food photo")

    for v in variants:
        if pin_data and v == 1:
            pt = pin_data.get("pin_title", title)
            desc = pin_data.get("description", excerpt)
            alt = pin_data.get("alt_text", alt_base)
        else:
            pt = title
            if excerpt:
                cat_tags = {
                    "recipes": "#HealthyRecipes #EasyMeals #MealPrep #HealthyEating",
                    "nutrition": "#NutritionTips #HealthyEating #WellnessJourney #FoodFacts",
                    "tips": "#KitchenHacks #CookingTips #FoodStorage #KitchenTips",
                }
                tags = pin_data.get("hashtags", cat_tags.get(category, "")) if pin_data else cat_tags.get(category, "")
                desc = f"{excerpt} {tags}"
            else:
                desc = f"{title}. Find out more on Daily Life Hacks."
            alt = alt_base

        image_url = f"https://www.daily-life-hacks.com/images/pins/{slug}_v{v}.jpg"
        link = f"https://www.daily-life-hacks.com/{slug}"

        pin_rows.append({
            "slug": slug,
            "variant": v,
            "title": pt,
            "text": desc,
            "link": link,
            "media_url": image_url,
            "alt_text": alt,
            "board": board,
        })

print(f"Total pin rows to schedule: {len(pin_rows)}")

# --- 4. Schedule: 5 pins/day, US active hours ---

US_TIMES = ["08:15", "10:45", "13:15", "16:00", "19:30"]

start_date = datetime(2026, 4, 5)
day_offset = 0
slot = 0

for row in pin_rows:
    date = start_date + timedelta(days=day_offset)
    time_str = US_TIMES[slot]
    row["date"] = f"{date.strftime('%Y-%m-%d')} {time_str}"
    slot += 1
    if slot >= 5:
        slot = 0
        day_offset += 1

last_date = (start_date + timedelta(days=day_offset)).strftime("%Y-%m-%d")
print(f"Schedule: {start_date.strftime('%Y-%m-%d')} to {last_date} ({day_offset + 1} days)")

# --- 5. Write Publer-format CSV ---

output_path = BASE / "pipeline-data" / "pinterest-publish-queue.csv"
headers = [
    "Date - Intl. format or prompt",
    "Text",
    "Link(s) - Separated by comma for FB carousels",
    "Media URL(s) - Separated by comma",
    "Title - For the video, pin, PDF ..",
    "Label(s) - Separated by comma",
    "Alt text(s) - Separated by ||",
    "Comment(s) - Separated by ||",
    "Pin board, FB album, or Google category",
    "Post subtype - I.e. story, reel, PDF ..",
    "CTA - For Facebook links or Google",
    "Reminder - For stories, reels, shorts, and TikToks",
]

with open(output_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f, quoting=csv.QUOTE_ALL)
    writer.writerow(headers)
    for row in pin_rows:
        writer.writerow([
            row["date"],
            row["text"],
            row["link"],
            row["media_url"],
            row["title"],
            "",
            row["alt_text"],
            "",
            row["board"],
            "",
            "",
            "",
        ])

print(f"\nWritten: {output_path}")
print(f"Total rows: {len(pin_rows)}")

# --- 6. Summary ---

articles_in_csv = sorted(set(r["slug"] for r in pin_rows))
print(f"Articles in CSV: {len(articles_in_csv)}")
for s in articles_in_csv:
    count = sum(1 for r in pin_rows if r["slug"] == s)
    print(f"  {s} ({count} pins)")
