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


CATEGORY_TO_BOARD = {
    "recipes":    "High Fiber Dinner and Gut Health Recipes",
    "nutrition":  "Gut Health Tips and Nutrition Charts",
    "tips":       "Healthy Meal Prep & Kitchen Tips",
}

BOARD_NAME_TO_ID = {
    "high fiber dinner and gut health recipes": "1124140825679184032",
    "high-fiber-recipes": "1124140825679184032",
    "high fiber recipes": "1124140825679184032",
    "gut health tips and nutrition charts": "1124140825679184034",
    "gut-health-nutrition-tips": "1124140825679184034",
    "gut health & nutrition tips": "1124140825679184034",
    "gut health and nutrition tips": "1124140825679184034",
    "healthy meal prep & kitchen tips": "1124140825679184036",
    "healthy breakfast, smoothies and snacks": "1124140825679184036",
    "healthy breakfast smoothies and snacks": "1124140825679184036",
}

MEAL_PREP_KEYWORDS = (
    "meal prep", "meal-prep", "breakfast", "smoothie", "snack", "lunch",
    "sandwich", "freezer", "storage", "organize", "organization", "grocery",
    "budget", "kitchen", "picnic", "leftover", "make ahead", "batch cooking",
    "prep",
)

GUT_NUTRITION_KEYWORDS = (
    "gut", "fiber", "nutrition", "sodium", "label", "protein", "cholesterol",
    "chia", "whole wheat", "constipation", "prebiotic", "vitamin", "mineral",
    "satiety",
)

RECIPE_KEYWORDS = (
    "recipe", "dinner", "soup", "stew", "salad", "chicken", "pork", "beef",
    "salmon", "beans", "lentil", "tofu", "vegetarian", "pizza", "pasta",
    "rice", "bowl", "casserole", "dumpling", "bread", "sourdough",
)


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
    return BOARD_NAME_TO_ID.get((board_name or "").strip().lower(), "")


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


def board_for_pin(pin: dict, category: str) -> str:
    category = (category or "").lower()
    haystack = _pin_haystack(pin)

    if _contains_any(haystack, MEAL_PREP_KEYWORDS):
        return CATEGORY_TO_BOARD["tips"]
    if category == "recipes":
        return CATEGORY_TO_BOARD["recipes"]
    if _contains_any(haystack, GUT_NUTRITION_KEYWORDS):
        return CATEGORY_TO_BOARD["nutrition"]
    if _contains_any(haystack, RECIPE_KEYWORDS):
        return CATEGORY_TO_BOARD["recipes"]
    return category_to_board(category)


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
