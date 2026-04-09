#!/usr/bin/env python3
"""
Pinterest Analytics Fetcher — fetches ALL pins from the Pinterest account
(across all boards), pulls analytics for each, and saves to D1.

Required env vars (same GitHub Secrets as post-pins.py):
  PINTEREST_APP_ID
  PINTEREST_APP_SECRET
  PINTEREST_REFRESH_TOKEN
  PINS_API_URL     e.g. https://www.daily-life-hacks.com
  PINS_API_KEY     same value as STATS_KEY in Cloudflare
"""

import os
import sys
import time
import subprocess
from datetime import date, timedelta
from base64 import b64encode

import requests

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
PINS_API_URL  = os.environ["PINS_API_URL"].rstrip("/")
PINS_API_KEY  = os.environ["PINS_API_KEY"]
GH_PAT        = os.environ.get("GH_PAT", "")
GH_REPO       = os.environ.get("GITHUB_REPOSITORY", "")

API_BASE = "https://api.pinterest.com/v5"

# ── Token ──────────────────────────────────────────────────────────────────────

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
        headers={"Authorization": f"Basic {basic}", "Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "refresh_token", "refresh_token": REFRESH_TOKEN},
        timeout=15,
    )
    if not resp.ok:
        print(f"ERROR: Token refresh failed {resp.status_code}: {resp.text[:300]}")
        sys.exit(1)
    data = resp.json()
    access_token = data.get("access_token")
    new_refresh  = data.get("refresh_token")
    if not access_token:
        print("ERROR: No access_token in response")
        sys.exit(1)
    print(f"Token OK. Expires in {data.get('expires_in', '?')}s")
    if new_refresh and new_refresh != REFRESH_TOKEN:
        print("New refresh_token received — updating GitHub Secret...")
        update_github_secret("PINTEREST_REFRESH_TOKEN", new_refresh)
    return access_token

# ── Get all boards ─────────────────────────────────────────────────────────────

def get_all_boards(access_token):
    boards = []
    cursor = None
    while True:
        params = {"page_size": 25}
        if cursor:
            params["bookmark"] = cursor
        resp = requests.get(
            f"{API_BASE}/boards",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=15,
        )
        if not resp.ok:
            print(f"  WARNING: boards fetch failed {resp.status_code}")
            break
        data = resp.json()
        boards.extend(data.get("items", []))
        cursor = data.get("bookmark")
        if not cursor:
            break
        time.sleep(0.3)
    return boards

# ── Get all pins from a board ──────────────────────────────────────────────────

def get_board_pins(access_token, board_id):
    pins = []
    cursor = None
    while True:
        params = {"page_size": 25}
        if cursor:
            params["bookmark"] = cursor
        resp = requests.get(
            f"{API_BASE}/boards/{board_id}/pins",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=15,
        )
        if not resp.ok:
            print(f"  WARNING: pins fetch for board {board_id} failed {resp.status_code}")
            break
        data = resp.json()
        pins.extend(data.get("items", []))
        cursor = data.get("bookmark")
        if not cursor:
            break
        time.sleep(0.2)
    return pins

# ── Fetch analytics per pin ────────────────────────────────────────────────────

def fetch_pin_analytics(access_token, pin_id, start_date, end_date):
    resp = requests.get(
        f"{API_BASE}/pins/{pin_id}/analytics",
        headers={"Authorization": f"Bearer {access_token}"},
        params={
            "start_date":   start_date,
            "end_date":     end_date,
            "metric_types": "IMPRESSION,OUTBOUND_CLICK,SAVE,PIN_CLICK",
            "app_types":    "ALL",
        },
        timeout=15,
    )
    if not resp.ok:
        return None

    data = resp.json()
    lifetime = (data.get("all") or {}).get("lifetime_metrics")
    if lifetime:
        return {
            "impressions":     lifetime.get("IMPRESSION", 0),
            "outbound_clicks": lifetime.get("OUTBOUND_CLICK", 0),
            "pin_clicks":      lifetime.get("PIN_CLICK", 0),
            "saves":           lifetime.get("SAVE", 0),
        }
    totals = {"impressions": 0, "outbound_clicks": 0, "pin_clicks": 0, "saves": 0}
    for d in (data.get("all") or {}).get("daily_metrics", []):
        if d.get("data_status") != "READY":
            continue
        m = d.get("metric", {})
        totals["impressions"]     += m.get("IMPRESSION", 0)
        totals["outbound_clicks"] += m.get("OUTBOUND_CLICK", 0)
        totals["pin_clicks"]      += m.get("PIN_CLICK", 0)
        totals["saves"]           += m.get("SAVE", 0)
    return totals

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    end_date   = date.today().isoformat()
    start_date = (date.today() - timedelta(days=89)).isoformat()
    print(f"Fetching Pinterest analytics: {start_date} → {end_date}")

    access_token = get_access_token()

    # Step 1: get all boards
    print("Fetching boards...")
    boards = get_all_boards(access_token)
    print(f"Found {len(boards)} boards")

    # Step 2: get all pins from every board
    all_pins = []
    for board in boards:
        board_id   = board["id"]
        board_name = board.get("name", board_id)
        print(f"  Board: {board_name}")
        pins = get_board_pins(access_token, board_id)
        print(f"    {len(pins)} pins")
        all_pins.extend(pins)

    print(f"\nTotal pins across all boards: {len(all_pins)}")

    if not all_pins:
        print("No pins found. Done.")
        return

    # Step 3: fetch analytics for each pin
    results = []
    for i, pin in enumerate(all_pins):
        pin_id    = pin.get("id", "")
        pin_title = (pin.get("title") or "")[:80]
        pin_link  = pin.get("link") or ""
        created   = pin.get("created_at") or ""
        if not pin_id:
            continue

        print(f"  [{i+1}/{len(all_pins)}] {pin_title[:60] or pin_id}")
        stats = fetch_pin_analytics(access_token, pin_id, start_date, end_date)
        if stats:
            results.append({
                "pin_id":          pin_id,
                "pin_title":       pin_title,
                "pin_url":         f"https://www.pinterest.com/pin/{pin_id}/",
                "pin_link":        pin_link,
                "created_at":      created,
                "impressions":     stats["impressions"],
                "outbound_clicks": stats["outbound_clicks"],
                "pin_clicks":      stats["pin_clicks"],
                "saves":           stats["saves"],
            })
        time.sleep(0.3)

    print(f"\nGot analytics for {len(results)} pins. Saving to D1...")

    save = requests.post(
        f"{PINS_API_URL}/api/pinterest-analytics-save",
        params={"key": PINS_API_KEY},
        json={"pins": results},
        timeout=60,
    )
    if save.ok:
        print(f"Done. Saved {save.json().get('saved', len(results))} pins.")
    else:
        print(f"ERROR saving: {save.status_code} {save.text[:300]}")
        sys.exit(1)

if __name__ == "__main__":
    main()
