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
from typing import Any, Callable

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from stage_1_5.openrouter import chat_completion, extract_text

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
    "postpartum",
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

SPECIFIC_FOOD_ANCHORS = FOOD_ANCHORS - {
    "bake", "baked", "budget", "breakfast", "cook", "cooking", "dinner",
    "food", "freezer", "healthy", "kitchen", "lunch", "meal", "meals",
    "nutrition", "prep", "protein", "recipe", "recipes", "snack", "store",
    "sweet",
}

DEFAULT_MIN_SCORE = 0.7
DEFAULT_SEMANTIC_MODEL = "google/gemini-2.5-flash"
SOURCE_RANK = {
    "gsc": 0,
    "llm_gap_expansion": 1,
    "pinterest": 2,
    "autocomplete": 3,
    "manual": 3,
}
SEMANTIC_DEDUP_SCHEMA = {
    "type": "object",
    "properties": {
        "verdicts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "is_duplicate": {"type": "boolean"},
                    "matched_title": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["topic", "is_duplicate", "matched_title", "reason"],
            },
        },
    },
    "required": ["verdicts"],
}


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


def specific_food_tokens(tokens: set[str]) -> set[str]:
    return tokens & SPECIFIC_FOOD_ANCHORS


def deterministic_duplicate_match(tokens: set[str], known_tokens: set[str], similarity: float) -> bool:
    if similarity >= 0.86:
        return True

    if not tokens or not known_tokens:
        return False

    candidate_specific = specific_food_tokens(tokens)
    known_specific = specific_food_tokens(known_tokens)
    same_specific_food = bool(candidate_specific and known_specific and candidate_specific & known_specific)
    if same_specific_food and tokens.issubset(known_tokens | {"later", "guide", "tips"}):
        return True
    if same_specific_food and known_tokens.issubset(tokens | {"later", "guide", "tips"}):
        return True
    return False


def topic_specificity_score(tokens: set[str]) -> float:
    score = 0.6
    if 3 <= len(tokens) <= 9:
        score += 0.18
    elif len(tokens) > 9:
        score += 0.08
    if any(word in tokens for word in {"store", "cook", "prep", "freeze", "recipe", "recipes"}):
        score += 0.1
    if specific_food_tokens(tokens):
        score += 0.08
    return round(min(score, 1.0), 3)


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
    normalized = normalize_topic(topic)
    tokens = topic_tokens(topic)
    tip_intent_patterns = [
        r"\bhow to (store|keep|freeze|preserve|organize|revive|reheat|thaw)\b",
        r"\b(storage|stored|storing|fresh longer|last longer|freezer burn)\b",
    ]
    recipe_action_words = {
        "bake", "baked", "cook", "cooked", "grill", "grilled", "make",
        "roast", "roasted", "fry", "fried", "stir", "marinade",
    }
    nutrition_words = ["nutrition", "nutrient", "vitamin", "mineral", "protein",
                       "fiber", "calorie", "diet", "health", "benefit",
                       "antioxidant", "omega", "iron", "calcium"]

    if any(re.search(pattern, normalized) for pattern in tip_intent_patterns):
        return "tips"
    if "recipe" in tokens or "recipes" in tokens or any(word in tokens for word in recipe_action_words):
        return "recipes"
    if any(w in normalized for w in nutrition_words):
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
        known_normalized = normalize_topic(known)
        if normalized == known_normalized:
            return False, f"exact title already exists or is queued: {known}", 1.0
        known_tokens = topic_tokens(known)
        if not known_tokens:
            continue
        overlap = len(tokens & known_tokens)
        similarity = overlap / max(len(tokens), len(known_tokens))
        best_similarity = max(best_similarity, similarity)
        if deterministic_duplicate_match(tokens, known_tokens, similarity):
            return False, f"too similar to existing or queued topic: {known}", round(similarity, 3)

    score = topic_specificity_score(tokens)
    if best_similarity >= 0.55:
        score = max(score - 0.03, DEFAULT_MIN_SCORE)
    return True, "passed deterministic quality gate", round(min(score, 1.0), 3)


def build_semantic_dedup_prompt(candidates: list[dict], known_titles: list[str]) -> str:
    known = [str(title).strip() for title in known_titles if str(title).strip()]
    candidate_rows = [
        {
            "topic": candidate["topic"],
            "source": candidate.get("source", "manual"),
            "category": candidate.get("category", "tips"),
        }
        for candidate in candidates
    ]

    return f"""You are the final semantic duplicate gate for Daily Life Hacks.

Daily Life Hacks is an American healthy-eating, recipes, nutrition, and kitchen tips site.

EXISTING SITE ARTICLES AND PIPELINE TOPICS:
{json.dumps(known, indent=2)}

CANDIDATE TOPICS:
{json.dumps(candidate_rows, indent=2)}

Task:
Compare every candidate against the full existing list above.
Mark is_duplicate true when the candidate would create an article with the same core promise, reader job, or practical angle as an existing article or queued pipeline topic, even if the wording is different.
Do not mark a candidate duplicate merely because it shares an ingredient or broad category. For example, a salmon storage guide, a salmon oven method, and a salmon nutrition comparison can be separate articles.

Return JSON only, matching this schema:
{json.dumps(SEMANTIC_DEDUP_SCHEMA, indent=2)}

Use matched_title for the closest existing title when duplicate, otherwise use an empty string.
Keep each reason to one short sentence."""


def _clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
    return cleaned


def parse_json_response(text: str) -> dict[str, Any]:
    cleaned = _clean_json_text(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as first_error:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            extracted = cleaned[start:end + 1]
            try:
                return json.loads(extracted)
            except json.JSONDecodeError:
                pass
        snippet = cleaned[:700].replace("\n", "\\n")
        raise ValueError(f"LLM returned invalid JSON: {first_error}. Snippet: {snippet}") from first_error


def call_semantic_dedup_llm(
    *,
    candidates: list[dict],
    known_titles: list[str],
    api_key: str,
    model: str,
    timeout: int,
) -> dict[str, Any]:
    prompt = build_semantic_dedup_prompt(candidates, known_titles)
    response = chat_completion(
        api_key=api_key,
        model_id=model,
        system="You are a strict JSON-only content duplicate checker. Return valid JSON and no markdown.",
        user=prompt,
        temperature=0.1,
        max_tokens=3000,
        timeout=timeout,
    )
    text, _ = extract_text(response)
    try:
        return parse_json_response(text)
    except ValueError:
        repair_prompt = f"""Convert this model output into valid JSON matching the required schema.

Rules:
- Preserve every verdict that is present.
- Do not add commentary.
- Return JSON only.

Required schema:
{json.dumps(SEMANTIC_DEDUP_SCHEMA, indent=2)}

MODEL OUTPUT:
{text}
"""
        repair_response = chat_completion(
            api_key=api_key,
            model_id=model,
            system="You repair malformed JSON. Return valid JSON and no markdown.",
            user=repair_prompt,
            temperature=0.0,
            max_tokens=5000,
            timeout=timeout,
        )
        repair_text, _ = extract_text(repair_response)
        return parse_json_response(repair_text)


def parse_semantic_verdicts(raw: dict[str, Any], candidates: list[dict]) -> list[dict[str, Any]]:
    verdicts = raw.get("verdicts") if isinstance(raw, dict) else None
    if not isinstance(verdicts, list):
        raise ValueError("semantic gate response missing verdicts array")

    by_topic = {
        normalize_topic(str(verdict.get("topic", ""))): verdict
        for verdict in verdicts
        if isinstance(verdict, dict)
    }
    parsed = []
    for candidate in candidates:
        topic = str(candidate.get("topic", ""))
        verdict = by_topic.get(normalize_topic(topic))
        if not verdict:
            parsed.append({
                "topic": topic,
                "is_duplicate": True,
                "matched_title": "",
                "reason": "semantic gate did not return a verdict for this candidate",
            })
            continue
        parsed.append({
            "topic": topic,
            "is_duplicate": bool(verdict.get("is_duplicate")),
            "matched_title": str(verdict.get("matched_title") or ""),
            "reason": str(verdict.get("reason") or "").strip() or "semantic gate reviewed this candidate",
        })
    return parsed


def semantic_dedup_topics(
    candidates: list[dict],
    known_titles: list[str],
    *,
    api_key: str,
    model: str,
    timeout: int,
    llm_fn: Callable[..., dict[str, Any]] | None = None,
) -> tuple[list[dict], list[dict]]:
    if not candidates:
        return [], []
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is required for semantic duplicate checking")

    if llm_fn is None:
        llm_fn = call_semantic_dedup_llm

    raw = llm_fn(
        candidates=candidates,
        known_titles=known_titles,
        api_key=api_key,
        model=model,
        timeout=timeout,
    )
    verdicts = parse_semantic_verdicts(raw, candidates)

    accepted: list[dict] = []
    rejected: list[dict] = []
    for candidate, verdict in zip(candidates, verdicts):
        if verdict["is_duplicate"]:
            rejected.append({
                **candidate,
                "reason": f"semantic duplicate: {verdict['matched_title'] or verdict['reason']}",
                "semantic_match": verdict["matched_title"],
                "semantic_reason": verdict["reason"],
            })
            continue
        accepted.append({
            **candidate,
            "semantic_match": "",
            "semantic_reason": verdict["reason"],
            "quality_reason": f"{candidate.get('quality_reason', 'passed deterministic quality gate')}; semantic gate: {verdict['reason']}",
        })
    return accepted, rejected


def count_by_source(items: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for item in items:
        source = str(item.get("source") or "unknown")
        counts[source] = counts.get(source, 0) + 1
    return counts


def source_sort_key(topic: dict) -> tuple:
    return (
        SOURCE_RANK.get(str(topic.get("source", "manual")), 9),
        -(topic.get("impressions") or 0),
        -(topic.get("dedup_score") or 0),
        str(topic.get("topic", "")),
    )


def semantic_pool_key(topic: dict) -> str:
    seed = str(topic.get("seed") or "").strip().lower()
    if seed:
        return f"{topic.get('source', 'manual')}:{seed}"
    return f"{topic.get('source', 'manual')}:{topic.get('category', 'tips')}"


def select_semantic_pool(candidates: list[dict], pool_limit: int) -> tuple[list[dict], list[dict]]:
    if pool_limit <= 0 or not candidates:
        return [], list(candidates)

    buckets: dict[str, list[int]] = {}
    for index, candidate in enumerate(candidates):
        buckets.setdefault(semantic_pool_key(candidate), []).append(index)

    selected_indexes: list[int] = []
    while buckets and len(selected_indexes) < pool_limit:
        for key in list(buckets):
            selected_indexes.append(buckets[key].pop(0))
            if not buckets[key]:
                del buckets[key]
            if len(selected_indexes) >= pool_limit:
                break

    selected = set(selected_indexes)
    pool = [candidates[index] for index in selected_indexes]
    overflow = [candidate for index, candidate in enumerate(candidates) if index not in selected]
    return pool, overflow


def push_topics_to_d1(base_url: str, key: str, topics: list[dict]) -> dict:
    results = {"added": 0, "added_topics": [], "errors": []}
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
                body = resp.read().decode()
                try:
                    payload = json.loads(body) if body else {}
                except json.JSONDecodeError:
                    payload = {}
                results["added"] += 1
                results["added_topics"].append({
                    "topic": t["topic"],
                    "slug": payload.get("slug") or t.get("slug"),
                    "category": t.get("category"),
                    "source": t.get("source"),
                    "dedup_score": t.get("dedup_score"),
                })
        except urllib.error.HTTPError as e:
            results["errors"].append({"topic": t["topic"], "error": e.read().decode()[:200]})
        except Exception as e:
            results["errors"].append({"topic": t["topic"], "error": str(e)[:200]})
    return results


def write_report(
    path: Path,
    *,
    input_count: int,
    accepted: list[dict],
    overflow: list[dict],
    rejected: list[dict],
    results: dict | None,
    dry_run: bool,
    semantic: dict[str, Any] | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    all_reported = accepted + overflow + rejected
    path.write_text(
        json.dumps(
            {
                "ok": not results or not results.get("errors"),
                "no_op": bool(results and not results.get("errors") and not dry_run and results.get("added", 0) == 0),
                "dry_run": dry_run,
                "input_count": input_count,
                "source_counts": count_by_source(all_reported),
                "accepted_count": len(accepted),
                "overflow_count": len(overflow),
                "rejected_count": len(rejected),
                "added_count": 0 if not results else results.get("added", 0),
                "error_count": 0 if not results else len(results.get("errors", [])),
                "semantic": semantic or {"enabled": False},
                "accepted": accepted,
                "overflow": overflow,
                "rejected": rejected,
                "results": results or {},
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Filter and push topics to D1")
    parser.add_argument("--input", default=None, help="Input JSON file (default: stdin)")
    parser.add_argument("--base-url", default="https://www.daily-life-hacks.com")
    parser.add_argument("--key", default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--write-rejections", default=None, help="Optional JSON path for rejected candidates")
    parser.add_argument("--report", type=Path, default=None, help="Optional JSON report path")
    parser.add_argument("--limit", type=int, default=20, help="Maximum accepted topics to push")
    parser.add_argument("--category", choices=["recipes", "nutrition", "tips"], default=None)
    parser.add_argument("--require-added", action="store_true", help="Exit non-zero if no topic was added")
    parser.add_argument("--semantic-dedup", action="store_true", help="Run final LLM semantic duplicate check before push")
    parser.add_argument("--semantic-model", default=DEFAULT_SEMANTIC_MODEL, help="OpenRouter model for semantic duplicate check")
    parser.add_argument("--semantic-key", default=None, help="OpenRouter API key (default: OPENROUTER_API_KEY)")
    parser.add_argument("--semantic-timeout", type=int, default=90)
    parser.add_argument("--semantic-pool", type=int, default=None, help="Deterministic candidates to send to semantic gate before limit")
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
    semantic_known_titles = list(known_titles)

    accepted = []
    rejected = []
    for t in discovered:
        t = dict(t)
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
        if args.category and t["category"] != args.category:
            rejected.append({
                **t,
                "slug": slug,
                "reason": f"category filter mismatch: wanted {args.category}, got {t['category']}",
                "dedup_score": score,
            })
            continue
        t["slug"] = slug
        t["status"] = "pending"
        t["dedup_score"] = score
        t["quality_reason"] = reason
        accepted.append(t)
        all_known.add(slug)
        known_titles.append(t["topic"])

    accepted.sort(key=source_sort_key)
    limit = max(args.limit, 0)

    semantic_report: dict[str, Any] = {"enabled": False}
    semantic_overflow: list[dict] = []
    if args.semantic_dedup:
        semantic_key = args.semantic_key or os.environ.get("OPENROUTER_API_KEY", "")
        semantic_pool_limit = (
            max(args.semantic_pool, limit)
            if args.semantic_pool is not None
            else max(limit * 4, limit)
        )
        if limit == 0:
            semantic_pool_limit = 0

        semantic_pool, semantic_overflow = select_semantic_pool(accepted, semantic_pool_limit)
        print(
            f"Semantic gate: checking {len(semantic_pool)} candidates against "
            f"{len(semantic_known_titles)} existing site/pipeline topics",
            file=sys.stderr,
        )
        semantic_report = {
            "enabled": True,
            "model": args.semantic_model,
            "known_titles_count": len(semantic_known_titles),
            "checked_count": len(semantic_pool),
            "unchecked_overflow_count": len(semantic_overflow),
            "accepted_count": 0,
            "rejected_count": 0,
        }
        try:
            accepted, semantic_rejected = semantic_dedup_topics(
                semantic_pool,
                semantic_known_titles,
                api_key=semantic_key,
                model=args.semantic_model,
                timeout=args.semantic_timeout,
            )
        except Exception as e:
            semantic_report["error"] = str(e)
            print(f"ERROR: semantic duplicate gate failed: {e}", file=sys.stderr)
            if args.report:
                write_report(
                    args.report,
                    input_count=len(discovered),
                    accepted=[],
                    overflow=semantic_pool + semantic_overflow,
                    rejected=rejected,
                    results={"added": 0, "added_topics": [], "errors": [{"topic": "semantic_gate", "error": str(e)[:300]}]},
                    dry_run=args.dry_run,
                    semantic=semantic_report,
                )
            return 1
        rejected.extend(semantic_rejected)
        semantic_report["accepted_count"] = len(accepted)
        semantic_report["rejected_count"] = len(semantic_rejected)
        print(
            f"Semantic gate: {len(accepted)} passed, {len(semantic_rejected)} rejected, "
            f"{len(semantic_overflow)} deferred outside pool",
            file=sys.stderr,
        )

    selected = accepted[:limit] if limit else []
    overflow = accepted[limit:] if limit else accepted
    if semantic_overflow:
        overflow.extend({
            **topic,
            "semantic_status": "not checked; outside semantic pool",
        } for topic in semantic_overflow)

    print(
        f"After quality gate: {len(accepted)} candidates, {len(rejected)} rejected, "
        f"{len(selected)} selected for push",
        file=sys.stderr,
    )

    if args.write_rejections:
        with open(args.write_rejections, "w", encoding="utf-8") as f:
            json.dump(rejected, f, indent=2)

    if args.dry_run:
        if args.report:
            write_report(
                args.report,
                input_count=len(discovered),
                accepted=selected,
                overflow=overflow,
                rejected=rejected,
                results=None,
                dry_run=True,
                semantic=semantic_report,
            )
        print(json.dumps({"accepted": selected, "overflow": overflow, "rejected": rejected}, indent=2))
        return 0

    results = push_topics_to_d1(args.base_url, key, selected)
    print(f"Added {results['added']} topics to D1", file=sys.stderr)
    if results["errors"]:
        print(f"Errors: {len(results['errors'])}", file=sys.stderr)
        for e in results["errors"]:
            print(f"  - {e['topic']}: {e['error']}", file=sys.stderr)
    if args.report:
        write_report(
            args.report,
            input_count=len(discovered),
            accepted=selected,
            overflow=overflow,
            rejected=rejected,
            results=results,
            dry_run=False,
            semantic=semantic_report,
        )
    if results["errors"]:
        return 1
    if args.require_added and results["added"] == 0:
        print("ERROR: no new topics were added", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
