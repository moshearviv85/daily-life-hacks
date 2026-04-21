"""Tests for Pinterest Trends API fetcher."""
import json
from unittest.mock import patch, MagicMock

import pytest

try:
    from scripts.topic_research.sources.pinterest_trends import (
        fetch_trending_keywords,
        fetch_all_trend_types,
        TREND_TYPES,
    )
except ImportError:
    fetch_trending_keywords = None
    fetch_all_trend_types = None
    TREND_TYPES = None


SAMPLE_RESPONSE = {
    "trends": [
        {
            "keyword": "deviled eggs",
            "pct_growth_wow": 100,
            "pct_growth_mom": 800,
            "pct_growth_yoy": 300,
            "time_series": {"2026-04-01": 20, "2026-04-08": 50, "2026-04-15": 100},
        },
        {
            "keyword": "pasta salad recipes",
            "pct_growth_wow": 0,
            "pct_growth_mom": 80,
            "pct_growth_yoy": -1,
            "time_series": {},
        },
    ]
}


def _mock_response(data):
    mock = MagicMock()
    mock.return_value.__enter__.return_value.read.return_value = json.dumps(data).encode()
    return mock


def test_module_exists():
    assert fetch_trending_keywords is not None


def test_trend_types_are_all_four():
    assert set(TREND_TYPES) == {"growing", "monthly", "yearly", "seasonal"}


def test_fetch_returns_normalized_rows():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        rows = fetch_trending_keywords(
            access_token="fake-token",
            trend_type="growing",
            region="US",
            interests=["food_and_drinks"],
            genders=["female"],
            ages=["25-34", "35-44"],
            limit=10,
        )

    assert len(rows) == 2
    first = rows[0]
    assert first["keyword"] == "deviled eggs"
    assert first["trend_type"] == "growing"
    assert first["region"] == "US"
    assert first["wow"] == 100
    assert first["mom"] == 800
    assert first["yoy"] == 300


def test_fetch_builds_correct_url():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock) as m:
        fetch_trending_keywords(
            access_token="T",
            trend_type="monthly",
            region="US",
            interests=["food_and_drinks"],
            genders=["female"],
            ages=["25-34"],
            limit=50,
        )

    req = m.call_args[0][0]
    url = req.full_url if hasattr(req, "full_url") else req.get_full_url()
    assert "api.pinterest.com/v5/trends/keywords/US/top/monthly" in url
    assert "interests=food_and_drinks" in url
    assert "genders=female" in url
    assert "ages=25-34" in url
    assert "limit=50" in url
    assert req.get_header("Authorization") == "Bearer T"


def test_fetch_handles_auth_failure_gracefully():
    """401/403 should not crash — return []."""
    import urllib.error
    # urllib.error.HTTPError: url, code, msg, hdrs, fp — minimal construction
    http_err = urllib.error.HTTPError(
        url="https://api.pinterest.com/v5/trends/keywords/US/top/growing",
        code=401,
        msg="Unauthorized",
        hdrs={},
        fp=None,
    )
    mock = MagicMock(side_effect=http_err)
    with patch("urllib.request.urlopen", mock):
        rows = fetch_trending_keywords(access_token="bad", trend_type="growing")
    assert rows == []


def test_fetch_rejects_bad_trend_type():
    with pytest.raises(ValueError, match="trend_type"):
        fetch_trending_keywords(access_token="T", trend_type="bogus")


def test_fetch_all_trend_types_aggregates_all_four():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        rows = fetch_all_trend_types(
            access_token="T",
            region="US",
            interests=["food_and_drinks"],
            genders=["female"],
            ages=["25-34", "35-44"],
            limit=50,
            sleep_between=0,
        )
    # 4 trend types * 2 keywords each = 8 rows
    assert len(rows) == 8
    trend_types = {r["trend_type"] for r in rows}
    assert trend_types == {"growing", "monthly", "yearly", "seasonal"}
