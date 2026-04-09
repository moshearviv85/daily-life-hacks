#!/usr/bin/env python3
"""
Pinterest Analytics Fetcher — uses user_account/top_pins_analytics
Fetches top pins by Impression, Click, and Save in 3 API calls (vs 100+ individual).
Requires org_analytics scope on the Pinterest token.

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

# ── Fetch top pins analytics ───────────────────────────────────────────────────

def fetch_top_pins(access_token, start_date, end_date, sort_by, num=50):
    resp = requests.get(
        f"{API_BASE}/user_account/analytics/top_pins",
        headers={"Authorization": f"Bearer {access_token}"},
        params={
            "start_date":   start_date,
            "end_date":     end_date,
            "sort_by":      sort_by,
            "num_of_pins":  num,
            "metric_types": "IMPRESSION,OUTBOUND_CLICK,SAVE,PIN_CLICK",
        },
        timeout=20,
    )
    print(f"  top_pins [{sort_by}] → {resp.status_code}")
    if not resp.ok:
        print(f"  ERROR: {resp.text[:500]}")
        return []

    data = resp.json()
    print(f"  RAW KEYS: {list(data.keys())}")
    print(f"  RAW SAMPLE: {str(data)[:800]}")

    # Try every known response structure
    items = (
        data.get("value")                          # direct value array
        or (data.get("all") or {}).get("value")    # wrapped under "all"
        or data.get("pins")                        # alternative key
        or data.get("items")                       # alternative key
        or []
    )
    print(f"  Got {len(items)} pins")
    return items

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    end_date   = date.today().isoformat()
    start_date = (date.today() - timedelta(days=89)).isoformat()
    print(f"Fetching Pinterest top-pins analytics: {start_date} → {end_date}")

    access_token = get_access_token()

    # Fetch top 50 pins by each metric (3 API calls total)
    pins_by_id = {}
    for sort_by in ["IMPRESSION", "OUTBOUND_CLICK", "SAVE"]:
        items = fetch_top_pins(access_token, start_date, end_date, sort_by)
        for item in items:
            pin_id = item.get("id") or item.get("pin_id") or ""
            if not pin_id or pin_id in pins_by_id:
                continue
            metrics = item.get("lifetime_metrics") or {}
            pins_by_id[pin_id] = {
                "pin_id":          pin_id,
                "pin_title":       (item.get("title") or "")[:80],
                "pin_url":         f"https://www.pinterest.com/pin/{pin_id}/",
                "pin_link":        item.get("link") or "",
                "created_at":      item.get("created_at") or "",
                "impressions":     metrics.get("IMPRESSION", 0),
                "outbound_clicks": metrics.get("OUTBOUND_CLICK", 0),
                "pin_clicks":      metrics.get("PIN_CLICK", 0),
                "saves":           metrics.get("SAVE", 0),
            }
        time.sleep(1)

    results = list(pins_by_id.values())
    print(f"\nUnique pins collected: {len(results)}")

    if not results:
        print("No data returned. Token may be missing org_analytics scope.")
        print("Re-authenticate at /api/pinterest-demo to get the updated token.")
        sys.exit(1)

    print("Saving to D1...")
    save = requests.post(
        f"{PINS_API_URL}/api/pinterest-analytics-save",
        params={"key": PINS_API_KEY},
        json={"pins": results},
        timeout=30,
    )
    if save.ok:
        print(f"Done. Saved {save.json().get('saved', len(results))} pins.")
    else:
        print(f"ERROR saving: {save.status_code} {save.text[:300]}")
        sys.exit(1)

if __name__ == "__main__":
    main()
