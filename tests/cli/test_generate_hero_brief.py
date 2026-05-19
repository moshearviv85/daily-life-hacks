"""Tests for scripts/generate_hero_brief.py.

LLM call is mocked. We verify:
- markdown ingestion (frontmatter + body digest)
- JSON extraction (plain / code fence / embedded)
- schema validation integration (bad LLM output -> ValueError)
- SQL writes via brief_store, idempotency, --force, --dry-run
- failure recording when LLM fails after retries
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

try:
    from scripts.generate_hero_brief import (
        main,
        generate_hero_brief,
        load_article,
        extract_json_object,
        parse_frontmatter,
        first_paragraphs,
    )
    from scripts.lib import brief_store
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


# ── helpers ──────────────────────────────────────────────────────────────────

def _good_llm(article):
    return {
        "prompt": "An overhead shot of a kitchen scene in soft natural daylight.",
        "alt": "An overhead photo of a kitchen counter with neatly arranged ingredients on a white surface.",
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


def _setup_article(tmp_path, monkeypatch, slug: str = "demo"):
    articles_dir = tmp_path / "articles"
    articles_dir.mkdir()
    (articles_dir / f"{slug}.md").write_text(
        '---\ntitle: "Demo Article"\n---\nBody paragraph one.\n',
        encoding="utf-8",
    )
    monkeypatch.setattr("scripts.generate_hero_brief.ARTICLES_DIR", articles_dir)
    monkeypatch.setattr(
        "scripts.generate_hero_brief.markdown_for_slug", lambda s: None
    )
    return articles_dir


# ── 1. module imports ────────────────────────────────────────────────────────

def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.generate_hero_brief"


# ── 2. parse_frontmatter ─────────────────────────────────────────────────────

def test_parse_frontmatter_basic():
    md = '---\ntitle: "Cheap Dinners"\ncategory: "recipes"\n---\nBody text here.\n'
    front, body = parse_frontmatter(md)
    assert front["title"] == "Cheap Dinners"
    assert front["category"] == "recipes"
    assert body.strip() == "Body text here."


def test_parse_frontmatter_missing():
    front, body = parse_frontmatter("Just body, no frontmatter.\n")
    assert front == {}
    assert "Just body" in body


# ── 3. first_paragraphs ──────────────────────────────────────────────────────

def test_first_paragraphs_skips_headings():
    body = "# Heading\n\nFirst paragraph here.\n\n## Sub\n\nSecond paragraph."
    out = first_paragraphs(body)
    assert "First paragraph" in out
    assert "Second paragraph" in out
    assert "# Heading" not in out
    assert "## Sub" not in out


def test_first_paragraphs_truncates():
    body = " ".join(["word"] * 300)
    out = first_paragraphs(body, max_words=50)
    assert len(out.split()) <= 51


# ── 4. extract_json_object ───────────────────────────────────────────────────

def test_extract_json_plain():
    obj = extract_json_object('{"prompt": "p", "alt": "a"}')
    assert obj == {"prompt": "p", "alt": "a"}


def test_extract_json_code_fence():
    obj = extract_json_object('```json\n{"prompt": "p", "alt": "a"}\n```')
    assert obj["prompt"] == "p"


def test_extract_json_embedded():
    obj = extract_json_object('Here is the brief: {"prompt": "p", "alt": "a"} OK')
    assert obj["alt"] == "a"


# ── 5. load_article ──────────────────────────────────────────────────────────

def test_load_article_reads_md(tmp_path, monkeypatch):
    articles_dir = tmp_path / "articles"
    articles_dir.mkdir()
    (articles_dir / "test-slug.md").write_text(
        '---\ntitle: "Test Article"\n---\nThe quick brown fox jumps over the lazy dog.\n',
        encoding="utf-8",
    )
    monkeypatch.setattr("scripts.generate_hero_brief.ARTICLES_DIR", articles_dir)
    a = load_article("test-slug")
    assert a["slug"] == "test-slug"
    assert a["title"] == "Test Article"
    assert "quick brown fox" in a["body_digest"]


def test_load_article_missing_raises(tmp_path, monkeypatch):
    monkeypatch.setattr("scripts.generate_hero_brief.ARTICLES_DIR", tmp_path)
    monkeypatch.setattr(
        "scripts.generate_hero_brief.markdown_for_slug", lambda s: None
    )
    with pytest.raises(FileNotFoundError):
        load_article("does-not-exist")


# ── 6. generate_hero_brief with mock LLM ─────────────────────────────────────

def test_generate_hero_brief_with_mock_returns_valid(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    brief = generate_hero_brief("demo", llm_call=_good_llm)
    assert brief.article_slug == "demo"
    assert "kitchen" in brief.prompt
    assert brief.alt == _good_llm(None)["alt"]


def test_generate_hero_brief_invalid_llm_output_raises(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)

    def bad_llm(article):
        return {
            "prompt": "ok prompt here that is long enough to look real",
            "alt": "alt — with em-dash inside the description text right here.",
        }

    with pytest.raises(ValueError):
        generate_hero_brief("demo", llm_call=bad_llm)


def test_generate_hero_brief_rejects_alt_over_200_chars(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)

    def bad_llm(article):
        return {
            "prompt": "A clean overhead kitchen photograph with natural light and a simple plate.",
            "alt": "A " + "very detailed " * 25 + "photo of a plate on a kitchen counter.",
        }

    with pytest.raises(ValueError):
        generate_hero_brief("demo", llm_call=bad_llm)


# ── 7. CLI ───────────────────────────────────────────────────────────────────

def test_cli_dry_run_does_not_write(tmp_path, monkeypatch, capsys):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    rc = main(["--slug", "demo", "--dry-run"], llm_call=_good_llm, db_path=db)
    assert rc == 0
    captured = capsys.readouterr()
    assert "kitchen" in captured.out
    con = brief_store.connect(db)
    try:
        assert brief_store.get_hero_brief(con, "demo") is None
    finally:
        con.close()


def test_cli_writes_to_sql(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    rc = main(["--slug", "demo"], llm_call=_good_llm, db_path=db)
    assert rc == 0
    con = brief_store.connect(db)
    try:
        row = brief_store.get_hero_brief(con, "demo")
    finally:
        con.close()
    assert row is not None
    assert row["status"] == "ok"
    assert "kitchen" in row["prompt"]


def test_cli_idempotent_skip(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    main(["--slug", "demo"], llm_call=_good_llm, db_path=db)

    def boom(article):
        raise AssertionError("LLM should not be called when slug already present")

    rc = main(["--slug", "demo"], llm_call=boom, db_path=db)
    assert rc == 0
    con = brief_store.connect(db)
    try:
        row = brief_store.get_hero_brief(con, "demo")
    finally:
        con.close()
    assert row is not None


def test_cli_force_overwrites(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)
    main(["--slug", "demo"], llm_call=_good_llm, db_path=db)

    def alt_llm(article):
        return {
            "prompt": "A different overhead kitchen scene at golden hour with warm tones.",
            "alt": "An overhead photo of a kitchen counter at golden hour with warm afternoon light streaming in.",
        }

    rc = main(["--slug", "demo", "--force"], llm_call=alt_llm, db_path=db)
    assert rc == 0
    con = brief_store.connect(db)
    try:
        row = brief_store.get_hero_brief(con, "demo")
    finally:
        con.close()
    assert "golden hour" in row["prompt"]


def test_cli_records_failure_row_when_llm_fails(tmp_path, monkeypatch):
    _setup_article(tmp_path, monkeypatch)
    db = _make_db(tmp_path)

    def always_bad(article):
        out = _good_llm(article)
        out["alt"] = "An overhead photo with em-dash — inserted to always fail validation across attempts."
        return out

    with pytest.raises(ValueError):
        main(["--slug", "demo"], llm_call=always_bad, db_path=db)

    con = brief_store.connect(db)
    try:
        row = brief_store.get_hero_brief(con, "demo")
    finally:
        con.close()
    assert row is not None
    assert row["status"] == "failed"
    assert row["error"]


# ── retry on stochastic validation failure ───────────────────────────────────

def test_generate_hero_brief_retries_when_validation_fails(tmp_path, monkeypatch):
    """LLM is non-deterministic. When a sample's alt contains a banned word
    or em-dash, the next sample will likely pass. Script must retry."""
    _setup_article(tmp_path, monkeypatch)

    call_count = {"n": 0}

    def flaky_llm(article):
        call_count["n"] += 1
        out = _good_llm(article)
        if call_count["n"] == 1:
            out["alt"] = "An overhead photo with em-dash — inserted into the alt text intentionally to fail validation."
        return out

    brief = generate_hero_brief("demo", llm_call=flaky_llm)
    assert brief.article_slug == "demo"
    assert "—" not in brief.alt
    assert call_count["n"] == 2, f"expected 2 LLM calls, got {call_count['n']}"


def test_generate_hero_brief_gives_up_after_max_retries(tmp_path, monkeypatch):
    """When every sample fails, the retry loop must terminate with a clear error."""
    _setup_article(tmp_path, monkeypatch)

    call_count = {"n": 0}

    def always_bad_llm(article):
        call_count["n"] += 1
        out = _good_llm(article)
        out["alt"] = "An overhead photo with em-dash — inserted to always fail validation across attempts."
        return out

    with pytest.raises(ValueError):
        generate_hero_brief("demo", llm_call=always_bad_llm)
    assert call_count["n"] >= 3, f"expected >=3 attempts, got {call_count['n']}"
    assert call_count["n"] <= 10, f"too many attempts ({call_count['n']}), retry cap missing"
