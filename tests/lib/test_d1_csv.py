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
    assert category_to_board("recipes") == "High Fiber Dinner and Gut Health Recipes"


def test_category_to_board_nutrition():
    assert category_to_board("nutrition") == "Gut Health Tips and Nutrition Charts"


def test_category_to_board_tips():
    assert category_to_board("tips") == "Gut Health Tips and Nutrition Charts"


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


def test_pins_csv_maps_category_recipes_to_high_fiber_board():
    text = build_pins_csv([_pin_record("demo", "recipes")])
    rows = _parse(text)
    for r in rows:
        assert r["board"] == "High Fiber Dinner and Gut Health Recipes"


def test_pins_csv_maps_category_nutrition_to_gut_health_board():
    text = build_pins_csv([_pin_record("demo", "nutrition")])
    rows = _parse(text)
    for r in rows:
        assert r["board"] == "Gut Health Tips and Nutrition Charts"


def test_pins_csv_maps_category_tips_to_gut_health_board():
    text = build_pins_csv([_pin_record("demo", "tips")])
    rows = _parse(text)
    for r in rows:
        assert r["board"] == "Gut Health Tips and Nutrition Charts"


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
    out = inject_image_alt(md, "fresh alt from hero brief")
    assert "imageAlt: fresh alt from hero brief" in out
    assert "old description here" not in out
    assert "title: T" in out
    assert "Body." in out


def test_inject_image_alt_inserts_when_missing():
    md = '---\ntitle: T\nimage: "/images/x-main.jpg"\ndate: 2026-04-27\n---\nBody.'
    out = inject_image_alt(md, "fresh alt")
    assert "imageAlt: fresh alt" in out


def test_inject_image_alt_preserves_body_unchanged():
    md = '---\ntitle: T\nimageAlt: old\n---\n## Body\n\nParagraph here.\n'
    out = inject_image_alt(md, "new alt")
    assert "## Body" in out
    assert "Paragraph here." in out


def test_inject_image_alt_quotes_value_with_special_chars():
    """Alt text with a colon would break YAML if unquoted."""
    md = '---\ntitle: T\nimageAlt: old\n---\nBody.'
    out = inject_image_alt(md, "A bowl: with stuff in it")
    # Round-trip through yaml to confirm parseability
    import yaml
    fm = out.split("---\n")[1]
    parsed = yaml.safe_load(fm)
    assert parsed["imageAlt"] == "A bowl: with stuff in it"


def test_inject_image_alt_returns_unchanged_when_alt_empty():
    md = '---\ntitle: T\nimageAlt: keep me\n---\nBody.'
    out = inject_image_alt(md, "")
    assert "imageAlt: keep me" in out


def test_inject_image_alt_idempotent_on_same_value():
    md = '---\ntitle: T\nimageAlt: stable\n---\nBody.'
    once = inject_image_alt(md, "stable")
    twice = inject_image_alt(once, "stable")
    assert once == twice
