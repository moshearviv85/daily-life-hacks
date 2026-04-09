#!/usr/bin/env python3
"""
Pinterest Auto-Poster
Gets next due pin from /api/pins-next, posts to Pinterest API v5,
then marks as POSTED via /api/pins-mark-posted.

Required env vars (GitHub Secrets):
  PINTEREST_APP_ID
  PINTEREST_APP_SECRET
  PINTEREST_REFRESH_TOKEN
  PINS_API_URL     e.g. https://www.daily-life-hacks.com
  PINS_API_KEY     same value as STATS_KEY in Cloudflare

Optional:
  GH_PAT           Personal Access Token for auto-updating PINTEREST_REFRESH_TOKEN secret
  GITHUB_REPOSITORY  e.g. moshearviv85/daily-life-hacks (auto-set by GitHub Actions)
"""

import os
import json
import sys
import subprocess
from datetime import datetime
from base64 import b64encode

import requests

# ── Config ────────────────────────────────────────────────────────────────────

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
PINS_API_URL  = os.environ["PINS_API_URL"].rstrip("/")
PINS_API_KEY  = os.environ["PINS_API_KEY"]
GH_PAT        = os.environ.get("GH_PAT", "")
GH_REPO       = os.environ.get("GITHUB_REPOSITORY", "")

API_BASE = "https://api.pinterest.com/v5"

# ── GitHub Secret auto-update ─────────────────────────────────────────────────

def update_github_secret(secret_name, secret_value):
    if not GH_PAT or not GH_REPO:
        print(f"  WARNING: GH_PAT or GITHUB_REPOSITORY not set — cannot auto-update {secret_name}")
        print(f"  Manual update required.")
        return
    result = subprocess.run(
        ["gh", "secret", "set", secret_name, "--body", secret_value, "--repo", GH_REPO],
        env={**os.environ, "GH_TOKEN": GH_PAT},
        capture_output=True, text=True,
    )
    if result.returncode == 0:
        print(f"  Auto-updated {secret_name} in GitHub Secrets.")
    else:
        print(f"  Failed to auto-update secret: {result.stderr.strip()}")

# ── Token refresh ─────────────────────────────────────────────────────────────

def get_access_token():
    basic = b64encode(f"{APP_ID}:{APP_SECRET}".encode()).decode()
    resp = requests.post(
        f"{API_BASE}/oauth/token",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={
            "grant_type": "refresh_token",
            "refresh_token": REFRESH_TOKEN,
        },
        timeout=15,
    )
    if not resp.ok:
        print(f"ERROR: Token refresh failed — HTTP {resp.status_code}")
        print(resp.text[:500])
        sys.exit(1)

    data = resp.json()
    access_token = data.get("access_token")
    new_refresh = data.get("refresh_token")

    if not access_token:
        print("ERROR: No access_token in refresh response")
        print(json.dumps(data, indent=2))
        sys.exit(1)

    print(f"Token refreshed OK. Expires in {data.get('expires_in', '?')}s")
    if new_refresh and new_refresh != REFRESH_TOKEN:
        print("Pinterest returned a new refresh_token — auto-updating GitHub Secret...")
        update_github_secret("PINTEREST_REFRESH_TOKEN", new_refresh)

    return access_token

# ── Get next pin from D1 ──────────────────────────────────────────────────────

def get_next_pin():
    resp = requests.get(
        f"{PINS_API_URL}/api/pins-next",
        params={"key": PINS_API_KEY},
        timeout=10,
    )
    if resp.status_code == 204:
        return None
    if not resp.ok:
        print(f"ERROR: pins-next failed — HTTP {resp.status_code}: {resp.text[:200]}")
        sys.exit(1)
    return resp.json()

# ── Mark pin as posted in D1 ──────────────────────────────────────────────────

def mark_posted(row_id, pin_id, pinterest_response):
    resp = requests.post(
        f"{PINS_API_URL}/api/pins-mark-posted",
        params={"key": PINS_API_KEY},
        json={
            "row_id": row_id,
            "pin_id": pin_id,
            "published_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "pinterest_response": pinterest_response,
        },
        timeout=10,
    )
    if not resp.ok:
        print(f"WARNING: mark-posted failed — HTTP {resp.status_code}: {resp.text[:200]}")
    else:
        print(f"  Marked {row_id} as POSTED in D1.")

# ── Post pin to Pinterest ─────────────────────────────────────────────────────

def post_pin(access_token, row):
    payload = {
        "board_id": row["board_id"],
        "title": row["pin_title"],
        "description": row["pin_description"],
        "alt_text": row["alt_text"],
        "link": row["link"],
        "media_source": {
            "source_type": "image_url",
            "url": row["image_url"],
        },
    }
    resp = requests.post(
        f"{API_BASE}/pins",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=20,
    )

    remaining = resp.headers.get("X-RateLimit-Remaining", "?")
    print(f"Rate limit remaining: {remaining}")

    if resp.status_code == 429:
        print("RATE LIMITED — stopping. Will retry on next run.")
        sys.exit(0)

    data = resp.json()
    if not resp.ok:
        return False, data

    pin_id = data.get("id") or data.get("pin_id") or ""
    return True, {"pin_id": pin_id, "raw": data}

# ── Fetch analytics for all posted pins & save to D1 ─────────────────────────

def fetch_pin_analytics(access_token, pin_id, start_date, end_date):
    resp = requests.get(
        f"{API_BASE}/pins/{pin_id}/analytics",
        headers={"Authorization": f"Bearer {access_token}"},
        params={
            "start_date": start_date,
            "end_date": end_date,
            "metric_types": "IMPRESSION,OUTBOUND_CLICK,SAVE,PIN_CLICK",
            "app_types": "ALL",
        },
        timeout=15,
    )
    if not resp.ok:
        return None
    data = resp.json()
    # Prefer lifetime_metrics; fall back to summing daily_metrics
    lifetime = (data.get("all") or {}).get("lifetime_metrics")
    if lifetime:
        return {
            "impressions":      lifetime.get("IMPRESSION", 0),
            "outbound_clicks":  lifetime.get("OUTBOUND_CLICK", 0),
            "pin_clicks":       lifetime.get("PIN_CLICK", 0),
            "saves":            lifetime.get("SAVE", 0),
        }
    daily = (data.get("all") or {}).get("daily_metrics", [])
    totals = {"impressions": 0, "outbound_clicks": 0, "pin_clicks": 0, "saves": 0}
    for d in daily:
        if d.get("data_status") != "READY":
            continue
        m = d.get("metric", {})
        totals["impressions"]     += m.get("IMPRESSION", 0)
        totals["outbound_clicks"] += m.get("OUTBOUND_CLICK", 0)
        totals["pin_clicks"]      += m.get("PIN_CLICK", 0)
        totals["saves"]           += m.get("SAVE", 0)
    return totals

def sync_analytics(access_token):
    from datetime import date, timedelta
    end_date   = date.today().isoformat()
    start_date = (date.today() - timedelta(days=89)).isoformat()

    # Get all posted pins from D1
    resp = requests.get(
        f"{PINS_API_URL}/api/pins-status",
        params={"key": PINS_API_KEY},
        timeout=10,
    )
    if not resp.ok:
        print(f"  WARNING: Could not fetch pins list — {resp.status_code}")
        return

    data = resp.json()
    posted = [p for p in (data.get("pins") or []) if p.get("status") == "POSTED" and p.get("pin_id")]
    if not posted:
        print("  No posted pins found for analytics sync.")
        return

    print(f"  Fetching analytics for {len(posted)} posted pins ({start_date} → {end_date})...")

    results = []
    for i, pin in enumerate(posted):
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
        # Small delay to avoid rate limit
        import time
        time.sleep(0.3)

    if not results:
        print("  No analytics data returned.")
        return

    # Save to D1 via dashboard API
    save_resp = requests.post(
        f"{PINS_API_URL}/api/pinterest-analytics-save",
        params={"key": PINS_API_KEY},
        json={"pins": results},
        timeout=30,
    )
    if save_resp.ok:
        print(f"  Saved analytics for {len(results)} pins to D1.")
    else:
        print(f"  WARNING: Failed to save analytics — {save_resp.status_code}: {save_resp.text[:200]}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    from datetime import date
    today = date.today().isoformat()
    print(f"Running post-pins.py — today is {today}")

    pin = get_next_pin()
    if not pin:
        print("No pins due today. Done.")
    else:
        print(f"\nNext pin: {pin['row_id']} — {pin['pin_title']}")
        print(f"  scheduled: {pin['scheduled_date']}")
        print(f"  board_id:  {pin['board_id']}")
        print(f"  image:     {pin['image_url']}")
        print(f"  link:      {pin['link']}")

        access_token = get_access_token()
        ok, result = post_pin(access_token, pin)

        if ok:
            pin_id = result["pin_id"]
            print(f"SUCCESS — pin_id: {pin_id}")
            mark_posted(pin["row_id"], pin_id, result["raw"])
        else:
            print(f"FAILED — Pinterest API error:")
            print(json.dumps(result, indent=2)[:600])
            sys.exit(1)

    # Always sync analytics (runs regardless of whether a pin was posted)
    print("\nSyncing Pinterest analytics to D1...")
    access_token = get_access_token() if not pin else access_token
    sync_analytics(access_token)

    print("\nDone.")

if __name__ == "__main__":
    main()
