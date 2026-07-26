#!/usr/bin/env python3
"""
Purge pins that do NOT point at our own domain.

Born from the 2026-07-26 Pinterest diagnostic: the account still carries legacy
affiliate pins, including ~49 pointing at a cloaked redirect tracker. Cloaked
redirects are a defined spam violation in Pinterest's own guidelines, so those
pins are an ACTIVE violation sitting on the same account as our content.

DRY RUN BY DEFAULT. Nothing is deleted unless PURGE_CONFIRM=DELETE is set,
matching the PINTEREST_RELEASE_CONFIRM convention used elsewhere in this repo.

Required env (same GitHub Secrets as post-pins.py):
  PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN
Optional:
  PURGE_CONFIRM=DELETE   actually delete (otherwise dry run)
  KEEP_HOSTS             extra comma-separated hosts to treat as ours
  GH_PAT, GITHUB_REPOSITORY  to persist a rotated refresh token
"""

import json
import os
import re
import subprocess
import sys
import time
from base64 import b64encode
from collections import Counter

import requests

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
GH_PAT        = os.environ.get("GH_PAT", "")
GH_REPO       = os.environ.get("GITHUB_REPOSITORY", "")
CONFIRM       = os.environ.get("PURGE_CONFIRM", "") == "DELETE"

API_BASE = "https://api.pinterest.com/v5"
OURS = {"daily-life-hacks.com"} | {
    h.strip().lower() for h in os.environ.get("KEEP_HOSTS", "").split(",") if h.strip()
}
REPORT = "pinterest-purge-report.json"


def update_github_secret(name, value):
    if not GH_PAT or not GH_REPO:
        return
    subprocess.run(
        ["gh", "secret", "set", name, "--body", value, "--repo", GH_REPO],
        env={**os.environ, "GH_TOKEN": GH_PAT},
        capture_output=True, text=True,
    )


def get_access_token():
    basic = b64encode(f"{APP_ID}:{APP_SECRET}".encode()).decode()
    resp = requests.post(
        f"{API_BASE}/oauth/token",
        headers={"Authorization": f"Basic {basic}",
                 "Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "refresh_token", "refresh_token": REFRESH_TOKEN},
        timeout=15,
    )
    if not resp.ok:
        print(f"ERROR: token refresh failed {resp.status_code}: {resp.text[:300]}")
        sys.exit(1)
    data = resp.json()
    new_refresh = data.get("refresh_token")
    if new_refresh and new_refresh != REFRESH_TOKEN:
        print("New refresh_token received - updating GitHub Secret...")
        update_github_secret("PINTEREST_REFRESH_TOKEN", new_refresh)
    return data["access_token"]


def host_of(link: str) -> str:
    m = re.match(r"https?://([^/]+)", link or "")
    return m.group(1).lower().replace("www.", "") if m else ""


def fetch_all_pins(headers):
    pins, bookmark = [], None
    while True:
        params = {"page_size": 100}
        if bookmark:
            params["bookmark"] = bookmark
        r = requests.get(f"{API_BASE}/pins", headers=headers, params=params, timeout=30)
        if not r.ok:
            print(f"ERROR listing pins {r.status_code}: {r.text[:300]}")
            sys.exit(1)
        d = r.json()
        pins += d.get("items", [])
        bookmark = d.get("bookmark")
        print(f"  fetched {len(pins)} pins...", flush=True)
        if not bookmark:
            return pins
        time.sleep(0.3)


def main() -> int:
    headers = {"Authorization": f"Bearer {get_access_token()}"}
    print("Listing every pin on the account...")
    pins = fetch_all_pins(headers)
    print(f"\nTOTAL PINS: {len(pins)}\n")

    hosts, doomed = Counter(), []
    for p in pins:
        h = host_of(p.get("link") or "")
        hosts[h or "(no link)"] += 1
        if h and h not in OURS:
            doomed.append({
                "id": p.get("id"),
                "host": h,
                "link": p.get("link"),
                "title": (p.get("title") or "")[:80],
                "board_id": p.get("board_id"),
                "created_at": p.get("created_at"),
            })

    print("DESTINATION HOSTS:")
    for h, c in hosts.most_common():
        mark = "KEEP" if h in OURS else ("----" if h == "(no link)" else "PURGE")
        print(f"  [{mark}] {c:5d}  {h}")

    print(f"\nPins targeted for deletion: {len(doomed)}")
    print("Pins with no link at all are LEFT ALONE (they send nobody anywhere).")

    with open(REPORT, "w", encoding="utf-8") as f:
        json.dump({"total_pins": len(pins),
                   "hosts": dict(hosts.most_common()),
                   "targeted": doomed}, f, indent=2, ensure_ascii=False)
    print(f"Full list written to {REPORT}")

    if not CONFIRM:
        print("\nDRY RUN. Nothing deleted.")
        print("Review the report, then re-run with PURGE_CONFIRM=DELETE to execute.")
        return 0

    print(f"\nPURGE_CONFIRM=DELETE set. Deleting {len(doomed)} pins...")
    ok = fail = 0
    for i, p in enumerate(doomed, 1):
        r = requests.delete(f"{API_BASE}/pins/{p['id']}", headers=headers, timeout=30)
        if r.status_code in (200, 204):
            ok += 1
        else:
            fail += 1
            print(f"  FAILED {p['id']} ({p['host']}): {r.status_code} {r.text[:120]}")
        if i % 25 == 0:
            print(f"  {i}/{len(doomed)} processed (deleted {ok}, failed {fail})", flush=True)
        time.sleep(0.4)  # stay well under the rate limit

    print(f"\nDONE. Deleted {ok}, failed {fail}.")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
