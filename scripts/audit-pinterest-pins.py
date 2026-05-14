#!/usr/bin/env python3
"""
Pinterest Pin Audit — pulls ALL pins from the account via API
and cross-references destination URLs against live site pages.

Usage:
  python scripts/audit-pinterest-pins.py

Reads PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN from env.
"""

import os
import sys
import json
from base64 import b64encode
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests

API_BASE = "https://api.pinterest.com/v5"
SITE = "https://www.daily-life-hacks.com"
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def get_access_token():
    app_id = os.environ.get("PINTEREST_APP_ID", "")
    app_secret = os.environ.get("PINTEREST_APP_SECRET", "")
    refresh_token = os.environ.get("PINTEREST_REFRESH_TOKEN", "")

    if not all([app_id, app_secret, refresh_token]):
        print("ERROR: set PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN")
        sys.exit(1)

    basic = b64encode(f"{app_id}:{app_secret}".encode()).decode()
    resp = requests.post(
        f"{API_BASE}/oauth/token",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        timeout=15,
    )
    if not resp.ok:
        print(f"ERROR: token refresh failed — HTTP {resp.status_code}")
        print(resp.text[:500])
        sys.exit(1)

    data = resp.json()
    token = data.get("access_token")
    if not token:
        print("ERROR: no access_token in response")
        sys.exit(1)

    print(f"Token OK (expires in {data.get('expires_in', '?')}s)")
    return token


def list_boards(token):
    boards = []
    bookmark = None
    while True:
        params = {"page_size": 100}
        if bookmark:
            params["bookmark"] = bookmark
        resp = requests.get(
            f"{API_BASE}/boards",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        boards.extend(data.get("items", []))
        bookmark = data.get("bookmark")
        if not bookmark:
            break
    return boards


def list_board_pins(token, board_id):
    pins = []
    bookmark = None
    while True:
        params = {"page_size": 100}
        if bookmark:
            params["bookmark"] = bookmark
        resp = requests.get(
            f"{API_BASE}/boards/{board_id}/pins",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        pins.extend(data.get("items", []))
        bookmark = data.get("bookmark")
        if not bookmark:
            break
    return pins


def load_valid_slugs():
    articles_dir = PROJECT_ROOT / "src" / "data" / "articles"
    articles = set()
    for f in articles_dir.iterdir():
        if f.suffix == ".md":
            articles.add(f.stem)

    aliases = set()
    alias_file = PROJECT_ROOT / "pipeline-data" / "slug-aliases.json"
    if alias_file.exists():
        with open(alias_file) as f:
            aliases = set(json.load(f).keys())

    variants = set()
    rm_file = PROJECT_ROOT / "pipeline-data" / "router-mapping.json"
    if rm_file.exists():
        with open(rm_file) as f:
            rm = json.load(f)
        for base_slug, variant_map in rm.items():
            for vkey, vdata in variant_map.items():
                if isinstance(vdata, dict) and "url_slug" in vdata:
                    variants.add(vdata["url_slug"])

    return articles, aliases, variants


def extract_slug(url):
    if not url:
        return ""
    slug = url.replace(SITE + "/", "").replace(SITE, "").strip("/")
    slug = slug.split("?")[0].split("#")[0]
    return slug


def main():
    token = get_access_token()
    articles, aliases, variants = load_valid_slugs()
    all_valid = articles | aliases | variants

    print(f"\nSite: {len(articles)} articles, {len(aliases)} aliases, {len(variants)} variants")
    print(f"Total valid slugs: {len(all_valid)}\n")

    boards = list_boards(token)
    print(f"Found {len(boards)} boards:")
    for b in boards:
        print(f"  - {b.get('name', '?')} (id: {b['id']})")

    all_pins = []
    for board in boards:
        pins = list_board_pins(token, board["id"])
        for p in pins:
            p["_board_name"] = board.get("name", "?")
        all_pins.extend(pins)
        print(f"  {board.get('name', '?')}: {len(pins)} pins")

    print(f"\nTotal pins on Pinterest: {len(all_pins)}\n")

    dead = []
    alive = []
    no_link = []

    for pin in all_pins:
        pin_id = pin.get("id", "?")
        link = pin.get("link", "")
        title = pin.get("title", "")
        if not title:
            title = (pin.get("description") or "")[:60]
        board_name = pin.get("_board_name", "?")

        if not link:
            no_link.append({"pin_id": pin_id, "title": title, "board": board_name})
            continue

        slug = extract_slug(link)

        if slug in all_valid:
            status = "article" if slug in articles else "alias" if slug in aliases else "variant"
            alive.append({"pin_id": pin_id, "slug": slug, "status": status, "title": title, "board": board_name})
        else:
            base = slug
            for suffix in ["-guide", "-tips"]:
                if base.endswith(suffix):
                    base = base[:-len(suffix)]
            best_base = base[5:] if base.startswith("best-") else None

            suggestion = ""
            if base in articles:
                suggestion = base
            elif best_base and best_base in articles:
                suggestion = best_base

            dead.append({
                "pin_id": pin_id,
                "slug": slug,
                "link": link,
                "title": title,
                "board": board_name,
                "suggestion": suggestion,
            })

    print("=" * 70)
    print(f"ALIVE: {len(alive)} pins point to valid pages")
    print(f"DEAD:  {len(dead)} pins point to non-existent pages")
    print(f"NO LINK: {len(no_link)} pins have no destination URL")
    print("=" * 70)

    if dead:
        print(f"\n{'DEAD PINS':=^70}")
        for d in sorted(dead, key=lambda x: x["slug"]):
            arrow = f" -> {d['suggestion']}" if d["suggestion"] else " -> ??? NO MATCH"
            print(f"  {d['slug']}{arrow}")
            print(f"    pin_id: {d['pin_id']}  board: {d['board']}")
        print()

        with_match = [d for d in dead if d["suggestion"]]
        without_match = [d for d in dead if not d["suggestion"]]
        print(f"  {len(with_match)} can be auto-aliased (clear article match)")
        print(f"  {len(without_match)} need manual mapping")

        if without_match:
            print(f"\n  Unmatched slugs:")
            for d in without_match:
                print(f"    {d['slug']}  (pin: {d['pin_id']})")

    if no_link:
        print(f"\n{'PINS WITHOUT LINK':=^70}")
        for n in no_link:
            print(f"  pin_id: {n['pin_id']}  title: {n['title']}  board: {n['board']}")

    output_path = PROJECT_ROOT / "pipeline-data" / "pinterest-audit-results.json"
    results = {
        "total_pins": len(all_pins),
        "alive": len(alive),
        "dead": len(dead),
        "no_link": len(no_link),
        "dead_pins": dead,
        "alive_pins": alive,
    }
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nFull results saved to {output_path}")


if __name__ == "__main__":
    main()
