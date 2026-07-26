#!/usr/bin/env python3
"""List every Pinterest board with its real ID, pin count and description.

The code's BOARD_NAME_TO_ID map has drifted from the live account at least once,
so routing fixes must be verified against this rather than against the map.
"""

import os
import subprocess
import sys
import time
from base64 import b64encode

import requests

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
GH_PAT        = os.environ.get("GH_PAT", "")
GH_REPO       = os.environ.get("GITHUB_REPOSITORY", "")
API_BASE = "https://api.pinterest.com/v5"


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
                       env={**os.environ, "GH_TOKEN": GH_PAT},
                       capture_output=True, text=True)
    return d["access_token"]


def main() -> int:
    headers = {"Authorization": f"Bearer {get_access_token()}"}
    boards, bookmark = [], None
    while True:
        p = {"page_size": 100}
        if bookmark:
            p["bookmark"] = bookmark
        r = requests.get(f"{API_BASE}/boards", headers=headers, params=p, timeout=30)
        if not r.ok:
            print(f"ERROR {r.status_code}: {r.text[:200]}")
            return 1
        d = r.json()
        boards += d.get("items", [])
        bookmark = d.get("bookmark")
        if not bookmark:
            break
        time.sleep(0.3)

    print(f"{'BOARD ID':<22} {'PINS':>5}  {'DESC?':<6} NAME")
    for b in sorted(boards, key=lambda x: -(x.get("pin_count") or 0)):
        has_desc = "yes" if (b.get("description") or "").strip() else "NO"
        print(f"{b['id']:<22} {b.get('pin_count', 0):>5}  {has_desc:<6} {b.get('name')}")
    print(f"\n{len(boards)} boards total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
