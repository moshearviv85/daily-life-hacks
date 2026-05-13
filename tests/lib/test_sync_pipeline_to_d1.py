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
