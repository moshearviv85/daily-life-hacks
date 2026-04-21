"""Pinterest Trends API — trending keywords filtered by our audience.

API docs: https://developers.pinterest.com/docs/api/v5/trends_list

Endpoint shape: GET /v5/trends/keywords/{region}/top/{trend_type}?<filters>
Returns up to 50 keywords ranked by trend strength for the given filters.

The interest/age/gender filters are critical — without them we get generic
"summer nails" trends. With food_and_drinks + female + 25-44 we get
"deviled eggs / pasta salad recipes / healthy dinner recipes" etc.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

_API_BASE = "https://api.pinterest.com/v5"

TREND_TYPES: tuple[str, ...] = ("growing", "monthly", "yearly", "seasonal")

# Recommended filters for the DLH audience (female 25-44, food & drinks niche)
DEFAULT_FILTERS: dict[str, list[str]] = {
    "interests": ["food_and_drinks"],
    "genders": ["female"],
    "ages": ["25-34", "35-44"],
}


def fetch_trending_keywords(
    access_token: str,
    trend_type: str,
    region: str = "US",
    interests: list[str] | None = None,
    genders: list[str] | None = None,
    ages: list[str] | None = None,
    limit: int = 50,
    timeout: int = 20,
) -> list[dict[str, Any]]:
    """Fetch trending keywords from Pinterest. Returns [] on failure (graceful)."""
    if trend_type not in TREND_TYPES:
        raise ValueError(f"trend_type must be one of {TREND_TYPES}, got {trend_type!r}")

    params: dict[str, str] = {"limit": str(limit)}
    if interests:
        params["interests"] = ",".join(interests)
    if genders:
        params["genders"] = ",".join(genders)
    if ages:
        params["ages"] = ",".join(ages)

    qs = urllib.parse.urlencode(params)
    url = f"{_API_BASE}/trends/keywords/{region}/top/{trend_type}?{qs}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:300] if e.fp else ""
        print(f"  [trends:{trend_type}] HTTP {e.code}: {body}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  [trends:{trend_type}] fetch failed: {e}", file=sys.stderr)
        return []

    trends = data.get("trends", []) if isinstance(data, dict) else []
    out: list[dict[str, Any]] = []
    for t in trends:
        if not isinstance(t, dict):
            continue
        keyword = (t.get("keyword") or "").strip()
        if not keyword:
            continue
        out.append({
            "keyword": keyword,
            "trend_type": trend_type,
            "region": region,
            "wow": t.get("pct_growth_wow"),
            "mom": t.get("pct_growth_mom"),
            "yoy": t.get("pct_growth_yoy"),
            "time_series": t.get("time_series") or {},
        })
    return out


def fetch_all_trend_types(
    access_token: str,
    region: str = "US",
    interests: list[str] | None = None,
    genders: list[str] | None = None,
    ages: list[str] | None = None,
    limit: int = 50,
    sleep_between: float = 1.0,
) -> list[dict[str, Any]]:
    """Fetch trending keywords for all 4 trend types and concatenate."""
    all_rows: list[dict[str, Any]] = []
    for i, tt in enumerate(TREND_TYPES):
        rows = fetch_trending_keywords(
            access_token=access_token,
            trend_type=tt,
            region=region,
            interests=interests,
            genders=genders,
            ages=ages,
            limit=limit,
        )
        all_rows.extend(rows)
        print(f"  [trends] {tt}: {len(rows)} keywords", file=sys.stderr)
        if sleep_between and i < len(TREND_TYPES) - 1:
            time.sleep(sleep_between)
    return all_rows


if __name__ == "__main__":
    import os
    from pathlib import Path
    for line in Path(".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip("'").strip('"')
    tok = os.environ["PINTEREST_ACCESS_TOKEN"]
    rows = fetch_all_trend_types(
        tok,
        interests=DEFAULT_FILTERS["interests"],
        genders=DEFAULT_FILTERS["genders"],
        ages=DEFAULT_FILTERS["ages"],
    )
    print(f"\nTotal: {len(rows)} trending keywords")
    for r in rows[:20]:
        print(f"  [{r['trend_type']:9s}] {r['keyword']:35s}  WoW:{r['wow']}%  MoM:{r['mom']}%  YoY:{r['yoy']}%")
