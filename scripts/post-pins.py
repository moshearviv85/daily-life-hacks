#!/usr/bin/env python3
"""
Pinterest Auto-Poster
Reads pipeline-data/pins-schedule.csv, posts due pins to Pinterest API v5,
updates the CSV with status/pin_id, and commits back to git.

Required env vars (GitHub Secrets):
  PINTEREST_APP_ID
  PINTEREST_APP_SECRET
  PINTEREST_REFRESH_TOKEN

Safety: posts at most 1 pin per run.
"""

import os
import csv
import json
import sys
import subprocess
from datetime import date, datetime
from base64 import b64encode

import requests

# ── Config ────────────────────────────────────────────────────────────────────

APP_ID       = os.environ["PINTEREST_APP_ID"]
APP_SECRET   = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]

CSV_PATH     = "pipeline-data/pins-schedule.csv"
API_BASE     = "https://api.pinterest.com/v5"
MAX_PER_RUN  = 1  # Safety: never bulk-post accidentally

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
    new_refresh   = data.get("refresh_token")

    if not access_token:
        print("ERROR: No access_token in refresh response")
        print(json.dumps(data, indent=2))
        sys.exit(1)

    print(f"Token refreshed OK. Expires in {data.get('expires_in', '?')}s")
    if new_refresh and new_refresh != REFRESH_TOKEN:
        print("NOTE: Pinterest returned a new refresh_token. Update PINTEREST_REFRESH_TOKEN secret.")
        print(f"  New refresh_token: {new_refresh}")

    return access_token

# ── Pin creation ──────────────────────────────────────────────────────────────

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

# ── CSV helpers ───────────────────────────────────────────────────────────────

def load_csv():
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save_csv(rows):
    if not rows:
        return
    fieldnames = rows[0].keys()
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

# ── Git commit ────────────────────────────────────────────────────────────────

def git_commit(pin_id, row_id):
    subprocess.run(["git", "config", "user.email", "actions@github.com"], check=True)
    subprocess.run(["git", "config", "user.name", "GitHub Actions"], check=True)
    subprocess.run(["git", "add", CSV_PATH], check=True)
    subprocess.run([
        "git", "commit", "-m",
        f"Posted pin {row_id} (pin_id={pin_id}) [skip ci]"
    ], check=True)
    subprocess.run(["git", "push"], check=True)
    print(f"CSV committed and pushed.")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    today = date.today().isoformat()
    print(f"Running post-pins.py — today is {today}")

    rows = load_csv()
    due = [
        r for r in rows
        if r.get("status", "").strip().upper() == "PENDING"
        and r.get("scheduled_date", "").strip() <= today
    ]

    if not due:
        print("No pins due today. Done.")
        return

    print(f"Found {len(due)} pending pin(s) due. Will post at most {MAX_PER_RUN}.")

    access_token = get_access_token()

    posted = 0
    for row in due[:MAX_PER_RUN]:
        print(f"\nPosting: {row['row_id']} — {row['pin_title']}")
        print(f"  board_id: {row['board_id']}")
        print(f"  image:    {row['image_url']}")
        print(f"  link:     {row['link']}")

        ok, result = post_pin(access_token, row)

        if ok:
            pin_id = result["pin_id"]
            print(f"SUCCESS — pin_id: {pin_id}")

            # Update row in place
            for r in rows:
                if r["row_id"] == row["row_id"]:
                    r["status"]           = "POSTED"
                    r["pin_id"]           = pin_id
                    r["published_date"]   = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
                    r["pinterest_response"] = json.dumps(result["raw"])
                    break

            save_csv(rows)
            git_commit(pin_id, row["row_id"])
            posted += 1

        else:
            print(f"FAILED — HTTP error")
            print(json.dumps(result, indent=2)[:600])

            # Log error in CSV but keep PENDING so it retries next run
            for r in rows:
                if r["row_id"] == row["row_id"]:
                    r["pinterest_response"] = json.dumps(result)[:300]
                    break
            save_csv(rows)

    print(f"\nDone. Posted {posted} pin(s) this run.")

if __name__ == "__main__":
    main()
