"""Google Autocomplete fetcher — no key required.

Uses the Firefox client of the suggest endpoint which returns a clean JSON
array: [query, [suggestions], ...].
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


_URL = "https://suggestqueries.google.com/complete/search"
_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) topic-research/1.0"


def fetch_autocomplete(query: str, hl: str = "en", gl: str = "us", timeout: int = 10) -> list[str]:
    """Return Google Autocomplete suggestions for a query. [] on failure."""
    params = urllib.parse.urlencode({"client": "firefox", "q": query, "hl": hl, "gl": gl})
    url = f"{_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
    except Exception as e:
        print(f"  [autocomplete:{query!r}] fetch failed: {e}", file=sys.stderr)
        return []

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []

    if not isinstance(data, list) or len(data) < 2:
        return []
    suggestions = data[1]
    if not isinstance(suggestions, list):
        return []
    return [s for s in suggestions if isinstance(s, str) and s.strip()]


def expand_seeds(
    seeds: list[str],
    hl: str = "en",
    gl: str = "us",
    sleep_between: float = 1.2,
) -> list[dict[str, Any]]:
    """Expand a list of seed keywords via Autocomplete.

    Returns list of dicts: {seed, expanded}. Expanded keywords are deduplicated
    across all seeds, and the seed itself (case-insensitive) is skipped.
    """
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for i, seed in enumerate(seeds):
        seed_clean = seed.strip()
        if not seed_clean:
            continue
        suggestions = fetch_autocomplete(seed_clean, hl=hl, gl=gl)
        for s in suggestions:
            s_clean = s.strip()
            if not s_clean or s_clean.lower() == seed_clean.lower():
                continue
            key = s_clean.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append({"seed": seed_clean, "expanded": s_clean})
        if sleep_between and i < len(seeds) - 1:
            time.sleep(sleep_between)
    return out


if __name__ == "__main__":
    import sys
    seeds = sys.argv[1:] or ["healthy soup recipes", "meal prep soup"]
    rows = expand_seeds(seeds)
    for r in rows:
        print(f"  [{r['seed']}] -> {r['expanded']}")
    print(f"Total: {len(rows)} keywords from {len(seeds)} seeds")
