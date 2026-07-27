#!/usr/bin/env python3
"""
Rename Pinterest boards, and optionally move pins between boards.

Why renaming matters more than it looks: Pinterest's OmniSearchSage paper
(arXiv 2404.16260) feeds the top 10 board titles of every pin into the search
embedding, and the ablation puts board titles second only to the pin's own text.
Renaming one 226-pin board is a single API call that changes that feature for
all 226 pins at once, without touching a single pin.

Both operations are DRY RUN unless confirmed:
  RENAME_CONFIRM=RENAME   apply the renames in RENAMES below
  MOVE_SPEC=<path>        JSON [{"pin_id": "...", "board_id": "..."}]
  MOVE_CONFIRM=MOVE       apply the moves

Pin moves use PATCH /v5/pins/{id} with a new board_id, which preserves the pin
id and its accumulated stats. That endpoint is beta-gated and can return 403,
so the script probes one pin first and stops cleanly if it is not available
rather than half-migrating the account.

Required env: PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN
Optional: GH_PAT, GITHUB_REPOSITORY to persist a rotated refresh token
"""

import json
import os
import subprocess
import sys
import time
from base64 import b64encode
from pathlib import Path

import requests

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
GH_PAT        = os.environ.get("GH_PAT", "")
GH_REPO       = os.environ.get("GITHUB_REPOSITORY", "")
DO_RENAME     = os.environ.get("RENAME_CONFIRM", "") == "RENAME"
DO_MOVE       = os.environ.get("MOVE_CONFIRM", "") == "MOVE"
MOVE_SPEC     = os.environ.get("MOVE_SPEC", "pipeline-data/pin-moves.json")

API_BASE = "https://api.pinterest.com/v5"

# current live name -> new name. Keys are matched case-insensitively.
RENAMES = {
    "grocery math: food prices and nutrition data": "Protein Per Dollar: Cheap Protein Sources",
    "high fiber dinner and gut health recipes":     "Fiber Per Dollar: Cheap High Fiber Foods",
    "high fiber recipes":                           "High Fiber Dinner Recipes",
    "healthy meal prep & kitchen tips":             "Kitchen Tips and Cooking Hacks",
    "gut health tips and nutrition charts":         "Grocery Budget Tips and Shopping Lists",
    "gut health & nutrition tips":                  "Gut Health Foods and Fiber Tips",
}


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
    d = r.json()
    nr = d.get("refresh_token")
    if nr and nr != REFRESH_TOKEN and GH_PAT and GH_REPO:
        subprocess.run(["gh", "secret", "set", "PINTEREST_REFRESH_TOKEN",
                        "--body", nr, "--repo", GH_REPO],
                       env={**os.environ, "GH_TOKEN": GH_PAT}, capture_output=True, text=True)
    return d["access_token"]


def list_boards(headers):
    out, bookmark = [], None
    while True:
        p = {"page_size": 100}
        if bookmark:
            p["bookmark"] = bookmark
        r = requests.get(f"{API_BASE}/boards", headers=headers, params=p, timeout=30)
        if not r.ok:
            print(f"ERROR listing boards {r.status_code}: {r.text[:200]}")
            sys.exit(1)
        d = r.json()
        out += d.get("items", [])
        bookmark = d.get("bookmark")
        if not bookmark:
            return out
        time.sleep(0.3)


def do_renames(headers, boards):
    by_name = {b["name"].strip().lower(): b for b in boards}
    live_names = {b["name"].strip().lower() for b in boards}
    plan, skip = [], []
    for old, new in RENAMES.items():
        b = by_name.get(old)
        if not b:
            skip.append(f"{old!r} not found on the account")
        elif new.strip().lower() in live_names and new.strip().lower() != old:
            skip.append(f"{new!r} already exists, would collide")
        else:
            plan.append((b, new))

    print("=== RENAMES ===")
    for b, new in plan:
        print(f"  {b.get('pin_count', 0):>4} pins  {b['name']!r}  ->  {new!r}")
    for s in skip:
        print(f"  SKIP: {s}")
    if not DO_RENAME:
        print("  DRY RUN. Set RENAME_CONFIRM=RENAME to apply.\n")
        return
    for b, new in plan:
        r = requests.patch(f"{API_BASE}/boards/{b['id']}", headers=headers,
                           json={"name": new}, timeout=30)
        print(f"  {'ok  ' if r.ok else 'FAIL'} {b['name']!r} -> {new!r}"
              + ("" if r.ok else f"  {r.status_code} {r.text[:160]}"))
        time.sleep(0.5)
    print()


def do_moves(headers):
    spec_path = Path(MOVE_SPEC)
    if not spec_path.exists():
        print(f"=== PIN MOVES ===\n  no spec at {MOVE_SPEC}, nothing to move.\n")
        return
    moves = json.loads(spec_path.read_text(encoding="utf-8"))
    print(f"=== PIN MOVES ===\n  {len(moves)} pins queued to move")
    if not DO_MOVE:
        print("  DRY RUN. Set MOVE_CONFIRM=MOVE to apply.\n")
        return

    # Probe once. PATCH /pins is beta-gated; better to stop than half-migrate.
    first = moves[0]
    probe = requests.patch(f"{API_BASE}/pins/{first['pin_id']}", headers=headers,
                           json={"board_id": first["board_id"]}, timeout=30)
    if not probe.ok:
        print(f"  PROBE FAILED {probe.status_code}: {probe.text[:220]}")
        print("  PATCH /v5/pins is not available to this app. No pins were moved.")
        print("  Nothing is half-done; rerun once the endpoint is enabled.")
        return
    print(f"  probe ok, moved {first['pin_id']}")

    ok, fail = 1, 0
    for i, m in enumerate(moves[1:], 2):
        r = requests.patch(f"{API_BASE}/pins/{m['pin_id']}", headers=headers,
                           json={"board_id": m["board_id"]}, timeout=30)
        if r.ok:
            ok += 1
        else:
            fail += 1
            print(f"  FAILED {m['pin_id']}: {r.status_code} {r.text[:140]}")
        if i % 25 == 0:
            print(f"  {i}/{len(moves)} (moved {ok}, failed {fail})", flush=True)
        time.sleep(0.4)
    print(f"  DONE. Moved {ok}, failed {fail}.\n")


def main() -> int:
    headers = {"Authorization": f"Bearer {get_access_token()}"}
    boards = list_boards(headers)
    print(f"Account has {len(boards)} boards.\n")
    do_renames(headers, boards)
    do_moves(headers)
    if DO_RENAME:
        print("Refreshed board list after renames:")
        for b in sorted(list_boards(headers), key=lambda x: -(x.get("pin_count") or 0))[:14]:
            print(f"  {b['id']}  {b.get('pin_count', 0):>4}  {b['name']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
