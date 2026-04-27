"""Sync legacy pin metadata (pipeline-data/pins-export.csv) to Cloudflare D1.

Sends only pins whose article is already on disk in src/data/articles/{slug}.md
- the rest are orphans we shouldn't ship. Posts with ?append=1 so the new
queue starts AFTER whatever PENDING is already booked, instead of mixing
into today's slots. row_id ({slug}_v{variant}) is unique - existing POSTED
pins are skipped by the endpoint, so this is safe to run repeatedly.

CLI:
    python scripts/sync_legacy_pins.py
    python scripts/sync_legacy_pins.py --dry-run
    python scripts/sync_legacy_pins.py --csv path/to.csv --articles-dir other/dir
"""
from __future__ import annotations

import argparse
import csv
import io
import os
import sys
from pathlib import Path
from urllib.parse import urlencode

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.lib.legacy_pins import (
    build_legacy_pins_records,
    load_article_categories,
)
from scripts.lib.d1_csv import category_to_board
from scripts.sync_to_d1 import http_post, _post_with_retry
from scripts.generate_hero_brief import load_env_file


DEFAULT_CSV          = REPO_ROOT / "pipeline-data" / "pins-export.csv"
DEFAULT_ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"
DEFAULT_BASE_URL     = "https://www.daily-life-hacks.com"
ENV_PATH             = REPO_ROOT / ".env"


PIN_COLUMNS = ("slug", "variant", "pin_title", "description", "alt_text", "board")


def build_legacy_pins_csv(records: list[dict]) -> str:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=list(PIN_COLUMNS), quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    for r in records:
        writer.writerow({
            "slug":         r["slug"],
            "variant":      str(r["variant"]),
            "pin_title":    r["pin_title"],
            "description":  r["description"],
            "alt_text":     r["alt_text"],
            "board":        category_to_board(r["category"]),
        })
    return buf.getvalue()


def main(argv: list[str] | None = None, *, post=http_post) -> int:
    parser = argparse.ArgumentParser(
        description="Upload legacy pin metadata (pins-export.csv) to D1."
    )
    parser.add_argument("--csv", default=str(DEFAULT_CSV))
    parser.add_argument("--articles-dir", default=str(DEFAULT_ARTICLES_DIR))
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--key", default="")
    parser.add_argument("--dry-run", action="store_true",
                        help="print CSV body and exit, no POST")
    args = parser.parse_args(argv)

    key = args.key
    if not key and not args.dry_run:
        load_env_file(ENV_PATH)
        key = os.environ.get("STATS_KEY", "")
        if not key:
            print("ERROR: STATS_KEY missing (pass --key or set in .env)", file=sys.stderr)
            return 2

    categories = load_article_categories(args.articles_dir)
    print(f"loaded {len(categories)} article(s) from {args.articles_dir}", file=sys.stderr)

    records = build_legacy_pins_records(args.csv, categories)
    print(f"built {len(records)} legacy pin record(s) (skipped orphans)", file=sys.stderr)

    if not records:
        print("no records to send (no overlap between pins-export.csv and articles dir)", file=sys.stderr)
        return 0

    body = build_legacy_pins_csv(records)

    if args.dry_run:
        print("=== legacy pins CSV (first 1500 chars) ===")
        print(body[:1500])
        return 0

    url = f"{args.base_url}/api/pins-upload?{urlencode({'append': '1'})}"
    status, text = _post_with_retry(url, body, key, post=post)
    print(f"POST {url} -> {status}: {text[:200]}", file=sys.stderr)
    if not (200 <= status < 300):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
