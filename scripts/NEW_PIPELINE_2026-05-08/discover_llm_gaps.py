# scripts/NEW_PIPELINE_2026-05-08/discover_llm_gaps.py
"""Discover topic gaps from the site's current content map.

This is an internal topic source, not a search-volume source. It gives an LLM
the existing article inventory and asks for practical follow-up topics that are
semantically distinct from what already exists. The downstream
filter_discovered_topics.py script remains the final quality and duplicate gate.

Usage:
    python scripts/NEW_PIPELINE_2026-05-08/discover_llm_gaps.py --count 50
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Callable

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from stage_1_5.openrouter import chat_completion, extract_text, usage_cost

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTICLE_DIR = REPO_ROOT / "src" / "data" / "articles"

DEFAULT_MODEL = "google/gemini-2.5-flash"
VALID_CATEGORIES = {"recipes", "nutrition", "tips"}
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "topics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "category": {"type": "string", "enum": ["recipes", "nutrition", "tips"]},
                    "content_type": {"type": "string"},
                    "parent_cluster": {"type": "string"},
                    "why_this_is_not_duplicate": {"type": "string"},
                    "pinterest_angle": {"type": "string"},
                    "seo_angle": {"type": "string"},
                },
                "required": [
                    "topic",
                    "category",
                    "content_type",
                    "parent_cluster",
                    "why_this_is_not_duplicate",
                    "pinterest_angle",
                    "seo_angle",
                ],
            },
        },
    },
    "required": ["topics"],
}


def _load_env() -> None:
    env_path = REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def _plain_yaml_value(value: str) -> str:
    value = value.strip()
    if "#" in value:
        value = value.split("#", 1)[0].strip()
    return value.strip().strip('"').strip("'")


def _parse_frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    if not text.startswith("---"):
        return {}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    frontmatter = parts[1]
    data: dict[str, Any] = {}
    tags: list[str] = []
    in_tags = False
    for raw_line in frontmatter.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            continue
        if in_tags and stripped.startswith("- "):
            tags.append(_plain_yaml_value(stripped[2:]))
            continue
        in_tags = False
        if stripped.startswith("title:"):
            data["title"] = _plain_yaml_value(stripped.split(":", 1)[1])
        elif stripped.startswith("category:"):
            data["category"] = _plain_yaml_value(stripped.split(":", 1)[1])
        elif stripped.startswith("tags:"):
            value = stripped.split(":", 1)[1].strip()
            if value.startswith("[") and value.endswith("]"):
                tags.extend(
                    _plain_yaml_value(item)
                    for item in value[1:-1].split(",")
                    if _plain_yaml_value(item)
                )
            else:
                in_tags = True
    if tags:
        data["tags"] = tags
    return data


def load_article_inventory(article_dir: Path = ARTICLE_DIR) -> list[dict[str, Any]]:
    if not article_dir.exists():
        return []
    articles: list[dict[str, Any]] = []
    for path in sorted(article_dir.glob("*.md")):
        data = _parse_frontmatter(path)
        title = str(data.get("title") or "").strip()
        if not title:
            continue
        category = str(data.get("category") or "tips").strip()
        if category not in VALID_CATEGORIES:
            category = "tips"
        articles.append({
            "title": title,
            "category": category,
            "slug": path.stem,
            "tags": data.get("tags", []),
        })
    return articles


def category_targets(total: int) -> dict[str, int]:
    if total <= 0:
        return {"recipes": 0, "nutrition": 0, "tips": 0}
    recipes = max(1, round(total * 0.4))
    nutrition = max(1, round(total * 0.3))
    tips = max(1, total - recipes - nutrition)
    while recipes + nutrition + tips > total:
        if recipes >= nutrition and recipes >= tips:
            recipes -= 1
        elif nutrition >= tips:
            nutrition -= 1
        else:
            tips -= 1
    while recipes + nutrition + tips < total:
        tips += 1
    return {"recipes": recipes, "nutrition": nutrition, "tips": tips}


def build_prompt(articles: list[dict[str, Any]], *, count: int, category: str | None = None) -> str:
    targets = category_targets(count)
    if category:
        target_text = f"Return exactly {count} topics, all in category {category}."
    else:
        target_text = (
            f"Return exactly {count} topics with this mix: "
            f"{targets['recipes']} recipes, {targets['nutrition']} nutrition, {targets['tips']} tips."
        )

    compact_inventory = [
        {
            "title": article["title"],
            "category": article["category"],
            "tags": article.get("tags", [])[:4],
        }
        for article in articles
    ]

    return f"""You are the topic gap strategist for Daily Life Hacks.

Daily Life Hacks is an American food, recipe, nutrition, meal-prep, and kitchen tips site. The reader is a practical home cook, often arriving from Pinterest, who wants useful food ideas without wellness-guru fluff.

EXISTING ARTICLES:
{json.dumps(compact_inventory, ensure_ascii=False, indent=2)}

TASK:
Generate new article topic candidates that are natural follow-ups to the existing site, but not semantic duplicates.

{target_text}

Rules:
- Each topic must be specific enough to become one article without guessing.
- Each topic must be useful for Pinterest discovery and for Google long-tail search.
- Prefer practical food/kitchen/nutrition jobs: dinner, lunch, breakfast, meal prep, freezer, storage, grocery savings, family cooking, high fiber, high protein, sodium-aware swaps, no-cook summer meals, leftovers, pantry meals.
- Include a real mix of recipes, nutrition explainers, and practical kitchen tips.
- Avoid medical claims, diet-program framing, supplements, detox, pregnancy, toddler/child-specific advice, and generic "healthy eating tips".
- Do not create another version of an existing topic with only wording changed.
- Do not over-focus on a single ingredient cluster.
- Use plain American English.

Return JSON only, matching this schema:
{json.dumps(OUTPUT_SCHEMA, indent=2)}
"""


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


def _normalize_category(raw: str) -> str:
    category = str(raw or "").strip().lower()
    if category in VALID_CATEGORIES:
        return category
    if "recipe" in category:
        return "recipes"
    if "nutrition" in category:
        return "nutrition"
    return "tips"


def normalize_topics(raw: dict[str, Any], *, category: str | None = None) -> list[dict[str, Any]]:
    rows = raw.get("topics") if isinstance(raw, dict) else None
    if not isinstance(rows, list):
        raise ValueError("LLM gap response missing topics array")

    seen: set[str] = set()
    topics: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        topic = re.sub(r"\s+", " ", str(row.get("topic") or "")).strip()
        if len(topic) < 12:
            continue
        normalized = topic.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        topic_category = category or _normalize_category(str(row.get("category") or ""))
        topics.append({
            "topic": topic,
            "source": "llm_gap",
            "category": topic_category,
            "seed": str(row.get("parent_cluster") or "site content gap").strip()[:120],
            "content_type": str(row.get("content_type") or "").strip()[:80],
            "why_this_is_not_duplicate": str(row.get("why_this_is_not_duplicate") or "").strip()[:500],
            "pinterest_angle": str(row.get("pinterest_angle") or "").strip()[:500],
            "seo_angle": str(row.get("seo_angle") or "").strip()[:500],
        })
    return topics


def call_gap_llm(
    *,
    api_key: str,
    model: str,
    prompt: str,
    timeout: int,
) -> tuple[dict[str, Any], dict[str, Any]]:
    response = chat_completion(
        api_key=api_key,
        model_id=model,
        system="You are a strict JSON-only content strategist. Return valid JSON and no markdown.",
        user=prompt,
        temperature=0.6,
        max_tokens=10000,
        timeout=timeout,
    )
    text, finish_reason = extract_text(response)
    tokens_in, tokens_out, cost = usage_cost(response)
    metadata = {
        "finish_reason": finish_reason,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_usd": cost,
    }
    try:
        return parse_json_response(text), metadata
    except ValueError:
        repair_prompt = f"""Convert this model output into valid JSON matching the required schema.

Rules:
- Preserve all topic ideas that are present.
- Do not add commentary.
- Return JSON only.

Required schema:
{json.dumps(OUTPUT_SCHEMA, indent=2)}

MODEL OUTPUT:
{text}
"""
        repair_response = chat_completion(
            api_key=api_key,
            model_id=model,
            system="You repair malformed JSON. Return valid JSON and no markdown.",
            user=repair_prompt,
            temperature=0.0,
            max_tokens=10000,
            timeout=timeout,
        )
        repair_text, repair_finish = extract_text(repair_response)
        repair_tokens_in, repair_tokens_out, repair_cost = usage_cost(repair_response)
        metadata.update({
            "repaired_json": True,
            "repair_finish_reason": repair_finish,
            "repair_tokens_in": repair_tokens_in,
            "repair_tokens_out": repair_tokens_out,
            "repair_cost_usd": repair_cost,
        })
        return parse_json_response(repair_text), metadata


def discover_gaps(
    *,
    articles: list[dict[str, Any]],
    count: int,
    category: str | None,
    api_key: str,
    model: str,
    timeout: int,
    llm_fn: Callable[..., tuple[dict[str, Any], dict[str, Any]]] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is required for LLM gap discovery")
    if llm_fn is None:
        llm_fn = call_gap_llm
    prompt = build_prompt(articles, count=count, category=category)
    raw, metadata = llm_fn(api_key=api_key, model=model, prompt=prompt, timeout=timeout)
    topics = normalize_topics(raw, category=category)
    return topics, metadata


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Discover topic gaps using the current site inventory")
    parser.add_argument("--count", type=int, default=50, help="Number of LLM gap candidates to request")
    parser.add_argument("--category", choices=sorted(VALID_CATEGORIES), default=None)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--report", type=Path, default=None, help="Optional metadata report path")
    args = parser.parse_args(argv)

    _load_env()
    api_key = args.api_key or os.environ.get("OPENROUTER_API_KEY", "")
    articles = load_article_inventory()
    if not articles:
        print("ERROR: no local articles found for gap discovery", file=sys.stderr)
        return 1

    try:
        topics, metadata = discover_gaps(
            articles=articles,
            count=args.count,
            category=args.category,
            api_key=api_key,
            model=args.model,
            timeout=args.timeout,
        )
    except Exception as exc:
        print(f"ERROR: LLM gap discovery failed: {exc}", file=sys.stderr)
        return 1

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(
            json.dumps({
                "ok": True,
                "requested_count": args.count,
                "returned_count": len(topics),
                "model": args.model,
                "article_count": len(articles),
                "category": args.category or "",
                "metadata": metadata,
                "topics": topics,
            }, indent=2),
            encoding="utf-8",
        )

    print(
        f"Found {len(topics)} LLM gap topic candidates from {len(articles)} articles",
        file=sys.stderr,
    )
    print(json.dumps(topics, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
