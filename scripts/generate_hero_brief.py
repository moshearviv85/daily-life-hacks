"""Generate hero image brief for one article.

Reads src/data/articles/{slug}.md, calls Gemini once via OpenRouter, validates
the response against HeroBrief, and appends one record to
pipeline-data/hero-briefs.jsonl.

CLI:
    python scripts/generate_hero_brief.py --slug <article-slug>
    python scripts/generate_hero_brief.py --slug <article-slug> --dry-run
    python scripts/generate_hero_brief.py --slug <article-slug> --force
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.lib.hero_brief import HeroBrief

ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"
OUTPUT_PATH = REPO_ROOT / "pipeline-data" / "hero-briefs.jsonl"
ENV_PATH = REPO_ROOT / ".env"

DEFAULT_MODEL = "google/gemini-2.5-flash"
DEFAULT_TEMPERATURE = 0.85
DEFAULT_MAX_TOKENS = 1000
DEFAULT_TIMEOUT = 60

SYSTEM_PROMPT = """You are a senior food and lifestyle photographer.
Your job: write ONE creative prompt for the hero image of an article, plus a
visual alt-text describing what the image shows for screen readers and Google.

Rules:
- The prompt is your photography brief. Free creative latitude on surface,
  light, angle, framing, scene. No scene library is supplied; choose freely.
- The alt is one factual sentence describing what the image literally shows.
  30 to 200 characters. No marketing language, no opinions, no em-dashes.
- The hero image has no overlay text. The photograph alone.

Return ONLY a JSON object, no preamble, no commentary, no code fence:
{"prompt": "string", "alt": "string"}
"""

USER_TEMPLATE = """Article title: {title}

Article opening:
\"\"\"
{body_digest}
\"\"\"

Produce the hero brief JSON now.
"""


# ── frontmatter / body ───────────────────────────────────────────────────────

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def parse_frontmatter(markdown: str) -> tuple[dict, str]:
    m = FRONTMATTER_RE.match(markdown.lstrip("﻿"))
    if not m:
        return {}, markdown
    raw, body = m.group(1), m.group(2)
    front: dict = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        if line.startswith(" "):
            continue
        k, _, v = line.partition(":")
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k and v and not k.startswith("-"):
            front[k] = v
    return front, body


def first_paragraphs(body: str, max_words: int = 180) -> str:
    text_lines = []
    for line in body.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or s.startswith("```"):
            continue
        text_lines.append(s)
    text = " ".join(text_lines).strip()
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + " ..."


def load_article(slug: str) -> dict:
    path = ARTICLES_DIR / f"{slug}.md"
    if not path.exists():
        raise FileNotFoundError(f"article not found: {path}")
    raw = path.read_text(encoding="utf-8")
    front, body = parse_frontmatter(raw)
    return {
        "slug": slug,
        "title": front.get("title", slug),
        "body_digest": first_paragraphs(body),
    }


# ── JSON extraction ──────────────────────────────────────────────────────────

JSON_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)


def extract_json_object(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    m = JSON_OBJECT_RE.search(cleaned)
    if not m:
        raise ValueError(f"no JSON object found: {text[:200]!r}")
    return json.loads(m.group(0))


# ── JSONL persistence ────────────────────────────────────────────────────────

def load_existing_slugs(path: Path) -> set[str]:
    if not path.exists():
        return set()
    out: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        s = obj.get("article_slug")
        if s:
            out.add(s)
    return out


def append_record(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def remove_slug_from_jsonl(path: Path, slug: str) -> None:
    if not path.exists():
        return
    kept = []
    for line in path.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s:
            continue
        try:
            obj = json.loads(s)
        except json.JSONDecodeError:
            continue
        if obj.get("article_slug") != slug:
            kept.append(s)
    path.write_text(("\n".join(kept) + "\n") if kept else "", encoding="utf-8")


# ── LLM call ─────────────────────────────────────────────────────────────────

def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        os.environ.setdefault(key.strip(), val.strip().strip("'").strip('"'))


def call_llm(article: dict) -> dict:
    """Call Gemini via OpenRouter, return parsed JSON dict."""
    load_env_file(ENV_PATH)
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")
    from stage_1_5 import openrouter as _or
    user = USER_TEMPLATE.format(title=article["title"], body_digest=article["body_digest"])
    resp, _latency_ms = _or.call_with_retry(
        api_key=api_key,
        model_id=DEFAULT_MODEL,
        system=SYSTEM_PROMPT,
        user=user,
        temperature=DEFAULT_TEMPERATURE,
        max_tokens=DEFAULT_MAX_TOKENS,
        timeout=DEFAULT_TIMEOUT,
        retries=2,
        backoff_seconds=3.0,
    )
    text, _finish = _or.extract_text(resp)
    return extract_json_object(text)


# ── core ─────────────────────────────────────────────────────────────────────

MAX_VALIDATION_RETRIES = 5


def generate_hero_brief(slug: str, *, llm_call=call_llm) -> HeroBrief:
    """Generate a hero brief for one article. Retries on stochastic validation
    failures (banned word in alt, em-dash, length out of range) up to
    MAX_VALIDATION_RETRIES times — temperature is non-zero so a fresh sample
    usually passes. Hard errors (article missing) are not retried."""
    article = load_article(slug)
    last_err: ValueError | None = None
    for attempt in range(1, MAX_VALIDATION_RETRIES + 1):
        raw = llm_call(article)
        try:
            return HeroBrief(
                article_slug=slug,
                prompt=raw.get("prompt", ""),
                alt=raw.get("alt", ""),
            )
        except ValueError as exc:
            last_err = exc
            print(
                f"hero-brief validation attempt {attempt}/{MAX_VALIDATION_RETRIES} "
                f"failed for {slug!r}: {exc}",
                file=sys.stderr,
            )
    assert last_err is not None
    raise ValueError(
        f"hero-brief validation failed after {MAX_VALIDATION_RETRIES} attempts "
        f"for {slug!r}; last error: {last_err}"
    )


# ── CLI ──────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None, *, llm_call=call_llm) -> int:
    parser = argparse.ArgumentParser(description="Generate hero image brief for one article")
    parser.add_argument("--slug", required=True, help="article slug (matches src/data/articles/{slug}.md)")
    parser.add_argument("--dry-run", action="store_true", help="print result, do not append to JSONL")
    parser.add_argument("--force", action="store_true", help="overwrite existing record for this slug")
    args = parser.parse_args(argv)

    if not args.force and not args.dry_run:
        if args.slug in load_existing_slugs(OUTPUT_PATH):
            print(f"skip: {args.slug} already in {OUTPUT_PATH.name}", file=sys.stderr)
            return 0

    brief = generate_hero_brief(args.slug, llm_call=llm_call)
    record = {
        "article_slug": brief.article_slug,
        "prompt": brief.prompt,
        "alt": brief.alt,
    }

    if args.dry_run:
        print(json.dumps(record, ensure_ascii=False, indent=2))
        return 0

    if args.force:
        remove_slug_from_jsonl(OUTPUT_PATH, args.slug)

    append_record(OUTPUT_PATH, record)
    print(json.dumps(record, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
