"""Generate 4-pin briefs for one article. Writes to pin_briefs table in
pipeline-data/topic-research.sqlite (no JSONL).

Reads src/data/articles/{slug}.md, calls Gemini once via OpenRouter, derives
pin slugs from pin titles in Python, validates the response against
PinBriefSet (4 unique pins, prompt must contain the title), and upserts
4 rows into pin_briefs (one row per pin, each in its own transaction).

If the LLM fails after MAX_VALIDATION_RETRIES, 4 status='failed' rows are
written so the failure is visible in SQL instead of disappearing.

CLI:
    python scripts/generate_pin_briefs.py --slug <article-slug>
    python scripts/generate_pin_briefs.py --slug <article-slug> --dry-run
    python scripts/generate_pin_briefs.py --slug <article-slug> --force
    python scripts/generate_pin_briefs.py --slug <article-slug> --description-only
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

from scripts.lib import brief_store
from scripts.lib.pin_brief import PinBrief, PinBriefSet
from scripts.lib.slugify import pin_slug_from_title
from scripts.lib.article_lookup import markdown_for_slug
from scripts.generate_hero_brief import (
    parse_frontmatter,
    first_paragraphs,
    extract_json_object,
    load_env_file,
)

ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"
ENV_PATH = REPO_ROOT / ".env"
DEFAULT_DB_PATH = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"

DEFAULT_MODEL = "google/gemini-2.5-flash"
DEFAULT_TEMPERATURE = 0.7
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
  - description : the Pinterest pin description (NOT the same as alt). A
             scroll-stopping teaser, STRICTLY 80 to 195 characters
             (count the chars before returning - 196 or more will be
             rejected). Written from a different angle than the title (do
             not just repeat the title). Open with a hook, name the
             concrete value the reader gets, end with a clear CTA driving
             them to click through to the article on the site (e.g.,
             "Get the full recipe.", "See all 5 swaps.", "Click for the
             printable list."). No em-dashes. No emojis. If your draft is
             196+ chars, rewrite it shorter before returning.

Hard rules:
- No em-dashes in titles, alts, or descriptions.
- No emojis anywhere.
- No medical claims, no supplements, no detox/cleanse language.
- Across the 4 pins of THIS article, vary the typography style, the surface,
  the lighting. Do not default to one look.
- Every title must be ASCII-only. Do NOT use accented characters or special
  letters (no e, n, u, c, &, etc.). Replace accented words with their plain
  English equivalent: "Sauteing" not "Sauteing", "Cafe" not "Cafe", and use
  the word "and" instead of "&".
- BANNED WORDS in titles, alts, descriptions (any field): Unlock, Elevate,
  Navigating, Game-changer, Revolutionize, Mouthwatering, Furthermore,
  Moreover, Delve, Dive into, In conclusion, In today's world, Take it to
  the next level. Use plain language instead. Examples of replacements:
  "Unlock the secret" -> "See the trick" or "Try the swap";
  "Elevate your meal" -> "Improve your meal" or "Boost your meal";
  "Game-changer" -> "real difference" or "shift";
  "Mouthwatering" -> "tasty" or just describe the food directly.

OUTPUT FORMAT (PLAIN TEXT, NOT JSON):

Return exactly 4 pins, each as a block of 4 labeled lines, separated by
the header "PIN N" where N is 1..4. No preamble, no closing remarks, no
code fence. Use the exact labels TITLE:, PROMPT:, ALT:, DESCRIPTION:
(uppercase, colon, single space). Each value is one single line.

Example shape (do not copy the example values):

PIN 1
TITLE: Your title here
PROMPT: Your photo brief here. Render the text "Your title here" across the top.
ALT: One factual sentence about the photograph.
DESCRIPTION: Your scroll-stopping teaser ending with a CTA.

PIN 2
TITLE: ...
PROMPT: ...
ALT: ...
DESCRIPTION: ...

PIN 3
TITLE: ...
PROMPT: ...
ALT: ...
DESCRIPTION: ...

PIN 4
TITLE: ...
PROMPT: ...
ALT: ...
DESCRIPTION: ...
"""

USER_TEMPLATE = """Article title: {title}

Article opening:
\"\"\"
{body_digest}
\"\"\"

Produce the 4-pin JSON now.
"""


DESCRIPTIONS_SYSTEM_PROMPT = """You are a Pinterest direct-response copywriter.

You will be given one article (title + opening) and 4 pin titles that have
already been chosen and rendered onto pin images. Your job: write the
Pinterest pin DESCRIPTION for each of the 4 pins, in order.

Each description must:
  - Be 80 to 195 characters STRICTLY. Count the characters before returning.
    196 or more will be rejected. If your draft is 196+, rewrite shorter.
  - Open with a hook that does NOT just repeat the pin title.
  - Name the concrete value the reader gets.
  - End with a clear CTA driving the click ("Get the full recipe.",
    "See all 5 swaps.", "Click for the printable list.", etc.).
  - Be ASCII-only (no accented characters, no em-dash, no emojis).
  - No medical claims, no supplements, no detox/cleanse language.

Hard rules:
- No em-dashes.
- No emojis.
- No banned AI words: Furthermore, Moreover, In conclusion, Delve into,
  Dive into, It's important to note, It's worth noting, In today's world,
  Unlock, Elevate, Navigating, Game-changer, Revolutionize,
  Take it to the next level, Mouthwatering.

Return ONLY a JSON object, no preamble, no commentary, no code fence:
{
  "descriptions": ["...", "...", "...", "..."]
}
"""

DESCRIPTIONS_USER_TEMPLATE = """Article title: {title}

Article opening:
\"\"\"
{body_digest}
\"\"\"

Pin titles (already locked, in order):
1. {t1}
2. {t2}
3. {t3}
4. {t4}

Produce the descriptions JSON now (one per pin, in the same order).
"""


# ── article ingestion ───────────────────────────────────────────────────────

def load_article(slug: str) -> dict:
    """Load article markdown for a slug. SQL is the source of truth
    (write_outputs.markdown); disk md is a fallback only."""
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

PIN_HEADER_RE = re.compile(r"^PIN\s+\d+\s*$", re.IGNORECASE)
FIELD_RE = re.compile(
    r"^(TITLE|PROMPT|ALT|DESCRIPTION)\s*:\s*(.*)$", re.IGNORECASE
)


def parse_pins_text(text: str) -> dict:
    """Parse the plain-text pin output into {'pins': [...]}.

    Skips any preamble before the first PIN header. Tolerates case
    variation, extra whitespace, and code fences. Each pin block is a
    PIN N header followed by lines of the form FIELD: value, with one
    line per field. Unknown fields are ignored. Empty pins are dropped."""
    pins: list[dict] = []
    current: dict = {}
    seen_first_header = False
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("```"):
            continue
        if PIN_HEADER_RE.match(line):
            if current:
                pins.append(current)
            current = {}
            seen_first_header = True
            continue
        if not seen_first_header:
            continue
        m = FIELD_RE.match(line)
        if not m:
            continue
        key = m.group(1).lower()
        val = m.group(2).strip()
        current[key] = val
    if current:
        pins.append(current)
    return {"pins": pins}


def call_llm(article: dict) -> dict:
    """Call the LLM via OpenRouter, return {'pins': [...]} parsed from
    the plain-text response."""
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
    return parse_pins_text(text)


def call_llm_for_descriptions(article: dict, pin_titles: list[str]) -> dict:
    """Call Gemini via OpenRouter for description-only backfill. Returns
    parsed JSON dict with 'descriptions' key (list of 4 strings)."""
    load_env_file(ENV_PATH)
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")
    from stage_1_5 import openrouter as _or
    user = DESCRIPTIONS_USER_TEMPLATE.format(
        title=article["title"],
        body_digest=article["body_digest"],
        t1=pin_titles[0],
        t2=pin_titles[1],
        t3=pin_titles[2],
        t4=pin_titles[3],
    )
    resp, _latency_ms = _or.call_with_retry(
        api_key=api_key,
        model_id=DEFAULT_MODEL,
        system=DESCRIPTIONS_SYSTEM_PROMPT,
        user=user,
        temperature=DEFAULT_TEMPERATURE,
        max_tokens=600,
        timeout=DEFAULT_TIMEOUT,
        retries=2,
        backoff_seconds=3.0,
    )
    text, _finish = _or.extract_text(resp)
    return extract_json_object(text)


# ── core ────────────────────────────────────────────────────────────────────

MAX_VALIDATION_RETRIES = 10
EXPECTED_PINS_PER_ARTICLE = 4


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
        description = (p.get("description") or "").strip()
        if not title:
            raise ValueError(f"pin[{i}].title missing or empty")
        slug_for_pin = _unique_slug_for(title, taken)
        taken.add(slug_for_pin)
        pins.append(PinBrief(
            slug=slug_for_pin,
            title=title,
            prompt=prompt,
            alt=alt,
            description=description,
        ))

    return PinBriefSet(article_slug=slug, pins=pins)


def generate_pin_briefs(slug: str, *, llm_call=call_llm) -> PinBriefSet:
    """Generate a 4-pin set for one article. Retries on stochastic validation
    failures (banned word, em-dash, etc.) up to MAX_VALIDATION_RETRIES times,
    since the LLM is sampled at temperature > 0 - a fresh sample usually passes.
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


# ── SQL persistence ─────────────────────────────────────────────────────────

def _legacy_pins_from_sql(con, slug: str) -> list[dict]:
    """Read existing pin rows for backfill. Returns a list of dicts with
    keys (slug, title, prompt, alt) preserving pin_index order. Raises
    KeyError if no rows exist for this slug."""
    rows = brief_store.list_pin_briefs(con, slug, only_ok=True)
    if not rows:
        raise KeyError(f"no pin_briefs rows for slug {slug!r}")
    return [
        {
            "slug": r["pin_slug"],
            "title": r["title"],
            "prompt": r["prompt"],
            "alt": r["alt"],
        }
        for r in rows
    ]


def _write_pin_brief_set(con, pset: PinBriefSet, *, model_id: str) -> None:
    """Upsert each pin in its own transaction. A CHECK violation on one pin
    does not roll back the others."""
    for idx, p in enumerate(pset.pins):
        brief_store.upsert_pin_brief(
            con,
            article_slug=pset.article_slug,
            pin_index=idx,
            pin_slug=p.slug,
            title=p.title,
            description=p.description,
            prompt=p.prompt,
            alt=p.alt,
            model_id=model_id,
        )


def _record_failure_for_all_slots(con, slug: str, error: str, *, model_id: str) -> None:
    """Mark every expected pin slot as failed. Visibility, not data."""
    for idx in range(EXPECTED_PINS_PER_ARTICLE):
        brief_store.record_failure_pin(
            con, slug, idx, error[:500], model_id=model_id
        )


# ── description-only backfill ───────────────────────────────────────────────

def _build_pin_brief_set_with_descriptions(
    slug: str, legacy_pins: list[dict], descriptions: list[str]
) -> PinBriefSet:
    if not isinstance(descriptions, list):
        raise ValueError(
            f"LLM 'descriptions' must be a list, got {type(descriptions).__name__}"
        )
    if len(descriptions) != len(legacy_pins):
        raise ValueError(
            f"description count mismatch: got {len(descriptions)} for "
            f"{len(legacy_pins)} pins"
        )
    pins: list[PinBrief] = []
    for i, (legacy, desc) in enumerate(zip(legacy_pins, descriptions)):
        if not isinstance(desc, str):
            raise ValueError(f"descriptions[{i}] is not a string: {desc!r}")
        pins.append(PinBrief(
            slug=legacy["slug"],
            title=legacy["title"],
            prompt=legacy["prompt"],
            alt=legacy["alt"],
            description=desc.strip(),
        ))
    return PinBriefSet(article_slug=slug, pins=pins)


def backfill_descriptions(
    slug: str,
    *,
    llm_call=call_llm_for_descriptions,
    db_path: Path | str = DEFAULT_DB_PATH,
) -> PinBriefSet:
    """Backfill description on every pin of an existing record in
    pin_briefs SQL. Reads the article markdown for context, calls the
    LLM for 4 descriptions matching the locked pin titles, validates the
    result, retries up to MAX_VALIDATION_RETRIES times on stochastic
    validation failures.

    Returns a validated PinBriefSet. Does NOT write to SQL - the caller
    persists via _write_pin_brief_set."""
    con = brief_store.connect(db_path)
    try:
        legacy_pins = _legacy_pins_from_sql(con, slug)
    finally:
        con.close()
    if len(legacy_pins) != EXPECTED_PINS_PER_ARTICLE:
        raise ValueError(
            f"record for {slug!r} must have {EXPECTED_PINS_PER_ARTICLE} pins, "
            f"got {len(legacy_pins)}"
        )
    for i, p in enumerate(legacy_pins):
        for k in ("slug", "title", "prompt", "alt"):
            if not p.get(k):
                raise ValueError(f"pin[{i}].{k} missing in record for {slug!r}")
    pin_titles = [p["title"] for p in legacy_pins]
    article = load_article(slug)
    last_err: ValueError | None = None
    for attempt in range(1, MAX_VALIDATION_RETRIES + 1):
        raw = llm_call(article, pin_titles)
        descriptions = raw.get("descriptions") if isinstance(raw, dict) else None
        try:
            return _build_pin_brief_set_with_descriptions(
                slug, legacy_pins, descriptions if descriptions is not None else []
            )
        except ValueError as exc:
            last_err = exc
            print(
                f"description backfill attempt {attempt}/{MAX_VALIDATION_RETRIES} "
                f"failed for {slug!r}: {exc}",
                file=sys.stderr,
            )
    assert last_err is not None
    raise ValueError(
        f"description backfill failed after {MAX_VALIDATION_RETRIES} attempts "
        f"for {slug!r}; last error: {last_err}"
    )


def pin_brief_set_to_record(pset: PinBriefSet) -> dict:
    """Reduce a PinBriefSet to the JSON shape printable from --dry-run."""
    return {
        "article_slug": pset.article_slug,
        "pins": [
            {
                "slug": p.slug,
                "title": p.title,
                "prompt": p.prompt,
                "alt": p.alt,
                "description": p.description,
            }
            for p in pset.pins
        ],
    }


# ── CLI ─────────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None, *, llm_call=None, db_path: Path | str = DEFAULT_DB_PATH) -> int:
    parser = argparse.ArgumentParser(description="Generate 4 pin briefs for one article")
    parser.add_argument("--slug", required=True, help="article slug (matches src/data/articles/{slug}.md)")
    parser.add_argument("--dry-run", action="store_true", help="print result, do not write to SQL")
    parser.add_argument("--force", action="store_true", help="overwrite existing rows for this slug")
    parser.add_argument(
        "--description-only",
        action="store_true",
        help="backfill description on every pin of an existing record; "
             "preserves slug, title, prompt, alt. Does not regenerate them.",
    )
    args = parser.parse_args(argv)

    if args.description_only:
        active_llm = llm_call if llm_call is not None else call_llm_for_descriptions
        pset = backfill_descriptions(args.slug, llm_call=active_llm, db_path=db_path)
        record = pin_brief_set_to_record(pset)
        if not args.dry_run:
            con = brief_store.connect(db_path)
            try:
                _write_pin_brief_set(con, pset, model_id=DEFAULT_MODEL)
            finally:
                con.close()
        print(json.dumps(record, ensure_ascii=False))
        return 0

    active_llm = llm_call if llm_call is not None else call_llm

    # idempotency: skip if all expected pins already exist
    if not args.force and not args.dry_run:
        con = brief_store.connect(db_path)
        try:
            existing = brief_store.list_pin_briefs(con, args.slug, only_ok=True)
        finally:
            con.close()
        if len(existing) >= EXPECTED_PINS_PER_ARTICLE:
            print(f"skip: {args.slug} already has {len(existing)} pin_briefs rows", file=sys.stderr)
            return 0

    try:
        pset = generate_pin_briefs(args.slug, llm_call=active_llm)
    except (ValueError, RuntimeError) as exc:
        if not args.dry_run:
            con = brief_store.connect(db_path)
            try:
                _record_failure_for_all_slots(
                    con, args.slug, str(exc), model_id=DEFAULT_MODEL
                )
            finally:
                con.close()
            print(
                f"failed: {args.slug} - recorded 4 status='failed' rows. error: {exc}",
                file=sys.stderr,
            )
        raise

    record = pin_brief_set_to_record(pset)

    if args.dry_run:
        print(json.dumps(record, ensure_ascii=False, indent=2))
        return 0

    con = brief_store.connect(db_path)
    try:
        if args.force:
            brief_store.delete_pin_briefs(con, args.slug)
        _write_pin_brief_set(con, pset, model_id=DEFAULT_MODEL)
    finally:
        con.close()
    print(json.dumps(record, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
