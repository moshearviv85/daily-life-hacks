import csv
import json
import os


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "pipeline-data", "pins-publer-final.csv")
ROUTER_PATH = os.path.join(BASE_DIR, "pipeline-data", "router-mapping.json")
REPORT_PATH = os.path.join(BASE_DIR, "pipeline-data", "pin-runway-audit.json")

CSV_HEADERS = [
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


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp_path, path)


def load_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def save_csv(path, rows):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_HEADERS, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)
    os.replace(tmp_path, path)


def clean_whitespace(value):
    return " ".join((value or "").replace("\r", " ").replace("\n", " ").split())


def contains_any(text, values):
    text = clean_whitespace(text).lower()
    return any(value.lower() in text for value in values)


def row_link(row):
    return row["Link(s) - Separated by comma for FB carousels"].strip()


def row_title(row):
    return row["Title - For the video, pin, PDF .."].strip()


def row_alt(row):
    return row["Alt text(s) - Separated by ||"].strip()


def row_media(row):
    return row["Media URL(s) - Separated by comma"].strip()


def set_text(row, text):
    row["Text"] = clean_whitespace(text)


def set_alt(row, text):
    row["Alt text(s) - Separated by ||"] = text


def set_link(row, link):
    row["Link(s) - Separated by comma for FB carousels"] = link


def set_title(row, title):
    row["Title - For the video, pin, PDF .."] = title


def row_haystack(row):
    return " ".join(
        clean_whitespace(value)
        for value in [row_link(row), row_title(row), row.get("Text", ""), row_alt(row), row_media(row)]
    ).lower()


def detect_row_issues(row):
    text = " ".join(
        clean_whitespace(value)
        for value in [row_link(row), row_title(row), row.get("Text", ""), row_alt(row)]
    ).lower()
    rules = {
        "risky-detox-language": ["detox", "cleanse", "body cleanse"],
        "risky-weight-loss-language": ["fat burning", "fat-burning", "weight loss"],
        "risky-medical-angle": ["constipation", "constipation relief", "severe constipation", "cholesterol"],
        "risky-kids-angle": ["toddlers", "kid friendly", "kids"],
        "risky-hype-language": ["gut glow guaranteed", " guaranteed!"],
    }
    return [issue for issue, patterns in rules.items() if any(pattern in text for pattern in patterns)]


def rewrite_safe_copy(row):
    haystack = row_haystack(row)
    link = row_link(row)

    if "30-day-high-fiber-challenge-meal-plan" in haystack:
        set_text(
            row,
            "A simple 30-day high-fiber meal plan with easy recipes, grocery ideas, and practical daily habits you can actually keep up with. "
            "#HighFiberMeals #MealPlanIdeas #GutFriendlyFoods #EasyRecipes #HealthyHabits #WeeklyPrep #SimpleNutrition #DailyRoutine",
        )
        set_alt(
            row,
            "Weekly meal planner surrounded by fresh produce, simple recipes, and notes for easy high-fiber meals",
        )
        return

    if "high-fiber-fast-food-options-guide" in haystack:
        set_text(
            row,
            "Stuck at a drive-thru? This guide rounds up practical high-fiber fast food picks from places like Subway, Chipotle, and Starbucks for busier days. "
            "#FastFoodHacks #HealthyOnTheGo #HighFiber #QuickMeals #NutritionTips #EatingOut #SimpleChoices #BusyDays",
        )
        set_alt(
            row,
            "Takeout-style meal with beans, grains, vegetables, and toppings arranged on a tray for a quick comparison guide",
        )
        return

    if "oatmeal-vs-grits-fiber-content" in haystack:
        set_text(
            row,
            "Oatmeal vs. grits is one of those breakfast comparisons that gets easier once you see the fiber difference side by side. "
            "#OatmealVsGrits #FiberComparison #HealthyBreakfast #BreakfastIdeas #WholeGrains #NutritionTips #SimpleChoices #MorningMeals",
        )
        set_alt(
            row,
            "Two breakfast bowls side by side with oatmeal toppings and warm grits for an easy fiber comparison",
        )
        return

    if "whole-wheat" in haystack and "pasta" in haystack:
        set_text(
            row,
            "Whole wheat pasta and white pasta can look similar on the plate, but the fiber difference changes how filling the meal feels. "
            "#WholeWheat #PastaComparison #HighFiber #HealthySwaps #WholeGrains #EasyMeals #NutritionTips #SimpleChoices",
        )
        set_alt(
            row,
            "Cooked whole wheat pasta and white pasta plated side by side for a simple fiber comparison",
        )
        return

    if "popcorn-vs-potato-chips-fiber-comparison" in haystack:
        set_text(
            row,
            "Popcorn and potato chips may both feel snacky, but the fiber difference makes them a very different fit for everyday snacking. "
            "#SnackSwap #FiberFacts #HealthyChoices #SnackIdeas #Popcorn #PotatoChips #SimpleComparison #EverydayNutrition",
        )
        set_alt(
            row,
            "Bowl of popcorn and bowl of potato chips arranged side by side for a quick snack comparison",
        )
        return

    if (
        "high-protein-high-fiber-meals-for-weight-loss" in haystack
        and "weight-loss" not in link
        and "weight loss" not in link
    ):
        set_text(
            row,
            "High-protein, high-fiber meals with beans, chicken, lentils, vegetables, and grains can make dinner feel more balanced and satisfying. "
            "#HighProteinHighFiber #BalancedMeals #EasyDinner #MealIdeas #FiberRich #ProteinPacked #SimpleCooking #WeeknightMeals",
        )
        set_alt(
            row,
            "Balanced plate with lentils, vegetables, grains, and protein arranged for a hearty everyday meal",
        )


def ensure_router_variants(router):
    updates = {
        "artichoke-recipes-for-gut-health": {
            "v3": {
                "url_slug": "artichoke-recipes-for-gut-health-guide",
                "title": "Artichoke Recipes for Gut Health Guide",
            },
            "v4": {
                "url_slug": "best-artichoke-recipes-for-gut-health",
                "title": "Best Artichoke Recipes for Gut Health",
            },
        },
        "freezer-meal-prep-ideas-for-beginners": {
            "v4": {
                "url_slug": "freezer-meal-prep-ideas-for-beginners-guide",
                "title": "Freezer Meal Prep Ideas for Beginners Guide",
            }
        },
        "how-to-meal-prep-on-a-budget-for-one-person": {
            "v4": {
                "url_slug": "how-to-meal-prep-on-a-budget-for-one-person-guide",
                "title": "How to Meal Prep on a Budget for One Person Guide",
            }
        },
        "how-to-organize-a-small-kitchen-on-a-budget": {
            "v4": {
                "url_slug": "how-to-organize-a-small-kitchen-on-a-budget-guide",
                "title": "How to Organize a Small Kitchen on a Budget Guide",
            }
        },
    }

    changed = 0
    for slug, variants in updates.items():
        router.setdefault(slug, {})
        for variant, data in variants.items():
            if router[slug].get(variant) != data:
                router[slug][variant] = data
                changed += 1
    return changed


def sanitize_row(row):
    link = row_link(row)

    # Remove rows that don't fit the current authority and safety strategy.
    drop_patterns = [
        "high-fiber-smoothies-for-kids-picky-eaters",
        "freezer-meal-prep-ideas-for-toddlers",
        "freezer-meal-prep-ideas-kid-friendly",
        "lower-cholesterol",
        "constipation",
        "how-to-read-nutrition-labels-for-weight-loss",
    ]
    if contains_any(link, drop_patterns):
        return None, "dropped", "risky-destination"

    # Replace fallback UTM links with clean router slugs.
    link_replacements = {
        "https://www.daily-life-hacks.com/how-to-meal-prep-on-a-budget-for-one-person?utm_content=v4":
            "https://www.daily-life-hacks.com/how-to-meal-prep-on-a-budget-for-one-person-guide",
        "https://www.daily-life-hacks.com/freezer-meal-prep-ideas-for-beginners?utm_content=v4":
            "https://www.daily-life-hacks.com/freezer-meal-prep-ideas-for-beginners-guide",
        "https://www.daily-life-hacks.com/how-to-organize-a-small-kitchen-on-a-budget?utm_content=v4":
            "https://www.daily-life-hacks.com/how-to-organize-a-small-kitchen-on-a-budget-guide",
        "https://www.daily-life-hacks.com/artichoke-recipes-for-gut-health?utm_content=v4":
            "https://www.daily-life-hacks.com/best-artichoke-recipes-for-gut-health",
        "https://www.daily-life-hacks.com/artichoke-recipes-for-gut-health?utm_content=v3":
            "https://www.daily-life-hacks.com/artichoke-recipes-for-gut-health-guide",
    }
    if link in link_replacements:
        set_link(row, link_replacements[link])

    if "tabbouleh-salad-high-fiber-bulgur" in link:
        set_text(
            row,
            "Fresh parsley, bulgur, cucumber, and lemon make this tabbouleh feel bright, hearty, and easy to prep ahead. "
            "#Tabbouleh #MediterraneanFood #HighFiberLunch #HealthyLunch #BulgurSalad #MealPrep #FreshRecipes #VeganRecipes",
        )
        set_alt(
            row,
            "Tabbouleh Salad High Fiber Bulgur - fresh parsley salad with bulgur, tomatoes, and cucumber for a bright Mediterranean lunch",
        )
    elif "gut-health-tea-peppermint-ginger" in link:
        set_text(
            row,
            "Warm peppermint and ginger tea with a fresh, cozy flavor. A simple after-dinner drink that fits beautifully into a calm evening routine. "
            "#HerbalTea #PeppermintTea #GingerTea #WarmDrink #TeaRecipe #HealthyHabits #AfterDinnerTea #CozyKitchen",
        )
        set_alt(
            row,
            "Gut Health Tea Peppermint Ginger - warm herbal tea with ginger and mint in a simple glass mug",
        )
    elif "high-fiber-bran-muffins-that-taste-good" in link:
        set_text(
            row,
            "Soft bran muffins with raisins, honey, and a cozy bakery feel. A practical make-ahead breakfast when you want more fiber without giving up flavor. "
            "#BranMuffins #HealthyBaking #BreakfastIdeas #HighFiber #MealPrepBreakfast #HomeBaking #EasyRecipes #CozyFood",
        )
        set_alt(
            row,
            "High Fiber Bran Muffins That Taste Good - golden bran muffins with raisins on a simple breakfast tray",
        )
    elif "fiber-rich-soup-for-weight-loss-cabbage" in link:
        set_text(
            row,
            "Hearty cabbage soup with beans, vegetables, and plenty of fiber. Cozy, budget friendly, and easy to batch cook for busy nights. "
            "#CabbageSoup #HighFiberSoup #VeggieSoup #MealPrepSoup #HealthyDinner #ComfortFood #BeanSoup #EasyRecipe",
        )
        set_alt(
            row,
            "Fiber Rich Soup for Weight Loss Cabbage - hearty cabbage and bean soup in a rustic bowl for a cozy dinner",
        )
    elif "artichoke-recipes-for-gut-health" in link or "are-artichokes-good-for-digestion" in link:
        set_text(
            row,
            "Steamed artichoke with lemon and garlic is one of those simple dishes that feels fresh, satisfying, and a little special. "
            "#ArtichokeRecipes #GutFriendlyMeals #HighFiberVeggies #VegetarianDinner #MediterraneanFood #FiberRich #SimpleCooking #FreshIngredients",
        )
        set_alt(
            row,
            "Artichoke Recipes for Gut Health - steamed artichoke with lemon and garlic on a fresh dinner plate",
        )
    elif "water-and-fiber-the-golden-rule" in link:
        set_text(
            row,
            "Fiber works best when your hydration habits keep up. This simple guide breaks down the water and fiber balance that helps meals feel more comfortable day to day. "
            "#Hydration #FiberTips #GutHealth #HealthyHabits #NutritionTips #DailyWellness #BalancedEating #SimpleHealth",
        )
        set_alt(
            row,
            "Water and Fiber The Golden Rule - simple hydration and fiber foods arranged for an everyday wellness guide",
        )
    elif "easy-high-protein-high-fiber-meals" in link:
        rewrite_safe_copy(row)

    rewrite_safe_copy(row)

    row_issues = detect_row_issues(row)
    if row_issues:
        return None, "dropped", ",".join(row_issues)

    return row, "kept", "clean"


def main():
    router = load_json(ROUTER_PATH)
    rows = load_csv(CSV_PATH)

    router_changes = ensure_router_variants(router)

    kept_rows = []
    dropped_rows = 0
    dropped_reasons = {}
    for row in rows:
        updated_row, state, reason = sanitize_row(row)
        if state == "dropped":
            dropped_rows += 1
            dropped_reasons[reason] = dropped_reasons.get(reason, 0) + 1
            continue
        kept_rows.append(updated_row)

    save_json(ROUTER_PATH, router)
    save_csv(CSV_PATH, kept_rows)
    save_json(
        REPORT_PATH,
        {
            "rows_before": len(rows),
            "rows_after": len(kept_rows),
            "rows_dropped": dropped_rows,
            "router_changes": router_changes,
            "dropped_reasons": dropped_reasons,
        },
    )

    print(f"router_changes={router_changes}")
    print(f"rows_before={len(rows)}")
    print(f"rows_after={len(kept_rows)}")
    print(f"rows_dropped={dropped_rows}")
    print(f"report={REPORT_PATH}")


if __name__ == "__main__":
    main()
