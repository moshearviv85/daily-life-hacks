"""Reddit source — fetches top posts from public subreddit JSON endpoints.

Uses reddit.com/r/X/top.json — no OAuth required. Rate limit is generous
enough for the 10-subreddit scan (a few requests with pauses between).
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

# Subreddits scanned during topic research. Ordered roughly by signal strength
# for our niche (healthy-eating / meal-prep / high-fiber).
SUBREDDITS: tuple[str, ...] = (
    "HealthyEating",
    "EatCheapAndHealthy",
    "MealPrepSunday",
    "nutrition",
    "1200isplenty",
    "Cooking",
    "fitmeals",
    "loseit",
    "volumeeating",
    "guthealth",
)

_USER_AGENT = "daily-life-hacks-topic-research/1.0 (+https://www.daily-life-hacks.com)"


def fetch_subreddit_top(
    subreddit: str,
    limit: int = 25,
    timeframe: str = "month",
    timeout: int = 15,
) -> list[dict[str, Any]]:
    """Fetch top posts from a subreddit. Returns [] on any failure (graceful).

    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
    """
    params = urllib.parse.urlencode({"t": timeframe, "limit": min(100, max(1, limit * 3))})
    url = f"https://www.reddit.com/r/{subreddit}/top.json?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
    except Exception as e:
        print(f"  [reddit:{subreddit}] fetch failed: {e}", file=sys.stderr)
        return []

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  [reddit:{subreddit}] bad JSON: {e}", file=sys.stderr)
        return []

    children = data.get("data", {}).get("children", []) if isinstance(data, dict) else []
    out: list[dict[str, Any]] = []
    for child in children:
        if not isinstance(child, dict):
            continue
        post = child.get("data") or {}
        if post.get("stickied"):
            continue
        nsfw = bool(post.get("over_18"))
        if nsfw:
            continue
        title = (post.get("title") or "").strip()
        if not title:
            continue
        permalink = post.get("permalink") or ""
        out.append({
            "title": title,
            "selftext": (post.get("selftext") or "").strip(),
            "upvotes": int(post.get("ups") or 0),
            "comments": int(post.get("num_comments") or 0),
            "url": f"https://www.reddit.com{permalink}" if permalink else "",
            "subreddit": post.get("subreddit") or subreddit,
            "created_utc": int(post.get("created_utc") or 0),
            "nsfw": nsfw,
        })
        if len(out) >= limit:
            break
    return out


def fetch_all_subreddits(
    subreddits: tuple[str, ...] | list[str] = SUBREDDITS,
    per_subreddit: int = 25,
    timeframe: str = "month",
    sleep_between: float = 2.0,
) -> list[dict[str, Any]]:
    """Sweep all configured subreddits. Graceful: one failure does not abort others."""
    posts: list[dict[str, Any]] = []
    for i, sub in enumerate(subreddits):
        batch = fetch_subreddit_top(sub, limit=per_subreddit, timeframe=timeframe)
        posts.extend(batch)
        print(f"  [reddit] r/{sub}: {len(batch)} posts", file=sys.stderr)
        if i < len(subreddits) - 1:
            time.sleep(sleep_between)
    return posts


if __name__ == "__main__":
    sub = sys.argv[1] if len(sys.argv) > 1 else "HealthyFood"
    posts = fetch_subreddit_top(sub, limit=10)
    for p in posts:
        print(f"[{p['upvotes']:5d} up | {p['comments']:3d} comments] {p['title']}")
