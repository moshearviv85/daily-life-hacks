"""Tests for scripts/lib/legacy_pins.py — read pins-export.csv (the legacy
pin metadata) and produce records ready for /api/pins-upload Agent 6 format.

The legacy CSV columns: image_filename, pin_title, description,
destination_url, board (often garbled with URLs), alt_text.

Output records: {slug, variant, pin_title, description, alt_text, category}.
The board is computed downstream from category (legacy `board` column is
ignored because the data is dirty)."""
from __future__ import annotations

import csv
import io
from pathlib import Path

import pytest

try:
    from scripts.lib.legacy_pins import (
        extract_slug_variant,
        read_legacy_pins_csv,
        load_article_categories,
        build_legacy_pins_records,
    )
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


def test_module_imports():
    assert _IMPORT_OK


# ── extract_slug_variant ─────────────────────────────────────────────────────

def test_extract_slug_variant_basic():
    assert extract_slug_variant("air-fryer-salmon_v1.jpg") == ("air-fryer-salmon", 1)


def test_extract_slug_variant_with_dir():
    assert extract_slug_variant("pins/some-slug-here_v3.jpg") == ("some-slug-here", 3)


def test_extract_slug_variant_multidigit():
    assert extract_slug_variant("topic_v12.jpg") == ("topic", 12)


def test_extract_slug_variant_returns_none_on_garbage():
    assert extract_slug_variant("not-a-pin-file.png") is None
    assert extract_slug_variant("") is None


# ── read_legacy_pins_csv ─────────────────────────────────────────────────────

def _write_csv(tmp_path, rows):
    p = tmp_path / "pins-export.csv"
    cols = ["image_filename", "pin_title", "description", "destination_url", "board", "alt_text"]
    with p.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow(r)
    return p


def test_read_legacy_pins_returns_parsed_dicts(tmp_path):
    p = _write_csv(tmp_path, [
        {"image_filename": "demo_v1.jpg", "pin_title": "T1", "description": "D1", "destination_url": "u", "board": "B", "alt_text": "A1"},
        {"image_filename": "demo_v2.jpg", "pin_title": "T2", "description": "D2", "destination_url": "u", "board": "B", "alt_text": "A2"},
    ])
    rows = read_legacy_pins_csv(p)
    assert len(rows) == 2
    assert rows[0]["pin_title"] == "T1"


def test_read_legacy_pins_skips_unparseable_filenames(tmp_path):
    p = _write_csv(tmp_path, [
        {"image_filename": "demo_v1.jpg",     "pin_title": "ok",  "description": "d", "destination_url": "u", "board": "B", "alt_text": "a"},
        {"image_filename": "broken-name.png", "pin_title": "bad", "description": "d", "destination_url": "u", "board": "B", "alt_text": "a"},
    ])
    rows = read_legacy_pins_csv(p)
    assert len(rows) == 1
    assert rows[0]["pin_title"] == "ok"


# ── load_article_categories ──────────────────────────────────────────────────

def test_load_article_categories_reads_frontmatter(tmp_path):
    d = tmp_path / "articles"
    d.mkdir()
    (d / "a.md").write_text(
        '---\ntitle: A\ncategory: recipes\n---\nbody', encoding="utf-8"
    )
    (d / "b.md").write_text(
        '---\ntitle: B\ncategory: tips\n---\nbody', encoding="utf-8"
    )
    out = load_article_categories(d)
    assert out == {"a": "recipes", "b": "tips"}


def test_load_article_categories_skips_quoted_value(tmp_path):
    d = tmp_path / "articles"
    d.mkdir()
    (d / "a.md").write_text(
        '---\ntitle: A\ncategory: "nutrition"\n---\nbody', encoding="utf-8"
    )
    out = load_article_categories(d)
    assert out["a"] == "nutrition"


def test_load_article_categories_ignores_files_without_category(tmp_path):
    d = tmp_path / "articles"
    d.mkdir()
    (d / "a.md").write_text('---\ntitle: A\n---\n', encoding="utf-8")
    (d / "b.md").write_text('---\ncategory: recipes\n---\n', encoding="utf-8")
    out = load_article_categories(d)
    assert out == {"b": "recipes"}


# ── build_legacy_pins_records ────────────────────────────────────────────────

def test_build_records_filters_to_articles_with_md(tmp_path):
    csv_p = _write_csv(tmp_path, [
        {"image_filename": "live_v1.jpg",   "pin_title": "T", "description": "D",
         "destination_url": "u", "board": "B", "alt_text": "A"},
        {"image_filename": "orphan_v1.jpg", "pin_title": "T", "description": "D",
         "destination_url": "u", "board": "B", "alt_text": "A"},
    ])
    cats = {"live": "recipes"}  # no entry for 'orphan'
    out = build_legacy_pins_records(csv_p, cats)
    assert len(out) == 1
    assert out[0]["slug"] == "live"
    assert out[0]["category"] == "recipes"


def test_build_records_attaches_variant_int(tmp_path):
    csv_p = _write_csv(tmp_path, [
        {"image_filename": "live_v3.jpg", "pin_title": "T", "description": "D",
         "destination_url": "u", "board": "B", "alt_text": "A"},
    ])
    out = build_legacy_pins_records(csv_p, {"live": "tips"})
    assert out[0]["variant"] == 3


def test_build_records_carries_pin_title_description_alt(tmp_path):
    csv_p = _write_csv(tmp_path, [
        {"image_filename": "x_v1.jpg", "pin_title": "Title", "description": "Desc",
         "destination_url": "u", "board": "B", "alt_text": "Alt"},
    ])
    out = build_legacy_pins_records(csv_p, {"x": "recipes"})
    rec = out[0]
    assert rec["pin_title"] == "Title"
    assert rec["description"] == "Desc"
    assert rec["alt_text"] == "Alt"


def test_build_records_returns_empty_when_no_overlap(tmp_path):
    csv_p = _write_csv(tmp_path, [
        {"image_filename": "ghost_v1.jpg", "pin_title": "T", "description": "D",
         "destination_url": "u", "board": "B", "alt_text": "A"},
    ])
    out = build_legacy_pins_records(csv_p, {"different": "recipes"})
    assert out == []


def test_build_records_drops_pin_with_empty_required_field(tmp_path):
    """A row without pin_title or description is unusable - skip."""
    csv_p = _write_csv(tmp_path, [
        {"image_filename": "ok_v1.jpg",  "pin_title": "T", "description": "D",
         "destination_url": "u", "board": "B", "alt_text": "A"},
        {"image_filename": "bad_v1.jpg", "pin_title": "",  "description": "D",
         "destination_url": "u", "board": "B", "alt_text": "A"},
    ])
    out = build_legacy_pins_records(csv_p, {"ok": "tips", "bad": "tips"})
    assert [r["slug"] for r in out] == ["ok"]
