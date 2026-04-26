"""Generate 4-pin briefs for one article.

Reads src/data/articles/{slug}.md, calls Gemini once via OpenRouter, derives
pin slugs from pin titles in Python, validates the response against
PinBriefSet (4 unique pins, prompt must contain the title), and appends
one record to pipeline-data/pin-briefs.jsonl.

CLI:
    python scripts/generate_pin_briefs.py --slug <article-slug>
    python scripts/generate_pin_briefs.py --slug <article-slug> --dry-run
    python scripts/generate_pin_briefs.py --slug <article-slug> --force
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

from scripts.lib.pin_brief import PinBrief, PinBriefSet
from scripts.lib.slugify import pin_slug_from_title
from scripts.generate_hero_brief import (
    parse_frontmatter,
    first_paragraphs,
    extract_json_object,
    load_env_file,
)

ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"
OUTPUT_PATH = REPO_ROOT / "pipeline-data" / "pin-briefs.jsonl"
ENV_PATH = REPO_ROOT / ".env"

DEFAULT_MODEL = "google/gemini-2.5-flash"
DEFAULT_TEMPERATURE = 0.95
DEFAULT_MAX_TOKENS = 2000
DEFAULT_TIMEOUT = 90

SYSTEM_PROMPT = """You are a Pinterest direct-response copywriter and a food
photographer collaborating on every job.

Your job for one article: produce 4 different pins. Each pin is a photograph
WITH OVERLAY TEXT. The overlay text is the pin title rendered as actual
typography on top of the photograph. The goal of every pin: stop the scroll,
push the reader to click, and bring them to the article on the site.

Each pin has:
  - title  : a CTA-driven headline that recombines the article's content. NOT
             necessarily the article's own title. Scroll-stopping. Specific.
             Concrete nouns. 65 character ceiling. Across the 4 titles vary
             the opening word, the rhythm, and the angle. Each title must be
             unique.
  - prompt : your photography brief PLUS an explicit overlay-text instruction
             at the END. The overlay instruction must read:
                 Render the text "<exact title>" ...
             The exact title string must match this pin's title field
             character-for-character. No scene library is supplied; choose
             surface, light, angle, framing freely. No "dish/food/subject"
             placeholder words; name the actual thing.
  - alt    : one factual sentence describing what is literally in the
             photograph for screen readers and Google. 30 to 200 chars. No
             marketing language.

Hard rules:
- No em-dashes in titles or alts.
- No emojis anywhere.
- No medical claims, no supplements, no detox/cleanse language.
- Across the 4 pins of THIS article, vary the typography style, the surface,
  the lighting. Do not default to one look.
- Every title must be ASCII-only. Do NOT use accented characters or special
  letters (no é, ñ, ü, ç, &, etc.). Replace accented words with their plain
  English equivalent: "Sauteing" not "Sauteing", "Cafe" not "Cafe", and use
  the word "and" instead of "&".

Return ONLY a JSON object, no preamble, no commentary, no code fence:
{
  "pins": [
    {"title": "...", "prompt": "...", "alt": "..."},
    {"title": "...", "prompt": "...", "alt": "..."},
    {"title": "...", "prompt": "...", "alt": "..."},
    {"title": "...", "prompt": "...", "alt": "..."}
  ]
}
"""

USER_TEMPLATE = """Article title: {title}

Article opening:
\"\"\"
{body_digest}
\"\"\"

Produce the 4-pin JSON now.
"""


# ── article ingestion ───────────────────────────────────────────────────────

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


# ── JSONL persistence ───────────────────────────────────────────────────────

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


# ── slug derivation with uniqueness fallback ────────────────────────────────

def _unique_slug_for(title: str, taken: set[str]) -> str:
    base = pin_slug_from_title(title)
    slug = base
    n = 2
    while slug in taken:
        slug = f"{base}-{n}"
        n += 1
    return slug


# ── LLM call ────────────────────────────────────────────────────────────────

def call_llm(article: dict) -> dict:
    """Call Gemini via OpenRouter, return parsed JSON dict with 'pins' key."""
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


# ── core ────────────────────────────────────────────────────────────────────

MAX_VALIDATION_RETRIES = 5


def _build_pin_brief_set(slug: str, raw: dict) -> PinBriefSet:
    raw_pins = raw.get("pins") or []
    if not isinstance(raw_pins, list):
        raise ValueError(f"LLM response 'pins' must be a list, got {type(raw_pins).__name__}")

    taken: set[str] = set()
    pins: list[PinBrief] = []
    for i, p in enumerate(raw_pins):
        if not isinstance(p, dict):
            raise ValueError(f"pin[{i}] is not an object: {p!r}")
        title = (p.get("title") or "").strip()
        prompt = p.get("prompt") or ""
        alt = p.get("alt") or ""
        if not title:
            raise ValueError(f"pin[{i}].title missing or empty")
        slug_for_pin = _unique_slug_for(title, taken)
        taken.add(slug_for_pin)
        pins.append(PinBrief(slug=slug_for_pin, title=title, prompt=prompt, alt=alt))

    return PinBriefSet(article_slug=slug, pins=pins)


def generate_pin_briefs(slug: str, *, llm_call=call_llm) -> PinBriefSet:
    """Generate a 4-pin set for one article. Retries on stochastic validation
    failures (banned word, em-dash, etc.) up to MAX_VALIDATION_RETRIES times,
    since the LLM is sampled at temperature > 0 — a fresh sample usually passes.
    Hard errors (article missing, malformed LLM JSON shape) are not retried."""
    article = load_article(slug)
    last_err: ValueError | None = None
    for attempt in range(1, MAX_VALIDATION_RETRIES + 1):
        raw = llm_call(article)
        try:
            return _build_pin_brief_set(slug, raw)
        except ValueError as exc:
            last_err = exc
            print(
                f"pin-briefs validation attempt {attempt}/{MAX_VALIDATION_RETRIES} "
                f"failed for {slug!r}: {exc}",
                file=sys.stderr,
            )
    assert last_err is not None
    raise ValueError(
        f"pin-briefs validation failed after {MAX_VALIDATION_RETRIES} attempts "
        f"for {slug!r}; last error: {last_err}"
    )


def pin_brief_set_to_record(pset: PinBriefSet) -> dict:
    return {
        "article_slug": pset.article_slug,
        "pins": [
            {"slug": p.slug, "title": p.title, "prompt": p.prompt, "alt": p.alt}
            for p in pset.pins
        ],
    }


# ── CLI ─────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None, *, llm_call=call_llm) -> int:
    parser = argparse.ArgumentParser(description="Generate 4 pin briefs for one article")
    parser.add_argument("--slug", required=True, help="article slug (matches src/data/articles/{slug}.md)")
    parser.add_argument("--dry-run", action="store_true", help="print result, do not append to JSONL")
    parser.add_argument("--force", action="store_true", help="overwrite existing record for this slug")
    args = parser.parse_args(argv)

    if not args.force and not args.dry_run:
        if args.slug in load_existing_slugs(OUTPUT_PATH):
            print(f"skip: {args.slug} already in {OUTPUT_PATH.name}", file=sys.stderr)
            return 0

    pset = generate_pin_briefs(args.slug, llm_call=llm_call)
    record = pin_brief_set_to_record(pset)

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
