"""Tests for scripts/lib/article_lookup.py — read article markdown from SQL.

Source of truth per scripts_principles rule 4: write_outputs.markdown in
pipeline-data/topic-research.sqlite. Disk md files are a delivery-layer
side-effect, not the read path.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

try:
    from scripts.lib.article_lookup import markdown_for_slug
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


def _make_db(tmp_path: Path, rows: list[tuple[str, str]]) -> Path:
    db = tmp_path / "test.sqlite"
    con = sqlite3.connect(str(db))
    con.execute("CREATE TABLE write_outputs (slug TEXT, markdown TEXT, status TEXT)")
    for slug, md in rows:
        con.execute("INSERT INTO write_outputs (slug, markdown, status) VALUES (?, ?, 'written')", (slug, md))
    con.commit()
    con.close()
    return db


def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.lib.article_lookup"


def test_markdown_for_slug_returns_content_when_present(tmp_path):
    db = _make_db(tmp_path, [("foo", "---\ntitle: Foo\n---\nbody one.\n")])
    out = markdown_for_slug("foo", db_path=db)
    assert out is not None
    assert "title: Foo" in out
    assert "body one" in out


def test_markdown_for_slug_returns_none_when_missing(tmp_path):
    db = _make_db(tmp_path, [("foo", "x")])
    assert markdown_for_slug("missing", db_path=db) is None


def test_markdown_for_slug_returns_none_when_db_path_does_not_exist(tmp_path):
    nope = tmp_path / "nope.sqlite"
    assert markdown_for_slug("foo", db_path=nope) is None


def test_markdown_for_slug_returns_none_when_markdown_null(tmp_path):
    db = tmp_path / "test.sqlite"
    con = sqlite3.connect(str(db))
    con.execute("CREATE TABLE write_outputs (slug TEXT, markdown TEXT)")
    con.execute("INSERT INTO write_outputs (slug, markdown) VALUES ('foo', NULL)")
    con.commit()
    con.close()
    assert markdown_for_slug("foo", db_path=db) is None
