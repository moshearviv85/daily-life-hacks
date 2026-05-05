"""
Assign tags from a fixed master list to all articles.

Uses keyword matching on slug + title + category to assign 2-4 tags per article.
Dry run by default. Use --apply to write changes.
"""

import os
import re
import argparse
from collections import Counter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(BASE_DIR, "src", "data", "articles")

MASTER_TAGS = {
    "meal prep": {
        "slug_keywords": ["meal-prep", "batch-cook", "make-ahead", "freezer-meal", "prep-ideas", "prep-for-week", "prep-bowls", "prep-tips", "prep-hacks"],
        "title_keywords": ["meal prep", "batch cook", "make ahead", "freezer meal", "prep for", "prep ideas", "prep bowls"],
    },
    "budget friendly": {
        "slug_keywords": ["budget", "cheap", "low-cost", "affordable", "save-money", "cheaper", "stretch-meals", "on-a-budget"],
        "title_keywords": ["budget", "cheap", "low cost", "affordable", "save money", "cheaper", "stretch", "on a budget", "without breaking"],
    },
    "large family": {
        "slug_keywords": ["large-famil", "big-famil"],
        "title_keywords": ["large famil", "big famil"],
    },
    "high fiber": {
        "slug_keywords": ["high-fiber", "fiber-rich", "fiber-content", "fiber-comparison", "good-source-of-fiber", "more-fiber", "constipation", "fiber-intake", "water-and-fiber"],
        "title_keywords": ["high fiber", "fiber-rich", "fiber content", "source of fiber", "more fiber", "constipation", "fiber intake", "fiber fast food", "water and fiber"],
    },
    "high protein": {
        "slug_keywords": ["high-protein", "protein-source", "protein-meal", "protein-lunch", "protein-breakfast", "how-much-protein", "complete-protein", "cottage-cheese", "greek-yogurt", "rotisserie-chicken", "protein-per-serving"],
        "title_keywords": ["high protein", "protein source", "protein meal", "how much protein", "complete protein", "cottage cheese", "greek yogurt", "rotisserie chicken", "protein per serving"],
    },
    "gut health": {
        "slug_keywords": ["gut-health", "gut-friendly", "prebiotic", "ferment", "natto", "probiotic", "digestive"],
        "title_keywords": ["gut health", "gut friendly", "prebiotic", "ferment", "natto", "probiotic", "digestive"],
    },
    "quick meals": {
        "slug_keywords": ["quick-", "20-minute", "30-minute", "15-min", "weeknight", "one-pot", "sheet-pan"],
        "title_keywords": ["quick", "20 minute", "30 minute", "15-min", "weeknight", "one pot", "one-pot", "sheet pan"],
    },
    "breakfast": {
        "slug_keywords": ["breakfast", "overnight-oats", "yogurt-parfait", "morning", "granola", "oatmeal", "grits"],
        "title_keywords": ["breakfast", "overnight oats", "yogurt parfait", "morning", "granola", "oatmeal", "grits"],
    },
    "lunch": {
        "slug_keywords": ["lunch", "sandwich", "bagel-sandwich", "pack-salad", "work-lunch"],
        "title_keywords": ["lunch", "sandwich", "bagel", "pack salad", "for work"],
    },
    "dinner": {
        "slug_keywords": ["dinner", "weeknight-dinner", "casserole", "crockpot", "slow-cooker", "salmon-bites", "baked-cod", "sheet-pan-salmon", "cauliflower-fried-rice", "lettuce-wraps", "stir-fry", "chicken-and-rice", "turkey-meatball"],
        "title_keywords": ["dinner", "casserole", "crockpot", "slow cooker", "salmon bites", "baked cod", "fried rice", "lettuce wraps", "stir fry", "turkey meatball"],
    },
    "snacks": {
        "slug_keywords": ["snack", "energy-ball", "popcorn", "chips-", "chickpeas-snack", "munchies"],
        "title_keywords": ["snack", "energy ball", "popcorn", "chips", "munchies"],
    },
    "soups and stews": {
        "slug_keywords": ["soup", "stew", "chili", "chowder"],
        "title_keywords": ["soup", "stew", "chili", "chowder"],
    },
    "salads": {
        "slug_keywords": ["salad", "tabbouleh", "slaw", "coleslaw"],
        "title_keywords": ["salad", "tabbouleh", "slaw"],
    },
    "baking": {
        "slug_keywords": ["bread-recipe", "muffin", "pizza-dough", "pizza-crust", "brownie", "sourdough", "baking", "dumpling-wrapper"],
        "title_keywords": ["bread recipe", "muffin", "pizza dough", "pizza crust", "brownie", "sourdough", "baking", "dumpling wrapper"],
    },
    "vegetarian": {
        "slug_keywords": ["vegan", "vegetarian", "plant-based", "meatless", "beans-and-rice", "lentil", "black-bean-taco", "white-bean"],
        "title_keywords": ["vegan", "vegetarian", "plant-based", "plant based", "meatless"],
    },
    "gluten free": {
        "slug_keywords": ["gluten-free", "gluten_free"],
        "title_keywords": ["gluten free", "gluten-free"],
    },
    "picky eaters": {
        "slug_keywords": ["picky-eat", "picky-kid", "picky-adult", "non-adventurous"],
        "title_keywords": ["picky eat", "picky kid", "non-adventurous"],
    },
    "kitchen tips": {
        "slug_keywords": ["how-to-clean", "how-to-season", "how-to-preheat", "kitchen-tool", "cutting-board", "cast-iron", "baking-sheet-liner", "smoke-point", "blender"],
        "title_keywords": ["how to clean", "how to season", "how to preheat", "kitchen tool", "cutting board", "cast iron", "baking sheet liner", "smoke point", "skillet"],
    },
    "food storage": {
        "slug_keywords": ["how-to-store", "how-to-keep", "how-to-freeze", "freezer-organiz", "freezer-inventory", "fresh-longer", "revive-wilted", "stop-browning", "food-waste", "soggy"],
        "title_keywords": ["how to store", "how to keep", "how to freeze", "freezer organiz", "freezer inventory", "fresh longer", "revive wilted", "stop browning", "food waste", "soggy"],
    },
    "grocery shopping": {
        "slug_keywords": ["grocery", "aldi-shopping", "costco-", "nutrition-label", "grocery-run", "shopping-list", "frozen-vs-fresh"],
        "title_keywords": ["grocery", "aldi", "costco", "nutrition label", "shopping", "frozen vs fresh"],
    },
    "nutrition basics": {
        "slug_keywords": ["nutrition-fact", "macronutrient", "understanding-macro", "how-to-read-nutrition", "protein-vs", "calories", "healthy-fats-list", "fiber-label", "resistant-starch", "zinc-containing", "hidden-sugar", "weekly-meals"],
        "title_keywords": ["nutrition fact", "macronutrient", "understanding macro", "how to read nutrition", "protein vs", "healthy fats", "fiber label", "resistant starch", "zinc", "hidden sugar", "rotate into weekly"],
    },
    "weight management": {
        "slug_keywords": ["weight-loss", "weight-management", "satiety", "keeps-you-full", "feeling-full"],
        "title_keywords": ["weight loss", "weight management", "satiety", "keeps you full", "feeling full", "holds you over"],
    },
    "salad dressings": {
        "slug_keywords": ["salad-dressing", "vinaigrette", "caesar-dressing", "dressing-recipe"],
        "title_keywords": ["salad dressing", "vinaigrette", "caesar", "dressing"],
    },
    "whole grains": {
        "slug_keywords": ["quinoa", "farro", "barley", "bulgur", "amaranth", "millet", "teff", "oatmeal", "whole-wheat", "brown-rice"],
        "title_keywords": ["quinoa", "farro", "barley", "bulgur", "amaranth", "millet", "teff", "whole wheat", "whole grain", "brown rice"],
    },
    "cooking basics": {
        "slug_keywords": ["how-to-cook-dried", "how-to-double-recipe", "how-to-cool-rice", "how-to-quick-soak", "how-to-measure", "cooking-oils", "fix-oversalted", "add-flavor", "leftover-rice", "less-salt", "cast-iron", "preheat-skillet", "cutting-board", "kitchen-tool", "clean-blender"],
        "title_keywords": ["how to cook dried", "how to double", "how to cool rice", "how to quick-soak", "how to measure", "cooking oil", "fix oversalted", "add flavor", "over-salting", "leftover rice", "less salt", "cast iron", "preheat", "cutting board", "kitchen tool", "clean a blender"],
    },
}


def read_frontmatter(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)", content, re.DOTALL)
    if not m:
        return None

    fm_raw = m.group(1)
    body = m.group(2)

    title_m = re.search(r'^title:\s*["\']?(.*?)["\']?\s*$', fm_raw, re.MULTILINE)
    title = title_m.group(1).strip().strip("\"'") if title_m else ""

    cat_m = re.search(r'^category:\s*["\']?(\w+)', fm_raw, re.MULTILINE)
    category = cat_m.group(1) if cat_m else "nutrition"

    return {"fm_raw": fm_raw, "body": body, "title": title, "category": category}


def match_tags(slug, title, category):
    matched = []
    slug_lower = slug.lower()
    title_lower = title.lower()

    for tag, rules in MASTER_TAGS.items():
        hit = False
        for kw in rules["slug_keywords"]:
            if kw in slug_lower:
                hit = True
                break
        if not hit:
            for kw in rules["title_keywords"]:
                if kw in title_lower:
                    hit = True
                    break
        if hit:
            matched.append(tag)

    if len(matched) < 2:
        if category == "recipes" and "quick meals" not in matched:
            matched.append("quick meals")
        elif category == "tips" and "kitchen tips" not in matched:
            matched.append("kitchen tips")
        elif category == "nutrition" and "nutrition basics" not in matched:
            matched.append("nutrition basics")

    return matched[:5]


def write_tags(filepath, fm_raw, body, new_tags):
    tags_block = "tags:\n" + "\n".join(f"  - {t}" for t in new_tags) + "\n"

    # Match block-style tags (tags:\n  - foo\n  - bar\n) with or without indentation
    block_match = re.search(r"^tags:\s*\n(?:\s*-\s+.+\n)*", fm_raw, re.MULTILINE)
    # Match inline-style tags (tags: ["foo", "bar"] or tags: foo, bar)
    inline_match = re.search(r"^tags:\s*\[.*?\]\s*\n?", fm_raw, re.MULTILINE)
    inline_plain = re.search(r'^tags:\s+[^\n\[]+\n', fm_raw, re.MULTILINE)

    if block_match:
        new_fm = re.sub(
            r"^tags:\s*\n(?:\s*-\s+.+\n)*",
            tags_block,
            fm_raw,
            flags=re.MULTILINE,
        )
    elif inline_match:
        new_fm = re.sub(
            r"^tags:\s*\[.*?\]\s*\n?",
            tags_block,
            fm_raw,
            flags=re.MULTILINE,
        )
    elif inline_plain:
        new_fm = re.sub(
            r'^tags:\s+[^\n\[]+\n',
            tags_block,
            fm_raw,
            flags=re.MULTILINE,
        )
    else:
        new_fm = re.sub(
            r"(^image:\s)",
            tags_block + r"\1",
            fm_raw,
            count=1,
            flags=re.MULTILINE,
        )

    with open(filepath, "w", encoding="utf-8", newline="\n") as f:
        f.write(f"---\n{new_fm}\n---\n{body}")


def main():
    parser = argparse.ArgumentParser(description="Assign master tags to all articles")
    parser.add_argument("--apply", action="store_true", help="Write changes (default: dry run)")
    args = parser.parse_args()

    tag_counter = Counter()
    zero_tags = []
    results = {}

    for filename in sorted(os.listdir(ARTICLES_DIR)):
        if not filename.endswith(".md"):
            continue
        slug = filename[:-3]
        filepath = os.path.join(ARTICLES_DIR, filename)
        data = read_frontmatter(filepath)
        if not data:
            continue

        tags = match_tags(slug, data["title"], data["category"])
        results[slug] = {"data": data, "tags": tags, "path": filepath}

        if not tags:
            zero_tags.append(slug)
        for t in tags:
            tag_counter[t] += 1

    print(f"Articles: {len(results)}")
    print(f"Articles with 0 tags: {len(zero_tags)}")
    print(f"Unique tags used: {len(tag_counter)}")
    print(f"\nTag distribution:")
    for tag, count in tag_counter.most_common():
        print(f"  {count:3d}x  {tag}")

    if zero_tags:
        print(f"\nArticles with 0 tags:")
        for s in zero_tags:
            print(f"  {s}")

    counts = Counter()
    for slug, info in results.items():
        counts[len(info["tags"])] += 1
    print(f"\nTags per article:")
    for n in sorted(counts):
        print(f"  {n} tags: {counts[n]} articles")

    if not args.apply:
        print(f"\nDRY RUN. Use --apply to write.")
        return

    written = 0
    for slug, info in results.items():
        write_tags(info["path"], info["data"]["fm_raw"], info["data"]["body"], info["tags"])
        written += 1

    print(f"\nWrote tags to {written} articles.")


if __name__ == "__main__":
    main()
