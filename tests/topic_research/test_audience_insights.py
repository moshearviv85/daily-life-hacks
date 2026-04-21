"""Tests for Pinterest Audience Insights API fetcher."""
import json
import urllib.error
from unittest.mock import patch, MagicMock

import pytest

try:
    from scripts.topic_research.sources.audience_insights import fetch_audience_insights
    _IMPORT_OK = True
except ImportError as e:
    fetch_audience_insights = None
    _IMPORT_OK = False
    _IMPORT_ERR = str(e)


# ── sample API response ───────────────────────────────────────────────────────

SAMPLE_RESPONSE = {
    "audience_size": 850000,
    "interests": [
        {
            "name": "healthy recipes",
            "affinity": 3.8,
            "percent": 22.5,
            "category": "Food & Drinks",
            "category_affinity": 1.4,
            "category_percent": 45.0,
        },
        {
            "name": "meal prep ideas",
            "affinity": 2.9,
            "percent": 16.0,
            "category": "Food & Drinks",
            "category_affinity": 1.4,
            "category_percent": 45.0,
        },
    ],
    "age": [
        {"name": "25-34", "percent": 38.0},
        {"name": "35-44", "percent": 29.5},
    ],
    "gender": [
        {"name": "female", "percent": 82.0},
        {"name": "male", "percent": 15.0},
    ],
    "device": [
        {"name": "mobile", "percent": 71.0},
        {"name": "desktop", "percent": 25.0},
    ],
    "countries": [
        {"name": "US", "percent": 68.0},
        {"name": "CA", "percent": 9.0},
    ],
}


def _mock_response(data):
    mock = MagicMock()
    mock.return_value.__enter__.return_value.read.return_value = json.dumps(data).encode()
    return mock


# ── 1. module import ──────────────────────────────────────────────────────────

def test_module_exists():
    assert _IMPORT_OK, f"Import failed: {_IMPORT_ERR if not _IMPORT_OK else ''}"


# ── 2. happy path — interests list ───────────────────────────────────────────

def test_happy_path_returns_interests_list():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("fake-token")

    assert isinstance(result, dict)
    interests = result.get("interests", [])
    assert isinstance(interests, list)
    assert len(interests) == 2


def test_happy_path_interest_fields():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("fake-token")

    first = result["interests"][0]
    assert first["interest"] == "healthy recipes"
    assert first["affinity"] == 3.8
    assert first["percent"] == 22.5
    assert first["category"] == "Food & Drinks"
    assert first["category_affinity"] == 1.4
    assert first["category_percent"] == 45.0


def test_happy_path_audience_size():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("fake-token")

    assert result["audience_size"] == 850000


# ── 3. correct URL + auth header ─────────────────────────────────────────────

def test_correct_url_and_auth_header():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock) as m:
        fetch_audience_insights("my-token", audience_type="YOUR_TOTAL_AUDIENCE")

    req = m.call_args[0][0]
    url = req.full_url if hasattr(req, "full_url") else req.get_full_url()
    assert "api.pinterest.com/v5/audience_insights" in url
    assert "audience_insight_type=YOUR_TOTAL_AUDIENCE" in url
    assert req.get_header("Authorization") == "Bearer my-token"


def test_custom_audience_type_in_url():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock) as m:
        fetch_audience_insights("tok", audience_type="YOUR_ACTING_AUDIENCE")

    req = m.call_args[0][0]
    url = req.full_url if hasattr(req, "full_url") else req.get_full_url()
    assert "audience_insight_type=YOUR_ACTING_AUDIENCE" in url


# ── 4. empty / minimal response returns empty dict ───────────────────────────

def test_empty_response_body_returns_empty_dict():
    """API returns {} — should return {} gracefully."""
    mock = _mock_response({})
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("fake-token")

    assert isinstance(result, dict)
    # Should still have the expected structure (empty lists, None size)
    assert result.get("interests") == [] or result == {}


def test_non_dict_response_returns_empty_dict():
    """API returns a non-dict (e.g. null) — should return {}."""
    mock = _mock_response(None)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("fake-token")

    assert result == {}


def test_no_interests_key_returns_empty_interests():
    """Response without 'interests' key returns interests: []."""
    mock = _mock_response({"audience_size": 100000})
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("fake-token")

    assert result.get("interests") == []


# ── 5. HTTP error returns empty dict ─────────────────────────────────────────

def test_http_401_returns_empty_dict():
    http_err = urllib.error.HTTPError(
        url="https://api.pinterest.com/v5/audience_insights",
        code=401,
        msg="Unauthorized",
        hdrs={},
        fp=None,
    )
    mock = MagicMock(side_effect=http_err)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("bad-token")

    assert result == {}


def test_http_500_returns_empty_dict():
    http_err = urllib.error.HTTPError(
        url="https://api.pinterest.com/v5/audience_insights",
        code=500,
        msg="Internal Server Error",
        hdrs={},
        fp=None,
    )
    mock = MagicMock(side_effect=http_err)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    assert result == {}


def test_network_error_returns_empty_dict():
    """Any non-HTTP exception (timeout, DNS, etc.) should return {}."""
    mock = MagicMock(side_effect=OSError("Network unreachable"))
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    assert result == {}


# ── 6. demographic fields parsed when present ────────────────────────────────

def test_age_field_parsed():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    age = result.get("age", [])
    assert isinstance(age, list)
    assert len(age) == 2
    assert age[0]["value"] == "25-34"
    assert age[0]["percent"] == 38.0


def test_gender_field_parsed():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    gender = result.get("gender", [])
    assert len(gender) == 2
    assert gender[0]["value"] == "female"
    assert gender[0]["percent"] == 82.0


def test_device_field_parsed():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    device = result.get("device", [])
    assert len(device) == 2
    assert device[0]["value"] == "mobile"


def test_countries_field_parsed():
    mock = _mock_response(SAMPLE_RESPONSE)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    countries = result.get("countries", [])
    assert len(countries) == 2
    assert countries[0]["value"] == "US"
    assert countries[0]["percent"] == 68.0


def test_missing_demographic_fields_return_empty_lists():
    """Response with only interests — age/gender/device/countries should be []."""
    partial = {"interests": [{"name": "healthy recipes", "affinity": 2.0, "percent": 10.0}]}
    mock = _mock_response(partial)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    assert result.get("age") == []
    assert result.get("gender") == []
    assert result.get("device") == []
    assert result.get("countries") == []


# ── 7. interest name fallback fields ─────────────────────────────────────────

def test_interest_name_from_key_field():
    """If 'name' is absent, fall back to 'key' field for interest name."""
    response = {
        "interests": [{"key": "gut health tips", "affinity": 2.5, "percent": 12.0}]
    }
    mock = _mock_response(response)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    assert result["interests"][0]["interest"] == "gut health tips"


def test_interest_skips_empty_name():
    """Items with no usable name field are skipped."""
    response = {
        "interests": [
            {"name": "", "affinity": 2.0, "percent": 5.0},
            {"name": "meal prep", "affinity": 1.5, "percent": 8.0},
        ]
    }
    mock = _mock_response(response)
    with patch("urllib.request.urlopen", mock):
        result = fetch_audience_insights("tok")

    assert len(result["interests"]) == 1
    assert result["interests"][0]["interest"] == "meal prep"
