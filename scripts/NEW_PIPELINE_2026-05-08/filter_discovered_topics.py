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
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTICLE_DIR = REPO_ROOT / "src" / "data" / "articles"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DLH-Pipeline/1.0)",
    "Accept": "application/json",
}

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "best", "better", "easy", "for",
    "from", "guide", "how", "ideas", "in", "make", "of", "on", "or", "the",
    "to", "ways", "with", "without", "you", "your",
}

OFF_TOPIC_PHRASES = [
    "pla filament",
    "poster",
    "images",
    "drawing",
    "ppt",
    "essay",
    "reading",
    "bags",
    "elderly",
    "restaurant food prep",
    "small spaces",
]

LOCALE_PHRASES = [
    "filipino",
    "philippines",
    "indian",
    "nz",
    "south indian",
    "south africa",
    "uk",
    "tamil",
    "ramadan",
]

AUDIENCE_RISK_PHRASES = [
    "kids",
    "pregnant",
    "pregnancy",
    "seniors",
    "older adults",
    "toddlers",
    "children",
    "12 18 months",
    "10 year olds",
    "11 year olds",
    "college students",
    "students",
    "athletes",
    "school",
]

MEDICAL_OR_DIET_PHRASES = [
    "lose weight",
    "weight loss",
    "diet plan",
    "doctors",
    "food safety",
    "zepbound",
    "colonoscopy",
    "detox",
    "cleanse",
]

LOW_INTENT_PHRASES = [
    "reddit",
    "chart",
    "printable",
    "website",
    "worksheet",
    "worksheets",
    "youtube",
]

BROAD_TOPIC_PATTERNS = [
    r"^food prep guide(?: blog)? recipes?$",
    r"^food prep guide(?: blog)?$",
    r"^meal prep guide(?: blog)? recipes?$",
    r"^weekly food prep guide(?: recipes?)?$",
    r"^healthy meal prep$",
    r"^healthy meal prep\b",
    r"^quick dinner recipes\b",
    r"^easy breakfast ideas\b",
    r"^healthy snack ideas\b",
    r"^budget meal ideas\b",
    r"^simple lunch recipes\b",
    r"^food preparation tips\b",
    r"^food prep tips$",
    r"^food prep tips\b",
    r"^food prep safety tips$",
    r"^healthy food prep tips$",
    r"^healthy eating habits\b",
    r"^nutrition tips for\b",
    r"^kitchen hacks for\b",
]

FOOD_ANCHORS = {
    "air", "asparagus", "avocado", "bake", "baked", "banana", "bananas",
    "bean", "beans", "berries", "breakfast", "brisket", "broccoli",
    "budget", "cabbage", "cauliflower", "chicken", "cook", "cooking",
    "dinner", "fiber", "food", "freezer", "garlic", "grill", "healthy",
    "kitchen", "lunch", "meal", "meals", "mint", "nutrition", "oats",
    "oven", "pantry", "pasta", "potato", "potatoes", "prep", "protein",
    "recipe", "recipes", "rice", "salad", "salmon", "sandwich", "snack",
    "sodium", "soup", "steak", "store", "strawberries", "swap", "swaps",
    "sweet", "tuna", "vegetarian", "veg",
}

DEFAULT_MIN_SCORE = 0.7


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


def normalize_topic(topic: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", topic.lower())).strip()


def topic_tokens(topic: str) -> set[str]:
    return {
        token
        for token in normalize_topic(topic).split()
        if len(token) > 2 and token not in STOPWORDS
    }


def read_article_titles() -> list[str]:
    titles: list[str] = []
    if not ARTICLE_DIR.exists():
        return titles
    for path in ARTICLE_DIR.glob("*.md"):
        try:
            for line in path.read_text(encoding="utf-8").splitlines()[:20]:
                if line.startswith("title:"):
                    titles.append(line.split(":", 1)[1].strip().strip('"'))
                    break
        except UnicodeDecodeError:
            continue
    return titles


def get_existing_slugs() -> set[str]:
    slugs = set()
    if ARTICLE_DIR.exists():
        slugs = {f.stem for f in ARTICLE_DIR.iterdir() if f.suffix == ".md"}
    return slugs


def fetch_d1_topic_slugs(base_url: str, key: str) -> set[str]:
    url = f"{base_url}/api/pipeline-topics?key={key}"
    req = urllib.request.Request(url, headers=_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            return {t["slug"] for t in data.get("topics", [])}
    except Exception as e:
        print(f"Warning: Could not fetch D1 topics: {e}", file=sys.stderr)
        return set()


def fetch_d1_topic_titles(base_url: str, key: str) -> list[str]:
    url = f"{base_url}/api/pipeline-topics?key={key}"
    req = urllib.request.Request(url, headers=_HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            return [t["topic"] for t in data.get("topics", []) if t.get("topic")]
    except Exception as e:
        print(f"Warning: Could not fetch D1 topic titles: {e}", file=sys.stderr)
        return []


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


def quality_score_topic(topic: str, known_titles: list[str]) -> tuple[bool, str, float]:
    normalized = normalize_topic(topic)
    tokens = topic_tokens(topic)

    for phrase in OFF_TOPIC_PHRASES:
        if phrase in normalized:
            return False, f"off-topic autocomplete phrase: {phrase}", 0.0
    for phrase in LOCALE_PHRASES:
        if re.search(rf"\b{re.escape(phrase)}\b", normalized):
            return False, f"not US-audience focused: {phrase}", 0.0
    for phrase in AUDIENCE_RISK_PHRASES:
        if phrase in normalized:
            return False, f"audience/medical-adjacent topic not suitable for DLH pipeline: {phrase}", 0.0
    for phrase in MEDICAL_OR_DIET_PHRASES:
        if phrase in normalized:
            return False, f"medical or diet-program framing: {phrase}", 0.0
    for phrase in LOW_INTENT_PHRASES:
        if re.search(rf"\b{re.escape(phrase)}\b", normalized):
            return False, f"low article intent modifier: {phrase}", 0.0
    for pattern in BROAD_TOPIC_PATTERNS:
        if re.search(pattern, normalized):
            return False, "too generic for autonomous article production", 0.0

    if len(normalized) < 12:
        return False, "too short / too broad", 0.0
    if len(tokens) < 3:
        return False, "not specific enough", 0.0
    if not any(anchor in tokens for anchor in FOOD_ANCHORS):
        return False, "not clearly food, nutrition, kitchen, or meal-prep related", 0.0

    best_similarity = 0.0
    for known in known_titles:
        known_tokens = topic_tokens(known)
        if not known_tokens:
            continue
        overlap = len(tokens & known_tokens)
        similarity = overlap / max(len(tokens), len(known_tokens))
        best_similarity = max(best_similarity, similarity)
        if similarity >= 0.72:
            return False, f"too similar to existing or queued topic: {known}", round(similarity, 3)

    score = 1.0 - best_similarity
    if 3 <= len(tokens) <= 7:
        score += 0.15
    if any(word in tokens for word in {"how", "store", "cook", "prep", "recipe", "recipes"}):
        score += 0.1
    return True, "passed deterministic quality gate", round(min(score, 1.0), 3)


def push_topics_to_d1(base_url: str, key: str, topics: list[dict]) -> dict:
    results = {"added": 0, "errors": []}
    for t in topics:
        url = f"{base_url}/api/pipeline-topics?key={key}&action=add"
        data = json.dumps({
            "topic": t["topic"],
            "category": t.get("category", "tips"),
            "source": t.get("source", "manual"),
            "status": t.get("status", "pending"),
            "impressions": t.get("impressions"),
            "ctr": t.get("ctr"),
            "avg_position": t.get("avg_position"),
            "dedup_score": t.get("dedup_score"),
            "quality_reason": t.get("quality_reason"),
        }).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST",
            headers={**_HEADERS, "Content-Type": "application/json"})
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
    parser.add_argument("--write-rejections", default=None, help="Optional JSON path for rejected candidates")
    parser.add_argument("--min-score", type=float, default=DEFAULT_MIN_SCORE)
    args = parser.parse_args(argv)

    _load_env()
    key = args.key or os.environ.get("DASHBOARD_PASSWORD", "")
    if not key and not args.dry_run:
        print("ERROR: DASHBOARD_PASSWORD not set", file=sys.stderr)
        return 1

    if args.input:
        with open(args.input, encoding="utf-8-sig") as f:
            discovered = json.load(f)
    else:
        discovered = json.load(sys.stdin)

    print(f"Input: {len(discovered)} topics", file=sys.stderr)

    existing_slugs = get_existing_slugs()
    d1_slugs = fetch_d1_topic_slugs(args.base_url, key) if not args.dry_run else set()
    all_known = existing_slugs | d1_slugs
    known_titles = read_article_titles()
    if not args.dry_run:
        known_titles += fetch_d1_topic_titles(args.base_url, key)

    filtered = []
    rejected = []
    for t in discovered:
        slug = slug_from_topic(t["topic"])
        if slug in all_known:
            rejected.append({**t, "slug": slug, "reason": "exact slug already exists"})
            continue
        passed, reason, score = quality_score_topic(t["topic"], known_titles)
        if not passed:
            rejected.append({**t, "slug": slug, "reason": reason, "dedup_score": score})
            continue
        if score < args.min_score:
            rejected.append({
                **t,
                "slug": slug,
                "reason": f"quality score below threshold: {score} < {args.min_score}",
                "dedup_score": score,
            })
            continue
        if not t.get("category"):
            t["category"] = categorize_topic(t["topic"])
        t["slug"] = slug
        t["status"] = "pending"
        t["dedup_score"] = score
        t["quality_reason"] = reason
        filtered.append(t)
        all_known.add(slug)
        known_titles.append(t["topic"])

    print(f"After quality gate: {len(filtered)} candidates, {len(rejected)} rejected", file=sys.stderr)

    if args.write_rejections:
        with open(args.write_rejections, "w", encoding="utf-8") as f:
            json.dump(rejected, f, indent=2)

    if args.dry_run:
        print(json.dumps({"accepted": filtered, "rejected": rejected}, indent=2))
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
