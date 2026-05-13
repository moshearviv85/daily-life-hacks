import sqlite3
import pytest
from pathlib import Path

SCHEMA_SQL = (Path(__file__).resolve().parents[2] / "schema.sql").read_text()

def _fresh_db():
    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA_SQL)
    return conn

def test_pipeline_articles_table_exists():
    conn = _fresh_db()
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    assert "pipeline_articles" in tables
    assert "pipeline_pins" in tables
    assert "pipeline_topics" in tables

def test_pipeline_articles_stage_constraint():
    conn = _fresh_db()
    conn.execute(
        "INSERT INTO pipeline_articles (slug, topic, category, stage) "
        "VALUES ('test', 'Test Topic', 'recipes', 'written')"
    )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO pipeline_articles (slug, topic, category, stage) "
            "VALUES ('bad', 'Bad', 'recipes', 'INVALID_STAGE')"
        )

def test_pipeline_topics_source_constraint():
    conn = _fresh_db()
    conn.execute(
        "INSERT INTO pipeline_topics (topic, slug, category, source) "
        "VALUES ('Test', 'test', 'nutrition', 'gsc')"
    )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO pipeline_topics (topic, slug, category, source) "
            "VALUES ('Bad', 'bad', 'tips', 'invalid_source')"
        )

def test_pipeline_pins_unique_constraint():
    conn = _fresh_db()
    conn.execute(
        "INSERT INTO pipeline_articles (slug, topic, category) "
        "VALUES ('art1', 'Topic', 'recipes')"
    )
    conn.execute(
        "INSERT INTO pipeline_pins (article_slug, pin_slug, pin_index) "
        "VALUES ('art1', 'my-pin-slug', 0)"
    )
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(
            "INSERT INTO pipeline_pins (article_slug, pin_slug, pin_index) "
            "VALUES ('art1', 'other-slug', 0)"
        )

def test_category_balance_query():
    conn = _fresh_db()
    for slug, cat in [("a", "recipes"), ("b", "recipes"), ("c", "nutrition")]:
        conn.execute(
            "INSERT INTO pipeline_articles (slug, topic, category, stage) "
            "VALUES (?, 'topic', ?, 'published')",
            (slug, cat),
        )
    rows = conn.execute(
        "SELECT category, COUNT(*) as cnt FROM pipeline_articles "
        "GROUP BY category ORDER BY cnt DESC"
    ).fetchall()
    assert rows[0] == ("recipes", 2)
    assert rows[1] == ("nutrition", 1)
