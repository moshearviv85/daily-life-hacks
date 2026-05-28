import json
import sqlite3
import pytest
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"
sys.path.insert(0, str(SCRIPT_DIR))

from sync_pipeline_to_d1 import (
    collect_articles_from_sqlite,
    collect_pins_from_sqlite,
    build_payload,
)

@pytest.fixture
def pipeline_db(tmp_path):
    db_path = tmp_path / "test.sqlite"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE write_outputs (
            id INTEGER PRIMARY KEY, slug TEXT, topic TEXT, category TEXT,
            model_id TEXT, markdown TEXT, tokens_in INTEGER, tokens_out INTEGER,
            cost_usd REAL, status TEXT, created_at TEXT
        );
        CREATE TABLE review_outputs (
            id INTEGER PRIMARY KEY, slug TEXT, reviewed_markdown TEXT,
            review_model TEXT, tokens_in INTEGER, tokens_out INTEGER,
            cost_usd REAL, status TEXT, created_at TEXT
        );
        CREATE TABLE hero_briefs (
            id INTEGER PRIMARY KEY, article_slug TEXT, status TEXT,
            prompt TEXT, alt TEXT, model_id TEXT, created_at TEXT
        );
        CREATE TABLE pin_briefs (
            id INTEGER PRIMARY KEY, article_slug TEXT, pin_index INTEGER,
            pin_slug TEXT, title TEXT, description TEXT, prompt TEXT, alt TEXT,
            status TEXT, model_id TEXT, created_at TEXT
        );
    """)
    markdown = "# Test\n" + ("word " * 600)
    conn.execute(
        "INSERT INTO write_outputs VALUES (1, 'test-slug', 'Test Topic', 'recipes', "
        "'gemini-2.5-flash', ?, 100, 500, 0.001, 'reviewed', '2026-05-13')",
        (markdown,),
    )
    conn.execute(
        "INSERT INTO review_outputs VALUES (1, 'test-slug', '# Reviewed Test', "
        "'gemini-2.5-flash', 200, 600, 0.002, 'ok', '2026-05-13')"
    )
    conn.execute(
        "INSERT INTO hero_briefs VALUES (1, 'test-slug', 'ok', "
        "'A photo of falafel', 'Crispy falafel on a plate', 'gemini', '2026-05-13')"
    )
    conn.execute(
        "INSERT INTO pin_briefs VALUES (1, 'test-slug', 0, 'crispy-falafel-tip', "
        "'Crispy Falafel Tips', 'Learn the secret...', 'Photo of golden falafel', "
        "'Golden falafel balls', 'ok', 'gemini', '2026-05-13')"
    )
    conn.commit()
    conn.close()
    return db_path

def test_collect_articles(pipeline_db):
    articles = collect_articles_from_sqlite(str(pipeline_db))
    assert len(articles) == 1
    a = articles[0]
    assert a["slug"] == "test-slug"
    assert a["category"] == "recipes"
    # Fixture has review_outputs (ok), hero_briefs (ok), and pin_briefs (ok),
    # so stage advances to "pins_brief" per the progression logic.
    assert a["stage"] == "pins_brief"
    assert a["cost_usd"] > 0

def test_collect_pins(pipeline_db):
    pins = collect_pins_from_sqlite(str(pipeline_db))
    assert len(pins) == 1
    p = pins[0]
    assert p["pin_slug"] == "crispy-falafel-tip"
    assert p["article_slug"] == "test-slug"

def test_build_payload(pipeline_db):
    articles = collect_articles_from_sqlite(str(pipeline_db))
    pins = collect_pins_from_sqlite(str(pipeline_db))
    payload = build_payload(articles, pins)
    assert "articles" in payload
    assert "pins" in payload
    assert len(payload["articles"]) == 1
    assert len(payload["pins"]) == 1


def test_article_only_db_syncs_before_asset_tables_exist(tmp_path):
    db_path = tmp_path / "article_only.sqlite"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE write_outputs (
            id INTEGER PRIMARY KEY, slug TEXT, topic TEXT, category TEXT,
            model_id TEXT, markdown TEXT, tokens_in INTEGER, tokens_out INTEGER,
            cost_usd REAL, status TEXT, created_at TEXT
        );
        CREATE TABLE review_outputs (
            id INTEGER PRIMARY KEY, slug TEXT, reviewed_markdown TEXT,
            review_model TEXT, tokens_in INTEGER, tokens_out INTEGER,
            cost_usd REAL, status TEXT, created_at TEXT
        );
    """)
    conn.execute(
        "INSERT INTO write_outputs VALUES (1, 'article-only', 'Article Only', 'recipes', "
        "'gemini-2.5-flash', '# Article Only', 100, 500, 0.001, 'reviewed', '2026-05-28')"
    )
    conn.execute(
        "INSERT INTO review_outputs VALUES (1, 'article-only', '# Reviewed Article Only', "
        "'gemini-2.5-flash', 200, 600, 0.002, 'ok', '2026-05-28')"
    )
    conn.commit()
    conn.close()

    articles = collect_articles_from_sqlite(str(db_path))
    pins = collect_pins_from_sqlite(str(db_path))

    assert len(articles) == 1
    assert articles[0]["slug"] == "article-only"
    assert articles[0]["stage"] == "reviewed"
    assert pins == []


def test_disqualified_write_outputs_do_not_sync_as_articles(tmp_path):
    db_path = tmp_path / "dq.sqlite"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE write_outputs (
            id INTEGER PRIMARY KEY, slug TEXT, topic TEXT, category TEXT,
            model_id TEXT, markdown TEXT, tokens_in INTEGER, tokens_out INTEGER,
            cost_usd REAL, status TEXT, created_at TEXT
        );
    """)
    conn.execute(
        "INSERT INTO write_outputs VALUES (1, 'dq-topic', 'DQ Topic', 'nutrition', "
        "'gemini-2.5-flash', '', 100, 500, 0.001, 'dq', '2026-05-28')"
    )
    conn.commit()
    conn.close()

    assert collect_articles_from_sqlite(str(db_path)) == []


def test_asset_db_syncs_from_staging_markdown_without_write_outputs(tmp_path, monkeypatch):
    db_path = tmp_path / "asset_only.sqlite"
    conn = sqlite3.connect(str(db_path))
    conn.executescript("""
        CREATE TABLE hero_briefs (
            article_slug TEXT, status TEXT, prompt TEXT, alt TEXT
        );
        CREATE TABLE pin_briefs (
            article_slug TEXT, pin_slug TEXT, pin_index INTEGER,
            title TEXT, description TEXT, prompt TEXT, alt TEXT, status TEXT
        );
    """)
    conn.execute(
        "INSERT INTO hero_briefs VALUES ('asset-only', 'ok', 'Prompt', 'Alt text')"
    )
    for idx in range(4):
        conn.execute(
            "INSERT INTO pin_briefs VALUES (?, ?, ?, ?, ?, ?, ?, 'ok')",
            (
                "asset-only",
                f"asset-pin-{idx + 1}",
                idx,
                f"Pin {idx + 1}",
                "Description",
                "Prompt",
                "Alt",
            ),
        )
    conn.commit()
    conn.close()

    article_dir = tmp_path / "articles"
    article_dir.mkdir()
    (article_dir / "asset-only.md").write_text(
        "---\n"
        'title: "Asset Only Article"\n'
        'category: "recipes"\n'
        "---\n"
        "Body words here.\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("sync_pipeline_to_d1.ARTICLE_DIR", article_dir)

    articles = collect_articles_from_sqlite(str(db_path))
    pins = collect_pins_from_sqlite(str(db_path))

    assert len(articles) == 1
    assert articles[0]["slug"] == "asset-only"
    assert articles[0]["topic"] == "Asset Only Article"
    assert articles[0]["category"] == "recipes"
    assert articles[0]["stage"] == "deployed"
    assert len(pins) == 4
