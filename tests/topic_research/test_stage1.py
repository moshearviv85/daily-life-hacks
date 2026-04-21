"""Tests for stage 1 orchestrator (stage1.py).

TDD: all network calls and Gemini are mocked.
At least one end-to-end test verifies DB rows are written correctly.
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

try:
    from scripts.topic_research.stage1 import (
        run_stage1,
        _extract_seeds,
        _build_stage1_prompt,
        _STAGE1_SCHEMA,
    )
    from scripts.topic_research.db import (
        open_db,
        init_schema,
        create_run,
        read_stage1_output,
    )
    _IMPORT_OK = True
except ImportError as e:
    _IMPORT_OK = False
    _IMPORT_ERR = str(e)


# ── fixtures ──────────────────────────────────────────────────────────────────

SAMPLE_INTERESTS = [
    {"category": "Food & Drinks", "category_percent": 42.5, "category_affinity": 1.2,
     "interest": "high fiber recipes", "percent": 18.3, "affinity": 3.5},
    {"category": "Food & Drinks", "category_percent": 42.5, "category_affinity": 1.2,
     "interest": "meal prep ideas", "percent": 14.0, "affinity": 2.8},
    {"category": "Health & Fitness", "category_percent": 30.0, "category_affinity": 1.1,
     "interest": "gut health tips", "percent": 12.0, "affinity": 2.1},
    {"category": "Food & Drinks", "category_percent": 42.5, "category_affinity": 1.2,
     "interest": "weight loss recipes", "percent": 10.0, "affinity": 1.9},
]

SAMPLE_AUDIENCE = {
    "audience_size": 500000,
    "interests": SAMPLE_INTERESTS,
    "age": [{"value": "25-34", "percent": 38.0}, {"value": "35-44", "percent": 29.5}],
    "gender": [{"value": "female", "percent": 82.0}],
    "device": [{"value": "mobile", "percent": 71.0}],
    "countries": [{"value": "US", "percent": 68.0}],
}

SAMPLE_GEMINI_RESPONSE = {
    "content_keywords": [
        {"rank": i, "keyword": f"content keyword {i}", "score": 90.0 - i, "rationale": f"reason {i}"}
        for i in range(1, 21)
    ],
    "board_keywords": [
        {"rank": i, "keyword": f"board keyword {i}", "score": 80.0 - i, "rationale": f"board reason {i}"}
        for i in range(1, 21)
    ],
}


def _gemini_mock(payload: dict) -> MagicMock:
    """Return a mock for scripts.topic_research.stage1.generate that returns payload."""
    m = MagicMock(return_value=payload)
    return m


# ── 1. module imports ─────────────────────────────────────────────────────────

def test_module_imports():
    assert _IMPORT_OK, f"Could not import stage1 module: {_IMPORT_ERR if not _IMPORT_OK else ''}"


# ── 2. _extract_seeds ─────────────────────────────────────────────────────────

def test_extract_seeds_returns_list_of_strings():
    seeds = _extract_seeds(SAMPLE_INTERESTS)
    assert isinstance(seeds, list)
    assert all(isinstance(s, str) for s in seeds)


def test_extract_seeds_sorted_by_affinity_desc():
    seeds = _extract_seeds(SAMPLE_INTERESTS)
    # "high fiber recipes" has affinity 3.5 — should be first
    assert seeds[0] == "high fiber recipes"


def test_extract_seeds_respects_limit():
    many = [
        {"interest": f"interest {i}", "affinity": float(i), "percent": 1.0, "category": "X",
         "category_percent": 10.0, "category_affinity": 1.0}
        for i in range(50)
    ]
    seeds = _extract_seeds(many, limit=10)
    assert len(seeds) == 10


def test_extract_seeds_deduplicates():
    duped = SAMPLE_INTERESTS + [
        {"interest": "high fiber recipes", "affinity": 5.0, "percent": 20.0,
         "category": "Food", "category_percent": 50.0, "category_affinity": 1.5},
    ]
    seeds = _extract_seeds(duped)
    assert seeds.count("high fiber recipes") == 1


def test_extract_seeds_skips_empty_interest():
    with_blank = SAMPLE_INTERESTS + [
        {"interest": "", "affinity": 9.0, "percent": 99.0, "category": "X",
         "category_percent": 1.0, "category_affinity": 1.0}
    ]
    seeds = _extract_seeds(with_blank)
    assert "" not in seeds


# ── 3. _build_stage1_prompt ───────────────────────────────────────────────────

def test_build_prompt_contains_seeds():
    prompt = _build_stage1_prompt(
        seeds=["high fiber recipes", "meal prep"],
        reddit_titles=["Reddit post about fiber"],
        autocomplete_terms=["high fiber foods list"],
        trending_keywords=["deviled eggs"],
        audience_summary="Female 25-44",
    )
    assert "high fiber recipes" in prompt
    assert "meal prep" in prompt


def test_build_prompt_contains_reddit_titles():
    prompt = _build_stage1_prompt(
        seeds=["fiber"],
        reddit_titles=["What high-fiber foods keep you full?"],
        autocomplete_terms=[],
        trending_keywords=[],
        audience_summary="test",
    )
    assert "What high-fiber foods keep you full?" in prompt


def test_build_prompt_contains_trending_keywords():
    prompt = _build_stage1_prompt(
        seeds=[],
        reddit_titles=[],
        autocomplete_terms=[],
        trending_keywords=["deviled eggs", "pasta salad"],
        audience_summary="test",
    )
    assert "deviled eggs" in prompt
    assert "pasta salad" in prompt


def test_build_prompt_mentions_20_content_and_board():
    prompt = _build_stage1_prompt(
        seeds=["fiber"],
        reddit_titles=[],
        autocomplete_terms=[],
        trending_keywords=[],
        audience_summary="test",
    )
    assert "20" in prompt
    assert "content" in prompt.lower()
    assert "board" in prompt.lower()


# ── 4. _STAGE1_SCHEMA structure ───────────────────────────────────────────────

def test_stage1_schema_has_content_and_board_arrays():
    props = _STAGE1_SCHEMA["properties"]
    assert "content_keywords" in props
    assert "board_keywords" in props
    assert props["content_keywords"]["type"] == "array"
    assert props["board_keywords"]["type"] == "array"


# ── 5. run_stage1 end-to-end with mocked network calls ───────────────────────

def test_run_stage1_writes_output_rows_to_db(tmp_path):
    """End-to-end: audience insights → (mocked) fetchers → (mocked) Gemini → DB rows."""
    db_path = str(tmp_path / "test.sqlite")

    with (
        patch("scripts.topic_research.stage1.fetch_audience_insights", return_value=SAMPLE_AUDIENCE),
        patch("scripts.topic_research.stage1.fetch_all_subreddits", return_value=[
            {"title": "Best fiber foods", "selftext": "", "upvotes": 100,
             "comments": 10, "url": "https://www.reddit.com/r/HealthyEating/comments/x/",
             "subreddit": "HealthyEating", "created_utc": 1713600000, "nsfw": False},
        ]),
        patch("scripts.topic_research.stage1.expand_seeds", return_value=[
            {"seed": "high fiber recipes", "expanded": "high fiber recipes for dinner"},
        ]),
        patch("scripts.topic_research.stage1.fetch_all_trend_types", return_value=[
            {"keyword": "deviled eggs", "trend_type": "growing", "region": "US",
             "wow": 100, "mom": 800, "yoy": 300, "time_series": {}},
        ]),
        patch("scripts.topic_research.stage1.generate", return_value=SAMPLE_GEMINI_RESPONSE),
    ):
        result = run_stage1(
            db_path=db_path,
            gemini_api_key="fake-key",
            pinterest_access_token="fake-token",
        )

    assert "run_id" in result
    assert "content_keywords" in result
    assert "board_keywords" in result
    assert len(result["content_keywords"]) == 20
    assert len(result["board_keywords"]) == 20

    # Verify DB rows were written
    conn = open_db(db_path)
    init_schema(conn)
    db_rows = read_stage1_output(conn, result["run_id"])
    conn.close()

    content_rows = [r for r in db_rows if r["keyword_type"] == "content"]
    board_rows = [r for r in db_rows if r["keyword_type"] == "board"]
    assert len(content_rows) == 20
    assert len(board_rows) == 20


def test_run_stage1_run_marked_done(tmp_path):
    """The run row must be closed with status='done' on success."""
    db_path = str(tmp_path / "test.sqlite")

    with (
        patch("scripts.topic_research.stage1.fetch_audience_insights", return_value=SAMPLE_AUDIENCE),
        patch("scripts.topic_research.stage1.fetch_all_subreddits", return_value=[]),
        patch("scripts.topic_research.stage1.expand_seeds", return_value=[]),
        patch("scripts.topic_research.stage1.fetch_all_trend_types", return_value=[]),
        patch("scripts.topic_research.stage1.generate", return_value=SAMPLE_GEMINI_RESPONSE),
    ):
        result = run_stage1(
            db_path=db_path,
            gemini_api_key="fake-key",
            pinterest_access_token="fake-token",
        )

    conn = open_db(db_path)
    row = conn.execute(
        "SELECT status FROM runs WHERE id = ?", (result["run_id"],)
    ).fetchone()
    conn.close()
    assert row[0] == "done"


def test_run_stage1_run_marked_failed_on_gemini_error(tmp_path):
    """The run row must be closed with status='failed' when Gemini raises."""
    from scripts.topic_research.llm.gemini import GeminiError

    db_path = str(tmp_path / "test.sqlite")

    with (
        patch("scripts.topic_research.stage1.fetch_audience_insights", return_value=SAMPLE_AUDIENCE),
        patch("scripts.topic_research.stage1.fetch_all_subreddits", return_value=[]),
        patch("scripts.topic_research.stage1.expand_seeds", return_value=[]),
        patch("scripts.topic_research.stage1.fetch_all_trend_types", return_value=[]),
        patch("scripts.topic_research.stage1.generate", side_effect=GeminiError("API error")),
    ):
        with pytest.raises(GeminiError):
            run_stage1(
                db_path=db_path,
                gemini_api_key="fake-key",
                pinterest_access_token="fake-token",
            )

    conn = open_db(db_path)
    run_id = conn.execute(
        "SELECT id FROM runs WHERE stage = 1 ORDER BY id DESC LIMIT 1"
    ).fetchone()[0]
    status = conn.execute(
        "SELECT status FROM runs WHERE id = ?", (run_id,)
    ).fetchone()[0]
    conn.close()
    assert status == "failed"


def test_run_stage1_raises_without_api_key(tmp_path):
    db_path = str(tmp_path / "test.sqlite")

    import os
    saved = os.environ.pop("GEMINI_API_KEY", None)
    try:
        with pytest.raises(ValueError, match="GEMINI_API_KEY"):
            run_stage1(
                db_path=db_path,
                gemini_api_key="",
            )
    finally:
        if saved:
            os.environ["GEMINI_API_KEY"] = saved


def test_run_stage1_audience_interests_persisted(tmp_path):
    """Audience interests from API must appear in the audience_interests table."""
    db_path = str(tmp_path / "test.sqlite")

    with (
        patch("scripts.topic_research.stage1.fetch_audience_insights", return_value=SAMPLE_AUDIENCE),
        patch("scripts.topic_research.stage1.fetch_all_subreddits", return_value=[]),
        patch("scripts.topic_research.stage1.expand_seeds", return_value=[]),
        patch("scripts.topic_research.stage1.fetch_all_trend_types", return_value=[]),
        patch("scripts.topic_research.stage1.generate", return_value=SAMPLE_GEMINI_RESPONSE),
    ):
        result = run_stage1(
            db_path=db_path,
            gemini_api_key="fake-key",
            pinterest_access_token="fake-token",
        )

    conn = open_db(db_path)
    count = conn.execute(
        "SELECT COUNT(*) FROM audience_interests WHERE run_id = ?",
        (result["run_id"],),
    ).fetchone()[0]
    conn.close()
    assert count == len(SAMPLE_INTERESTS)


def test_run_stage1_reddit_posts_persisted(tmp_path):
    db_path = str(tmp_path / "test.sqlite")

    reddit_posts = [
        {"title": "Best high-fiber meals", "selftext": "", "upvotes": 500,
         "comments": 40, "url": "https://www.reddit.com/r/HealthyEating/comments/abc/",
         "subreddit": "HealthyEating", "created_utc": 1713600000, "nsfw": False},
    ]

    with (
        patch("scripts.topic_research.stage1.fetch_audience_insights", return_value=SAMPLE_AUDIENCE),
        patch("scripts.topic_research.stage1.fetch_all_subreddits", return_value=reddit_posts),
        patch("scripts.topic_research.stage1.expand_seeds", return_value=[]),
        patch("scripts.topic_research.stage1.fetch_all_trend_types", return_value=[]),
        patch("scripts.topic_research.stage1.generate", return_value=SAMPLE_GEMINI_RESPONSE),
    ):
        result = run_stage1(
            db_path=db_path,
            gemini_api_key="fake-key",
            pinterest_access_token="fake-token",
        )

    conn = open_db(db_path)
    count = conn.execute(
        "SELECT COUNT(*) FROM reddit_posts WHERE run_id = ?",
        (result["run_id"],),
    ).fetchone()[0]
    conn.close()
    assert count == 1


def test_run_stage1_skips_trends_when_no_token(tmp_path):
    """When no Pinterest token is provided, trends fetch and audience insights are skipped (no error)."""
    import os
    db_path = str(tmp_path / "test.sqlite")

    saved = os.environ.pop("PINTEREST_ACCESS_TOKEN", None)
    try:
        with (
            patch("scripts.topic_research.stage1.fetch_audience_insights") as mock_audience,
            patch("scripts.topic_research.stage1.fetch_all_subreddits", return_value=[]),
            patch("scripts.topic_research.stage1.expand_seeds", return_value=[]),
            patch("scripts.topic_research.stage1.fetch_all_trend_types") as mock_trends,
            patch("scripts.topic_research.stage1.generate", return_value=SAMPLE_GEMINI_RESPONSE),
        ):
            result = run_stage1(
                db_path=db_path,
                gemini_api_key="fake-key",
                pinterest_access_token="",
            )
        # fetch_all_trend_types and fetch_audience_insights should NOT have been called (no token)
        mock_trends.assert_not_called()
        mock_audience.assert_not_called()
    finally:
        if saved:
            os.environ["PINTEREST_ACCESS_TOKEN"] = saved

    assert result["run_id"] is not None


def test_run_stage1_result_structure():
    """run_stage1 returns dict with run_id, content_keywords, board_keywords."""
    import tempfile

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        audience_csv = _make_audience_csv(tmp)
        db_path = str(tmp / "test.sqlite")

        with (
            patch("scripts.topic_research.stage1.fetch_all_subreddits", return_value=[]),
            patch("scripts.topic_research.stage1.expand_seeds", return_value=[]),
            patch("scripts.topic_research.stage1.fetch_all_trend_types", return_value=[]),
            patch("scripts.topic_research.stage1.generate", return_value=SAMPLE_GEMINI_RESPONSE),
        ):
            result = run_stage1(
                audience_csv_path=audience_csv,
                db_path=db_path,
                gemini_api_key="fake-key",
            )

    assert isinstance(result["run_id"], int)
    assert isinstance(result["content_keywords"], list)
    assert isinstance(result["board_keywords"], list)


def test_run_stage1_content_keywords_have_required_fields(tmp_path):
    audience_csv = _make_audience_csv(tmp_path)
    db_path = str(tmp_path / "test.sqlite")

    with (
        patch("scripts.topic_research.stage1.fetch_all_subreddits", return_value=[]),
        patch("scripts.topic_research.stage1.expand_seeds", return_value=[]),
        patch("scripts.topic_research.stage1.fetch_all_trend_types", return_value=[]),
        patch("scripts.topic_research.stage1.generate", return_value=SAMPLE_GEMINI_RESPONSE),
    ):
        result = run_stage1(
            audience_csv_path=audience_csv,
            db_path=db_path,
            gemini_api_key="fake-key",
        )

    for kw in result["content_keywords"]:
        assert "rank" in kw
        assert "keyword" in kw
        assert "score" in kw
        assert "rationale" in kw
