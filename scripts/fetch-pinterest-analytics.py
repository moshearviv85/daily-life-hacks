#!/usr/bin/env python3
"""
Pinterest Analytics Fetcher — standalone, independent of post-pins.py
Fetches analytics for all POSTED pins from D1 and saves them back to D1.

Required env vars (same GitHub Secrets as post-pins.py):
  PINTEREST_APP_ID
  PINTEREST_APP_SECRET
  PINTEREST_REFRESH_TOKEN
  PINS_API_URL     e.g. https://www.daily-life-hacks.com
  PINS_API_KEY     same value as STATS_KEY in Cloudflare
"""

import os
import sys
import json
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

# ── Token ─────────────────────────────────────────────────────────────────────

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
    new_refresh   = data.get("refresh_token")
    if not access_token:
        print("ERROR: No access_token in response")
        sys.exit(1)
    print(f"Token OK. Expires in {data.get('expires_in', '?')}s")
    if new_refresh and new_refresh != REFRESH_TOKEN:
        print("New refresh_token received — updating GitHub Secret...")
        update_github_secret("PINTEREST_REFRESH_TOKEN", new_refresh)
    return access_token

# ── Fetch analytics per pin ───────────────────────────────────────────────────

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
        print(f"  Analytics error for {pin_id}: {resp.status_code}")
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
    # Fall back to summing daily_metrics
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

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    end_date   = date.today().isoformat()
    start_date = (date.today() - timedelta(days=89)).isoformat()
    print(f"Fetching Pinterest analytics: {start_date} → {end_date}")

    # Get list of posted pins from D1
    resp = requests.get(f"{PINS_API_URL}/api/pins-status", params={"key": PINS_API_KEY}, timeout=10)
    if not resp.ok:
        print(f"ERROR: pins-status failed {resp.status_code}")
        sys.exit(1)

    data   = resp.json()
    posted = [p for p in (data.get("pins") or []) if p.get("status") == "POSTED" and p.get("pin_id")]
    print(f"Found {len(posted)} posted pins")

    if not posted:
        print("Nothing to fetch.")
        return

    access_token = get_access_token()

    results = []
    for i, pin in enumerate(posted):
        print(f"  [{i+1}/{len(posted)}] {pin.get('pin_title', pin['pin_id'])[:60]}")
        stats = fetch_pin_analytics(access_token, pin["pin_id"], start_date, end_date)
        if stats:
            results.append({
                "pin_id":          pin["pin_id"],
                "pin_title":       pin.get("pin_title", ""),
                "pin_url":         f"https://www.pinterest.com/pin/{pin['pin_id']}/",
                "pin_link":        pin.get("link", ""),
                "created_at":      pin.get("published_date", ""),
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
        timeout=30,
    )
    if save.ok:
        print(f"Done. Saved {save.json().get('saved', len(results))} pins.")
    else:
        print(f"ERROR saving: {save.status_code} {save.text[:300]}")
        sys.exit(1)

if __name__ == "__main__":
    main()
