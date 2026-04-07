from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKER_FILE = ROOT / "pipeline-data" / "content-tracker.json"
PINS_JSON_FILE = ROOT / "pipeline-data" / "pins.json"

# Pin copy used by scripts/generate-images.py for the text overlay.
SLUG_UPDATES: dict[str, dict] = {
    "quick-20-minute-high-fiber-meals-for-busy-days": {
        "pin_title": "Quick 20 Minute Bean & Rice Meals for Busy Days",
        "description": "No time? These 20-minute bean and rice skillet meals are simple, filling, and easy to clean up.",
        "hashtags": ["QuickMeals", "SkilletDinner", "Beans", "WholeGrains", "20MinuteRecipes"],
        "alt_text": "Quick 20 Minute Bean & Rice Meals for Busy Days - colorful skillet meal with beans, vegetables, and whole grains",
        "keyword": "quick 20 minute bean and rice meals for busy days",
    },
    "high-fiber-meal-prep-ideas-for-busy-weeks-2026": {
        "pin_title": "Meal Prep Bowls for Busy Weeks 2026",
        "description": "Prep lentils, quinoa, and roasted vegetables once, then remix lunch and dinner all week. Flexible, simple, and no boring repeats.",
        "hashtags": ["MealPrep", "MealBowl", "Lentils", "Quinoa", "BusyWeeks"],
        "alt_text": "Meal Prep Bowls for Busy Weeks 2026 - overhead view of lentil and quinoa meal prep containers with roasted vegetables",
        "keyword": "meal prep bowls for busy weeks 2026",
    },
    "no-bake-high-fiber-energy-balls-recipe": {
        "pin_title": "No-Bake Oat & Flax Energy Balls",
        "description": "A quick, no-bake snack made with oats and flax. Easy to roll, easy to portion, and simple to customize with mix-ins.",
        "hashtags": ["EnergyBalls", "Oats", "Flax", "NoBake", "SnackIdeas"],
        "alt_text": "No-Bake Oat & Flax Energy Balls - oat snack balls on a plate",
        "keyword": "no-bake oat and flax energy balls recipe",
    },
    "high-fiber-avocado-toast-variations": {
        "pin_title": "Avocado Toast Variations With Beans & Seeds",
        "description": "Three repeatable avocado toast combos with beans, seeds, and crunch. Fast breakfast that you actually want to eat again.",
        "hashtags": ["AvocadoToast", "Breakfast", "Beans", "Seeds", "EasyBreakfast"],
        "alt_text": "Avocado Toast Variations With Beans & Seeds - avocado toast with beans and seeds",
        "keyword": "avocado toast variations with beans and seeds",
    },
    "high-fiber-quinoa-salad-for-lunch-prep": {
        "pin_title": "Quinoa Lunch Salad That Stays Fresh",
        "description": "Quinoa and chickpeas with a bright lemon dressing. Built for meal prep, packs well, and keeps its texture longer.",
        "hashtags": ["QuinoaSalad", "MealPrep", "LunchIdeas", "Chickpeas", "Lemon"],
        "alt_text": "Quinoa Lunch Salad That Stays Fresh - quinoa salad in meal prep container",
        "keyword": "quinoa lunch salad that stays fresh for meal prep",
    },
    "crispy-roasted-chickpeas-high-fiber-snack": {
        "pin_title": "Crispy Roasted Chickpeas for Crunchy Snacking",
        "description": "Chip-style crunch from oven-roasted chickpeas. Dry them well, season boldly, and enjoy as snack or salad topper.",
        "hashtags": ["Chickpeas", "RoastedSnack", "Crunchy", "PlantProtein", "EasyOven"],
        "alt_text": "Crispy Roasted Chickpeas for Crunchy Snacking - bowl of spiced roasted chickpeas",
        "keyword": "crispy roasted chickpeas crunchy snacking snack",
    },
    "gut-friendly-high-fiber-smoothies-for-daily-wellness": {
        "pin_title": "Gut-Friendly Smoothie Blends for Daily Wellness",
        "description": "Thick, creamy smoothies with fruit, oats, chia, and greens. Blend-smart tips for texture and a drink you look forward to.",
        "hashtags": ["SmoothieRecipes", "GutFriendly", "Oats", "Chia", "DailyWellness"],
        "alt_text": "Gut-Friendly Smoothie Blends for Daily Wellness - thick smoothie in blender jar with fruit nearby",
        "keyword": "gut-friendly smoothie blends for daily wellness",
    },
    "how-to-increase-fiber-intake-without-gas": {
        "pin_title": "How to Add More Fiber Without Gas",
        "description": "If fiber makes you feel uncomfortable, you might be ramping too fast. This practical guide covers gradual swaps, hydration, and food choices.",
        "hashtags": ["FiberTips", "Digestion", "Bloating", "Hydration", "GradualChange"],
        "alt_text": "How to Add More Fiber Without Gas - bowl of oats and fruit on kitchen counter",
        "keyword": "how to add more fiber without gas practical steps",
    },
    "best-high-fiber-fruits-for-weight-loss-list": {
        "pin_title": "Fiber-Rich Fruits for Feeling Full",
        "description": "A practical list of fiber-rich fruit options for snacks that feel satisfying. Pair with protein and keep portions sensible.",
        "hashtags": ["FiberRichFruits", "FruitSnacks", "PortionControl", "HealthySnacks", "SnackIdeas"],
        "alt_text": "Fiber-Rich Fruits for Feeling Full - berries, apples, pears, and citrus on a board",
        "keyword": "fiber-rich fruits for feeling full",
    },
    "high-fiber-pasta-alternatives": {
        "pin_title": "Pasta Alternatives That Still Feel Like Dinner",
        "description": "Chickpea pasta, lentil pasta, and whole wheat swaps cook differently. Follow the simple timing tips so they taste like real dinner.",
        "hashtags": ["PastaAlternatives", "ChickpeaPasta", "LentilPasta", "HealthySwaps", "DinnerAtHome"],
        "alt_text": "Pasta Alternatives That Still Feel Like Dinner - bowls of pasta with vegetables and tomato sauce",
        "keyword": "pasta alternatives that still feel like dinner",
    },
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    tracker = load_json(TRACKER_FILE)
    tracker_updates = 0
    for item in tracker:
        slug = item.get("slug")
        if not slug or slug not in SLUG_UPDATES:
            continue
        upd = SLUG_UPDATES[slug]
        for k in ("pin_title", "description", "hashtags", "alt_text", "keyword"):
            if k in upd:
                item[k] = upd[k]
        tracker_updates += 1

    pins = load_json(PINS_JSON_FILE)
    pins_updates = 0
    for pin in pins:
        slug = pin.get("slug")
        if not slug or slug not in SLUG_UPDATES:
            continue
        upd = SLUG_UPDATES[slug]
        pin["pin_title"] = upd["pin_title"]
        pin["description"] = upd["description"]
        # pins.json stores hashtags as a single string.
        pin["hashtags"] = " ".join([f"#{h}" for h in upd["hashtags"]])
        pin["alt_text"] = upd["alt_text"]
        pins_updates += 1

    dump_json(TRACKER_FILE, tracker)
    dump_json(PINS_JSON_FILE, pins)
    print(f"Updated content-tracker.json for {tracker_updates} items")
    print(f"Updated pins.json for {pins_updates} pin variants")


if __name__ == "__main__":
    main()

