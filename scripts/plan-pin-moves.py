#!/usr/bin/env python3
"""
Work out which live pins should move to which board, and write the move spec.

After the 2026-07-26 board rebuild there are 13 new narrow boards and 6 renamed
ones, but the ~500 pins posted before that are still sitting wherever the old
routing put them. This replays every live pin through the current router and
records the ones that now belong somewhere else.

Read-only against Pinterest. Writes pipeline-data/pin-moves.json, which
scripts/rename-boards.py consumes.

Required env: PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN
"""

import json
import os
import sys
import time
from base64 import b64encode
from collections import Counter
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from lib.d1_csv import board_for_pin, board_name_to_id  # noqa: E402

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
API_BASE = "https://api.pinterest.com/v5"
OUT = Path("pipeline-data/pin-moves.json")


def get_access_token():
    basic = b64encode(f"{APP_ID}:{APP_SECRET}".encode()).decode()
    r = requests.post(f"{API_BASE}/oauth/token",
                      headers={"Authorization": f"Basic {basic}",
                               "Content-Type": "application/x-www-form-urlencoded"},
                      data={"grant_type": "refresh_token", "refresh_token": REFRESH_TOKEN},
                      timeout=15)
    if not r.ok:
        print(f"ERROR: token refresh failed {r.status_code}: {r.text[:300]}")
        sys.exit(1)
    return r.json()["access_token"]


def fetch_all(url, headers):
    out, bookmark = [], None
    while True:
        p = {"page_size": 100}
        if bookmark:
            p["bookmark"] = bookmark
        r = requests.get(url, headers=headers, params=p, timeout=30)
        if not r.ok:
            print(f"ERROR {url} {r.status_code}: {r.text[:200]}")
            sys.exit(1)
        d = r.json()
        out += d.get("items", [])
        bookmark = d.get("bookmark")
        if not bookmark:
            return out
        time.sleep(0.3)


def main() -> int:
    headers = {"Authorization": f"Bearer {get_access_token()}"}
    boards = {b["id"]: b["name"] for b in fetch_all(f"{API_BASE}/boards", headers)}
    pins = fetch_all(f"{API_BASE}/pins", headers)
    print(f"{len(boards)} boards, {len(pins)} pins\n")

    # Boards that are not part of the content plan: leave their pins alone.
    LEGACY = {"fashion", "diets", "home design", "impact driver", "dogs",
              "bohemian world", "Mediterranean diet", "Modern living room", "draft",
              "Recipes to cook", "Gut health recipes", "gut health recipes",
              "Money Making Ideas and Business Tips",
              "Relationship Psychology and Red Flags",
              "Dating Tips and First Date Ideas",
              "Entrepreneurship and Online Business",
              "Daily Life Hacks Demo", "שמירות מהירות"}

    moves, stay, unresolved = [], 0, Counter()
    flow = Counter()
    for p in pins:
        cur_id = p.get("board_id")
        cur = boards.get(cur_id, "?")
        if cur in LEGACY:
            continue
        link = p.get("link") or ""
        if "daily-life-hacks.com" not in link:
            continue

        slug = link.rstrip("/").rsplit("/", 1)[-1]
        pin = {"title": p.get("title") or "", "description": p.get("description") or "",
               "alt": "", "article_slug": slug, "pin_slug": slug}
        category = "recipes" if "recipe" in slug else "nutrition"
        want_name = board_for_pin(pin, category)
        want_id = board_name_to_id(want_name)

        if not want_id:
            unresolved[want_name] += 1
            continue
        if want_id == cur_id:
            stay += 1
            continue
        moves.append({"pin_id": p["id"], "board_id": want_id,
                      "from": cur, "to": want_name, "title": (p.get("title") or "")[:60]})
        flow[f"{cur}  ->  {want_name}"] += 1

    print(f"already correct : {stay}")
    print(f"to move         : {len(moves)}")
    if unresolved:
        print("\nWARNING, board names the router returned that have no live ID:")
        for n, c in unresolved.most_common():
            print(f"  {c:4d}  {n}")

    print("\nBIGGEST FLOWS:")
    for f, c in flow.most_common(18):
        print(f"  {c:4d}  {f}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(moves, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\nwrote {OUT} ({len(moves)} moves)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
