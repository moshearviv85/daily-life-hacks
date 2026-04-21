"""Tests for Reddit public-JSON fetcher."""
import json
from unittest.mock import patch, MagicMock

import pytest

try:
    from scripts.topic_research.sources.reddit import (
        fetch_subreddit_top,
        SUBREDDITS,
    )
except ImportError:
    fetch_subreddit_top = None
    SUBREDDITS = None


# Minimal realistic Reddit JSON structure
def _make_listing(posts):
    """Build a response shaped like reddit's /r/x/top.json."""
    return {
        "kind": "Listing",
        "data": {
            "children": [
                {"kind": "t3", "data": p} for p in posts
            ],
            "after": None,
        },
    }


SAMPLE_POSTS = [
    {
        "title": "What are your favorite high-fiber meals?",
        "selftext": "Looking for meal ideas that hit 30g+ fiber per day.",
        "ups": 850,
        "num_comments": 120,
        "permalink": "/r/HealthyFood/comments/abc123/high_fiber/",
        "subreddit": "HealthyFood",
        "created_utc": 1713600000,
        "over_18": False,
        "stickied": False,
    },
    {
        "title": "Easy sandwich ideas for work lunch?",
        "selftext": "",
        "ups": 420,
        "num_comments": 55,
        "permalink": "/r/HealthyFood/comments/def456/sandwich/",
        "subreddit": "HealthyFood",
        "created_utc": 1713500000,
        "over_18": False,
        "stickied": False,
    },
    {
        "title": "[MOD] Community rules — DO NOT REMOVE",
        "selftext": "",
        "ups": 9999,
        "num_comments": 0,
        "permalink": "/r/HealthyFood/comments/xxx/rules/",
        "subreddit": "HealthyFood",
        "created_utc": 1600000000,
        "over_18": False,
        "stickied": True,
    },
]


# ─────────────────────────────────────────────────────────────────

def test_module_exists():
    assert fetch_subreddit_top is not None


def test_subreddit_list_is_reasonable():
    assert isinstance(SUBREDDITS, (list, tuple))
    assert len(SUBREDDITS) >= 8
    # core communities we want
    for s in ("HealthyEating", "EatCheapAndHealthy", "MealPrepSunday", "nutrition"):
        assert s in SUBREDDITS, f"missing subreddit: {s}"


def test_fetch_returns_posts_with_expected_fields():
    response = _make_listing(SAMPLE_POSTS)
    mock_urlopen = MagicMock()
    mock_urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(response).encode()

    with patch("urllib.request.urlopen", mock_urlopen):
        posts = fetch_subreddit_top("HealthyFood", limit=10, timeframe="month")

    assert len(posts) == 2  # stickied mod post filtered out
    first = posts[0]
    assert first["title"] == "What are your favorite high-fiber meals?"
    assert first["subreddit"] == "HealthyFood"
    assert first["upvotes"] == 850
    assert first["comments"] == 120
    assert first["url"].startswith("https://www.reddit.com")


def test_fetch_filters_stickied():
    response = _make_listing(SAMPLE_POSTS)
    mock_urlopen = MagicMock()
    mock_urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(response).encode()

    with patch("urllib.request.urlopen", mock_urlopen):
        posts = fetch_subreddit_top("HealthyFood")

    for p in posts:
        assert "[MOD]" not in p["title"]


def test_fetch_filters_nsfw():
    nsfw_posts = [
        dict(SAMPLE_POSTS[0], over_18=True, title="Not safe post"),
        dict(SAMPLE_POSTS[1]),
    ]
    response = _make_listing(nsfw_posts)
    mock_urlopen = MagicMock()
    mock_urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(response).encode()

    with patch("urllib.request.urlopen", mock_urlopen):
        posts = fetch_subreddit_top("HealthyFood")

    assert all(not p.get("nsfw") for p in posts)
    assert len(posts) == 1


def test_fetch_handles_network_error_gracefully():
    """A source failure must not kill the research run — return empty list + log."""
    mock_urlopen = MagicMock(side_effect=Exception("DNS failure"))
    with patch("urllib.request.urlopen", mock_urlopen):
        posts = fetch_subreddit_top("HealthyFood")
    assert posts == []


def test_fetch_hits_correct_url():
    response = _make_listing(SAMPLE_POSTS)
    mock_urlopen = MagicMock()
    mock_urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(response).encode()

    with patch("urllib.request.urlopen", mock_urlopen) as m:
        fetch_subreddit_top("HealthyFood", limit=25, timeframe="week")

    call_args = m.call_args
    req = call_args[0][0]  # the Request object
    url = req.full_url if hasattr(req, "full_url") else req.get_full_url()
    assert "reddit.com/r/HealthyFood/top.json" in url
    assert "t=week" in url
    # limit is inflated (3x) to leave headroom after filtering stickied/NSFW
    assert "limit=" in url
    # Must send a User-Agent — reddit blocks blank UA
    assert req.get_header("User-agent")


def test_respects_limit_after_filtering():
    """If caller asks for N posts, return up to N from filtered set."""
    many = []
    for i in range(30):
        many.append({
            "title": f"Post {i}",
            "selftext": "",
            "ups": 100 + i,
            "num_comments": 10,
            "permalink": f"/r/HealthyFood/comments/x{i}/",
            "subreddit": "HealthyFood",
            "created_utc": 1713600000,
            "over_18": False,
            "stickied": False,
        })
    response = _make_listing(many)
    mock_urlopen = MagicMock()
    mock_urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(response).encode()

    with patch("urllib.request.urlopen", mock_urlopen):
        posts = fetch_subreddit_top("HealthyFood", limit=5)

    assert len(posts) == 5
