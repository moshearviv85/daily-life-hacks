"""CSV building + alt injection for D1 sync.

Two CSVs are produced:
- Articles CSV: matches /api/articles-upload (functions/api/articles-upload.js).
  Headers: row, slug, title, category, article_markdown, image_main_filename
- Pins CSV (Agent 6 format): matches /api/pins-upload auto-detection
  (functions/api/pins-upload.js, isAgentFormat branch).
  Headers: slug, variant, pin_title, description, alt_text, board

The endpoints derive image_url and destination_url from slug+variant
themselves, so we do not send those columns.
"""
from __future__ import annotations

import csv
import io
import json
import re
from typing import Iterable


# Fallbacks when no rule matches. Must name boards that exist and are used.
CATEGORY_TO_BOARD = {
    "recipes":   "Easy Dinner Recipes",                          # 8.2 imp/pin
    "nutrition": "Nutrition Labels and Daily Values Explained",
    "tips":      "Kitchen Tips and Cooking Hacks",
}

# VERIFIED against the live account 2026-07-26 via scripts/list-boards.py.
# The previous map had a three-way rotation: 032/034/036 were each pointing at
# a different board than their name claimed, so gut-health pins landed on the
# meal-prep board and vice versa. Re-verify with list-boards.py before editing.
BOARD_NAME_TO_ID = {
    # 13 narrow boards created 2026-07-27 from the board-architecture report.
    "cheap meals for large families": "1124140825679688282",
    "healthy snacks for a sweet tooth": "1124140825679688283",
    "high protein breakfast ideas": "1124140825679688284",
    "high fiber breakfast ideas": "1124140825679688285",
    "high protein lunch and sandwich ideas": "1124140825679688286",
    "sheet pan and one pot dinner recipes": "1124140825679688287",
    "bean and lentil recipes": "1124140825679688288",
    "healthy soup recipes": "1124140825679688289",
    "salad recipes and homemade dressings": "1124140825679688290",
    "sourdough discard recipes and easy bread": "1124140825679688291",
    "how to cook chicken, pork and beef": "1124140825679688292",
    "high fiber snack ideas": "1124140825679688293",
    "nutrition labels and daily values explained": "1124140825679688294",
    # 226 pins, 0.7 impressions/pin
    "high fiber dinner recipes": "1124140825679184032",
    "high-fiber-recipes": "1124140825679184032",
    # 2 pins - a separate, nearly empty board despite the similar name
    "fiber per dollar: cheap high fiber foods": "1124140825679097740",
    # 83 pins, 2.0 impressions/pin
    "gut health foods and fiber tips": "1124140825679184036",
    "gut health and nutrition tips": "1124140825679184036",
    "gut-health-nutrition-tips": "1124140825679184036",
    # 0 pins - distinct board, kept only so the name resolves rather than 404s
    "grocery budget tips and shopping lists": "1124140825679640840",
    # 181 pins, 0.6 impressions/pin
    "kitchen tips and cooking hacks": "1124140825679184034",
    "healthy breakfast, smoothies and snacks": "1124140825679184034",
    "healthy breakfast smoothies and snacks": "1124140825679184034",
    # 14 pins, 2.4 impressions/pin
    "protein per dollar: cheap protein sources": "1124140825679640841",
    "grocery math": "1124140825679640841",
    # 12 pins, 8.2 impressions/pin - best performing board on the account
    "easy dinner recipes": "1124140825679548778",
    "easy-dinner-recipes": "1124140825679548778",
    "easy weeknight dinners": "1124140825679548778",
    "budget meals and grocery hacks": "1124140825679548779",
    "budget-meals": "1124140825679548779",
    "budget meals": "1124140825679548779",
    "grocery hacks": "1124140825679548779",
    "high protein meals and smart swaps": "1124140825679548780",
    "high-protein-meals": "1124140825679548780",
    "high protein recipes": "1124140825679548780",
    "protein meals": "1124140825679548780",
    "food storage and freezer tips": "1124140825679548781",
    "food-storage": "1124140825679548781",
    "food storage tips": "1124140825679548781",
    "freezer tips": "1124140825679548781",
}










def category_to_board(category: str) -> str:
    if not category:
        raise ValueError("category must be non-empty")
    if category not in CATEGORY_TO_BOARD:
        raise ValueError(
            f"unknown category {category!r}; expected one of "
            f"{sorted(CATEGORY_TO_BOARD)}"
        )
    return CATEGORY_TO_BOARD[category]


# ── articles CSV ─────────────────────────────────────────────────────────────

def board_name_to_id(board_name: str) -> str:
    """Resolve a board name to its live Pinterest ID.

    Raises rather than returning "" : a silent empty ID during a board
    migration sends pins nowhere, which is how the 2026-07-26 routing bug
    went unnoticed.
    """
    key = (board_name or "").strip().lower()
    board_id = BOARD_NAME_TO_ID.get(key, "")
    if not board_id:
        raise KeyError(
            f"no live board ID for {board_name!r}. Run scripts/list-boards.py "
            "and update BOARD_NAME_TO_ID."
        )
    return board_id


def _pin_haystack(pin: dict) -> str:
    values = (
        pin.get("title"),
        pin.get("description"),
        pin.get("alt"),
        pin.get("article_slug"),
        pin.get("pin_slug"),
        pin.get("slug"),
    )
    return " ".join(str(value) for value in values if value).lower()


def _contains_any(haystack: str, needles: Iterable[str]) -> bool:
    return any(needle in haystack for needle in needles)



BOARD_RULES = (
    # 1-2. Priced data. Must beat every topical rule: a per-dollar pin is a
    # data pin first and a food pin second.
    ("Protein Per Dollar: Cheap Protein Sources", (
        "protein per dollar", "protein-per-dollar", "per dollar protein",
        "cheapest protein", "cheapest animal protein", "cheapest dairy protein",
        "protein cost", "protein-cost", "protein value", "protein per serving",
        "cost per gram of protein", "50 grams of protein", "one dollar protein",
        "one-dollar-protein", "complete protein pairs", "protein sources ranked",
    )),
    ("Fiber Per Dollar: Cheap High Fiber Foods", (
        "fiber per dollar", "fiber-per-dollar", "per dollar fiber",
        "cheapest high fiber", "cheapest fiber", "fiber cost", "fiber-cost",
        "30 grams of fiber", "one dollar fiber", "one-dollar-fiber",
        "fiber comparison",
    )),
    # 3. Audience rule. "families" is broad but the audience intent outranks
    # the dish: a crockpot meal for eight belongs here, not on Sheet Pan.
    ("Cheap Meals for Large Families", (
        "large family", "large families", "for a crowd", "feed a crowd",
        "feeding a crowd", "big family", "stretch meals", "families",
    )),
    # 4. Above the bean rule on purpose: black-bean-brownies is a dessert.
    ("Healthy Snacks for a Sweet Tooth", (
        "sweet tooth", "brownie", "brownies", "energy ball", "energy balls",
        "dessert", "jam", "sweet snack", "sweet treat", "granola",
    )),
    # 5-7. Meal slot x attribute: the highest-intent shape on Pinterest.
    ("High Protein Breakfast Ideas", (
        "high protein breakfast", "protein breakfast", "breakfast burrito",
        "breakfast hash", "egg sandwich", "savory oatmeal", "breakfast staples",
        "balanced breakfast", "breakfast foods for sustained",
        "make ahead breakfast", "make-ahead-breakfast",
    )),
    ("High Fiber Breakfast Ideas", (
        "high fiber breakfast", "fiber breakfast", "chia pudding",
        "overnight oats", "yogurt parfait", "avocado toast", "bran muffin",
        "savory chia", "ricotta berry", "chia seed recipes",
    )),
    ("High Protein Lunch and Sandwich Ideas", (
        "sandwich", "lunch", "bagel", "work lunch", "packed lunch", "lunch prep",
        "lunch bowl", "burrito bowl", "wrap", "wraps",
    )),
    # 8-14. Recipe forms, narrow to broad.
    ("Sheet Pan and One Pot Dinner Recipes", (
        "sheet pan", "sheet-pan", "one pot", "one-pot", "skillet dinner",
        "crockpot", "crock pot", "slow cooker", "risotto", "hands-off",
    )),
    ("Bean and Lentil Recipes", (
        "bean", "beans", "lentil", "lentils", "chickpea", "chickpeas", "hummus",
        "split pea", "black bean", "kidney bean", "white bean", "legume",
        "rice and beans", "edamame", "natto", "soybean",
    )),
    ("Healthy Soup Recipes", (
        "soup", "stew", "chili", "broth", "chowder", "bisque",
    )),
    ("Salad Recipes and Homemade Dressings", (
        "picnic", "potluck", "potlucks", "pasta salad", "salad", "dressing",
        "dressings", "slaw", "tabbouleh", "vinaigrette",
    )),
    ("Sourdough Discard Recipes and Easy Bread", (
        "sourdough", "discard", "pizza dough", "bread recipe", "sandwich bread",
        "dumpling wrapper", "homemade bread", "baking",
    )),
    ("How to Cook Chicken, Pork and Beef", (
        "best way to cook", "how to cook chicken", "pork chop",
        "pork tenderloin", "prime rib", "ribs", "baked potato",
        "rotisserie chicken", "steak", "roast",
    )),
    ("High Fiber Dinner Recipes", (
        "high fiber dinner", "fiber dinner", "high-fiber dinner",
        "high fiber meal", "high fiber recipes", "vegetarian high fiber",
        "vegan high fiber", "high fiber stir fry", "high fiber pizza",
        "high fiber cauliflower", "high fiber quinoa", "quinoa", "farro",
        "barley", "bulgur", "millet", "teff", "amaranth", "whole grain",
        "high fiber pasta", "whole wheat", "stir fry", "stir-fry",
    )),
    ("High Protein Meals and Smart Swaps", (
        "high protein", "high-protein", "protein meal", "protein swap",
        "greek yogurt", "cottage cheese", "turkey meatball", "protein bread",
    )),
    # 15. Holds bare "recipe"/"recipes". Deliberately below every specific
    # recipe-form board so it catches only genuinely unclassified recipes.
    # This is the account's best board (8.2) and a good place to land.
    ("Easy Dinner Recipes", (
        "dinner", "weeknight", "tacos", "salmon", "cod", "fish", "chicken",
        "tofu", "pasta", "orzo", "pizza", "casserole", "meatballs",
        "portobello", "curry", "fried rice", "20-minute", "20 minute",
        "quick dinner", "recipe", "recipes",
    )),
    # 16. Holds bare "snack". Below Sweet Tooth so sweet pins are claimed first.
    ("High Fiber Snack Ideas", (
        "snack", "snacks", "popcorn", "potato chips", "chips",
        "roasted chickpeas",
    )),
    # 17-18. Storage and kitchen. Freezer before general storage: a freezer
    # meal is a freezer pin even though it also matches "storage".
    ("Food Storage and Freezer Tips", (
        "freezer", "freeze", "frozen", "how to store", "storage", "keep fresh",
        "fresh longer", "shelf life", "leftover", "leftovers", "food waste",
        "wilted", "browning", "keep berries", "store cooked",
    )),
    ("Kitchen Tips and Cooking Hacks", (
        "kitchen", "cast iron", "skillet", "cutting board", "blender",
        "parchment", "baking sheet", "cookware", "utensil", "organize",
        "organization", "oversalted", "seasoning", "cool rice", "preheat",
        "clean", "tools",
    )),
    # 19-20. Budget. Grocery-logistics before general budget, and both below
    # the per-dollar rules so priced data is never swallowed by "cost".
    ("Grocery Budget Tips and Shopping Lists", (
        "grocery", "groceries", "shopping list", "aldi", "costco", "thrifty",
        "grocery bill", "pantry", "shelf stable", "shelf-stable", "meal plan",
        "meal planning", "week of dinners", "grocery run",
    )),
    ("Budget Meals and Grocery Hacks", (
        "budget", "cheap", "affordable", "save money", "saving money", "frugal",
        "low cost", "low-cost", "cost", "for one", "cooking for one",
    )),
    # 21. Gut health. Narrow on purpose: the old version held bare "fiber"
    # and "nutrition", which is exactly what caused the 405-pin pileup.
    ("Gut Health Foods and Fiber Tips", (
        "gut health", "gut-health", "gut friendly", "gut-friendly",
        "constipation", "prebiotic", "probiotic", "fermented", "bloat",
        "digestion", "digestive", "artichoke", "prune juice", "natural relief",
        "smoothie", "smoothies", "tea",
    )),
    # 22. DEFERRED until the board exists with 20+ pins. Keep commented so the
    # intended position in the order is not lost.
    # ("Healthy Food Swaps and Alternatives", (
    #     "alternative", "alternatives", "swap", "swaps", "hidden sugar",
    #     "less salt", "less sugar", "sodium", "without more sugar", "substitute",
    # )),
    # 23. LAST. Holds bare "nutrition", so it must stay at the bottom.
    ("Nutrition Labels and Daily Values Explained", (
        "nutrition label", "label", "daily value", "daily values",
        "how much protein", "macronutrient", "macro", "healthy fats",
        "selenium", "zinc", "vitamin", "mineral", "smoke point", "cooking oil",
        "nutrition facts", "satiety", "weight loss", "fiber intake",
        "water and fiber", "challenge", "per day", "nutrition",
    )),
)


def board_for_pin(pin: dict, category: str) -> str:
    """Route a pin to a board. First match in BOARD_RULES wins.

    Ordering is the contract, not the keyword sets: a rule holding a broad
    token sits below every rule that could legitimately claim a pin containing
    it. The previous version had this inverted, and the two broadest catchers
    swallowed 405 of 561 pins into the two boards that produce 0.6-0.7
    impressions per pin while the account's best board (8.2) held 12.

    Board titles are a ranked Pinterest search feature: OmniSearchSage
    (arXiv 2404.16260) feeds the top 10 board titles of a pin into its search
    embedding, second in weight only to the pin's own text. Which board a pin
    lands on is therefore a distribution decision, not filing.
    """
    haystack = _pin_haystack(pin)
    for board, keywords in BOARD_RULES:
        if _contains_any(haystack, keywords):
            return board
    return category_to_board((category or "").lower())


ARTICLE_COLUMNS = (
    "row", "slug", "title", "category", "article_markdown", "image_main_filename",
)


def build_articles_csv(records: Iterable[dict]) -> str:
    """Build the articles CSV ready for POST /api/articles-upload.

    Each record is a dict with keys: slug, title, category, markdown,
    image_filename. The 'row' column is auto-assigned 1..N to preserve
    insertion order on the D1 side (articles-due.js sorts by row_num)."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(ARTICLE_COLUMNS), quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    for i, rec in enumerate(records, start=1):
        writer.writerow({
            "row":                  str(i),
            "slug":                 rec["slug"],
            "title":                rec["title"],
            "category":             rec.get("category", ""),
            "article_markdown":     rec["markdown"],
            "image_main_filename":  rec.get("image_filename", ""),
        })
    return buf.getvalue()


# ── pins CSV ─────────────────────────────────────────────────────────────────

PIN_COLUMNS = (
    "slug", "variant", "pin_title", "description", "alt_text", "board",
)


def build_pins_csv(records: Iterable[dict]) -> str:
    """Build the Agent-6-format pins CSV for POST /api/pins-upload.

    Each record represents one article: {article_slug, category, pins[4]}.
    Each pin must have a non-empty description (the Astro side renders
    blank descriptions as empty pin bodies; we surface this as an error
    instead of silently shipping)."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(PIN_COLUMNS), quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    for rec in records:
        slug = rec["article_slug"]
        category = rec.get("category", "")
        pins = rec.get("pins") or []
        if len(pins) != 4:
            raise ValueError(
                f"article {slug!r} has {len(pins)} pins; expected 4"
            )
        for variant, pin in enumerate(pins, start=1):
            board = board_for_pin({**pin, "article_slug": slug}, category)
            description = (pin.get("description") or "").strip()
            if not description:
                raise ValueError(
                    f"article {slug!r} pin {variant} has empty description; "
                    f"run --description-only backfill before sync"
                )
            writer.writerow({
                "slug":         slug,
                "variant":      str(variant),
                "pin_title":    pin["title"],
                "description":  description,
                "alt_text":     pin.get("alt", ""),
                "board":        board,
            })
    return buf.getvalue()


# ── imageAlt injection ───────────────────────────────────────────────────────

_FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)
_IMAGEALT_LINE_RE = re.compile(r"^imageAlt:.*$", re.MULTILINE)


def validate_image_alt(alt: str) -> None:
    n = len(alt)
    if n < 30:
        raise ValueError(f"imageAlt too short ({n} < 30 chars)")
    if n > 200:
        raise ValueError(f"imageAlt too long ({n} > 200 chars)")


def inject_image_alt(markdown: str, alt: str) -> str:
    """Replace `imageAlt: ...` in the frontmatter with the new value, or
    insert it if missing. Empty alt is a no-op (keeps the existing value).

    The alt is YAML-safe: dump as a single-line scalar so colons and
    quotes don't break the parser."""
    if not alt:
        return markdown
    validate_image_alt(alt)
    m = _FRONTMATTER_RE.match(markdown)
    if not m:
        return markdown
    fm_block, body = m.group(1), m.group(2)
    # JSON-quoted strings are valid YAML scalars and survive any colon/quote/
    # newline content without breaking the parser. Plain values are kept as-is
    # for readability.
    needs_quoting = any(c in alt for c in ':"\n#&*!|>%@`') or alt.startswith(('-', '?'))
    yaml_value = json.dumps(alt, ensure_ascii=False) if needs_quoting else alt
    new_line = f"imageAlt: {yaml_value}"
    if _IMAGEALT_LINE_RE.search(fm_block):
        new_fm = _IMAGEALT_LINE_RE.sub(new_line, fm_block, count=1)
    else:
        # Insert after the `image:` line if present, else at the end of the block
        image_line_re = re.compile(r"^(image:.*)$", re.MULTILINE)
        if image_line_re.search(fm_block):
            new_fm = image_line_re.sub(r"\1\n" + new_line, fm_block, count=1)
        else:
            new_fm = fm_block.rstrip() + "\n" + new_line
    return f"---\n{new_fm}\n---\n{body}"
