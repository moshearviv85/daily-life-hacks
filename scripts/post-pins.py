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
  MAX_PINS_PER_RUN Maximum due pins to publish in one scheduled run (safety-capped at 1)
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
IMMEDIATE     = os.environ.get("IMMEDIATE", "false") == "true"
PIN_ROW_ID    = os.environ.get("PIN_ROW_ID", "").strip()

def _env_int(name, default, minimum=1, maximum=5):
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        print(f"WARNING: {name}={raw!r} is invalid; using {default}.")
        return default
    if value < minimum:
        print(f"WARNING: {name}={value} is below {minimum}; using {minimum}.")
        return minimum
    if value > maximum:
        print(f"WARNING: {name}={value} is above safety cap {maximum}; using {maximum}.")
        return maximum
    return value

MAX_PINS_PER_RUN = _env_int("MAX_PINS_PER_RUN", 1, maximum=1)
CATCH_UP_PAUSE_SECONDS = _env_int("CATCH_UP_PAUSE_SECONDS", 90, minimum=30, maximum=300)

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
    params = {"key": PINS_API_KEY}
    if IMMEDIATE:
        params["immediate"] = "1"
        print("IMMEDIATE mode — skipping schedule filter.")
    if PIN_ROW_ID:
        params["row_id"] = PIN_ROW_ID
        print(f"Target row_id: {PIN_ROW_ID}")
    try:
        resp = requests.get(
            f"{PINS_API_URL}/api/pins-next",
            params=params,
            timeout=30,
        )
    except requests.exceptions.RequestException as e:
        print(f"WARNING: pins-next request failed ({type(e).__name__}: {e}). Will retry next run.")
        sys.exit(0)
    if resp.status_code == 204:
        reason = resp.headers.get("X-Pins-Reason", "no_due_pins")
        due = resp.headers.get("X-Pins-Due", "0")
        skipped = resp.headers.get("X-Pins-Skipped", "0")
        if reason == "all_due_pins_blocked_by_pending_articles":
            print(f"BLOCKED: {skipped} of {due} due pin(s) waiting on articles not yet PUBLISHED.")
            print("Fix: publish the articles (publish-articles.py) or mark stale pins FAILED.")
        else:
            print(f"No pins due. reason={reason} due_count={due}")
        return None
    if 500 <= resp.status_code < 600:
        # Transient Cloudflare/D1 hiccup (often returns HTML error page).
        # Exit clean so the Action stays green; next cron will retry.
        print(f"WARNING: pins-next returned HTTP {resp.status_code} (Cloudflare/D1 transient). Will retry next run.")
        print(f"  body preview: {resp.text[:150].replace(chr(10), ' ')}")
        sys.exit(0)
    if not resp.ok:
        print(f"ERROR: pins-next failed — HTTP {resp.status_code}: {resp.text[:200]}")
        sys.exit(1)
    try:
        return resp.json()
    except ValueError:
        print(f"WARNING: pins-next returned non-JSON body. Will retry next run.")
        print(f"  body preview: {resp.text[:150].replace(chr(10), ' ')}")
        sys.exit(0)

# ── Retry helper for D1 sync calls ────────────────────────────────────────────

import time

def _post_with_retries(url, json_body, label, attempts=3, timeout=30, backoff=5):
    """POST with retries. Returns (ok, response_or_None). Never raises."""
    last_err = None
    for i in range(1, attempts + 1):
        try:
            resp = requests.post(
                url,
                params={"key": PINS_API_KEY},
                json=json_body,
                timeout=timeout,
            )
            if resp.ok:
                return True, resp
            print(f"WARNING: {label} attempt {i}/{attempts} — HTTP {resp.status_code}: {resp.text[:200]}")
            last_err = f"HTTP {resp.status_code}"
        except requests.exceptions.RequestException as e:
            print(f"WARNING: {label} attempt {i}/{attempts} failed: {type(e).__name__}: {e}")
            last_err = str(e)
        if i < attempts:
            time.sleep(backoff)
    print(f"ERROR: {label} failed after {attempts} attempts ({last_err}) — continuing without blocking.")
    return False, None

# ── Mark pin as failed in D1 ─────────────────────────────────────────────────

def mark_failed(row_id, error_message):
    ok, resp = _post_with_retries(
        f"{PINS_API_URL}/api/pins-mark-failed",
        {"row_id": row_id, "error_message": error_message},
        label="mark-failed",
    )
    if not ok:
        return None
    data = resp.json()
    fail_count = data.get("fail_count", "?")
    status = data.get("status", "PENDING")
    if status == "FAILED":
        print(f"  Pin {row_id} marked FAILED after {fail_count} attempts — skipping permanently.")
    else:
        print(f"  Pin {row_id} fail count: {fail_count}/3 — will retry next run.")
    return data

# ── Mark pin as posted in D1 ──────────────────────────────────────────────────

def mark_posted(row_id, pin_id, pinterest_response):
    ok, _ = _post_with_retries(
        f"{PINS_API_URL}/api/pins-mark-posted",
        {
            "row_id": row_id,
            "pin_id": pin_id,
            "published_date": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
            "pinterest_response": pinterest_response,
        },
        label="mark-posted",
    )
    if ok:
        print(f"  Marked {row_id} as POSTED in D1.")
    else:
        print(f"  CRITICAL: pin {row_id} (pin_id={pin_id}) posted to Pinterest but NOT marked POSTED in D1.")
        print(f"  Manual fix needed — else next run will re-post and duplicate.")

# ── Post pin to Pinterest ─────────────────────────────────────────────────────

def post_pin(access_token, row):
    payload = {
        "board_id": row["board_id"],
        "title": row["pin_title"],
        "description": row["pin_description"],
        "alt_text": row["alt_text"],
        "link": row["link"],
        "ai_disclosures": {"values": ["AI_MODIFIED"]},
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

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    from datetime import date
    today = date.today().isoformat()
    print(f"Running post-pins.py — today is {today}")
    print(f"Mode: {'IMMEDIATE' if IMMEDIATE else 'scheduled'}; max pins this run: {MAX_PINS_PER_RUN}")

    access_token = None
    posted_count = 0

    for attempt in range(1, MAX_PINS_PER_RUN + 1):
        pin = get_next_pin()
        if not pin:
            if posted_count == 0:
                print("No pins due today. Done.")
            else:
                print(f"No more due pins. Posted {posted_count} pin(s) this run.")
            return

        print(f"\nPin {attempt}/{MAX_PINS_PER_RUN}: {pin['row_id']} — {pin['pin_title']}")
        print(f"  scheduled: {pin['scheduled_date']}")
        print(f"  board_id:  {pin['board_id']}")
        print(f"  image:     {pin['image_url']}")
        print(f"  link:      {pin['link']}")

        if access_token is None:
            access_token = get_access_token()

        ok, result = post_pin(access_token, pin)

        if ok:
            pin_id = result["pin_id"]
            print(f"SUCCESS — pin_id: {pin_id}")
            mark_posted(pin["row_id"], pin_id, result["raw"])
            posted_count += 1
        else:
            print(f"FAILED — Pinterest API error:")
            print(json.dumps(result, indent=2)[:600])
            error_msg = result.get("message", json.dumps(result))
            mark_failed(pin["row_id"], error_msg)
            print("Stopping this run after a Pinterest API failure. The next cron run will retry safely.")
            sys.exit(0)

        if attempt < MAX_PINS_PER_RUN:
            print(f"Pausing {CATCH_UP_PAUSE_SECONDS}s before checking for another due pin.")
            time.sleep(CATCH_UP_PAUSE_SECONDS)

    print(f"\nDone. Posted {posted_count} pin(s).")

if __name__ == "__main__":
    main()
