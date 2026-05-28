"""Tests for scripts/lib/d1_sources.py — read articles + pin briefs + hero
briefs from local SQL, ready for D1 sync.

Sources:
- Articles: pipeline-data/topic-research.sqlite, table write_outputs,
  status='written'.
- Pin briefs: same DB, table pin_briefs (status='ok').
- Hero briefs: same DB, table hero_briefs (status='ok').
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

try:
    from scripts.lib.d1_sources import (
        fetch_articles_from_sql,
        fetch_pin_records_from_sql,
        load_hero_alts_from_sql,
    )
    from scripts.lib import brief_store
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.lib.d1_sources"


VALID_PIN_TITLE = "A reasonable pin title that fits the length window"
VALID_PIN_DESC = "A reasonable pin description that is long enough to satisfy the check constraint and ends with a CTA."
VALID_PIN_PROMPT = "A cinematic overhead photo of a kitchen scene with text overlay across the top of the frame."
VALID_HERO_PROMPT = "A wide overhead photo of fresh ingredients on a wooden table with morning light."


def _mk_sqlite(tmp_path: Path, rows: list[tuple]) -> Path:
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
    bcon = brief_store.connect(p)
    try:
        brief_store.init_schema(bcon)
    finally:
        bcon.close()
    return p


def _md(title: str, body: str = "Body.") -> str:
    return (
        "---\n"
        f"title: {title}\n"
        'image: "/images/x-main.jpg"\n'
        "date: 2026-04-27\n"
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
    con = sqlite3.connect(str(db))
    con.execute("UPDATE write_outputs SET disqualified=1 WHERE slug='ok'")
    con.commit()
    con.close()
    out = fetch_articles_from_sql(db)
    assert out == []


def test_fetch_articles_skips_when_title_missing_from_frontmatter(tmp_path):
    bad_md = "---\nimage: \"/images/x.jpg\"\ndate: 2026-04-27\n---\nBody.\n"
    db = _mk_sqlite(tmp_path, [
        ("bad-md", "recipes", bad_md, "written"),
        ("good",   "tips",    _md("Good"), "written"),
    ])
    out = fetch_articles_from_sql(db)
    slugs = [r["slug"] for r in out]
    assert slugs == ["good"]


# ── fetch_pin_records_from_sql ───────────────────────────────────────────────

def test_fetch_pin_records_attaches_category_from_articles(tmp_path):
    db = _mk_sqlite(tmp_path, [("demo", "recipes", _md("Demo"), "written")])
    bcon = brief_store.connect(db)
    try:
        for i in range(4):
            brief_store.upsert_pin_brief(
                bcon,
                article_slug="demo",
                pin_index=i,
                pin_slug=f"p{i}",
                title=f"{VALID_PIN_TITLE} {i}",
                description=f"{VALID_PIN_DESC} v{i}",
                prompt=VALID_PIN_PROMPT,
                alt=f"A demo pin alt for variant {i} long enough for validation.",
            )
    finally:
        bcon.close()

    articles = [{"slug": "demo", "category": "recipes", "title": "T", "markdown": "...", "image_filename": "x.jpg"}]
    out = fetch_pin_records_from_sql(db, articles)
    assert len(out) == 1
    assert out[0]["article_slug"] == "demo"
    assert out[0]["category"] == "recipes"
    assert len(out[0]["pins"]) == 4
    assert out[0]["pins"][0]["slug"] == "p0"
    assert "title" in out[0]["pins"][0]


def test_fetch_pin_records_skips_articles_without_pin_briefs(tmp_path):
    """Articles in SQL that don't yet have pin_briefs rows must be skipped
    silently — they are part of an in-progress batch."""
    db = _mk_sqlite(tmp_path, [
        ("ready", "recipes", _md("R"), "written"),
        ("not-ready", "tips", _md("N"), "written"),
    ])
    bcon = brief_store.connect(db)
    try:
        for i in range(4):
            brief_store.upsert_pin_brief(
                bcon,
                article_slug="ready",
                pin_index=i,
                pin_slug=f"p{i}",
                title=f"{VALID_PIN_TITLE} {i}",
                description=f"{VALID_PIN_DESC} v{i}",
                prompt=VALID_PIN_PROMPT,
                alt=f"A demo pin alt for variant {i} long enough for validation.",
            )
    finally:
        bcon.close()

    articles = [
        {"slug": "ready",     "category": "recipes",   "title": "R", "markdown": "...", "image_filename": "x.jpg"},
        {"slug": "not-ready", "category": "tips",      "title": "N", "markdown": "...", "image_filename": "x.jpg"},
    ]
    out = fetch_pin_records_from_sql(db, articles)
    assert [r["article_slug"] for r in out] == ["ready"]


def test_fetch_pin_records_returns_empty_when_no_rows(tmp_path):
    db = _mk_sqlite(tmp_path, [])
    out = fetch_pin_records_from_sql(db, [])
    assert out == []


def test_fetch_pin_records_skips_failed_rows(tmp_path):
    """Pins with status='failed' must not appear in the sync output."""
    db = _mk_sqlite(tmp_path, [("demo", "recipes", _md("Demo"), "written")])
    bcon = brief_store.connect(db)
    try:
        brief_store.record_failure_pin(bcon, "demo", 0, "boom")
        brief_store.record_failure_pin(bcon, "demo", 1, "boom")
    finally:
        bcon.close()
    articles = [{"slug": "demo", "category": "recipes", "title": "T", "markdown": "...", "image_filename": "x.jpg"}]
    out = fetch_pin_records_from_sql(db, articles)
    assert out == []


# ── load_hero_alts_from_sql ──────────────────────────────────────────────────

def test_load_hero_alts_returns_dict_of_slug_to_alt(tmp_path):
    db = _mk_sqlite(tmp_path, [])
    bcon = brief_store.connect(db)
    try:
        brief_store.upsert_hero_brief(
            bcon, article_slug="a", prompt=VALID_HERO_PROMPT, alt="A1 alt"
        )
        brief_store.upsert_hero_brief(
            bcon, article_slug="b", prompt=VALID_HERO_PROMPT, alt="B1 alt"
        )
    finally:
        bcon.close()
    out = load_hero_alts_from_sql(db)
    assert out == {"a": "A1 alt", "b": "B1 alt"}


def test_load_hero_alts_empty_when_no_rows(tmp_path):
    db = _mk_sqlite(tmp_path, [])
    assert load_hero_alts_from_sql(db) == {}


def test_load_hero_alts_empty_before_hero_brief_stage(tmp_path):
    db = tmp_path / "pipeline.sqlite"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE write_outputs (slug TEXT)")
    con.close()

    assert load_hero_alts_from_sql(db) == {}


def test_load_hero_alts_skips_records_without_alt(tmp_path):
    db = _mk_sqlite(tmp_path, [])
    bcon = brief_store.connect(db)
    try:
        brief_store.upsert_hero_brief(
            bcon, article_slug="a", prompt=VALID_HERO_PROMPT, alt=None
        )
        brief_store.upsert_hero_brief(
            bcon, article_slug="b", prompt=VALID_HERO_PROMPT, alt="B"
        )
    finally:
        bcon.close()
    assert load_hero_alts_from_sql(db) == {"b": "B"}


def test_load_hero_alts_skips_failed_rows(tmp_path):
    db = _mk_sqlite(tmp_path, [])
    bcon = brief_store.connect(db)
    try:
        brief_store.upsert_hero_brief(
            bcon, article_slug="ok", prompt=VALID_HERO_PROMPT, alt="OK alt"
        )
        brief_store.record_failure_hero(bcon, "broken", "boom")
    finally:
        bcon.close()
    out = load_hero_alts_from_sql(db)
    assert out == {"ok": "OK alt"}
