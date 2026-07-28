"""Fetch the full pin inventory from Pinterest API and write to local JSONL.

READ-ONLY. Does not touch D1, does not send anything to Pinterest, does
not modify any pipeline data. Only output: pipeline-data/pinterest-inventory.jsonl.

Used to figure out what's already live on Pinterest (regardless of which
tool uploaded it - Publer, post-pins.py, manual) before running
sync_legacy_pins.py, so we don't trigger duplicate posts.

CLI:
    python scripts/fetch_pinterest_inventory.py
    python scripts/fetch_pinterest_inventory.py --domain daily-life-hacks.com
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from base64 import b64encode
from pathlib import Path
from urllib.parse import urlencode

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.generate_hero_brief import load_env_file
from scripts.lib.pinterest_inventory import extract_slug_variant_from_link

ENV_PATH = REPO_ROOT / ".env"
OUTPUT_PATH = REPO_ROOT / "pipeline-data" / "pinterest-inventory.jsonl"
API_BASE = "https://api.pinterest.com/v5"


def _http_json(url: str, headers: dict, method: str = "GET", body: bytes | None = None) -> tuple[int, dict]:
    req = urllib.request.Request(url, headers=headers, method=method, data=body)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", errors="replace") if e.fp else ""
        try:
            return e.code, json.loads(text)
        except Exception:
            return e.code, {"raw": text[:500]}


def get_access_token() -> str:
    """Use stored access token if it works; otherwise refresh.
    Returns a valid access_token string or raises RuntimeError with guidance."""
    access = os.environ.get("PINTEREST_ACCESS_TOKEN", "")
    if access:
        # Try a tiny call to validate
        status, _ = _http_json(
            f"{API_BASE}/user_account",
            headers={"Authorization": f"Bearer {access}"},
        )
        if status == 200:
            return access
        print(f"PINTEREST_ACCESS_TOKEN invalid (HTTP {status}); attempting refresh", file=sys.stderr)

    refresh = os.environ.get("PINTEREST_REFRESH_TOKEN", "")
    app_id = os.environ.get("PINTEREST_APP_ID", "")
    app_secret = os.environ.get("PINTEREST_APP_SECRET", "")
    if not (refresh and app_id and app_secret):
        missing = [k for k, v in {
            "PINTEREST_REFRESH_TOKEN": refresh,
            "PINTEREST_APP_ID": app_id,
            "PINTEREST_APP_SECRET": app_secret,
        }.items() if not v]
        raise RuntimeError(
            f"Cannot refresh Pinterest token: missing env vars {missing}. "
            f"Either fix PINTEREST_ACCESS_TOKEN (still valid?) or add the "
            f"refresh credentials to .env"
        )

    basic = b64encode(f"{app_id}:{app_secret}".encode()).decode()
    body = urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh,
    }).encode()
    status, data = _http_json(
        f"{API_BASE}/oauth/token",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
        body=body,
    )
    if status != 200 or not data.get("access_token"):
        raise RuntimeError(f"Token refresh failed (HTTP {status}): {data}")
    return data["access_token"]


def fetch_all_pins(access_token: str, domain: str | None = None) -> list[dict]:
    """Page through GET /v5/pins until done. Returns a list of pin dicts."""
    out: list[dict] = []
    bookmark: str | None = None
    page = 0
    while True:
        page += 1
        params = {"page_size": 100}
        if bookmark:
            params["bookmark"] = bookmark
        if domain:
            params["domain"] = domain
        url = f"{API_BASE}/pins?{urlencode(params)}"
        status, data = _http_json(
            url, headers={"Authorization": f"Bearer {access_token}"},
        )
        if status == 429:
            print("Rate limited; sleeping 30s", file=sys.stderr)
            time.sleep(30)
            continue
        if status != 200:
            raise RuntimeError(f"GET /v5/pins failed (HTTP {status}): {data}")
        items = data.get("items") or []
        out.extend(items)
        bookmark = data.get("bookmark")
        print(f"page {page}: {len(items)} pins (total so far {len(out)})", file=sys.stderr)
        if not bookmark or not items:
            break
    return out


def normalize(pin: dict) -> dict:
    link = pin.get("link") or ""
    slug, variant = extract_slug_variant_from_link(link)
    return {
        "pin_id":      pin.get("id"),
        "title":       pin.get("title", ""),
        "link":        link,
        "board_id":    pin.get("board_id"),
        "created_at":  pin.get("created_at"),
        "slug":        slug,
        "variant":     variant,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch Pinterest pin inventory (READ-ONLY)")
    parser.add_argument("--domain", default="daily-life-hacks.com",
                        help="filter pins by link domain (default: daily-life-hacks.com)")
    parser.add_argument("--output", default=str(OUTPUT_PATH))
    args = parser.parse_args(argv)

    load_env_file(ENV_PATH)

    try:
        token = get_access_token()
    except RuntimeError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2

    print(f"Fetching all pins for domain={args.domain!r}...", file=sys.stderr)
    pins = fetch_all_pins(token, domain=args.domain)
    print(f"Total pins: {len(pins)}", file=sys.stderr)

    normalized = [normalize(p) for p in pins]
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as fh:
        for rec in normalized:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"Wrote {len(normalized)} records to {out}", file=sys.stderr)

    # Quick coverage report
    with_variant = sum(1 for r in normalized if r.get("variant") is not None)
    slug_only = sum(1 for r in normalized if r.get("slug") and r.get("variant") is None)
    no_slug = sum(1 for r in normalized if not r.get("slug"))
    print(f"  with slug+variant: {with_variant}")
    print(f"  slug only (variant unknown): {slug_only}")
    print(f"  no slug (different domain or root): {no_slug}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
