"""Tests for scripts/generate_pin_briefs.py.

LLM call is mocked. Verifies the pin-briefs pipeline:
- markdown ingestion (frontmatter + body digest, shared with hero script)
- LLM JSON extraction -> 4 raw pins -> pin-slug derivation in Python
- schema validation integration (PinBriefSet, 4-unique constraint)
- SQL writes via brief_store, per-pin transactions
- failure recording when LLM fails after retries
- --description-only backfill
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

try:
    from scripts.generate_pin_briefs import (
        main,
        generate_pin_briefs,
        backfill_descriptions,
        parse_pins_text,
        EXPECTED_PINS_PER_ARTICLE,
    )
    from scripts.lib import brief_store
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


# ── helpers ──────────────────────────────────────────────────────────────────

def _good_llm(article):
    return {
        "pins": [
            {
                "title": "5 Pantry Swaps That Cut Your Grocery Bill in Half",
                "prompt": 'A cinematic overhead photo of a kitchen pantry. Render the text "5 Pantry Swaps That Cut Your Grocery Bill in Half" prominently across the top.',
                "alt": "An overhead photo of a kitchen pantry with neatly arranged glass jars on a wooden shelf.",
                "description": "Stop overspending at the store. Click for 5 pantry swaps that quietly cut your bill in half this week.",
            },
            {
                "title": "The Ingredient Costing You $40 a Week",
                "prompt": 'A close-up of a grocery receipt next to one ingredient. Render the text "The Ingredient Costing You $40 a Week" boldly in the top half.',
                "alt": "A close-up photo of a grocery receipt next to a single ingredient highlighted in red.",
                "description": "One ingredient is eating $40 a week from your budget. Find out which one and what to swap it with.",
            },
            {
                "title": "Why Bulk Buying Backfires for Most Families",
                "prompt": 'A wide shot of a family cart at supermarket checkout. Render the text "Why Bulk Buying Backfires for Most Families" across the lower band.',
                "alt": "A wide photo of a family cart at the supermarket checkout filled with bulk packages.",
                "description": "Bulk buying sounds smart but wastes money for most families. See the rule that fixes it tonight.",
            },
            {
                "title": "Cheap Dinners My Kids Actually Eat",
                "prompt": 'A photo of a smiling child holding a plate of pasta. Render the text "Cheap Dinners My Kids Actually Eat" in a friendly typography on the side.',
                "alt": "A photo of a smiling child holding a plate of pasta with simple toppings on it.",
                "description": "Picky kids and tight budgets do not mix. Get the dinner formula that works on both, every weeknight.",
            },
        ]
    }


def _make_db(tmp_path: Path) -> Path:
    db = tmp_path / "test.sqlite"
    con = sqlite3.connect(str(db))
    con.execute(
        "CREATE TABLE write_outputs (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, status TEXT, markdown TEXT)"
    )
    con.commit()
    con.close()
    con = brief_store.connect(db)
    brief_store.init_schema(con)
    con.close()
    return db


def _setup_article(tmp_path, monkeypatch, slug: str = "demo") -> Path:
    articles_dir = tmp_path / "articles"
    articles_dir.mkdir()
    (articles_dir / f"{slug}.md").write_text(
        '---\ntitle: "Demo Article"\n---\nBody paragraph one.\n',
        encoding="utf-8",
    )
    monkeypatch.setattr("scripts.generate_pin_briefs.ARTICLES_DIR", articles_dir)
    # disable SQL article fallback so the on-disk markdown is used
    monkeypatch.setattr(
        "scripts.generate_pin_briefs.markdown_for_slug", lambda s: None
    )
    return articles_dir


def _seed_legacy_pins(db: Path, slug: str = "demo") -> list[dict]:
    """Seed pin_briefs with 4 rows that have title/prompt/alt/slug but
    descriptions that match the LLM's expected response. Returns the legacy
    list as the script would read it back."""
    legacy = _legacy_pin_rows()
    con = brief_store.connect(db)
    try:
        for idx, p in enumerate(legacy):
            brief_store.upsert_pin_brief(
                con,
                article_slug=slug,
                pin_index=idx,
                pin_slug=p["slug"],
                title=p["title"],
                prompt=p["prompt"],
                alt=p["alt"],
                description=p["description"],
            )
    finally:
        con.close()
    return legacy


def _legacy_pin_rows() -> list[dict]:
    """A pre-description-era set: title/prompt/alt/slug locked. Description
    is a placeholder that meets length so the row inserts; backfill rewrites."""
    placeholder = "Old description placeholder text that fills the length window for the schema check constraint."
    return [
        {
            "slug": "pantry-swaps-cut-grocery-bill",
            "title": "5 Pantry Swaps That Cut Your Grocery Bill in Half",
            "prompt": 'Overhead pantry photo. Render the text "5 Pantry Swaps That Cut Your Grocery Bill in Half" across the top.',
            "alt": "An overhead photo of a kitchen pantry with neatly arranged glass jars on a wooden shelf.",
            "description": placeholder,
        },
        {
            "slug": "ingredient-costing-forty-week",
            "title": "The Ingredient Costing You $40 a Week",
            "prompt": 'Receipt close-up. Render the text "The Ingredient Costing You $40 a Week" boldly in the top half.',
            "alt": "A close-up photo of a grocery receipt next to a single ingredient highlighted in red.",
            "description": placeholder,
        },
        {
            "slug": "bulk-buying-backfires-families",
            "title": "Why Bulk Buying Backfires for Most Families",
            "prompt": 'Cart at checkout. Render the text "Why Bulk Buying Backfires for Most Families" across the lower band.',
            "alt": "A wide photo of a family cart at the supermarket checkout filled with bulk packages.",
            "description": placeholder,
        },
        {
            "slug": "cheap-dinners-kids-actually-eat",
            "title": "Cheap Dinners My Kids Actually Eat",
            "prompt": 'Smiling child with pasta plate. Render the text "Cheap Dinners My Kids Actually Eat" on the side.',
            "alt": "A photo of a smiling child holding a plate of pasta with simple toppings on it.",
            "description": placeholder,
        },
    ]


def _good_descriptions_llm(article, pin_titles):
    return {
        "descriptions": [
            "Stop overspending at the store. Click for 5 pantry swaps that quietly cut your bill in half this week.",
            "One ingredient is eating $40 a week from your budget. See which one and what to swap it with.",
            "Bulk buying sounds smart but wastes money for most families. See the rule that fixes it tonight.",
            "Picky kids and tight budgets do not mix. Get the dinner formula that works on both, every weeknight.",
        ]
    }


# ── 1. module imports ────────────────────────────────────────────────────────

def test_module_imports():
    assert _IMPORT_OK


# ── parse_pins_text — plain-text format parser ───────────────────────────────

def test_parse_pins_text_basic():
    text = """PIN 1
TITLE: First pin title here
PROMPT: First pin prompt here
ALT: First pin alt text here
DESCRIPTION: First pin description here

PIN 2
TITLE: Second pin title
PROMPT: Second pin prompt
ALT: Second pin alt
DESCRIPTION: Second pin description

PIN 3
TITLE: Third
PROMPT: Third prompt
ALT: Third alt
DESCRIPTION: Third desc

PIN 4
TITLE: Fourth
PROMPT: Fourth prompt
ALT: Fourth alt
DESCRIPTION: Fourth desc
"""
    out = parse_pins_text(text)
    assert len(out["pins"]) == 4
    assert out["pins"][0]["title"] == "First pin title here"
    assert out["pins"][1]["description"] == "Second pin description"


def test_parse_pins_text_skips_preamble():
    text = """Sure, here are the 4 pins:

PIN 1
TITLE: T1
PROMPT: P1
ALT: A1
DESCRIPTION: D1

PIN 2
TITLE: T2
PROMPT: P2
ALT: A2
DESCRIPTION: D2
"""
    out = parse_pins_text(text)
    assert len(out["pins"]) == 2
    assert out["pins"][0]["title"] == "T1"


def test_parse_pins_text_handles_apostrophes_and_dollar_signs():
    """The whole point of plain text: no escape needed."""
    text = """PIN 1
TITLE: $40 Saved on Kids' Lunches
PROMPT: A photo. Render the text "$40 Saved on Kids' Lunches" across the top.
ALT: A child's lunch box with healthy items.
DESCRIPTION: Don't waste money. Click for the swap that saves $40 a week on the kids' lunches.
"""
    out = parse_pins_text(text)
    assert out["pins"][0]["title"] == "$40 Saved on Kids' Lunches"
    assert "kids'" in out["pins"][0]["description"]


def test_parse_pins_text_case_insensitive_headers():
    text = """pin 1
Title: T1
prompt: P1
alt: A1
Description: D1
"""
    out = parse_pins_text(text)
    assert out["pins"][0]["title"] == "T1"
    assert out["pins"][0]["description"] == "D1"


def test_parse_pins_text_strips_code_fence():
    text = """```
PIN 1
TITLE: T1
PROMPT: P1
ALT: A1
DESCRIPTION: D1
```
"""
    out = parse_pins_text(text)
    assert len(out["pins"]) == 1
    assert out["pins"][0]["title"] == "T1"


def test_parse_pins_text_empty_input_returns_no_pins():
    out = parse_pins_text("")
    assert out == {"pins": []}


def test_parse_pins_text_unknown_field_ignored():
    text = """PIN 1
TITLE: T1
PROMPT: P1
ALT: A1
DESCRIPTION: D1
EXTRA: should be ignored
"""
    out = parse_pins_text(text)
    assert out["pins"][0] == {"title": "T1", "prompt": "P1", "alt": "A1", "description": "D1"}


# ── 2. generate_pin_briefs (pure validation, no SQL) ─────────────────────────


def test_generate_pin_briefs_returns_pin_brief_set(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    pset = generate_pin_briefs("demo", llm_call=_good_llm)
    assert pset.article_slug == "demo"
    assert len(pset.pins) == 4


def test_generate_pin_briefs_derives_unique_slugs(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    pset = generate_pin_briefs("demo", llm_call=_good_llm)
    slugs = [p.slug for p in pset.pins]
    assert len(set(slugs)) == 4
    assert all(slugs)


def test_generate_pin_briefs_invalid_em_dash_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    bad["pins"][0]["alt"] = "An overhead photo — with em-dash inserted into the alt text intentionally."
    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


def test_generate_pin_briefs_three_pins_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    bad["pins"] = bad["pins"][:3]
    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


def test_generate_pin_briefs_duplicate_titles_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    bad["pins"][1]["title"] = bad["pins"][0]["title"]
    bad["pins"][1]["prompt"] = bad["pins"][0]["prompt"]
    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


def test_generate_pin_briefs_near_duplicate_title_phrase_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    titles = [
        "No More Cold Centers: The Only Way You Should Ever Cook Prime Rib",
        "Edge to Edge Perfection: The Only Way You Should Ever Cook Prime Rib",
        "Skip the Grey Ring: The Only Way You Should Ever Cook Prime Rib",
        "Reverse Sear: The Only Way You Should Ever Cook Prime Rib",
    ]
    for pin, title in zip(bad["pins"], titles):
        pin["title"] = title
        pin["prompt"] = f'A prime rib photo. Render the text "{title}" across the top.'

    with pytest.raises(ValueError, match="too similar"):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


def test_generate_pin_briefs_prompt_missing_title_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    bad = _good_llm(None)
    bad["pins"][0]["prompt"] = "A photo with bold text overlay but no exact title rendered."
    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=lambda a: bad)


# ── 3. CLI dry-run ──────────────────────────────────────────────────────────


def test_cli_dry_run_does_not_write(tmp_path, monkeypatch, capsys):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    rc = main(["--slug", "demo", "--dry-run"], llm_call=_good_llm, db_path=db)
    assert rc == 0
    captured = capsys.readouterr()
    assert "Pantry Swaps" in captured.out
    con = brief_store.connect(db)
    try:
        rows = brief_store.list_pin_briefs(con, "demo", only_ok=False)
    finally:
        con.close()
    assert rows == []


# ── 4. CLI write to SQL ─────────────────────────────────────────────────────


def test_cli_writes_to_sql(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    rc = main(["--slug", "demo"], llm_call=_good_llm, db_path=db)
    assert rc == 0
    con = brief_store.connect(db)
    try:
        rows = brief_store.list_pin_briefs(con, "demo")
    finally:
        con.close()
    assert len(rows) == 4
    assert all(r["status"] == "ok" for r in rows)
    assert [r["pin_index"] for r in rows] == [0, 1, 2, 3]
    titles = [r["title"] for r in rows]
    assert "5 Pantry Swaps That Cut Your Grocery Bill in Half" in titles


def test_cli_idempotent_skip_when_already_present(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    main(["--slug", "demo"], llm_call=_good_llm, db_path=db)

    def boom(article):
        raise AssertionError("LLM should not be called when slug already complete")

    rc = main(["--slug", "demo"], llm_call=boom, db_path=db)
    assert rc == 0
    con = brief_store.connect(db)
    try:
        rows = brief_store.list_pin_briefs(con, "demo")
    finally:
        con.close()
    assert len(rows) == 4


def test_cli_force_overwrites(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    main(["--slug", "demo"], llm_call=_good_llm, db_path=db)

    def alt_llm(article):
        out = _good_llm(article)
        for p in out["pins"]:
            new_title = p["title"] + " (V2)"
            p["title"] = new_title
            p["prompt"] = f'An updated photo. Render the text "{new_title}" in the top band.'
        return out

    rc = main(["--slug", "demo", "--force"], llm_call=alt_llm, db_path=db)
    assert rc == 0
    con = brief_store.connect(db)
    try:
        rows = brief_store.list_pin_briefs(con, "demo")
    finally:
        con.close()
    assert len(rows) == 4
    assert all("(V2)" in r["title"] for r in rows)


# ── 5. retry on stochastic validation failure ───────────────────────────────


def test_generate_pin_briefs_retries_when_validation_fails(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    call_count = {"n": 0}

    def flaky_llm(article):
        call_count["n"] += 1
        out = _good_llm(article)
        if call_count["n"] == 1:
            out["pins"][0]["title"] = "Unlock the Secret Pantry"
            out["pins"][0]["prompt"] = 'A photo. Render the text "Unlock the Secret Pantry" in the top band.'
        return out

    pset = generate_pin_briefs("demo", llm_call=flaky_llm)
    assert pset.article_slug == "demo"
    assert call_count["n"] == 2


def test_generate_pin_briefs_gives_up_after_max_retries(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    call_count = {"n": 0}

    def always_bad_llm(article):
        call_count["n"] += 1
        out = _good_llm(article)
        out["pins"][0]["title"] = "Unlock the Best Recipe"
        out["pins"][0]["prompt"] = 'A photo. Render the text "Unlock the Best Recipe" in the top band.'
        return out

    with pytest.raises(ValueError):
        generate_pin_briefs("demo", llm_call=always_bad_llm)
    assert 3 <= call_count["n"] <= 10


# ── 6. failure rows on hard fail ────────────────────────────────────────────


def test_cli_records_failure_rows_when_llm_fails(tmp_path, monkeypatch):
    """When the LLM fails after all retries, main records 4 status='failed' rows
    so the failure is visible in SQL instead of disappearing."""
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)

    def always_bad_llm(article):
        out = _good_llm(article)
        out["pins"][0]["title"] = "Unlock the Best Recipe"
        out["pins"][0]["prompt"] = 'A photo. Render the text "Unlock the Best Recipe" in the top band.'
        return out

    with pytest.raises(ValueError):
        main(["--slug", "demo"], llm_call=always_bad_llm, db_path=db)

    con = brief_store.connect(db)
    try:
        rows = brief_store.list_pin_briefs(con, "demo", only_ok=False)
    finally:
        con.close()
    assert len(rows) == 4
    assert all(r["status"] == "failed" for r in rows)
    assert all(r["error"] for r in rows)


# ── 7. --description-only backfill ──────────────────────────────────────────


def test_backfill_descriptions_returns_full_pin_brief_set(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    _seed_legacy_pins(db)
    pset = backfill_descriptions(
        "demo", llm_call=_good_descriptions_llm, db_path=db
    )
    assert pset.article_slug == "demo"
    assert len(pset.pins) == 4
    assert all(80 <= len(p.description) <= 200 for p in pset.pins)


def test_backfill_descriptions_preserves_titles_prompts_alts_slugs(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    legacy = _seed_legacy_pins(db)
    pset = backfill_descriptions(
        "demo", llm_call=_good_descriptions_llm, db_path=db
    )
    for old, new in zip(legacy, pset.pins):
        assert new.slug == old["slug"]
        assert new.title == old["title"]
        assert new.prompt == old["prompt"]
        assert new.alt == old["alt"]


def test_backfill_descriptions_retries_on_too_short(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    _seed_legacy_pins(db)
    call_count = {"n": 0}

    def flaky_llm(article, pin_titles):
        call_count["n"] += 1
        out = _good_descriptions_llm(article, pin_titles)
        if call_count["n"] == 1:
            out["descriptions"][2] = "Too short."
        return out

    pset = backfill_descriptions("demo", llm_call=flaky_llm, db_path=db)
    assert len(pset.pins) == 4
    assert call_count["n"] == 2


def test_backfill_descriptions_gives_up_after_max_retries(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    _seed_legacy_pins(db)

    def always_bad_llm(article, pin_titles):
        out = _good_descriptions_llm(article, pin_titles)
        out["descriptions"][0] = "Too short."
        return out

    with pytest.raises(ValueError):
        backfill_descriptions("demo", llm_call=always_bad_llm, db_path=db)


def test_backfill_descriptions_raises_when_no_rows(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    with pytest.raises((KeyError, ValueError)):
        backfill_descriptions(
            "demo", llm_call=_good_descriptions_llm, db_path=db
        )


def test_backfill_descriptions_wrong_count_retries(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    _seed_legacy_pins(db)
    call_count = {"n": 0}

    def flaky_llm(article, pin_titles):
        call_count["n"] += 1
        out = _good_descriptions_llm(article, pin_titles)
        if call_count["n"] == 1:
            out["descriptions"] = out["descriptions"][:3]
        return out

    pset = backfill_descriptions("demo", llm_call=flaky_llm, db_path=db)
    assert len(pset.pins) == 4
    assert call_count["n"] == 2


def test_cli_description_only_writes_to_sql(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    _seed_legacy_pins(db)
    rc = main(
        ["--slug", "demo", "--description-only"],
        llm_call=_good_descriptions_llm,
        db_path=db,
    )
    assert rc == 0
    con = brief_store.connect(db)
    try:
        rows = brief_store.list_pin_briefs(con, "demo")
    finally:
        con.close()
    assert len(rows) == 4
    descs = [r["description"] for r in rows]
    assert all("placeholder" not in d for d in descs), "old placeholder must be replaced"
    assert all(80 <= len(d) <= 200 for d in descs)


def test_cli_description_only_preserves_neighbor_records(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    _seed_legacy_pins(db, slug="demo")
    # neighbor: another article with a single pin
    con = brief_store.connect(db)
    try:
        brief_store.upsert_pin_brief(
            con,
            article_slug="other-a",
            pin_index=0,
            pin_slug="other-a-pin",
            title="A neighbor title that is long enough to satisfy the check",
            description="A neighbor description that is long enough to satisfy the check constraint and should not be touched.",
            prompt="A neighbor prompt that is long enough to satisfy the check constraint.",
        )
    finally:
        con.close()

    main(
        ["--slug", "demo", "--description-only"],
        llm_call=_good_descriptions_llm,
        db_path=db,
    )

    con = brief_store.connect(db)
    try:
        neighbor = brief_store.list_pin_briefs(con, "other-a")
    finally:
        con.close()
    assert len(neighbor) == 1
    assert neighbor[0]["title"] == "A neighbor title that is long enough to satisfy the check"
    assert "should not be touched" in neighbor[0]["description"]
