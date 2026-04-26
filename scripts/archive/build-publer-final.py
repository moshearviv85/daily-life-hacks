import argparse
import csv
import json
import os
import random
import re
from datetime import datetime, timedelta


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY_PATH = os.path.join(BASE_DIR, "pipeline-data", "content-registry.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "pipeline-data", "pins-publer-final.generated.csv")

HEADERS = [
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

DEFAULT_WINDOWS = [
    ((9, 5), (10, 20)),
    ((10, 45), (12, 0)),
    ((12, 30), (13, 50)),
    ((14, 20), (15, 45)),
    ((16, 10), (17, 40)),
]


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_csv(path, rows):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)
    os.replace(tmp_path, path)


def clean_whitespace(value):
    return " ".join((value or "").replace("\r", " ").replace("\n", " ").split())


def strip_title_prefix(image_alt):
    cleaned = clean_whitespace(image_alt)
    parts = re.split(r"\s[-–—]\s", cleaned, maxsplit=1)
    if len(parts) == 2:
        return parts[1].strip()
    return cleaned


def is_generic_alt(text):
    generic_patterns = [
        "healthy tips tips",
        "healthy nutrition tips",
        "natural nutrition",
        "natural digestive relief",
        "healthy weight management",
        "healthy snacking",
        "healthy morning",
        "for natural nutrition",
        "for digestive comfort",
    ]
    lowered = text.lower()
    return any(pattern in lowered for pattern in generic_patterns)


def title_to_visual_alt(title, category):
    lowered = title.lower()

    rules = [
        (["meal plan", "challenge"], "Weekly meal planner surrounded by fresh produce, simple recipes, and notes for daily meals"),
        (["tea", "peppermint", "ginger"], "Warm herbal tea with ginger and mint in a simple glass mug on a kitchen surface"),
        (["muffin"], "Golden bran muffins with raisins arranged on a tray beside oats and honey"),
        (["soup"], "Hearty vegetable soup in a rustic bowl with visible cabbage, beans, and herbs"),
        (["salad", "tabbouleh"], "Fresh salad bowl with chopped herbs, grains, and vegetables on a bright table"),
        (["parfait", "breakfast"], "Breakfast glass layered with yogurt, berries, and crunchy toppings"),
        (["smoothie"], "Colorful smoothie glasses with fruit and greens arranged on a bright counter"),
        (["hummus"], "Creamy hummus in a shallow bowl with vegetables and chickpeas nearby"),
        (["pizza"], "Cauliflower pizza crust topped with vegetables and sliced on a baking tray"),
        (["stir fry"], "Pan of colorful stir-fry vegetables with steam rising during cooking"),
        (["artichoke"], "Steamed artichoke served with lemon and a small dipping sauce on a plate"),
        (["avocado"], "Whole and halved avocados stored on a kitchen counter with wrap and containers nearby"),
        (["herbs"], "Fresh herbs wrapped and stored neatly in jars and containers on a kitchen counter"),
        (["lettuce", "greens"], "Wilted and refreshed leafy greens beside a bowl of cold water on a counter"),
        (["bananas", "smoothies"], "Sliced bananas arranged on a tray or in freezer bags ready for smoothies"),
        (["kitchen", "organize"], "Small kitchen shelves and containers arranged neatly to save space"),
        (["meal prep"], "Glass meal prep containers lined up with grains, vegetables, and ready-to-eat meals"),
        (["grocery", "shopping"], "Groceries, handwritten list, and pantry staples spread across a kitchen table"),
        (["bread"], "Loaf of bread sliced on a board with storage bag or bread box nearby"),
        (["water and fiber"], "Glass of water with fiber-rich foods like oats, fruit, and seeds arranged nearby"),
        (["fast food"], "Takeout-style meal with a balanced mix of grains, vegetables, and toppings on a tray"),
        (["popcorn"], "Bowl of popcorn with small seasoning bowls arranged for a snack setup"),
        (["pasta"], "Cooked pasta served side by side with whole wheat and white pasta for a simple comparison"),
    ]

    for keywords, description in rules:
        if any(keyword in lowered for keyword in keywords):
            return description

    if category == "tips":
        return "Kitchen scene with food storage tools, labeled containers, and organized ingredients on a counter"
    if category == "recipes":
        return "Finished homemade dish plated with visible ingredients on a clean kitchen surface"
    return "Food comparison or ingredient layout arranged clearly on a bright kitchen surface"


def build_alt_text(article, variant):
    base_alt = strip_title_prefix(article.get("image_alt", ""))
    if base_alt and not is_generic_alt(base_alt):
        return base_alt
    return title_to_visual_alt(variant["title"], article["category"])


def random_daily_slots(day_seed, windows):
    rng = random.Random(day_seed)
    slots = []
    for start, end in windows:
        start_minutes = (start[0] * 60) + start[1]
        end_minutes = (end[0] * 60) + end[1]
        minute_of_day = rng.randint(start_minutes, end_minutes)
        slots.append(f"{minute_of_day // 60:02d}:{minute_of_day % 60:02d}")
    return sorted(slots)


def schedule_rows(rows, start_date, windows):
    scheduled = []
    day_offset = 0
    slot_index = 0
    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    daily_slots = random_daily_slots(f"{start_date}:{day_offset}", windows)

    for row in rows:
        slot = daily_slots[slot_index]
        timestamp = (current_date + timedelta(days=day_offset)).strftime(f"%Y-%m-%d {slot}")
        scheduled_row = dict(row)
        scheduled_row["Date - Intl. format or prompt"] = timestamp
        scheduled.append(scheduled_row)

        slot_index += 1
        if slot_index >= len(daily_slots):
            slot_index = 0
            day_offset += 1
            daily_slots = random_daily_slots(f"{start_date}:{day_offset}", windows)

    return scheduled


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-date", default=datetime.now().strftime("%Y-%m-%d"))
    args = parser.parse_args()

    registry = load_json(REGISTRY_PATH)
    rows = []

    for base_slug, article_wrapper in registry["articles"].items():
        article = article_wrapper["article"]
        for variant_id, variant in article_wrapper["variants"].items():
            if not variant["publish_ready"]:
                continue

            rows.append({
                "Date - Intl. format or prompt": "",
                "Text": variant["description"] or article["excerpt"],
                "Link(s) - Separated by comma for FB carousels": variant["destination_url"],
                "Media URL(s) - Separated by comma": f"https://www.daily-life-hacks.com{variant['pin_image']}",
                "Title - For the video, pin, PDF ..": variant["title"],
                "Label(s) - Separated by comma": "",
                "Alt text(s) - Separated by ||": build_alt_text(article, variant),
                "Comment(s) - Separated by ||": "",
                "Pin board, FB album, or Google category": variant["board"],
                "Post subtype - I.e. story, reel, PDF ..": "",
                "CTA - For Facebook links or Google": "",
                "Reminder - For stories, reels, shorts, and TikToks": "",
            })

    rows.sort(key=lambda row: (row["Pin board, FB album, or Google category"], row["Title - For the video, pin, PDF .."]))
    scheduled = schedule_rows(rows, args.start_date, DEFAULT_WINDOWS)
    save_csv(OUTPUT_PATH, scheduled)

    print(f"rows={len(scheduled)}")
    print(f"output={OUTPUT_PATH}")


if __name__ == "__main__":
    main()
