"""Tests for Pinterest audience-insights CSV parser."""
from pathlib import Path

import pytest

try:
    from scripts.topic_research.sources.audience_csv import parse_audience_csv
except ImportError:
    parse_audience_csv = None


FIXTURE = Path(__file__).parent / "fixtures" / "audience_sample.csv"


@pytest.fixture
def audience():
    assert parse_audience_csv is not None, "audience_csv.parse_audience_csv not implemented"
    return parse_audience_csv(FIXTURE)


def test_returns_dict_with_expected_keys(audience):
    assert isinstance(audience, dict)
    for key in ("audience_size", "interests", "countries", "metros", "gender", "device", "age"):
        assert key in audience, f"missing key: {key}"


def test_audience_size_is_int(audience):
    assert audience["audience_size"] == 10000


def test_interests_parsed_correctly(audience):
    interests = audience["interests"]
    assert isinstance(interests, list)
    assert len(interests) == 5

    soup = next((i for i in interests if i["interest"] == "Soup"), None)
    assert soup is not None
    assert soup["category"] == "Food and Drinks"
    assert soup["percent"] == pytest.approx(0.337)
    assert soup["affinity"] == pytest.approx(8.558)

    # Missing affinity (empty cell) should be None, not crash
    grain = next((i for i in interests if i["interest"] == "Grain"), None)
    assert grain is not None
    assert grain["affinity"] is None


def test_countries_parsed(audience):
    countries = audience["countries"]
    assert len(countries) == 3
    assert countries[0] == {"value": "United States", "percent": pytest.approx(0.545)}


def test_metros_parsed(audience):
    metros = audience["metros"]
    assert len(metros) == 2
    assert metros[0]["value"] == "Los Angeles"


def test_gender_parsed(audience):
    gender = audience["gender"]
    labels = {g["value"] for g in gender}
    assert labels == {"Female", "Unspecified & custom", "Male"}


def test_device_parsed(audience):
    device = audience["device"]
    iphone = next((d for d in device if d["value"] == "iPhone"), None)
    assert iphone is not None
    assert iphone["percent"] == pytest.approx(0.636)


def test_age_parsed(audience):
    age = audience["age"]
    buckets = {a["value"] for a in age}
    assert "25-34" in buckets
    assert "18-24" in buckets


def test_missing_file_raises(tmp_path):
    missing = tmp_path / "nope.csv"
    with pytest.raises(FileNotFoundError):
        parse_audience_csv(missing)


def test_handles_utf8_bom(tmp_path):
    """Pinterest exports can have BOM — parser must tolerate it."""
    raw = FIXTURE.read_bytes()
    with_bom = b"\xef\xbb\xbf" + raw
    bom_file = tmp_path / "bom.csv"
    bom_file.write_bytes(with_bom)
    result = parse_audience_csv(bom_file)
    assert result["audience_size"] == 10000
