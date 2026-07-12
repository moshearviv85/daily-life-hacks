#!/usr/bin/env python3
"""Create or list the Daily Life Hacks Pinterest boards.

This script is intentionally separate from post-pins.py. It does not create
pins, does not read the site queue, and only touches Pinterest boards.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from base64 import b64encode

import requests


API_BASE = "https://api.pinterest.com/v5"

APP_ID = os.environ["PINTEREST_APP_ID"]
APP_SECRET = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
GH_PAT = os.environ.get("GH_PAT", "")
GH_REPO = os.environ.get("GITHUB_REPOSITORY", "")
CREATE_BOARDS = os.environ.get("CREATE_BOARDS", "false").lower() == "true"


# Keep in sync with functions/api/_pin-metadata.js (PINTEREST_BOARDS) and docs/pinterest-boards.md
TARGET_BOARDS = [
    {
        "name": "High Fiber Dinner and Gut Health Recipes",
        "description": "High-fiber dinners, beans, lentils, oats, and gut-friendly recipes from Daily Life Hacks.",
        "id": "1124140825679184032",
    },
    {
        "name": "Gut Health Tips and Nutrition Charts",
        "description": "Gut health tips, nutrition charts, labels, and everyday nutrition ideas from Daily Life Hacks.",
        "id": "1124140825679184034",
    },
    {
        "name": "Healthy Meal Prep & Kitchen Tips",
        "description": "Meal prep systems, breakfast, smoothies, snacks, and kitchen tips from Daily Life Hacks.",
        "id": "1124140825679184036",
    },
    {
        "name": "Easy Dinner Recipes",
        "description": "Practical weeknight dinners, simple recipes, and real-life meal ideas from Daily Life Hacks.",
        "id": "1124140825679548778",
    },
    {
        "name": "Budget Meals and Grocery Hacks",
        "description": "Affordable meals, grocery planning, and kitchen money-saving ideas from Daily Life Hacks.",
        "id": "1124140825679548779",
    },
    {
        "name": "High Protein Meals and Smart Swaps",
        "description": "High-protein meals, food-first swaps, and filling everyday ideas from Daily Life Hacks.",
        "id": "1124140825679548780",
    },
    {
        "name": "Food Storage and Freezer Tips",
        "description": "Food storage, freezer meals, leftovers, and prep tips from Daily Life Hacks.",
        "id": "1124140825679548781",
    },
]


def update_github_secret(secret_name: str, secret_value: str) -> None:
    if not GH_PAT or not GH_REPO:
        print(f"WARNING: GH_PAT or GITHUB_REPOSITORY not set; cannot update {secret_name}.")
        return
    result = subprocess.run(
        ["gh", "secret", "set", secret_name, "--body", secret_value, "--repo", GH_REPO],
        env={**os.environ, "GH_TOKEN": GH_PAT},
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode == 0:
        print(f"Updated GitHub secret {secret_name}.")
    else:
        print(f"WARNING: failed to update {secret_name}: {result.stderr.strip()}")


def get_access_token() -> str:
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
        timeout=20,
    )
    if not resp.ok:
        print(f"ERROR: token refresh failed, HTTP {resp.status_code}")
        print(resp.text[:500])
        sys.exit(1)
    data = resp.json()
    access_token = data.get("access_token")
    if not access_token:
        print("ERROR: refresh response did not include access_token")
        print(json.dumps(data, indent=2))
        sys.exit(1)
    new_refresh = data.get("refresh_token")
    if new_refresh and new_refresh != REFRESH_TOKEN:
        print("Pinterest returned a new refresh_token; updating GitHub secret.")
        update_github_secret("PINTEREST_REFRESH_TOKEN", new_refresh)
    return access_token


def pinterest_request(method: str, path: str, access_token: str, **kwargs) -> requests.Response:
    return requests.request(
        method,
        f"{API_BASE}{path}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        timeout=30,
        **kwargs,
    )


def list_boards(access_token: str) -> list[dict]:
    boards: list[dict] = []
    params: dict[str, str | int] = {"page_size": 100}
    while True:
        resp = pinterest_request("GET", "/boards", access_token, params=params)
        if not resp.ok:
            print(f"ERROR: list boards failed, HTTP {resp.status_code}")
            print(resp.text[:500])
            sys.exit(1)
        data = resp.json()
        boards.extend(data.get("items") or [])
        bookmark = data.get("bookmark")
        if not bookmark:
            return boards
        params["bookmark"] = bookmark


def normalize_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


def create_board(access_token: str, board: dict) -> dict:
    payload = {
        "name": board["name"],
        "description": board["description"],
        "privacy": "PUBLIC",
    }
    resp = pinterest_request("POST", "/boards", access_token, json=payload)
    if not resp.ok:
        print(f"ERROR: create board failed for {board['name']!r}, HTTP {resp.status_code}")
        print(resp.text[:800])
        sys.exit(1)
    return resp.json()


def main() -> None:
    print(f"Pinterest board manager. create={CREATE_BOARDS}")
    access_token = get_access_token()
    existing = list_boards(access_token)
    by_name = {normalize_name(board.get("name", "")): board for board in existing}

    results = []
    for target in TARGET_BOARDS:
        normalized = normalize_name(target["name"])
        if normalized in by_name:
            board = by_name[normalized]
            results.append({
                "status": "existing",
                "name": target["name"],
                "id": board.get("id", ""),
            })
            continue
        if not CREATE_BOARDS:
            results.append({
                "status": "missing",
                "name": target["name"],
                "id": "",
            })
            continue
        board = create_board(access_token, target)
        results.append({
            "status": "created",
            "name": target["name"],
            "id": board.get("id", ""),
        })

    print("BOARD_RESULTS_START")
    print(json.dumps(results, indent=2, sort_keys=True))
    print("BOARD_RESULTS_END")


if __name__ == "__main__":
    main()
