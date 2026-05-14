#!/usr/bin/env python3
"""
1. Delete 12 remaining dead DLH pins from Pinterest
2. Pull all OUR pins (daily-life-hacks.com domain) with full details
3. Export to SQLite: pipeline-data/pinterest-pins-live.db
"""

import os
import sys
import json
import time
import sqlite3
from base64 import b64encode
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests

API_BASE = "https://api.pinterest.com/v5"
SITE = "https://www.daily-life-hacks.com"
PROJECT_ROOT = Path(__file__).resolve().parent.parent

PINS_TO_DELETE = [
    "1124140757045057961",
    "1124140757044992600",
    "1124140757044987533",
    "1124140757045462876",
    "1124140757045449445",
    "1124140757045440613",
    "1124140757045073217",
    "1124140757045054044",
    "1124140757045047427",
    "1124140757045008880",
    "1124140757045001419",
    "1124140757045455719",
]


def get_access_token():
    app_id = os.environ["PINTEREST_APP_ID"]
    app_secret = os.environ["PINTEREST_APP_SECRET"]
    refresh_token = os.environ["PINTEREST_REFRESH_TOKEN"]
    basic = b64encode(f"{app_id}:{app_secret}".encode()).decode()
    resp = requests.post(
        f"{API_BASE}/oauth/token",
        headers={"Authorization": f"Basic {basic}", "Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        timeout=15,
    )
    resp.raise_for_status()
    token = resp.json()["access_token"]
    print("Token OK")
    return token


def delete_pins(token):
    print(f"\n--- Deleting {len(PINS_TO_DELETE)} dead pins ---")
    deleted = 0
    for pin_id in PINS_TO_DELETE:
        r = requests.delete(
            f"{API_BASE}/pins/{pin_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        if r.status_code == 204:
            print(f"  DELETED {pin_id}")
            deleted += 1
        elif r.status_code == 404:
            print(f"  SKIP    {pin_id} (already gone)")
            deleted += 1
        else:
            print(f"  FAIL    {pin_id} — HTTP {r.status_code}: {r.text[:200]}")
        time.sleep(0.3)
    print(f"\n{deleted}/{len(PINS_TO_DELETE)} deleted")


def list_all_boards(token):
    boards = []
    bookmark = None
    while True:
        params = {"page_size": 100}
        if bookmark:
            params["bookmark"] = bookmark
        resp = requests.get(
            f"{API_BASE}/boards",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        boards.extend(data.get("items", []))
        bookmark = data.get("bookmark")
        if not bookmark:
            break
    return boards


def list_board_pins(token, board_id):
    pins = []
    bookmark = None
    while True:
        params = {"page_size": 100, "pin_metrics": "true"}
        if bookmark:
            params["bookmark"] = bookmark
        resp = requests.get(
            f"{API_BASE}/boards/{board_id}/pins",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        pins.extend(data.get("items", []))
        bookmark = data.get("bookmark")
        if not bookmark:
            break
    return pins


def is_our_pin(pin):
    link = pin.get("link", "") or ""
    if "daily-life-hacks.com" in link and not link.startswith("https://go."):
        return True
    image_url = ""
    media = pin.get("media", {}) or {}
    images = media.get("images", {}) or {}
    for size_key in images:
        img = images[size_key]
        if isinstance(img, dict):
            image_url = img.get("url", "")
            break
    if not image_url:
        pin_media = pin.get("pin_metrics", {})
    if "daily-life-hacks.com" in image_url:
        return True
    return False


def extract_slug(url):
    if not url:
        return ""
    slug = url.replace(SITE + "/", "").replace(SITE, "").strip("/")
    slug = slug.split("?")[0].split("#")[0]
    return slug


def get_image_url(pin):
    media = pin.get("media", {}) or {}
    images = media.get("images", {}) or {}
    for size in ["1200x", "original", "600x", "400x300", "150x150"]:
        if size in images and isinstance(images[size], dict):
            return images[size].get("url", "")
    return ""


def export_to_sqlite(pins, db_path):
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    conn.execute("""
        CREATE TABLE pins (
            pin_id TEXT PRIMARY KEY,
            title TEXT,
            description TEXT,
            link TEXT,
            slug TEXT,
            image_url TEXT,
            board_id TEXT,
            board_name TEXT,
            created_at TEXT,
            dominant_color TEXT,
            has_been_promoted INTEGER DEFAULT 0,
            alt_text TEXT,
            raw_json TEXT
        )
    """)

    for pin in pins:
        conn.execute(
            """INSERT OR REPLACE INTO pins
               (pin_id, title, description, link, slug, image_url,
                board_id, board_name, created_at, dominant_color,
                has_been_promoted, alt_text, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                pin.get("id", ""),
                pin.get("title", ""),
                pin.get("description", ""),
                pin.get("link", ""),
                extract_slug(pin.get("link", "")),
                get_image_url(pin),
                pin.get("board_id", ""),
                pin.get("_board_name", ""),
                pin.get("created_at", ""),
                pin.get("dominant_color", ""),
                1 if pin.get("has_been_promoted", False) else 0,
                pin.get("alt_text", ""),
                json.dumps(pin, ensure_ascii=False),
            ),
        )

    conn.commit()
    count = conn.execute("SELECT COUNT(*) FROM pins").fetchone()[0]
    conn.close()
    return count


def main():
    token = get_access_token()

    delete_pins(token)

    print("\n--- Pulling all pins from all boards ---")
    boards = list_all_boards(token)
    print(f"Found {len(boards)} boards")

    all_pins = []
    for board in boards:
        pins = list_board_pins(token, board["id"])
        for p in pins:
            p["_board_name"] = board.get("name", "?")
        all_pins.extend(pins)
        print(f"  {board.get('name', '?')}: {len(pins)} pins")

    print(f"\nTotal pins fetched: {len(all_pins)}")

    our_pins = [p for p in all_pins if is_our_pin(p)]
    print(f"Our pins (daily-life-hacks.com): {len(our_pins)}")

    db_path = PROJECT_ROOT / "pipeline-data" / "pinterest-pins-live.db"
    count = export_to_sqlite(our_pins, db_path)
    print(f"\nExported {count} pins to {db_path}")

    slugs = set()
    for p in our_pins:
        s = extract_slug(p.get("link", ""))
        if s:
            slugs.add(s)
    print(f"Unique destination slugs: {len(slugs)}")


if __name__ == "__main__":
    main()
