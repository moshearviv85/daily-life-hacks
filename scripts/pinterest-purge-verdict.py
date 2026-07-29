#!/usr/bin/env python3
"""
Post-purge verdict: did deleting the 217 spam pins on 2026-07-26 restore distribution?

Read-only. Posts nothing, deletes nothing.

Two measurements, because the earlier diagnosis conflated them:
  1. ACCOUNT-LEVEL daily impressions across the whole live corpus. This is the
     metric the owner's own Pinterest chart shows (~40-80/day pre-purge,
     1,141 over Jul 12-26). It is the honest baseline.
  2. COHORT-LEVEL: pins created after the purge cutoff, versus the pre-purge
     July cohort. This is the metric the original diagnosis used when it
     wrongly reported "absolute zero".

Required env (same GitHub Secrets as post-pins.py):
  PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_REFRESH_TOKEN
Optional:
  GH_PAT, GITHUB_REPOSITORY  to persist a rotated refresh token
"""

import json
import os
import subprocess
import sys
import time
from base64 import b64encode
from collections import defaultdict
from datetime import datetime, timezone

import requests

APP_ID        = os.environ["PINTEREST_APP_ID"]
APP_SECRET    = os.environ["PINTEREST_APP_SECRET"]
REFRESH_TOKEN = os.environ["PINTEREST_REFRESH_TOKEN"]
GH_PAT        = os.environ.get("GH_PAT", "")
GH_REPO       = os.environ.get("GITHUB_REPOSITORY", "")

API_BASE = "https://api.pinterest.com/v5"
REPORT   = "purge-verdict-report.json"

# The purge ran 2026-07-26 ~20:30 Israel time (IDT, UTC+3) = 17:30 UTC.
PURGE_CUTOFF = datetime(2026, 7, 26, 17, 30, tzinfo=timezone.utc)
JULY_START   = datetime(2026, 7, 1, tzinfo=timezone.utc)

# Account-level window: covers well before the purge through today.
ACCOUNT_START = "2026-06-20"


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
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _unwrap(d):
    """user_account/analytics and pins/{id}/analytics both nest under 'all'."""
    if not isinstance(d, dict):
        return {}, []
    agg = d.get("all", d)
    if not isinstance(agg, dict):
        return {}, []
    summary = agg.get("summary_metrics", {})
    daily = agg.get("daily_metrics", []) or []
    if not summary and not daily:
        summary = agg
    return summary if isinstance(summary, dict) else {}, daily


def account_analytics(headers, start, end):
    """Account-level daily impressions. This is the real baseline."""
    metrics = "IMPRESSION,OUTBOUND_CLICK,PIN_CLICK,SAVE"
    attempts = [
        {"start_date": start, "end_date": end, "metric_types": metrics,
         "granularity": "DAY", "from_claimed_content": "ALL",
         "pin_format": "ALL", "app_types": "ALL"},
        {"start_date": start, "end_date": end, "metric_types": metrics,
         "granularity": "DAY"},
        {"start_date": start, "end_date": end, "metric_types": metrics},
    ]
    for params in attempts:
        r = requests.get(f"{API_BASE}/user_account/analytics",
                         headers=headers, params=params, timeout=30)
        print(f"  user_account/analytics -> {r.status_code}")
        if r.ok:
            return _unwrap(r.json())
        print(f"    {r.text[:250]}")
        time.sleep(1)
    return {}, []


def pin_analytics(headers, pin_id, start, end):
    try:
        r = requests.get(f"{API_BASE}/pins/{pin_id}/analytics", headers=headers,
                         params={"start_date": start, "end_date": end,
                                 "metric_types": "IMPRESSION,OUTBOUND_CLICK,PIN_CLICK,SAVE"},
                         timeout=30)
        if not r.ok:
            return None
        summary, _ = _unwrap(r.json())
        return {
            "impressions": summary.get("IMPRESSION", 0) or 0,
            "outbound":    summary.get("OUTBOUND_CLICK", 0) or 0,
            "pin_clicks":  summary.get("PIN_CLICK", 0) or 0,
            "saves":       summary.get("SAVE", 0) or 0,
        }
    except Exception as e:
        print(f"  pin {pin_id}: {e}")
        return None


def summarise(label, rows):
    n = len(rows)
    imp = sum(r["impressions"] for r in rows)
    out = sum(r["outbound"] for r in rows)
    sav = sum(r["saves"] for r in rows)
    nz  = sum(1 for r in rows if r["impressions"] > 0)
    per = imp / n if n else 0
    print(f"\n=== {label} ===")
    print(f"  pins                  : {n}")
    print(f"  total impressions     : {imp}")
    print(f"  impressions per pin   : {per:.1f}")
    print(f"  pins with ANY imp     : {nz} / {n}")
    print(f"  saves                 : {sav}")
    print(f"  outbound clicks       : {out}")
    return {"label": label, "pins": n, "impressions": imp, "per_pin": round(per, 2),
            "pins_with_any": nz, "saves": sav, "outbound": out}


def main() -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    headers = {"Authorization": f"Bearer {get_access_token()}"}

    print(f"\n########## ACCOUNT-LEVEL DAILY ({ACCOUNT_START} -> {today}) ##########")
    acct_summary, acct_daily = account_analytics(headers, ACCOUNT_START, today)
    print(f"  summary: {json.dumps(acct_summary)[:300]}")

    daily_rows = []
    for entry in acct_daily:
        if not isinstance(entry, dict):
            continue
        day = entry.get("date") or entry.get("DATE") or ""
        m = entry.get("metrics", entry)
        if not isinstance(m, dict):
            continue
        daily_rows.append({
            "date": day,
            "impressions": m.get("IMPRESSION", 0) or 0,
            "outbound":    m.get("OUTBOUND_CLICK", 0) or 0,
            "saves":       m.get("SAVE", 0) or 0,
        })
    daily_rows.sort(key=lambda r: r["date"])

    print(f"\n  {'date':<12} {'impressions':>12} {'outbound':>9} {'saves':>6}")
    pre, post = [], []
    for r in daily_rows:
        mark = ""
        if r["date"] and r["date"] >= "2026-07-27":
            post.append(r["impressions"]); mark = "  <- post-purge"
        elif r["date"]:
            pre.append(r["impressions"])
        print(f"  {r['date']:<12} {r['impressions']:>12} {r['outbound']:>9} {r['saves']:>6}{mark}")

    pre_avg  = sum(pre) / len(pre) if pre else 0
    post_avg = sum(post) / len(post) if post else 0
    print(f"\n  pre-purge  daily avg impressions ({len(pre)} days): {pre_avg:.1f}")
    print(f"  post-purge daily avg impressions ({len(post)} days): {post_avg:.1f}")
    if pre_avg:
        print(f"  change: {((post_avg - pre_avg) / pre_avg * 100):+.1f}%")

    print(f"\n########## COHORTS ##########")
    pins = fetch_all(f"{API_BASE}/pins", headers)
    print(f"Total live pins: {len(pins)}")
    boards = {b["id"]: b.get("name", "?") for b in fetch_all(f"{API_BASE}/boards", headers)}

    post_pins, july_pre_pins = [], []
    for p in pins:
        c = parse_dt(p.get("created_at"))
        if not c:
            continue
        if c >= PURGE_CUTOFF:
            post_pins.append(p)
        elif c >= JULY_START:
            july_pre_pins.append(p)

    print(f"Created AFTER purge cutoff ({PURGE_CUTOFF.isoformat()}): {len(post_pins)}")
    print(f"Created in July BEFORE the purge                       : {len(july_pre_pins)}")

    cohorts = {}
    for name, group, start in (
        ("post_purge", post_pins, "2026-07-26"),
        ("july_pre_purge", july_pre_pins, "2026-07-01"),
    ):
        rows = []
        print(f"\nPulling per-pin analytics for {name} ({len(group)} pins)...")
        for i, p in enumerate(group, 1):
            s = pin_analytics(headers, p["id"], start, today) or {
                "impressions": 0, "outbound": 0, "pin_clicks": 0, "saves": 0}
            rows.append({
                "id": p["id"],
                "created_at": p.get("created_at"),
                "board": boards.get(p.get("board_id"), "?"),
                "title": (p.get("title") or "")[:90],
                "link": p.get("link"),
                **s,
            })
            if i % 10 == 0:
                print(f"  {i}/{len(group)}...", flush=True)
            time.sleep(0.25)
        cohorts[name] = rows

    stats = {}
    stats["post_purge"] = summarise(
        f"POST-PURGE COHORT (created after 2026-07-26 20:30 Israel)", cohorts["post_purge"])
    stats["july_pre_purge"] = summarise(
        "JULY PRE-PURGE COHORT (created 2026-07-01 -> purge)", cohorts["july_pre_purge"])

    rows = sorted(cohorts["post_purge"], key=lambda r: -r["impressions"])
    if rows:
        print(f"\n=== EVERY POST-PURGE PIN ===")
        for r in rows:
            print(f"  {r['impressions']:5d} imp  {r['outbound']:3d} out  {r['saves']:3d} sv  "
                  f"[{r['board'][:24]:24s}] {(r['created_at'] or '')[:16]}  {r['title'][:46]}")

        bstat = defaultdict(lambda: {"pins": 0, "imp": 0})
        for r in rows:
            bstat[r["board"]]["pins"] += 1
            bstat[r["board"]]["imp"] += r["impressions"]
        print(f"\n=== POST-PURGE BY BOARD ===")
        for b, v in sorted(bstat.items(), key=lambda kv: -kv[1]["imp"]):
            per = v["imp"] / v["pins"] if v["pins"] else 0
            print(f"  {v['imp']:5d} imp / {v['pins']:3d} pins = {per:5.1f} per pin   {b}")

    print(f"\n########## VERDICT INPUTS ##########")
    total_post_imp = stats["post_purge"]["impressions"]
    print(f"  post-purge pins            : {stats['post_purge']['pins']}")
    print(f"  post-purge impressions     : {total_post_imp}")
    print(f"  post-purge pins with ANY   : {stats['post_purge']['pins_with_any']}")
    print(f"  account daily avg pre/post : {pre_avg:.1f} -> {post_avg:.1f}")
    print(f"  ABSOLUTE ZERO?             : {'YES' if total_post_imp == 0 else 'NO'}")

    with open(REPORT, "w", encoding="utf-8") as f:
        json.dump({
            "generated_utc": datetime.now(timezone.utc).isoformat(),
            "purge_cutoff_utc": PURGE_CUTOFF.isoformat(),
            "total_live_pins": len(pins),
            "account_summary": acct_summary,
            "account_daily": daily_rows,
            "account_pre_purge_daily_avg": round(pre_avg, 2),
            "account_post_purge_daily_avg": round(post_avg, 2),
            "cohort_stats": stats,
            "cohorts": cohorts,
        }, f, indent=2, ensure_ascii=False)
    print(f"\nFull data -> {REPORT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
