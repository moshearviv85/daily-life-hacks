# scripts/NEW_PIPELINE_2026-05-08/discover_autocomplete.py
"""Discover topics from Google Autocomplete suggestions.

Takes seed queries and expands them via Google Autocomplete API.
Outputs JSON to stdout.

Usage:
    python scripts/NEW_PIPELINE_2026-05-08/discover_autocomplete.py
    python scripts/NEW_PIPELINE_2026-05-08/discover_autocomplete.py --seeds "healthy meal prep,quick dinner recipes"
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
import urllib.parse

DEFAULT_SEEDS = [
    "how to store fresh herbs",
    "how to store berries longer",
    "how to store avocados",
    "how to store bread fresh",
    "how to store potatoes",
    "best way to cook asparagus",
    "best way to cook salmon",
    "best way to cook sweet potatoes",
    "best way to cook broccoli",
    "best way to cook steak",
    "meal prep high protein lunches",
    "meal prep freezer meals",
    "meal prep lunch bowls",
    "meal prep rotisserie chicken",
    "meal prep rice bowls",
    "sheet pan chicken dinner",
    "one pot rice dinner",
    "ground beef dinner ideas",
    "rotisserie chicken dinner ideas",
    "overnight oats high protein",
    "high fiber lunch ideas",
    "low sodium pantry swaps",
    "fiber rich snacks",
    "high protein breakfast eggs yogurt beans",
]


def fetch_autocomplete(query: str) -> list[str]:
    url = "https://suggestqueries.google.com/complete/search"
    params = urllib.parse.urlencode({"client": "firefox", "q": query})
    req = urllib.request.Request(
        f"{url}?{params}",
        headers={"User-Agent": "Mozilla/5.0 (compatible; DLH-Bot/1.0)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data[1] if len(data) > 1 else []
    except Exception as e:
        print(f"Warning: autocomplete failed for '{query}': {e}", file=sys.stderr)
        return []


def discover_from_seeds(seeds: list[str], delay: float = 1.0) -> list[dict]:
    seen = set()
    results = []

    for seed in seeds:
        seed_lower = seed.lower().strip()
        suggestions = fetch_autocomplete(seed)
        for s in suggestions:
            s_lower = s.lower().strip()
            if s_lower == seed_lower:
                continue
            if s_lower not in seen and len(s_lower) > 10:
                seen.add(s_lower)
                results.append({
                    "topic": s,
                    "source": "autocomplete",
                    "seed": seed,
                })
        time.sleep(delay)

    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Discover topics from Google Autocomplete")
    parser.add_argument("--seeds", default=None, help="Comma-separated seed queries")
    parser.add_argument("--delay", type=float, default=1.0)
    args = parser.parse_args(argv)

    seeds = args.seeds.split(",") if args.seeds else DEFAULT_SEEDS
    topics = discover_from_seeds(seeds, args.delay)
    print(f"Found {len(topics)} autocomplete suggestions", file=sys.stderr)
    print(json.dumps(topics, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
