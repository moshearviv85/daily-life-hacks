"""Tests for Pin Inspector CSV parsers (keywords + boards)."""
from pathlib import Path

import pytest

try:
    from scripts.topic_research.sources.pin_inspector import (
        parse_pin_inspector_keywords,
        parse_pin_inspector_boards,
    )
except ImportError:
    parse_pin_inspector_keywords = None
    parse_pin_inspector_boards = None


KEYWORDS_FIXTURE = Path(__file__).parent / "fixtures" / "pin_inspector_keywords_sample.csv"
BOARDS_FIXTURE = Path(__file__).parent / "fixtures" / "pin_inspector_boards_sample.csv"


# ────────────────────────── Keywords CSV ──────────────────────────

def test_keywords_parser_exists():
    assert parse_pin_inspector_keywords is not None


def test_keywords_parses_all_rows():
    rows = parse_pin_inspector_keywords(KEYWORDS_FIXTURE)
    assert len(rows) == 6


def test_keywords_has_expected_fields():
    rows = parse_pin_inspector_keywords(KEYWORDS_FIXTURE)
    r = rows[0]
    assert r["keyword"] == "healthy soup recipes clean eating"
    assert r["rank"] == 1
    assert r["seed"] == "healthy soup recipes"  # stripped
    assert r["word_count"] == 5


def test_keywords_groups_by_seed():
    rows = parse_pin_inspector_keywords(KEYWORDS_FIXTURE)
    seeds = {r["seed"] for r in rows}
    assert "healthy soup recipes" in seeds
    assert "easy sandwich recipes healthy" in seeds
    assert "high fiber soup recipes" in seeds


def test_keywords_handles_bom():
    raw = KEYWORDS_FIXTURE.read_bytes()
    # The fixture was written without BOM by us; add one to confirm tolerance.
    assert not raw.startswith(b"\xef\xbb\xbf")
    rows = parse_pin_inspector_keywords(KEYWORDS_FIXTURE)
    assert rows, "should still parse cleanly"


def test_keywords_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        parse_pin_inspector_keywords(tmp_path / "nope.csv")


# ─────────────────────────── Boards CSV ───────────────────────────

def test_boards_parser_exists():
    assert parse_pin_inspector_boards is not None


def test_boards_parses_all_rows():
    rows = parse_pin_inspector_boards(BOARDS_FIXTURE)
    assert len(rows) == 3


def test_boards_strips_commas_in_numbers():
    """Pin Inspector writes followers as "1,234" — must convert to int."""
    rows = parse_pin_inspector_boards(BOARDS_FIXTURE)
    first = rows[0]
    assert first["board_name"] == "High Fiber"
    assert first["board_followers"] == 1234
    assert first["pin_count"] == 10
    assert first["owner_followers"] == 4790


def test_boards_related_interests_as_list():
    rows = parse_pin_inspector_boards(BOARDS_FIXTURE)
    first = rows[0]
    assert isinstance(first["related_interests"], list)
    assert "High Fiber" in first["related_interests"]
    assert "Fiber Foods" in first["related_interests"]


def test_boards_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        parse_pin_inspector_boards(tmp_path / "nope.csv")


def test_boards_aggregates_related_interests():
    """For ranking purposes we want frequency counts across all boards."""
    from scripts.topic_research.sources.pin_inspector import aggregate_related_interests
    rows = parse_pin_inspector_boards(BOARDS_FIXTURE)
    freq = aggregate_related_interests(rows)
    # Healthy Recipes appears in all 3 boards
    assert freq.get("Healthy Recipes") == 3
    # Meal Prep appears in 2 boards
    assert freq.get("Meal Prep") == 2
