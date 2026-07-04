#!/usr/bin/env python3
"""
Fetch ALL pins from the Pinterest account via GET /v5/pins (paginated).
Writes all-pins.json for download as a workflow artifact.

Required env vars (same GitHub Secrets as post-pins.py):
  PINTEREST_APP_ID
  PINTEREST_APP_SECRET
  PINTEREST_REFRESH_TOKEN
Optional:
  GH_PAT, GITHUB_REPOSITORY  (to persist a rotated refresh token)
"""

import json
import os
import subprocess
import sys
from base64 import b64encode

import requests

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
GH_PAT        = os.environ.get("GH_PAT", "")
GH_REPO       = os.environ.get("GITHUB_REPOSITORY", "")

API_BASE = "https://api.pinterest.com/v5"


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
        print(f"ERROR: Token refresh failed {resp.status_code}: {resp.text[:300]}")
        sys.exit(1)
    data = resp.json()
    new_refresh = data.get("refresh_token")
    if new_refresh and new_refresh != REFRESH_TOKEN:
        print("New refresh_token received — updating GitHub Secret...")
        update_github_secret("PINTEREST_REFRESH_TOKEN", new_refresh)
    return data["access_token"]


def main():
    token = get_access_token()
    pins = []
    bookmark = None
    page = 0
    while True:
        params = {"page_size": 100}
        if bookmark:
            params["bookmark"] = bookmark
        resp = requests.get(
            f"{API_BASE}/pins",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=30,
        )
        if not resp.ok:
            print(f"ERROR: /pins page {page} -> {resp.status_code}: {resp.text[:300]}")
            sys.exit(1)
        data = resp.json()
        items = data.get("items") or []
        for p in items:
            pins.append({
                "pin_id":     p.get("id"),
                "title":      p.get("title"),
                "link":       p.get("link"),
                "board_id":   p.get("board_id"),
                "created_at": p.get("created_at"),
            })
        page += 1
        print(f"page {page}: {len(items)} pins (total {len(pins)})")
        bookmark = data.get("bookmark")
        if not bookmark:
            break

    with open("all-pins.json", "w", encoding="utf-8") as f:
        json.dump(pins, f, indent=1)
    print(f"Wrote all-pins.json with {len(pins)} pins")


if __name__ == "__main__":
    main()
