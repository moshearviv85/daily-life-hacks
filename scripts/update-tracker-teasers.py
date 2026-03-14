import json
import os

TRACKER_FILE = "pipeline-data/content-tracker.json"
TEASERS = {
    "easy-one-pot-chicken-and-rice-dinner": "Cooking at home is already a project, it does not need to be a performance. You brown the chicken, add rice and broth, and let it simmer. No three skillets, no pile of dishes. Just a solid dinner that leaves you with exactly one pan to wash.",
    "how-much-protein-do-you-need-per-day": "There is no magic number that applies to everyone on earth, despite what the internet tells you. We broke down a sane, realistic range based on your size and how you actually move. No spreadsheets, no complex math, and definitely no bro science.",
    "kitchen-tools-that-save-time-and-money": "Your kitchen does not need to look like a commercial prep station. We rounded up the few tools that actually earn their keep. A decent knife, a solid board, a sheet pan, and a can opener. Stop buying single use gadgets that just take up drawer space.",
    "healthy-turkey-meatballs-meal-prep": "Turkey meatballs have a reputation for tasting like dry cardboard. We fixed that. Make a batch of these once, and you can eat them with pasta, in a sandwich, or over rice all week long. The best part? They actually taste good when you reheat them.",
    "plant-based-protein-sources-complete-guide": "Beans, lentils, tofu, and nuts. That is the list. If you are trying to eat less meat but still want to feel full, here is what to buy, how much you need, and how to actually use it without turning your dinner into a preachy sermon.",
    "how-to-use-leftover-rice-creative-ideas": "We all have that sad container of rice sitting in the back of the fridge right now. Before it becomes a science experiment, turn it into fried rice, soup, fritters, or stuffed peppers. Real, actionable ideas so you stop throwing away good food.",
    "sheet-pan-salmon-and-vegetables-30-minutes": "Salmon and vegetables on exactly one tray. You slide it in the oven, set a timer, and go do literally anything else. In thirty minutes, dinner is ready, and you only have one piece of metal to scrub when you are done.",
    "healthy-fats-list-foods-to-eat-daily": "Oils, nuts, avocado, and fatty fish. These are real foods you can eat without turning every single meal into a macro tracking project. Here is the straightforward list of fats that actually make your food taste better and keep you full.",
    "how-to-cook-dried-beans-from-scratch": "Soak them, simmer them, season them. Cooking dried beans is significantly cheaper than buying cans, and you control exactly how much salt goes in. Make one big batch on Sunday and you are completely set for tacos and soups all week.",
    "easy-black-bean-tacos-weeknight-dinner": "Two cans of beans, a skillet, and some tortillas. That is dinner in under fifteen minutes. There is no long simmering process and absolutely no guilt trip. Sometimes you just need to eat, and tacos do not need a complicated backstory.",
    "best-breakfast-foods-for-sustained-energy": "If you are crashing hard at 10 AM, your breakfast is probably the problem. We put together a list of foods with enough protein and fiber to actually keep you going. No miracle claims, just straightforward food that prevents you from needing a nap.",
    "how-to-season-cast-iron-skillet-properly": "It is just a thin layer of oil baked onto heavy metal. That is it. We break down the absolute simplest method to keep your skillet non stick, requiring about sixty seconds of upkeep after you cook. No ancient mystery, no ruined pans."
}

with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
    tracker = json.load(f)

updated = 0
for item in tracker:
    if item['slug'] in TEASERS:
        item['email_teaser'] = TEASERS[item['slug']]
        updated += 1

with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
    json.dump(tracker, f, indent=2, ensure_ascii=False)

print(f"Updated {updated} items with new, extended, tone-accurate email teasers (NO EM DASHES).")
