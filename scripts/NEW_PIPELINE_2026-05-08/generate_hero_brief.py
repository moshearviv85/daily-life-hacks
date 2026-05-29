"""Generate hero image brief for one article. Writes to hero_briefs table in
pipeline-data/topic-research.sqlite (no JSONL).

Reads the article markdown (from SQL or disk), calls Gemini once via
OpenRouter, validates the response against HeroBrief, and upserts one row
into hero_briefs.

If the LLM fails after MAX_VALIDATION_RETRIES, a status='failed' row is
written so the failure is visible in SQL instead of disappearing.

CLI:
    python scripts/NEW_PIPELINE_2026-05-08/generate_hero_brief.py --slug <article-slug>
    python scripts/NEW_PIPELINE_2026-05-08/generate_hero_brief.py --slug <slug> --dry-run
    python scripts/NEW_PIPELINE_2026-05-08/generate_hero_brief.py --slug <slug> --force
    python scripts/NEW_PIPELINE_2026-05-08/generate_hero_brief.py --all
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
REPO_ROOT = _SCRIPT_DIR.parent.parent

from lib import brief_store  # noqa: E402
from lib.hero_brief import HeroBrief  # noqa: E402
from lib.article_lookup import markdown_for_slug  # noqa: E402

ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"
ENV_PATH = REPO_ROOT / ".env"
DEFAULT_DB_PATH = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"

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
- Make the image bright, fresh, colorful, and appetizing. Use natural daylight
  or soft studio light, clean highlights, visible color contrast, and warm food
  styling.
- Avoid dark, gloomy, underexposed, gray, muddy, desaturated, vintage,
  dramatic low-key, or moody lighting.

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
    """Load article markdown for a slug. SQL is the source of truth
    (review_outputs.reviewed_markdown → write_outputs.markdown); disk md
    is a fallback only."""
    raw = markdown_for_slug(slug)
    if not raw:
        path = ARTICLES_DIR / f"{slug}.md"
        if not path.exists():
            raise FileNotFoundError(
                f"article not found: not in SQL (write_outputs.markdown) "
                f"and not on disk ({path})"
            )
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


# ── SQL persistence ──────────────────────────────────────────────────────────

def _hero_exists(con, slug: str) -> bool:
    row = brief_store.get_hero_brief(con, slug)
    return bool(row and row["status"] == "ok")


def _write_hero_brief(con, brief: HeroBrief, *, model_id: str) -> None:
    brief_store.upsert_hero_brief(
        con,
        article_slug=brief.article_slug,
        prompt=brief.prompt,
        alt=brief.alt,
        model_id=model_id,
    )


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
        prompt = raw.get("prompt", "")
        try:
            return HeroBrief(
                article_slug=slug,
                prompt=prompt,
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

def main(
    argv: list[str] | None = None,
    *,
    llm_call=call_llm,
    db_path: Path | str = DEFAULT_DB_PATH,
) -> int:
    parser = argparse.ArgumentParser(description="Generate hero image brief for one article")
    parser.add_argument("--slug", help="article slug (matches src/data/articles/{slug}.md)")
    parser.add_argument("--all", action="store_true", help="generate for all articles missing hero briefs")
    parser.add_argument("--dry-run", action="store_true", help="print result, do not write to SQL")
    parser.add_argument("--force", action="store_true", help="overwrite existing row for this slug")
    args = parser.parse_args(argv)

    if not args.slug and not args.all:
        parser.error("either --slug or --all is required")

    if args.all:
        con = brief_store.connect(db_path)
        try:
            slugs = brief_store.list_missing_hero_briefs(con)
        finally:
            con.close()
        if not slugs:
            print("all articles already have hero briefs", file=sys.stderr)
            return 0
        print(f"generating hero briefs for {len(slugs)} articles...", file=sys.stderr)
        failed = 0
        for i, slug in enumerate(slugs, 1):
            print(f"[{i}/{len(slugs)}] {slug}", file=sys.stderr)
            try:
                result = main(["--slug", slug] + (["--dry-run"] if args.dry_run else []),
                              llm_call=llm_call, db_path=db_path)
                if result != 0:
                    failed += 1
            except (ValueError, RuntimeError):
                failed += 1
        print(f"done: {len(slugs) - failed} ok, {failed} failed", file=sys.stderr)
        return 1 if failed else 0

    if not args.force and not args.dry_run:
        con = brief_store.connect(db_path)
        try:
            already_ok = _hero_exists(con, args.slug)
        finally:
            con.close()
        if already_ok:
            print(f"skip: {args.slug} already has hero_briefs row (status='ok')", file=sys.stderr)
            return 0

    try:
        brief = generate_hero_brief(args.slug, llm_call=llm_call)
    except (ValueError, RuntimeError) as exc:
        if not args.dry_run:
            con = brief_store.connect(db_path)
            try:
                brief_store.record_failure_hero(
                    con, args.slug, str(exc)[:500], model_id=DEFAULT_MODEL
                )
            finally:
                con.close()
            print(
                f"failed: {args.slug} - recorded status='failed' row. error: {exc}",
                file=sys.stderr,
            )
        raise

    record = {
        "article_slug": brief.article_slug,
        "prompt": brief.prompt,
        "alt": brief.alt,
    }

    if args.dry_run:
        print(json.dumps(record, ensure_ascii=False, indent=2))
        return 0

    con = brief_store.connect(db_path)
    try:
        _write_hero_brief(con, brief, model_id=DEFAULT_MODEL)
    finally:
        con.close()
    print(json.dumps(record, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
