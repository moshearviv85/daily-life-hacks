#!/usr/bin/env python3
"""
Investigate the Jul 15-16 2026 impression spike.

Account-level impressions jumped ~5x on Jul 16 (roughly 40/day to ~200) and then
decayed over the following week. That is the only thing in this account's history
that ever worked, so it is worth more than any suppression theory.

This pulls per-pin analytics, ranks by impressions, and profiles the winners
against the rest: board, title/description shape, image aspect, and pin age.

Required env (same GitHub Secrets as post-pins.py):
  PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN
Optional:
  GH_PAT, GITHUB_REPOSITORY  to persist a rotated refresh token
"""

import json
import os
import re
import subprocess
import sys
import time
from base64 import b64encode
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

import requests

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
GH_PAT        = os.environ.get("GH_PAT", "")
GH_REPO       = os.environ.get("GITHUB_REPOSITORY", "")

API_BASE = "https://api.pinterest.com/v5"
REPORT   = "pin-spike-report.json"

# The window we care about, plus context either side.
SPIKE_START = datetime(2026, 7, 14, tzinfo=timezone.utc)
SPIKE_END   = datetime(2026, 7, 17, tzinfo=timezone.utc)


def update_github_secret(name, value):
    if not GH_PAT or not GH_REPO:
        return
    subprocess.run(["gh", "secret", "set", name, "--body", value, "--repo", GH_REPO],
                   env={**os.environ, "GH_TOKEN": GH_PAT}, capture_output=True, text=True)


def get_access_token():
    basic = b64encode(f"{APP_ID}:{APP_SECRET}".encode()).decode()
    r = requests.post(f"{API_BASE}/oauth/token",
                      headers={"Authorization": f"Basic {basic}",
                               "Content-Type": "application/x-www-form-urlencoded"},
                      data={"grant_type": "refresh_token", "refresh_token": REFRESH_TOKEN},
                      timeout=15)
    if not r.ok:
        print(f"ERROR: token refresh failed {r.status_code}: {r.text[:300]}")
        sys.exit(1)
    d = r.json()
    nr = d.get("refresh_token")
    if nr and nr != REFRESH_TOKEN:
        print("New refresh_token received - updating GitHub Secret...")
        update_github_secret("PINTEREST_REFRESH_TOKEN", nr)
    return d["access_token"]


def fetch_all(url, headers, params=None):
    out, bookmark = [], None
    while True:
        p = dict(params or {}); p["page_size"] = 100
        if bookmark:
            p["bookmark"] = bookmark
        r = requests.get(url, headers=headers, params=p, timeout=30)
        if not r.ok:
            print(f"ERROR {url} {r.status_code}: {r.text[:200]}")
            return out
        d = r.json()
        out += d.get("items", [])
        bookmark = d.get("bookmark")
        if not bookmark:
            return out
        time.sleep(0.3)


def parse_dt(s):
    if not s:
        return None
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None
    # Pinterest sometimes returns naive timestamps; normalise so comparisons work.
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def main() -> int:
    headers = {"Authorization": f"Bearer {get_access_token()}"}

    boards = {b["id"]: b.get("name", "?") for b in fetch_all(f"{API_BASE}/boards", headers)}
    print(f"Boards: {len(boards)}")

    pins = fetch_all(f"{API_BASE}/pins", headers)
    print(f"Pins: {len(pins)}\n")

    # Per-pin analytics over a window that comfortably covers the spike and after.
    start = (SPIKE_START - timedelta(days=6)).strftime("%Y-%m-%d")
    end   = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"Pulling per-pin analytics {start} -> {end} (this is the slow part)...")

    stats = {}
    for i, p in enumerate(pins, 1):
        pid = p["id"]
        try:
            r = requests.get(f"{API_BASE}/pins/{pid}/analytics", headers=headers,
                             params={"start_date": start, "end_date": end,
                                     "metric_types": "IMPRESSION,OUTBOUND_CLICK,PIN_CLICK,SAVE"},
                             timeout=30)
            if r.ok:
                d = r.json()
                agg = d.get("all", d) if isinstance(d, dict) else {}
                summary = agg.get("summary_metrics", agg) if isinstance(agg, dict) else {}
                stats[pid] = {
                    "impressions": summary.get("IMPRESSION", 0) or 0,
                    "outbound": summary.get("OUTBOUND_CLICK", 0) or 0,
                    "saves": summary.get("SAVE", 0) or 0,
                    "daily": agg.get("daily_metrics", []) if isinstance(agg, dict) else [],
                }
        except Exception as e:
            print(f"  pin {pid}: {e}")
        if i % 50 == 0:
            print(f"  {i}/{len(pins)}...", flush=True)
        time.sleep(0.25)

    rows = []
    for p in pins:
        s = stats.get(p["id"], {})
        created = parse_dt(p.get("created_at"))
        rows.append({
            "id": p["id"],
            "created_at": p.get("created_at"),
            "in_spike_window": bool(created and SPIKE_START <= created <= SPIKE_END),
            "board": boards.get(p.get("board_id"), "?"),
            "title": (p.get("title") or "")[:100],
            "description": (p.get("description") or "")[:200],
            "desc_len": len(p.get("description") or ""),
            "link": p.get("link"),
            "impressions": s.get("impressions", 0),
            "outbound": s.get("outbound", 0),
            "saves": s.get("saves", 0),
        })

    rows.sort(key=lambda r: -r["impressions"])
    total = sum(r["impressions"] for r in rows)
    nonzero = [r for r in rows if r["impressions"] > 0]

    print(f"\n=== TOTALS ===")
    print(f"total impressions in window : {total}")
    print(f"pins with ANY impressions   : {len(nonzero)} / {len(rows)}")
    top20 = rows[:20]
    share = sum(r['impressions'] for r in top20) / total * 100 if total else 0
    print(f"top 20 pins carry           : {share:.1f}% of all impressions")

    print(f"\n=== TOP 20 PINS ===")
    for r in top20:
        print(f"{r['impressions']:6d} imp  {r['outbound']:3d} out  {r['saves']:3d} sv  "
              f"[{r['board'][:26]:26s}] {(r['created_at'] or '')[:10]}  {r['title'][:52]}")

    print(f"\n=== BOARD PERFORMANCE ===")
    bstat = defaultdict(lambda: {"pins": 0, "imp": 0})
    for r in rows:
        bstat[r["board"]]["pins"] += 1
        bstat[r["board"]]["imp"] += r["impressions"]
    for b, v in sorted(bstat.items(), key=lambda kv: -kv[1]["imp"]):
        per = v["imp"] / v["pins"] if v["pins"] else 0
        print(f"  {v['imp']:6d} imp / {v['pins']:4d} pins = {per:6.1f} per pin   {b}")

    print(f"\n=== PINS CREATED IN THE Jul 14-17 WINDOW ===")
    win = [r for r in rows if r["in_spike_window"]]
    print(f"  {len(win)} pins created in window, {sum(r['impressions'] for r in win)} impressions")
    for r in win[:15]:
        print(f"  {r['impressions']:6d} imp  [{r['board'][:24]:24s}] {r['title'][:56]}")

    print(f"\n=== WHAT THE WINNERS HAVE IN COMMON ===")
    winners = rows[:20]
    losers = [r for r in rows if r["impressions"] == 0][:200]
    for label, group in (("TOP 20", winners), ("ZERO-IMPRESSION SAMPLE", losers)):
        if not group:
            continue
        avg_desc = sum(r["desc_len"] for r in group) / len(group)
        boards_c = Counter(r["board"] for r in group).most_common(3)
        has_num = sum(1 for r in group if re.search(r"\d", r["title"])) / len(group) * 100
        print(f"  {label}: avg description {avg_desc:.0f} chars · "
              f"{has_num:.0f}% have a number in the title · top boards {boards_c}")

    with open(REPORT, "w", encoding="utf-8") as f:
        json.dump({"window": [start, end], "total_impressions": total,
                   "pins": rows}, f, indent=2, ensure_ascii=False)
    print(f"\nFull per-pin data -> {REPORT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
