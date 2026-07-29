"""Tests for scripts/lib/d1_csv.py — CSV building for D1 sync.

Two CSVs are produced:
- Articles CSV: matches /api/articles-upload format
  Required headers: row, slug, title, category, article_markdown, image_main_filename
- Pins CSV (Agent 6 format): matches /api/pins-upload auto-detection
  Required headers: slug, variant, pin_title, description, alt_text, board

The endpoints derive image_url and destination_url from slug+variant
automatically, so we do not send those columns.

Also tested here:
- imageAlt injection from hero-briefs.jsonl into the article markdown
  before sending to D1 (the writer no longer produces imageAlt).
- board mapping by category.
"""
from __future__ import annotations

import csv
import io
import pytest

try:
    from scripts.lib.d1_csv import (
        board_for_pin,
        board_name_to_id,
        build_articles_csv,
        build_pins_csv,
        category_to_board,
        inject_image_alt,
    )
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.lib.d1_csv"


# ── category_to_board ────────────────────────────────────────────────────────

def test_category_to_board_recipes():
    assert category_to_board("recipes") == "Easy Dinner Recipes"


def test_category_to_board_nutrition():
    assert category_to_board("nutrition") == "Nutrition Labels and Daily Values Explained"


def test_category_to_board_tips():
    assert category_to_board("tips") == "Kitchen Tips and Cooking Hacks"


def test_category_to_board_unknown_raises():
    with pytest.raises(ValueError):
        category_to_board("unknown")


def test_category_to_board_empty_raises():
    with pytest.raises(ValueError):
        category_to_board("")


# ── build_articles_csv ───────────────────────────────────────────────────────

def _parse(csv_text: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(csv_text)))


def test_articles_csv_has_required_headers():
    text = build_articles_csv([
        {
            "slug": "demo",
            "title": "Demo Title",
            "category": "recipes",
            "markdown": "---\ntitle: Demo Title\n---\nBody.",
            "image_filename": "demo-main.jpg",
        }
    ])
    rows = _parse(text)
    assert len(rows) == 1
    for col in ("row", "slug", "title", "category", "article_markdown", "image_main_filename"):
        assert col in rows[0], f"missing column: {col}"


def test_articles_csv_assigns_row_index_starting_at_1():
    text = build_articles_csv([
        {"slug": "a", "title": "A", "category": "recipes", "markdown": "---\n---\n", "image_filename": "a.jpg"},
        {"slug": "b", "title": "B", "category": "tips", "markdown": "---\n---\n", "image_filename": "b.jpg"},
    ])
    rows = _parse(text)
    assert [r["row"] for r in rows] == ["1", "2"]


def test_articles_csv_escapes_markdown_with_newlines_and_commas():
    md = "---\ntitle: Has, Comma\n---\nLine one.\nLine two, with comma.\n"
    text = build_articles_csv([
        {"slug": "x", "title": "Has, Comma", "category": "recipes", "markdown": md, "image_filename": "x.jpg"}
    ])
    rows = _parse(text)
    assert rows[0]["article_markdown"] == md
    assert rows[0]["title"] == "Has, Comma"


def test_articles_csv_escapes_double_quotes_in_markdown():
    md = 'Body with "quoted" word.'
    text = build_articles_csv([
        {"slug": "x", "title": "T", "category": "tips", "markdown": md, "image_filename": "x.jpg"}
    ])
    rows = _parse(text)
    assert rows[0]["article_markdown"] == md


# ── build_pins_csv ───────────────────────────────────────────────────────────

def _pin_record(slug: str, category: str) -> dict:
    return {
        "article_slug": slug,
        "category": category,
        "pins": [
            {"slug": "p1", "title": f"Pin 1 for {slug}", "prompt": "...", "alt": "Alt 1 of {slug}", "description": "Desc 1 has 80+ chars filling out to be valid for the test fixture, ending with a CTA."},
            {"slug": "p2", "title": f"Pin 2 for {slug}", "prompt": "...", "alt": "Alt 2 of {slug}", "description": "Desc 2 has 80+ chars filling out to be valid for the test fixture, ending with a CTA."},
            {"slug": "p3", "title": f"Pin 3 for {slug}", "prompt": "...", "alt": "Alt 3 of {slug}", "description": "Desc 3 has 80+ chars filling out to be valid for the test fixture, ending with a CTA."},
            {"slug": "p4", "title": f"Pin 4 for {slug}", "prompt": "...", "alt": "Alt 4 of {slug}", "description": "Desc 4 has 80+ chars filling out to be valid for the test fixture, ending with a CTA."},
        ],
    }


def test_pins_csv_has_required_headers():
    text = build_pins_csv([_pin_record("demo", "recipes")])
    rows = _parse(text)
    for col in ("slug", "variant", "pin_title", "description", "alt_text", "board"):
        assert col in rows[0], f"missing column: {col}"


def test_pins_csv_emits_4_rows_per_article():
    text = build_pins_csv([_pin_record("a", "recipes"), _pin_record("b", "tips")])
    rows = _parse(text)
    assert len(rows) == 8


def test_pins_csv_variants_are_1_to_4():
    text = build_pins_csv([_pin_record("demo", "recipes")])
    rows = _parse(text)
    assert [r["variant"] for r in rows] == ["1", "2", "3", "4"]


def test_pins_csv_maps_category_recipes_to_easy_dinner_board():
    text = build_pins_csv([_pin_record("demo", "recipes")])
    rows = _parse(text)
    for r in rows:
        assert r["board"] == "Easy Dinner Recipes"


def test_pins_csv_maps_category_nutrition_to_nutrition_labels_board():
    text = build_pins_csv([_pin_record("demo", "nutrition")])
    rows = _parse(text)
    for r in rows:
        assert r["board"] == "Nutrition Labels and Daily Values Explained"


def test_pins_csv_maps_category_tips_to_kitchen_tips_board():
    text = build_pins_csv([_pin_record("demo", "tips")])
    rows = _parse(text)
    for r in rows:
        assert r["board"] == "Kitchen Tips and Cooking Hacks"


def test_board_for_pin_routes_nutrition_label_to_labels_board():
    board = board_for_pin({
        "title": "How to Read Nutrition Labels",
        "description": "Simple nutrition label basics with fiber and sodium.",
        "article_slug": "how-to-read-nutrition-labels",
    }, "nutrition")
    assert board == "Nutrition Labels and Daily Values Explained"


def test_board_for_pin_routes_lunch_prep_to_lunch_board():
    """Meal slot beats the generic kitchen board: "lunches" claims this pin
    before Kitchen Tips is reached, which is the intended ordering."""
    board = board_for_pin({
        "title": "Bulk Meal Prep for Easy Lunches",
        "description": "A practical kitchen system for make-ahead meals.",
        "article_slug": "bulk-meal-prep-easy-lunches",
    }, "tips")
    assert board == "High Protein Lunch and Sandwich Ideas"


def test_board_for_pin_routes_bean_recipe_to_bean_board():
    board = board_for_pin({
        "title": "Easy Bean Dinner Recipe",
        "description": "A simple weeknight dinner with beans and oats.",
        "article_slug": "easy-bean-dinner-recipe",
    }, "recipes")
    assert board == "Bean and Lentil Recipes"


def test_board_for_pin_routes_budget_to_grocery_board():
    board = board_for_pin({
        "title": "Budget Meals from a Small Grocery List",
        "description": "Affordable food that helps save money.",
        "article_slug": "budget-meals-small-grocery-list",
    }, "tips")
    assert board == "Grocery Budget Tips and Shopping Lists"


def test_board_for_pin_dish_token_outranks_budget_token():
    """Ordering contract, not an accident. Easy Dinner Recipes sits above both
    budget rules, so a budget pin that also names a dish lands on the dish
    board. Same fixture as the test above, with "dinners" back in the
    description. If a reorder ever changes this, it should be deliberate."""
    board = board_for_pin({
        "title": "Budget Meals from a Small Grocery List",
        "description": "Affordable dinners that help save money.",
        "article_slug": "budget-meals-small-grocery-list",
    }, "tips")
    assert board == "Easy Dinner Recipes"


def test_board_for_pin_routes_storage_to_freezer_board():
    board = board_for_pin({
        "title": "Freeze Flat for Easy Food Storage",
        "description": "A leftover system that protects shelf life.",
        "article_slug": "freeze-flat-food-storage",
    }, "tips")
    assert board == "Food Storage and Freezer Tips"


def test_board_for_pin_routes_protein_lunch_to_lunch_board():
    board = board_for_pin({
        "title": "High Protein Lunch Ideas Without Powder",
        "description": "Food-first protein meals with eggs, tofu, and yogurt.",
        "article_slug": "high-protein-lunch-ideas-without-powder",
    }, "nutrition")
    assert board == "High Protein Lunch and Sandwich Ideas"


def test_board_name_to_id_accepts_aliases():
    assert board_name_to_id("Healthy Breakfast, Smoothies and Snacks") == "1124140825679184034"
    assert board_name_to_id("Kitchen Tips and Cooking Hacks") == "1124140825679184034"
    assert board_name_to_id("gut-health-nutrition-tips") == "1124140825679184036"
    assert board_name_to_id("Gut Health Foods and Fiber Tips") == "1124140825679184036"
    assert board_name_to_id("Budget Meals") == "1124140825679548779"
    assert board_name_to_id("Freezer Tips") == "1124140825679548781"


def test_board_name_to_id_raises_on_unknown_board():
    """Must raise, never return "". A silent empty board_id during a board
    migration sends pins nowhere, and that is how the 2026-07-26 routing bug
    stayed invisible."""
    with pytest.raises(KeyError):
        board_name_to_id("Board That Does Not Exist")


def test_board_name_to_id_raises_on_empty_name():
    with pytest.raises(KeyError):
        board_name_to_id("")


def test_every_routable_board_resolves_to_an_id():
    """Guards the gap between the two tables: a rule may only name a board
    that BOARD_NAME_TO_ID can resolve. Without this, adding a rule for a board
    that was never created fails at upload time instead of at test time."""
    from scripts.lib.d1_csv import BOARD_RULES, CATEGORY_TO_BOARD

    unresolvable = []
    for board in [b for b, _ in BOARD_RULES] + list(CATEGORY_TO_BOARD.values()):
        try:
            board_name_to_id(board)
        except KeyError:
            unresolvable.append(board)
    assert not unresolvable, f"routed to boards with no live ID: {unresolvable}"


def test_pins_csv_carries_pin_title_description_alt():
    text = build_pins_csv([_pin_record("demo", "recipes")])
    rows = _parse(text)
    assert rows[0]["pin_title"] == "Pin 1 for demo"
    assert rows[0]["alt_text"] == "Alt 1 of {slug}"
    assert "Desc 1" in rows[0]["description"]


def test_pins_csv_skips_record_with_missing_descriptions():
    """A record that hasn't been backfilled yet must not be silently sent
    with empty descriptions — the endpoint accepts them but the pins would
    publish with empty bodies. Explicit error is safer."""
    bad = _pin_record("demo", "recipes")
    bad["pins"][2]["description"] = ""
    with pytest.raises(ValueError):
        build_pins_csv([bad])


# ── inject_image_alt ─────────────────────────────────────────────────────────

def test_inject_image_alt_replaces_existing_line():
    md = '---\ntitle: T\nimage: "/images/x-main.jpg"\nimageAlt: old description here\ndate: 2026-04-27\n---\nBody.'
    out = inject_image_alt(md, "Fresh hero alt showing food on a bright kitchen counter")
    assert "imageAlt: Fresh hero alt showing food on a bright kitchen counter" in out
    assert "old description here" not in out
    assert "title: T" in out
    assert "Body." in out


def test_inject_image_alt_inserts_when_missing():
    md = '---\ntitle: T\nimage: "/images/x-main.jpg"\ndate: 2026-04-27\n---\nBody.'
    out = inject_image_alt(md, "Fresh hero alt showing food on a bright kitchen counter")
    assert "imageAlt: Fresh hero alt showing food on a bright kitchen counter" in out


def test_inject_image_alt_preserves_body_unchanged():
    md = '---\ntitle: T\nimageAlt: old\n---\n## Body\n\nParagraph here.\n'
    out = inject_image_alt(md, "Fresh hero alt showing food on a bright kitchen counter")
    assert "## Body" in out
    assert "Paragraph here." in out


def test_inject_image_alt_quotes_value_with_special_chars():
    """Alt text with a colon would break YAML if unquoted."""
    md = '---\ntitle: T\nimageAlt: old\n---\nBody.'
    out = inject_image_alt(md, "A bowl: with vegetables on a bright kitchen counter")
    # Round-trip through yaml to confirm parseability
    import yaml
    fm = out.split("---\n")[1]
    parsed = yaml.safe_load(fm)
    assert parsed["imageAlt"] == "A bowl: with vegetables on a bright kitchen counter"


def test_inject_image_alt_returns_unchanged_when_alt_empty():
    md = '---\ntitle: T\nimageAlt: keep me\n---\nBody.'
    out = inject_image_alt(md, "")
    assert "imageAlt: keep me" in out


def test_inject_image_alt_rejects_alt_under_30_chars():
    md = '---\ntitle: T\nimageAlt: old\n---\nBody.'
    with pytest.raises(ValueError):
        inject_image_alt(md, "Too short")


# ── no second router ─────────────────────────────────────────────────────────
#
# scripts/NEW_PIPELINE_2026-05-08/lib/d1_csv.py is importable as `lib.d1_csv`,
# the same name as scripts/lib/d1_csv.py. Until 2026-07-28 it held its own copy
# of the routing, and anything run with NEW_PIPELINE on sys.path silently got
# the stale rules — 80 pins went to retired broad boards. It is a re-export
# shim now, and these tests keep it one.

def _load_new_pipeline_copy():
    import importlib.util
    from pathlib import Path

    path = (
        Path(__file__).resolve().parents[2]
        / "scripts" / "NEW_PIPELINE_2026-05-08" / "lib" / "d1_csv.py"
    )
    assert path.is_file(), f"expected the shim at {path}"
    spec = importlib.util.spec_from_file_location("_new_pipeline_d1_csv", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_new_pipeline_copy_exposes_the_canonical_rules():
    from scripts.lib.d1_csv import BOARD_NAME_TO_ID, BOARD_RULES

    mod = _load_new_pipeline_copy()
    assert mod.BOARD_RULES == BOARD_RULES
    assert mod.BOARD_NAME_TO_ID == BOARD_NAME_TO_ID


def test_new_pipeline_copy_routes_identically():
    """generate_pinterest_csv.py imports board_for_pin from the NEW_PIPELINE
    copy. Every pin it routes must land where the canonical router says."""
    mod = _load_new_pipeline_copy()
    fixtures = [
        ("High Protein Breakfast Burrito", "recipes"),
        ("Sheet Pan Chicken Dinner", "recipes"),
        ("Sourdough Discard Crackers", "recipes"),
        ("Cheap Meals for Large Families", "tips"),
        ("How to Store Berries in the Freezer", "tips"),
        ("How to Read Nutrition Labels", "nutrition"),
        ("Pin with no routing keywords at all", "tips"),
    ]
    for title, category in fixtures:
        pin = {"title": title, "description": ""}
        assert mod.board_for_pin(pin, category) == board_for_pin(pin, category), title


def test_new_pipeline_copy_also_raises_on_unknown_board():
    mod = _load_new_pipeline_copy()
    with pytest.raises(KeyError):
        mod.board_name_to_id("Board That Does Not Exist")


def test_inject_image_alt_rejects_alt_over_200_chars():
    md = '---\ntitle: T\nimageAlt: old\n---\nBody.'
    long_alt = "A " + "very detailed " * 25 + "photo of food on a plate."
    with pytest.raises(ValueError):
        inject_image_alt(md, long_alt)


def test_inject_image_alt_idempotent_on_same_value():
    alt = "Stable hero alt showing food on a bright kitchen counter"
    md = f"---\ntitle: T\nimageAlt: {alt}\n---\nBody."
    once = inject_image_alt(md, alt)
    twice = inject_image_alt(once, alt)
    assert once == twice
