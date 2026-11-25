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

_RETRYABLE = (
    requests.exceptions.Timeout,         # ReadTimeout + ConnectTimeout
    requests.exceptions.ConnectionError,
)

def request_with_retry(method, url, *, timeout, retries=3, backoff=2.0, label="", **kwargs):
    """HTTP request with retries on Timeout, ConnectionError, and 5xx.

    Returns the Response, or None if every attempt failed with a retryable error.
    Non-5xx HTTP responses are returned immediately so the caller can handle 4xx.
    """
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.request(method, url, timeout=timeout, **kwargs)
        except _RETRYABLE as e:
            last_err = f"{type(e).__name__}: {e}"
            print(f"  WARNING: {label} attempt {attempt}/{retries} — {last_err}")
        else:
            if resp.status_code < 500:
                return resp
            last_err = f"HTTP {resp.status_code}"
            print(f"  WARNING: {label} attempt {attempt}/{retries} — {last_err}: {resp.text[:200]}")
        if attempt < retries:
            wait = backoff * (2 ** (attempt - 1))
            print(f"  Retrying {label} in {wait:.0f}s...")
            time.sleep(wait)
    print(f"  ERROR: {label} failed after {retries} attempts ({last_err})")
    return None

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
    resp = request_with_retry(
        "POST",
        f"{API_BASE}/oauth/token",
        headers={"Authorization": f"Basic {basic}", "Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "refresh_token", "refresh_token": REFRESH_TOKEN},
        timeout=15,
        label="token refresh",
    )
    if resp is None or not resp.ok:
        status = resp.status_code if resp is not None else "no response"
        body = resp.text[:300] if resp is not None else ""
        print(f"ERROR: Token refresh failed {status}: {body}")
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
    resp = request_with_retry(
        "GET",
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
        label=f"top_pins [{sort_by}]",
    )
    if resp is None:
        print(f"  top_pins [{sort_by}] → no response")
        return []
    print(f"  top_pins [{sort_by}] → {resp.status_code}")
    if not resp.ok:
        print(f"  ERROR: {resp.text[:500]}")
        raise RuntimeError("Pinterest analytics request failed; existing cache was not replaced")

    data  = resp.json()
    items = data.get("pins") or []
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
            pin_id = item.get("pin_id") or ""
            if not pin_id or pin_id in pins_by_id:
                continue
            metrics = item.get("metrics") or {}
            pins_by_id[pin_id] = {
                "pin_id":          pin_id,
                "pin_title":       "",
                "pin_url":         f"https://www.pinterest.com/pin/{pin_id}/",
                "pin_link":        "",
                "created_at":      "",
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
        sys.exit(1)

    # Fetch title + link for each pin. Metrics are already collected — a flaky
    # GET /pins/{id} must not abort the job or drop the analytics snapshot.
    print("Fetching pin details (title, link)...")
    skipped_details = 0
    for i, pin in enumerate(results):
        pin_id = pin["pin_id"]
        resp = request_with_retry(
            "GET",
            f"{API_BASE}/pins/{pin_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=20,
            label=f"pin {pin_id}",
        )
        if resp is not None and resp.ok:
            d = resp.json()
            pin["pin_title"] = (d.get("title") or "")[:80]
            pin["pin_link"]  = d.get("link") or ""
            pin["created_at"] = d.get("created_at") or ""
        else:
            skipped_details += 1
            status = resp.status_code if resp is not None else "timeout/error"
            print(f"  Skipping pin {pin_id} details ({status}) — keeping metrics")
        if (i + 1) % 10 == 0:
            print(f"  {i+1}/{len(results)} details fetched")
        time.sleep(1)  # 60 req/min limit
    if skipped_details:
        print(f"  Pin details skipped: {skipped_details}/{len(results)} (metrics still saved)")

    print("Saving to D1...")
    save = request_with_retry(
        "POST",
        f"{PINS_API_URL}/api/pinterest-analytics-save",
        params={"key": PINS_API_KEY},
        json={"pins": results},
        timeout=30,
        label="analytics save",
    )
    if save is not None and save.ok:
        print(f"Done. Saved {save.json().get('saved', len(results))} pins.")
    else:
        status = save.status_code if save is not None else "no response"
        body = save.text[:300] if save is not None else ""
        print(f"ERROR saving: {status} {body}")
        sys.exit(1)

    # Fetch and save trending keywords
    print("\nFetching Pinterest trends (US, growing, food/recipes)...")
    trends = fetch_trends(access_token)
    if trends:
        save_trends(trends)

def fetch_trends(access_token):
    """
    GET /v5/trends/keywords/US/top/growing
    Filtered to food + recipes interests.
    """
    all_trends = {}
    # Valid Pinterest interest slugs for food/health niche
    for interest in ["food_and_drinks", "health"]:
        resp = request_with_retry(
            "GET",
            f"{API_BASE}/trends/keywords/US/top/growing",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "interests": interest,
                "limit":     50,
            },
            timeout=15,
            label=f"trends [{interest}]",
        )
        if resp is None:
            print(f"  trends [{interest}] → no response")
            continue
        print(f"  trends [{interest}] → {resp.status_code}")
        if not resp.ok:
            print(f"  ERROR: {resp.text[:300]}")
            continue
        data = resp.json()
        print(f"  RAW KEYS: {list(data.keys())}")
        items = data.get("trends") or []
        print(f"  Items count: {len(items)}")
        if items:
            print(f"  First item keys: {list(items[0].keys())}")
        for t in items:
            kw = (t.get("keyword") or "").strip()
            if not kw or kw in all_trends:
                continue
            all_trends[kw] = {
                "keyword":    kw,
                "growth_wow": t.get("pct_growth_wow") or t.get("growth_rate") or 0,
                "growth_mom": t.get("pct_growth_mom") or 0,
                "growth_yoy": t.get("pct_growth_yoy") or 0,
            }
        time.sleep(1)

    results = sorted(all_trends.values(), key=lambda x: x["growth_mom"] or 0, reverse=True)
    print(f"  Total unique trends: {len(results)}")
    return results


def save_trends(trends):
    import json as _json
    resp = request_with_retry(
        "POST",
        f"{PINS_API_URL}/api/pinterest-trends-save",
        params={"key": PINS_API_KEY},
        json={"trends": trends},
        timeout=15,
        label="trends save",
    )
    if resp is not None and resp.ok:
        print(f"Trends saved: {resp.json().get('saved', len(trends))} keywords")
    else:
        status = resp.status_code if resp is not None else "no response"
        body = resp.text[:200] if resp is not None else ""
        print(f"ERROR saving trends: {status} {body}")


if __name__ == "__main__":
    main()
