"""Sync local pipeline state to Cloudflare D1.

Reads articles from pipeline-data/topic-research.sqlite (write_outputs,
status='written') and pins from pipeline-data/pin-briefs.jsonl. Injects
hero alt from hero-briefs.jsonl into each article's frontmatter (replacing
the writer's stale imageAlt). Builds two CSVs and POSTs them to:

    POST {base_url}/api/articles-upload?key={STATS_KEY}   (text/csv)
    POST {base_url}/api/pins-upload?key={STATS_KEY}       (text/csv)

Articles are sent first; the /api/pins-next endpoint will not release a
pin whose article isn't yet PUBLISHED or DUPLICATE in articles_schedule
(see functions/api/pins-next.js:67-83), so the order matters.

CLI:
    python scripts/sync_to_d1.py
    python scripts/sync_to_d1.py --dry-run
    python scripts/sync_to_d1.py --articles-only
    python scripts/sync_to_d1.py --pins-only
    python scripts/sync_to_d1.py --base-url https://staging.example.com --key XYZ
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlencode

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.lib.d1_csv import (
    build_articles_csv,
    build_pins_csv,
    inject_image_alt,
)
from scripts.lib.d1_sources import (
    fetch_articles_from_sql,
    fetch_pin_records_from_jsonl,
    load_hero_alts,
)
from scripts.generate_hero_brief import load_env_file


DEFAULT_DB        = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
DEFAULT_PINS_JSONL = REPO_ROOT / "pipeline-data" / "pin-briefs.jsonl"
DEFAULT_HERO_JSONL = REPO_ROOT / "pipeline-data" / "hero-briefs.jsonl"
DEFAULT_BASE_URL   = "https://www.daily-life-hacks.com"
ENV_PATH           = REPO_ROOT / ".env"

MAX_5XX_RETRIES = 3
BACKOFF_SECONDS = 2.0


# ── HTTP ─────────────────────────────────────────────────────────────────────

def http_post(url: str, *, body: str, key: str) -> tuple[int, str]:
    """POST CSV body. Returns (status, response_text)."""
    full_url = f"{url}?{urlencode({'key': key})}"
    req = urllib.request.Request(
        full_url,
        data=body.encode("utf-8"),
        method="POST",
        headers={"Content-Type": "text/csv; charset=utf-8"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace") if e.fp else ""


def _post_with_retry(url: str, body: str, key: str, *, post) -> tuple[int, str]:
    """Wrap a single POST with retry-on-5xx (bounded). 4xx goes through
    immediately — those are user errors (bad key, bad CSV) that retrying
    won't fix."""
    last = (0, "")
    for attempt in range(1, MAX_5XX_RETRIES + 1):
        status, text = post(url, body=body, key=key)
        last = (status, text)
        if 200 <= status < 300:
            return last
        if 400 <= status < 500:
            return last  # don't retry client errors
        # 5xx
        if attempt < MAX_5XX_RETRIES:
            print(
                f"  POST {url} returned {status}, retry "
                f"{attempt}/{MAX_5XX_RETRIES - 1} in {BACKOFF_SECONDS * attempt:.1f}s",
                file=sys.stderr,
            )
            time.sleep(BACKOFF_SECONDS * attempt)
    return last


# ── core ─────────────────────────────────────────────────────────────────────

def _build_articles_csv_with_injected_alts(articles: list[dict], hero_alts: dict[str, str]) -> str:
    enriched: list[dict] = []
    for a in articles:
        alt = hero_alts.get(a["slug"], "")
        new_md = inject_image_alt(a["markdown"], alt) if alt else a["markdown"]
        enriched.append({**a, "markdown": new_md})
    return build_articles_csv(enriched)


def main(argv: list[str] | None = None, *, post=http_post) -> int:
    parser = argparse.ArgumentParser(
        description="Sync pipeline state (articles + pins) to Cloudflare D1."
    )
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--pins-jsonl", default=str(DEFAULT_PINS_JSONL))
    parser.add_argument("--hero-jsonl", default=str(DEFAULT_HERO_JSONL))
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--key", default="")
    parser.add_argument("--articles-only", action="store_true")
    parser.add_argument("--pins-only", action="store_true")
    parser.add_argument("--append", action="store_true",
                        help="POST to /api/pins-upload with ?append=1 so new "
                             "pins queue up AFTER existing PENDING instead of "
                             "mixing into today's slots")
    parser.add_argument("--dry-run", action="store_true",
                        help="print CSVs to stdout, do not POST")
    args = parser.parse_args(argv)

    if args.articles_only and args.pins_only:
        print("ERROR: --articles-only and --pins-only are mutually exclusive", file=sys.stderr)
        return 2

    key = args.key
    if not key and not args.dry_run:
        load_env_file(ENV_PATH)
        key = os.environ.get("STATS_KEY", "")
        if not key:
            print("ERROR: STATS_KEY missing (pass --key or set in .env)", file=sys.stderr)
            return 2

    articles = fetch_articles_from_sql(args.db)
    print(f"loaded {len(articles)} article(s) from {args.db}", file=sys.stderr)

    if not args.pins_only:
        hero_alts = load_hero_alts(args.hero_jsonl)
        print(f"loaded {len(hero_alts)} hero alt(s) for injection", file=sys.stderr)
        articles_csv = _build_articles_csv_with_injected_alts(articles, hero_alts)
        if args.dry_run:
            print("=== articles CSV (first 1000 chars) ===")
            print(articles_csv[:1000])
        else:
            url = f"{args.base_url}/api/articles-upload"
            status, text = _post_with_retry(url, articles_csv, key, post=post)
            print(f"POST {url} -> {status}: {text[:200]}", file=sys.stderr)
            if not (200 <= status < 300):
                return 1

    if not args.articles_only:
        pin_records = fetch_pin_records_from_jsonl(args.pins_jsonl, articles)
        print(f"loaded {len(pin_records)} pin record(s) from {args.pins_jsonl}", file=sys.stderr)
        if pin_records:
            pins_csv = build_pins_csv(pin_records)
            if args.dry_run:
                print("=== pins CSV (first 1000 chars) ===")
                print(pins_csv[:1000])
            else:
                url = f"{args.base_url}/api/pins-upload"
                if args.append:
                    url += "?append=1"
                status, text = _post_with_retry(url, pins_csv, key, post=post)
                print(f"POST {url} -> {status}: {text[:200]}", file=sys.stderr)
                if not (200 <= status < 300):
                    return 1
        else:
            print("no pin records to send (skipping pins-upload)", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
