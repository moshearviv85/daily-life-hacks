"""Tests for scripts/bulk_deploy_articles.py — write 50 articles from
write_outputs SQL to src/data/articles/{slug}.md, with hero alt injected
and frontmatter cleaned."""
from __future__ import annotations

import sqlite3
from datetime import date
from pathlib import Path

import pytest

try:
    from scripts.bulk_deploy_articles import main, build_article_md
    from scripts.lib import brief_store
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


VALID_HERO_PROMPT = "A wide overhead photo of fresh ingredients on a wooden table with morning light."


def test_module_imports():
    assert _IMPORT_OK


def _make_pipeline(tmp_path: Path, articles: list[tuple[str, str, str]]) -> Path:
    """articles: list of (slug, category, markdown). Returns DB path.
    The markdown is treated as written to write_outputs."""
    db = tmp_path / "topic.sqlite"
    con = sqlite3.connect(str(db))
    con.execute("""
        CREATE TABLE write_outputs (
            id INTEGER PRIMARY KEY,
            run_id INTEGER, topic_id INTEGER, topic_rank INTEGER,
            topic TEXT, category TEXT, slug TEXT,
            model_id TEXT, markdown TEXT,
            status TEXT, disqualified INTEGER DEFAULT 0
        )
    """)
    for i, (slug, cat, md) in enumerate(articles, start=1):
        con.execute(
            "INSERT INTO write_outputs (run_id, topic_id, topic_rank, topic, category, slug, model_id, markdown, status) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (1, i, i, slug, cat, slug, "test-model", md, "written"),
        )
    con.commit()
    con.close()
    bcon = brief_store.connect(db)
    try:
        brief_store.init_schema(bcon)
    finally:
        bcon.close()
    return db


def _seed_hero(db: Path, slug: str, alt: str) -> None:
    bcon = brief_store.connect(db)
    try:
        brief_store.upsert_hero_brief(
            bcon, article_slug=slug, prompt=VALID_HERO_PROMPT, alt=alt
        )
    finally:
        bcon.close()


def _md(title: str = "Demo", img: str = "/images/demo-main.jpg",
        existing_alt: str = "stale alt", body: str = "Body.") -> str:
    return (
        "---\n"
        f'title: "{title}"\n'
        'category: "recipes"\n'
        f'image: "{img}"\n'
        f'imageAlt: "{existing_alt}"\n'
        "date: 2025-01-01\n"
        "---\n"
        f"{body}\n"
    )


# ── build_article_md (pure function) ─────────────────────────────────────────

def test_build_article_md_injects_hero_alt():
    article_md = _md(existing_alt="stale alt from writer")
    out = build_article_md(article_md, hero_alt="Fresh hero alt")
    assert "Fresh hero alt" in out
    assert "stale alt from writer" not in out


def test_build_article_md_cleans_frontmatter():
    article_md = _md()
    out = build_article_md(article_md, hero_alt="Fresh alt")
    today = date.today().isoformat()
    assert f"date: {today}" in out
    assert 'author: "David Miller"' in out


def test_build_article_md_no_hero_alt_keeps_existing():
    article_md = _md(existing_alt="existing alt")
    out = build_article_md(article_md, hero_alt=None)
    assert "existing alt" in out


# ── CLI: dry-run ─────────────────────────────────────────────────────────────

def test_cli_dry_run_does_not_write(tmp_path):
    db = _make_pipeline(tmp_path, [("demo", "recipes", _md())])
    _seed_hero(db, "demo", "Fresh alt")
    out_dir = tmp_path / "articles"
    out_dir.mkdir()

    rc = main([
        "--db", str(db),
        "--out-dir", str(out_dir),
        "--dry-run",
    ])
    assert rc == 0
    assert list(out_dir.glob("*.md")) == []


def test_cli_writes_one_md_per_article(tmp_path):
    db = _make_pipeline(tmp_path, [
        ("a", "recipes", _md(title="A")),
        ("b", "tips",    _md(title="B")),
        ("c", "nutrition", _md(title="C")),
    ])
    _seed_hero(db, "a", "Alt A")
    _seed_hero(db, "b", "Alt B")
    _seed_hero(db, "c", "Alt C")
    out_dir = tmp_path / "articles"
    out_dir.mkdir()

    rc = main(["--db", str(db), "--out-dir", str(out_dir)])
    assert rc == 0
    files = sorted(p.name for p in out_dir.glob("*.md"))
    assert files == ["a.md", "b.md", "c.md"]


def test_cli_injects_hero_alt_into_each_file(tmp_path):
    db = _make_pipeline(tmp_path, [("demo", "recipes", _md(existing_alt="stale"))])
    _seed_hero(db, "demo", "Fresh hero alt")
    out_dir = tmp_path / "articles"
    out_dir.mkdir()

    main(["--db", str(db), "--out-dir", str(out_dir)])
    content = (out_dir / "demo.md").read_text(encoding="utf-8")
    assert "Fresh hero alt" in content
    assert "stale" not in content


def test_cli_overwrites_existing_files(tmp_path):
    db = _make_pipeline(tmp_path, [("demo", "recipes", _md(title="New Version"))])
    _seed_hero(db, "demo", "Fresh alt")
    out_dir = tmp_path / "articles"
    out_dir.mkdir()
    (out_dir / "demo.md").write_text("OLD CONTENT", encoding="utf-8")

    main(["--db", str(db), "--out-dir", str(out_dir)])
    content = (out_dir / "demo.md").read_text(encoding="utf-8")
    assert "OLD CONTENT" not in content
    assert "New Version" in content


def test_cli_filter_by_slug(tmp_path):
    db = _make_pipeline(tmp_path, [
        ("a", "recipes", _md()),
        ("b", "tips",    _md()),
    ])
    _seed_hero(db, "a", "Alt A")
    _seed_hero(db, "b", "Alt B")
    out_dir = tmp_path / "articles"
    out_dir.mkdir()

    main(["--db", str(db), "--out-dir", str(out_dir), "--slug", "a"])
    files = sorted(p.name for p in out_dir.glob("*.md"))
    assert files == ["a.md"]


def test_cli_skips_articles_without_title(tmp_path):
    """No title in frontmatter -> Astro can't render it -> skip.
    Same logic as fetch_articles_from_sql in lib/d1_sources.py."""
    bad_md = "---\nimage: \"/images/x.jpg\"\ndate: 2026-04-28\n---\nBody.\n"
    db = _make_pipeline(tmp_path, [
        ("bad", "recipes", bad_md),
        ("good", "tips", _md(title="Good")),
    ])
    _seed_hero(db, "good", "Alt G")
    out_dir = tmp_path / "articles"
    out_dir.mkdir()

    rc = main(["--db", str(db), "--out-dir", str(out_dir)])
    assert rc == 0
    files = sorted(p.name for p in out_dir.glob("*.md"))
    assert files == ["good.md"]


def test_cli_works_when_hero_alt_missing(tmp_path):
    """An article without a hero brief should still deploy with whatever
    imageAlt is in the original frontmatter."""
    db = _make_pipeline(tmp_path, [("demo", "recipes", _md(existing_alt="original"))])
    out_dir = tmp_path / "articles"
    out_dir.mkdir()

    rc = main(["--db", str(db), "--out-dir", str(out_dir)])
    assert rc == 0
    content = (out_dir / "demo.md").read_text(encoding="utf-8")
    assert "original" in content
