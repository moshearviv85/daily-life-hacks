# scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py
"""Filter and push discovered topics to D1.

Reads discovered topics JSON from stdin, deduplicates against existing articles
and D1 pipeline_topics, categorizes via LLM, and pushes approved topics to D1.

Usage:
    cat discovered.json | python scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py
    python scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py --input discovered.json
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTICLE_DIR = REPO_ROOT / "src" / "data" / "articles"


def _load_env() -> None:
    env_path = REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))


def slug_from_topic(topic: str) -> str:
    s = topic.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s[:80]


def get_existing_slugs() -> set[str]:
    slugs = set()
    if ARTICLE_DIR.exists():
        slugs = {f.stem for f in ARTICLE_DIR.iterdir() if f.suffix == ".md"}
    return slugs


def fetch_d1_topic_slugs(base_url: str, key: str) -> set[str]:
    url = f"{base_url}/api/pipeline-topics?key={key}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            return {t["slug"] for t in data.get("topics", [])}
    except Exception as e:
        print(f"Warning: Could not fetch D1 topics: {e}", file=sys.stderr)
        return set()


def categorize_topic(topic: str) -> str:
    t = topic.lower()
    recipe_words = ["recipe", "cook", "bake", "make", "roast", "grill", "fry",
                    "soup", "salad", "bowl", "sandwich", "bread", "cake", "pie",
                    "smoothie", "wrap", "stir", "marinade", "sauce"]
    nutrition_words = ["nutrition", "nutrient", "vitamin", "mineral", "protein",
                       "fiber", "calorie", "diet", "health", "benefit",
                       "antioxidant", "omega", "iron", "calcium"]

    if any(w in t for w in recipe_words):
        return "recipes"
    if any(w in t for w in nutrition_words):
        return "nutrition"
    return "tips"


def push_topics_to_d1(base_url: str, key: str, topics: list[dict]) -> dict:
    results = {"added": 0, "errors": []}
    for t in topics:
        url = f"{base_url}/api/pipeline-topics?key={key}&action=add"
        data = json.dumps({
            "topic": t["topic"],
            "category": t.get("category", "tips"),
            "source": t.get("source", "manual"),
        }).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST",
            headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                results["added"] += 1
        except urllib.error.HTTPError as e:
            results["errors"].append({"topic": t["topic"], "error": e.read().decode()[:200]})
        except Exception as e:
            results["errors"].append({"topic": t["topic"], "error": str(e)[:200]})
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Filter and push topics to D1")
    parser.add_argument("--input", default=None, help="Input JSON file (default: stdin)")
    parser.add_argument("--base-url", default="https://www.daily-life-hacks.com")
    parser.add_argument("--key", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    _load_env()
    key = args.key or os.environ.get("DASHBOARD_PASSWORD", "")
    if not key and not args.dry_run:
        print("ERROR: DASHBOARD_PASSWORD not set", file=sys.stderr)
        return 1

    if args.input:
        with open(args.input) as f:
            discovered = json.load(f)
    else:
        discovered = json.load(sys.stdin)

    print(f"Input: {len(discovered)} topics", file=sys.stderr)

    existing_slugs = get_existing_slugs()
    d1_slugs = fetch_d1_topic_slugs(args.base_url, key) if not args.dry_run else set()
    all_known = existing_slugs | d1_slugs

    filtered = []
    for t in discovered:
        slug = slug_from_topic(t["topic"])
        if slug in all_known:
            continue
        if not t.get("category"):
            t["category"] = categorize_topic(t["topic"])
        t["slug"] = slug
        filtered.append(t)
        all_known.add(slug)

    print(f"After dedup: {len(filtered)} new topics", file=sys.stderr)

    if args.dry_run:
        print(json.dumps(filtered, indent=2))
        return 0

    results = push_topics_to_d1(args.base_url, key, filtered)
    print(f"Added {results['added']} topics to D1", file=sys.stderr)
    if results["errors"]:
        print(f"Errors: {len(results['errors'])}", file=sys.stderr)
        for e in results["errors"]:
            print(f"  - {e['topic']}: {e['error']}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
