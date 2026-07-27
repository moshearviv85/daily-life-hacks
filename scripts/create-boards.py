#!/usr/bin/env python3
"""
Create Pinterest boards from a spec file.

Board specificity is the strongest distribution lever we have measured. On this
account, narrow keyword-true boards return roughly ten times the impressions per
pin of the broad catch-all boards (Easy Dinner Recipes 8.2 vs High Fiber Recipes
0.7, measured 2026-07-26 across 561 live pins). Pinterest reads the board as the
pin's topic signal, so a vague board teaches it nothing.

DRY RUN BY DEFAULT. Nothing is created unless CREATE_CONFIRM=CREATE is set.
Existing boards with the same name are skipped, never duplicated, and the script
prints the resulting name-to-ID map ready to paste into scripts/lib/d1_csv.py.

Spec file: JSON list of objects
  {"name": "...", "description": "...", "privacy": "PUBLIC"}

Required env (same GitHub Secrets as post-pins.py):
  PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN
Optional:
  BOARD_SPEC       path to the spec (default pipeline-data/pinterest-boards-spec.json)
  CREATE_CONFIRM   set to CREATE to actually create
  GH_PAT, GITHUB_REPOSITORY  to persist a rotated refresh token
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
CONFIRM       = os.environ.get("CREATE_CONFIRM", "") == "CREATE"
SPEC          = Path(os.environ.get("BOARD_SPEC", "pipeline-data/pinterest-boards-spec.json"))

API_BASE = "https://api.pinterest.com/v5"
MAX_DESC = 500  # Pinterest board description limit


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
        print("New refresh_token received - updating GitHub Secret...")
        subprocess.run(["gh", "secret", "set", "PINTEREST_REFRESH_TOKEN",
                        "--body", nr, "--repo", GH_REPO],
                       env={**os.environ, "GH_TOKEN": GH_PAT},
                       capture_output=True, text=True)
    return d["access_token"]


def existing_boards(headers):
    out, bookmark = {}, None
    while True:
        p = {"page_size": 100}
        if bookmark:
            p["bookmark"] = bookmark
        r = requests.get(f"{API_BASE}/boards", headers=headers, params=p, timeout=30)
        if not r.ok:
            print(f"ERROR listing boards {r.status_code}: {r.text[:200]}")
            sys.exit(1)
        d = r.json()
        for b in d.get("items", []):
            out[b["name"].strip().lower()] = b["id"]
        bookmark = d.get("bookmark")
        if not bookmark:
            return out
        time.sleep(0.3)


def main() -> int:
    if not SPEC.exists():
        print(f"ERROR: spec not found at {SPEC}")
        return 1
    spec = json.loads(SPEC.read_text(encoding="utf-8"))

    problems = []
    for i, b in enumerate(spec):
        if not b.get("name", "").strip():
            problems.append(f"entry {i}: empty name")
        if len(b.get("description", "")) > MAX_DESC:
            problems.append(f"{b.get('name')!r}: description {len(b['description'])} chars, max {MAX_DESC}")
        if not b.get("description", "").strip():
            problems.append(f"{b.get('name')!r}: no description - a board without one is a wasted signal")
    if problems:
        print("SPEC PROBLEMS:")
        for p in problems:
            print("  -", p)
        return 1

    headers = {"Authorization": f"Bearer {get_access_token()}"}
    have = existing_boards(headers)
    print(f"Account already has {len(have)} boards.\n")

    to_create = [b for b in spec if b["name"].strip().lower() not in have]
    skipped   = [b for b in spec if b["name"].strip().lower() in have]

    for b in skipped:
        print(f"  [EXISTS] {b['name']}")
    for b in to_create:
        print(f"  [NEW]    {b['name']}")
    print(f"\n{len(to_create)} to create, {len(skipped)} already present.")

    if not CONFIRM:
        print("\nDRY RUN. Nothing created. Re-run with CREATE_CONFIRM=CREATE to execute.")
        return 0

    created = {}
    for b in to_create:
        payload = {"name": b["name"].strip(),
                   "description": b["description"].strip(),
                   "privacy": b.get("privacy", "PUBLIC")}
        r = requests.post(f"{API_BASE}/boards", headers=headers, json=payload, timeout=30)
        if r.ok:
            bid = r.json().get("id")
            created[b["name"]] = bid
            print(f"  created {bid}  {b['name']}")
        else:
            print(f"  FAILED  {b['name']}: {r.status_code} {r.text[:200]}")
        time.sleep(0.5)

    print(f"\nCreated {len(created)} boards.")
    if created:
        print("\nPaste into BOARD_NAME_TO_ID in scripts/lib/d1_csv.py:")
        for name, bid in created.items():
            print(f'    "{name.lower()}": "{bid}",')
    return 0


if __name__ == "__main__":
    sys.exit(main())
