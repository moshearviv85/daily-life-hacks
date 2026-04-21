"""Tests for SQLite persistence layer (db.py).

TDD: RED → GREEN
Covers schema creation, idempotency, all insert/read round-trips,
constraint enforcement, and latest-run helpers.
"""
from __future__ import annotations

import sqlite3
import tempfile
from pathlib import Path

import pytest

try:
    from scripts.topic_research.db import (
        open_db,
        init_schema,
        create_run,
        close_run,
        get_latest_run_id,
        insert_audience_interests,
        insert_pin_inspector_keywords,
        insert_pin_inspector_boards,
        insert_reddit_posts,
        insert_autocomplete,
        insert_pinterest_trends,
        insert_stage1_output,
        insert_stage2_output,
        read_stage1_output,
        read_stage2_output,
    )
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


# ── helpers ──────────────────────────────────────────────────────────────────

def _tmp_db() -> sqlite3.Connection:
    """Return an in-memory DB with schema already applied."""
    conn = open_db(":memory:")
    init_schema(conn)
    return conn


# ── 1. module exists ──────────────────────────────────────────────────────────

def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.topic_research.db — module missing or has errors"


# ── 2. schema creation ────────────────────────────────────────────────────────

def test_schema_creates_all_tables():
    conn = _tmp_db()
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = {row[0] for row in cur.fetchall()}
    expected = {
        "runs",
        "audience_interests",
        "pin_inspector_keywords",
        "pin_inspector_boards",
        "reddit_posts",
        "autocomplete",
        "pinterest_trends",
        "stage1_output",
        "stage2_output",
    }
    assert expected.issubset(tables), f"Missing tables: {expected - tables}"


def test_schema_init_is_idempotent():
    """Calling init_schema twice must not raise or duplicate tables."""
    conn = open_db(":memory:")
    init_schema(conn)
    init_schema(conn)  # second call — must not raise
    cur = conn.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='runs'"
    )
    assert cur.fetchone()[0] == 1


# ── 3. run lifecycle ──────────────────────────────────────────────────────────

def test_create_run_returns_int_id():
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    assert isinstance(run_id, int) and run_id > 0


def test_create_run_stage_constraint():
    """stage must be 1 or 2 — anything else raises."""
    conn = _tmp_db()
    with pytest.raises(Exception):
        create_run(conn, stage=99)


def test_close_run_sets_status():
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    close_run(conn, run_id, status="done")
    row = conn.execute(
        "SELECT status FROM runs WHERE id = ?", (run_id,)
    ).fetchone()
    assert row[0] == "done"


def test_get_latest_run_id_returns_most_recent():
    conn = _tmp_db()
    r1 = create_run(conn, stage=1)
    r2 = create_run(conn, stage=1)
    assert get_latest_run_id(conn, stage=1) == r2


def test_get_latest_run_id_none_when_no_runs():
    conn = _tmp_db()
    assert get_latest_run_id(conn, stage=1) is None


def test_get_latest_run_id_respects_stage():
    conn = _tmp_db()
    r1 = create_run(conn, stage=1)
    r2 = create_run(conn, stage=2)
    assert get_latest_run_id(conn, stage=1) == r1
    assert get_latest_run_id(conn, stage=2) == r2


# ── 4. audience_interests round-trip ─────────────────────────────────────────

def test_insert_audience_interests_round_trip():
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    rows = [
        {"category": "Food & Drinks", "category_percent": 42.5, "category_affinity": 1.2,
         "interest": "healthy recipes", "percent": 18.3, "affinity": 2.1},
        {"category": "Food & Drinks", "category_percent": 42.5, "category_affinity": 1.2,
         "interest": "meal prep", "percent": 10.0, "affinity": 1.8},
    ]
    insert_audience_interests(conn, run_id, rows)
    result = conn.execute(
        "SELECT interest FROM audience_interests WHERE run_id = ? ORDER BY interest",
        (run_id,),
    ).fetchall()
    interests = [r[0] for r in result]
    assert "healthy recipes" in interests
    assert "meal prep" in interests


# ── 5. pin_inspector_keywords round-trip ─────────────────────────────────────

def test_insert_pin_inspector_keywords_round_trip():
    conn = _tmp_db()
    run_id = create_run(conn, stage=2)
    rows = [
        {"keyword": "high fiber meals", "rank": 1, "word_count": 3,
         "character_count": 15, "seed": "fiber", "monthly_searches": 5000},
        {"keyword": "gut health recipes", "rank": 2, "word_count": 3,
         "character_count": 18, "seed": "gut health", "monthly_searches": 3000},
    ]
    insert_pin_inspector_keywords(conn, run_id, rows)
    count = conn.execute(
        "SELECT COUNT(*) FROM pin_inspector_keywords WHERE run_id = ?", (run_id,)
    ).fetchone()[0]
    assert count == 2


# ── 6. pin_inspector_boards round-trip ───────────────────────────────────────

def test_insert_pin_inspector_boards_round_trip():
    conn = _tmp_db()
    run_id = create_run(conn, stage=2)
    rows = [
        {
            "board_id": "abc123",
            "board_name": "Healthy Dinner Recipes",
            "board_followers": 12000,
            "pin_count": 450,
            "board_link": "https://pinterest.com/board/abc123",
            "description": "All the best dinners",
            "is_group_board": False,
            "owner_name": "Jane Doe",
            "owner_followers": 5000,
            "owner_username": "janedoe",
            "related_interests": ["food_and_drinks", "healthy_eating"],
        }
    ]
    insert_pin_inspector_boards(conn, run_id, rows)
    result = conn.execute(
        "SELECT board_name, board_followers FROM pin_inspector_boards WHERE run_id = ?",
        (run_id,),
    ).fetchone()
    assert result[0] == "Healthy Dinner Recipes"
    assert result[1] == 12000


# ── 7. reddit_posts round-trip + INSERT OR IGNORE ────────────────────────────

def test_insert_reddit_posts_round_trip():
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    rows = [
        {
            "title": "Best high-fiber foods?",
            "selftext": "Looking for ideas",
            "upvotes": 800,
            "comments": 95,
            "url": "https://www.reddit.com/r/HealthyEating/comments/x1/",
            "subreddit": "HealthyEating",
            "created_utc": 1713600000,
            "nsfw": False,
        }
    ]
    insert_reddit_posts(conn, run_id, rows)
    count = conn.execute(
        "SELECT COUNT(*) FROM reddit_posts WHERE run_id = ?", (run_id,)
    ).fetchone()[0]
    assert count == 1


def test_insert_reddit_posts_duplicate_url_ignored():
    """Same URL inserted twice in same run must not raise — INSERT OR IGNORE."""
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    row = {
        "title": "High fiber meals",
        "selftext": "",
        "upvotes": 100,
        "comments": 10,
        "url": "https://www.reddit.com/r/HealthyEating/comments/dup/",
        "subreddit": "HealthyEating",
        "created_utc": 1713600000,
        "nsfw": False,
    }
    insert_reddit_posts(conn, run_id, [row, row])
    count = conn.execute(
        "SELECT COUNT(*) FROM reddit_posts WHERE run_id = ? AND url = ?",
        (run_id, row["url"]),
    ).fetchone()[0]
    assert count == 1


# ── 8. autocomplete round-trip ────────────────────────────────────────────────

def test_insert_autocomplete_round_trip():
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    rows = [
        {"seed": "high fiber", "expanded": "high fiber meals for weight loss"},
        {"seed": "high fiber", "expanded": "high fiber foods list"},
    ]
    insert_autocomplete(conn, run_id, rows)
    result = conn.execute(
        "SELECT expanded FROM autocomplete WHERE run_id = ? ORDER BY expanded",
        (run_id,),
    ).fetchall()
    expanded = [r[0] for r in result]
    assert "high fiber foods list" in expanded
    assert "high fiber meals for weight loss" in expanded


# ── 9. pinterest_trends round-trip ────────────────────────────────────────────

def test_insert_pinterest_trends_round_trip():
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    rows = [
        {
            "keyword": "deviled eggs",
            "trend_type": "growing",
            "region": "US",
            "wow": 100,
            "mom": 800,
            "yoy": 300,
            "time_series": {"2026-04-01": 20, "2026-04-15": 100},
        },
        {
            "keyword": "pasta salad recipes",
            "trend_type": "monthly",
            "region": "US",
            "wow": 0,
            "mom": 80,
            "yoy": -1,
            "time_series": {},
        },
    ]
    insert_pinterest_trends(conn, run_id, rows)
    count = conn.execute(
        "SELECT COUNT(*) FROM pinterest_trends WHERE run_id = ?", (run_id,)
    ).fetchone()[0]
    assert count == 2


def test_pinterest_trends_trend_type_constraint():
    """trend_type must be one of growing/monthly/yearly/seasonal."""
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    bad_row = {
        "keyword": "test",
        "trend_type": "bogus",
        "region": "US",
        "wow": 0,
        "mom": 0,
        "yoy": 0,
        "time_series": {},
    }
    with pytest.raises(Exception):
        insert_pinterest_trends(conn, run_id, [bad_row])


# ── 10. stage1_output round-trip ─────────────────────────────────────────────

def test_insert_and_read_stage1_output():
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    rows = [
        {"keyword": "high fiber dinner recipes", "keyword_type": "content",
         "rank": 1, "score": 95.5, "rationale": "High demand, low comp"},
        {"keyword": "healthy meal prep boards", "keyword_type": "board",
         "rank": 1, "score": 88.0, "rationale": "Good board keyword"},
    ]
    insert_stage1_output(conn, run_id, rows)
    result = read_stage1_output(conn, run_id)
    assert len(result) == 2
    types = {r["keyword_type"] for r in result}
    assert types == {"content", "board"}


def test_stage1_output_keyword_type_constraint():
    """keyword_type must be 'content' or 'board'."""
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    bad = [{"keyword": "foo", "keyword_type": "invalid", "rank": 1, "score": 50.0, "rationale": ""}]
    with pytest.raises(Exception):
        insert_stage1_output(conn, run_id, bad)


def test_read_stage1_output_empty_when_no_rows():
    conn = _tmp_db()
    run_id = create_run(conn, stage=1)
    assert read_stage1_output(conn, run_id) == []


# ── 11. stage2_output round-trip ─────────────────────────────────────────────

def test_insert_and_read_stage2_output():
    conn = _tmp_db()
    run_id = create_run(conn, stage=2)
    rows = [
        {
            "rank": 1,
            "topic": "high fiber dinner recipes for weight loss",
            "category": "recipes",
            "slug": "high-fiber-dinner-recipes-for-weight-loss",
            "score": 92.0,
            "rationale": "High search intent, matches audience",
        },
        {
            "rank": 2,
            "topic": "gut health meal prep ideas",
            "category": "nutrition",
            "slug": "gut-health-meal-prep-ideas",
            "score": 87.5,
            "rationale": "Trending + gaps in published content",
        },
    ]
    insert_stage2_output(conn, run_id, rows)
    result = read_stage2_output(conn, run_id)
    assert len(result) == 2
    assert result[0]["rank"] == 1
    assert result[0]["topic"] == "high fiber dinner recipes for weight loss"
    assert result[1]["slug"] == "gut-health-meal-prep-ideas"


def test_stage2_output_category_constraint():
    """category must be 'recipes' or 'nutrition'."""
    conn = _tmp_db()
    run_id = create_run(conn, stage=2)
    bad = [{
        "rank": 1,
        "topic": "some topic",
        "category": "fitness",
        "slug": "some-topic",
        "score": 50.0,
        "rationale": "",
    }]
    with pytest.raises(Exception):
        insert_stage2_output(conn, run_id, bad)


def test_read_stage2_output_ordered_by_rank():
    conn = _tmp_db()
    run_id = create_run(conn, stage=2)
    rows = [
        {"rank": 3, "topic": "topic c", "category": "recipes",
         "slug": "topic-c", "score": 70.0, "rationale": ""},
        {"rank": 1, "topic": "topic a", "category": "nutrition",
         "slug": "topic-a", "score": 90.0, "rationale": ""},
        {"rank": 2, "topic": "topic b", "category": "recipes",
         "slug": "topic-b", "score": 80.0, "rationale": ""},
    ]
    insert_stage2_output(conn, run_id, rows)
    result = read_stage2_output(conn, run_id)
    assert [r["rank"] for r in result] == [1, 2, 3]


# ── 12. file-backed DB persists on disk ──────────────────────────────────────

def test_file_backed_db_persists():
    """Data written to a file-backed DB must survive closing + reopening."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = str(Path(tmpdir) / "test.sqlite")
        conn1 = open_db(db_path)
        init_schema(conn1)
        run_id = create_run(conn1, stage=1)
        insert_autocomplete(conn1, run_id, [{"seed": "fiber", "expanded": "fiber rich foods"}])
        conn1.close()

        conn2 = open_db(db_path)
        row = conn2.execute(
            "SELECT expanded FROM autocomplete WHERE run_id = ?", (run_id,)
        ).fetchone()
        conn2.close()

    assert row is not None
    assert row[0] == "fiber rich foods"
