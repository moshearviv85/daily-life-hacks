"""Tests for Google Autocomplete fetcher."""
import json
from unittest.mock import patch, MagicMock

import pytest

try:
    from scripts.topic_research.sources.google_autocomplete import (
        fetch_autocomplete,
        expand_seeds,
    )
except ImportError:
    fetch_autocomplete = None
    expand_seeds = None


def _mock_response(suggestions: list[str]) -> bytes:
    """Google returns: [query, [suggestions...], ..., {metadata}]"""
    return json.dumps([
        "healthy soup recipes",
        suggestions,
        ["" for _ in suggestions],
        {"google:clientdata": {"bpc": False, "tlw": False}},
    ]).encode("utf-8")


def test_module_exists():
    assert fetch_autocomplete is not None
    assert expand_seeds is not None


def test_fetch_returns_suggestions():
    mock_urlopen = MagicMock()
    mock_urlopen.return_value.__enter__.return_value.read.return_value = _mock_response([
        "healthy soup recipes clean eating",
        "healthy soup recipes for weight loss",
        "healthy soup recipes easy",
    ])
    with patch("urllib.request.urlopen", mock_urlopen):
        out = fetch_autocomplete("healthy soup recipes")
    assert len(out) == 3
    assert "healthy soup recipes clean eating" in out


def test_fetch_handles_http_error():
    mock_urlopen = MagicMock(side_effect=Exception("network"))
    with patch("urllib.request.urlopen", mock_urlopen):
        out = fetch_autocomplete("test")
    assert out == []


def test_fetch_hits_correct_url():
    mock_urlopen = MagicMock()
    mock_urlopen.return_value.__enter__.return_value.read.return_value = _mock_response([])
    with patch("urllib.request.urlopen", mock_urlopen) as m:
        fetch_autocomplete("meal prep soup")
    req = m.call_args[0][0]
    url = req.full_url if hasattr(req, "full_url") else req.get_full_url()
    assert "suggestqueries.google.com" in url
    assert "client=firefox" in url
    assert "meal+prep+soup" in url or "meal%20prep%20soup" in url
    assert "hl=en" in url
    assert "gl=us" in url


def test_expand_seeds_dedupes_and_skips_identical():
    suggestions_per_seed = {
        "seed a": ["seed a one", "seed a two", "shared result"],
        "seed b": ["seed b only", "shared result"],  # shared with seed a
    }

    def side_effect(query, *a, **kw):
        return suggestions_per_seed.get(query, [])

    with patch("scripts.topic_research.sources.google_autocomplete.fetch_autocomplete", side_effect=side_effect):
        result = expand_seeds(["seed a", "seed b"], sleep_between=0)

    keywords = {row["expanded"] for row in result}
    assert "seed a one" in keywords
    assert "seed b only" in keywords
    assert "shared result" in keywords
    # Each expanded keyword appears at most once (deduped)
    assert len([r for r in result if r["expanded"] == "shared result"]) == 1


def test_expand_seeds_skips_seed_if_echoed():
    """Google sometimes returns the seed itself — filter it out."""
    def side_effect(query, *a, **kw):
        if query == "pizza":
            return ["pizza", "pizza recipe", "PIZZA"]  # seed echoed in multiple cases
        return []

    with patch("scripts.topic_research.sources.google_autocomplete.fetch_autocomplete", side_effect=side_effect):
        result = expand_seeds(["pizza"], sleep_between=0)

    keywords = [r["expanded"] for r in result]
    assert "pizza recipe" in keywords
    assert "pizza" not in keywords
    assert "PIZZA" not in keywords
