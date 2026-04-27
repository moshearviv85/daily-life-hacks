"""Tests for scripts/lib/d1_sources.py — read articles + pin briefs + hero
briefs from local sources, ready for D1 sync.

Sources:
- Articles: pipeline-data/topic-research.sqlite, table write_outputs,
  status='written'. The slug, category, markdown columns are authoritative;
  title is parsed from the markdown frontmatter (write_outputs has no
  title column).
- Pin briefs: pipeline-data/pin-briefs.jsonl
- Hero briefs: pipeline-data/hero-briefs.jsonl (provides alt for inject)
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

try:
    from scripts.lib.d1_sources import (
        fetch_articles_from_sql,
        fetch_pin_records_from_jsonl,
        load_hero_alts,
    )
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.lib.d1_sources"


# ── tmp DB helper ────────────────────────────────────────────────────────────

def _mk_sqlite(tmp_path, rows: list[tuple]) -> Path:
    """rows: list of (slug, category, markdown, status) tuples."""
    p = tmp_path / "test.sqlite"
    con = sqlite3.connect(str(p))
    con.execute("""
        CREATE TABLE write_outputs (
            id INTEGER PRIMARY KEY,
            run_id INTEGER, topic_id INTEGER, topic_rank INTEGER,
            topic TEXT, category TEXT, slug TEXT,
            model_id TEXT, markdown TEXT,
            status TEXT, disqualified INTEGER DEFAULT 0
        )
    """)
    for i, (slug, cat, md, status) in enumerate(rows, start=1):
        con.execute(
            "INSERT INTO write_outputs (run_id, topic_id, topic_rank, topic, category, slug, model_id, markdown, status) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (1, i, i, slug, cat, slug, "test-model", md, status),
        )
    con.commit()
    con.close()
    return p


def _md(title: str, body: str = "Body.") -> str:
    return (
        "---\n"
        f"title: {title}\n"
        'image: "/images/x-main.jpg"\n'
        f"date: 2026-04-27\n"
        "---\n"
        f"{body}\n"
    )


# ── fetch_articles_from_sql ──────────────────────────────────────────────────

def test_fetch_articles_returns_only_written(tmp_path):
    db = _mk_sqlite(tmp_path, [
        ("good", "recipes",   _md("Good Title"),   "written"),
        ("bad",  "tips",      _md("Bad Title"),    "failed"),
        ("ugly", "nutrition", _md("Ugly Title"),   "draft"),
    ])
    out = fetch_articles_from_sql(db)
    slugs = [r["slug"] for r in out]
    assert slugs == ["good"]


def test_fetch_articles_extracts_title_from_frontmatter(tmp_path):
    db = _mk_sqlite(tmp_path, [
        ("demo", "recipes", _md("Demo Title Here"), "written"),
    ])
    out = fetch_articles_from_sql(db)
    assert out[0]["title"] == "Demo Title Here"


def test_fetch_articles_derives_image_filename_from_slug(tmp_path):
    db = _mk_sqlite(tmp_path, [
        ("crockpot-meals", "recipes", _md("X"), "written"),
    ])
    out = fetch_articles_from_sql(db)
    assert out[0]["image_filename"] == "crockpot-meals-main.jpg"


def test_fetch_articles_carries_slug_category_markdown(tmp_path):
    md = _md("T", "Some body content here.")
    db = _mk_sqlite(tmp_path, [("a", "tips", md, "written")])
    out = fetch_articles_from_sql(db)
    rec = out[0]
    assert rec["slug"] == "a"
    assert rec["category"] == "tips"
    assert rec["markdown"] == md


def test_fetch_articles_excludes_disqualified(tmp_path):
    db = _mk_sqlite(tmp_path, [
        ("ok",  "recipes", _md("Ok"),  "written"),
    ])
    # Mark it disqualified
    con = sqlite3.connect(str(db))
    con.execute("UPDATE write_outputs SET disqualified=1 WHERE slug='ok'")
    con.commit()
    con.close()
    out = fetch_articles_from_sql(db)
    assert out == []


def test_fetch_articles_skips_when_title_missing_from_frontmatter(tmp_path):
    """If frontmatter lacks title, the row is skipped (not silently sent
    with empty title — D1 schema requires NOT NULL title)."""
    bad_md = "---\nimage: \"/images/x.jpg\"\ndate: 2026-04-27\n---\nBody.\n"
    db = _mk_sqlite(tmp_path, [
        ("bad-md", "recipes", bad_md, "written"),
        ("good",   "tips",    _md("Good"), "written"),
    ])
    out = fetch_articles_from_sql(db)
    slugs = [r["slug"] for r in out]
    assert slugs == ["good"]


# ── fetch_pin_records_from_jsonl ─────────────────────────────────────────────

def test_fetch_pin_records_attaches_category_from_articles(tmp_path):
    p = tmp_path / "pin-briefs.jsonl"
    pins = [{"slug": f"p{i}", "title": f"T{i}",
             "prompt": f"... {i}", "alt": f"A{i} that is long enough to pass validation",
             "description": f"Pin {i} description that is over 80 characters long for the validator and ends with a CTA."}
            for i in range(1, 5)]
    record = {"article_slug": "demo", "pins": pins}
    p.write_text(json.dumps(record) + "\n", encoding="utf-8")

    articles = [{"slug": "demo", "category": "recipes", "title": "T", "markdown": "...", "image_filename": "x.jpg"}]
    out = fetch_pin_records_from_jsonl(p, articles)
    assert len(out) == 1
    assert out[0]["article_slug"] == "demo"
    assert out[0]["category"] == "recipes"
    assert len(out[0]["pins"]) == 4


def test_fetch_pin_records_skips_articles_without_pin_briefs(tmp_path):
    """Articles in SQL that don't yet have a pin-briefs entry must be
    skipped silently — they are part of an in-progress batch."""
    p = tmp_path / "pin-briefs.jsonl"
    p.write_text(json.dumps({
        "article_slug": "ready",
        "pins": [{"slug": f"p{i}", "title": f"T{i}", "prompt": "...",
                  "alt": "Long enough alt text for validation",
                  "description": "Long enough description that has 80+ chars in it for the validator. CTA."}
                 for i in range(4)]
    }) + "\n", encoding="utf-8")

    articles = [
        {"slug": "ready",     "category": "recipes",   "title": "R", "markdown": "...", "image_filename": "x.jpg"},
        {"slug": "not-ready", "category": "tips",      "title": "N", "markdown": "...", "image_filename": "x.jpg"},
    ]
    out = fetch_pin_records_from_jsonl(p, articles)
    assert [r["article_slug"] for r in out] == ["ready"]


def test_fetch_pin_records_returns_empty_when_jsonl_missing(tmp_path):
    p = tmp_path / "missing.jsonl"
    out = fetch_pin_records_from_jsonl(p, [])
    assert out == []


# ── load_hero_alts ───────────────────────────────────────────────────────────

def test_load_hero_alts_returns_dict_of_slug_to_alt(tmp_path):
    p = tmp_path / "hero-briefs.jsonl"
    p.write_text(
        json.dumps({"article_slug": "a", "prompt": "...", "alt": "A1 alt"}) + "\n" +
        json.dumps({"article_slug": "b", "prompt": "...", "alt": "B1 alt"}) + "\n",
        encoding="utf-8",
    )
    out = load_hero_alts(p)
    assert out == {"a": "A1 alt", "b": "B1 alt"}


def test_load_hero_alts_missing_file_returns_empty(tmp_path):
    p = tmp_path / "missing.jsonl"
    assert load_hero_alts(p) == {}


def test_load_hero_alts_skips_records_without_alt(tmp_path):
    p = tmp_path / "hero-briefs.jsonl"
    p.write_text(
        json.dumps({"article_slug": "a", "prompt": "..."}) + "\n" +
        json.dumps({"article_slug": "b", "prompt": "...", "alt": "B"}) + "\n",
        encoding="utf-8",
    )
    assert load_hero_alts(p) == {"b": "B"}
