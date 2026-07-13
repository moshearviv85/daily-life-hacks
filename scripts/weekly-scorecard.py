#!/usr/bin/env python3
"""
Weekly Growth Scorecard — daily-life-hacks.com

Gathers every automatable growth metric, compares against the staged targets in
pipeline-data/growth-targets.md, and writes pipeline-data/scorecards/scorecard-{YYYY-WW}.md.

Auto metrics:
  - Reddit comment karma      (public about.json, no auth)
  - Pinterest 30d impressions + outbound clicks (user_account/analytics, OAuth refresh flow)
  - Email subscribers total   (/api/stats?key=STATS_KEY)
  - Site page views over the last 7 complete UTC days
    (/api/analytics?key=STATS_KEY, page_views_by_day)

Manual metrics (rendered as fill-in rows with instructions):
  - Google Search Console impressions/clicks per day
  - Bing Webmaster AI citations per day

Env vars (all OPTIONAL — a missing secret degrades that metric to N/A, never crashes):
  PINTEREST_APP_ID / PINTEREST_APP_SECRET / PINTEREST_REFRESH_TOKEN
  STATS_KEY
  SITE_URL   (default https://www.daily-life-hacks.com)
  GH_PAT + GITHUB_REPOSITORY  (only for rotating PINTEREST_REFRESH_TOKEN secret)

Design rule: graceful failure everywhere. One dead API must not kill the scorecard.
"""

import json
import os
import re
import subprocess
import sys
from base64 import b64encode
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

# Windows consoles default to cp1252 — make prints of arrows/Hebrew safe.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
SCORECARDS_DIR = ROOT / "pipeline-data" / "scorecards"

SITE_URL = os.environ.get("SITE_URL", "https://www.daily-life-hacks.com").rstrip("/")
STATS_KEY = os.environ.get("STATS_KEY", "")
PINTEREST_APP_ID = os.environ.get("PINTEREST_APP_ID", "")
PINTEREST_APP_SECRET = os.environ.get("PINTEREST_APP_SECRET", "")
PINTEREST_REFRESH_TOKEN = os.environ.get("PINTEREST_REFRESH_TOKEN", "")
GH_PAT = os.environ.get("GH_PAT", "")
GH_REPO = os.environ.get("GITHUB_REPOSITORY", "")

PINTEREST_API = "https://api.pinterest.com/v5"
REDDIT_USER = "YogurtclosetOk80"
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

NA_NO_SECRET = "N/A (secret not available locally)"
NA_NO_REQUESTS = "N/A (python 'requests' not installed)"

# ── Metric definitions: baseline (2026-07-12) and Stage-1 targets ─────────────
# Order here = row order in the scorecard.
METRICS = [
    # key,                          label,                               baseline, stage1_target, mode
    ("google_impressions_day",      "Google impressions/day (GSC)",      5,    50,    "manual"),
    ("google_clicks_day",           "Google clicks/day (GSC)",           0,    3,     "manual"),
    ("pinterest_impressions_30d",   "Pinterest impressions (30d)",       0,    1000,  "auto"),
    ("pinterest_outbound_clicks_30d", "Pinterest outbound clicks (30d)", 0,    50,    "auto"),
    ("email_subscribers",           "Email subscribers (total)",         5,    25,    "auto"),
    ("reddit_comment_karma",        "Reddit comment karma",              5,    50,    "auto"),
    ("ai_citations_day",            "AI citations/day (Bing)",           0,    10,    "manual"),
    ("page_views_7d",               "Site page views (last 7 complete UTC days)", 0, None, "auto"),
]

MANUAL_INSTRUCTIONS = {
    "google_impressions_day": (
        "GSC → https://search.google.com/search-console → Performance → last 7 days → "
        "total impressions / 7. Paste the number in the Current column."
    ),
    "google_clicks_day": (
        "GSC → Performance → last 7 days → total clicks / 7. Paste in Current column."
    ),
    "ai_citations_day": (
        "Bing Webmaster Tools → https://www.bing.com/webmasters → Search Performance → "
        "filter 'Chat/Copilot citations' → last 7 days / 7. Paste in Current column."
    ),
}


def log(msg):
    print(msg, flush=True)


# ── Collectors ─────────────────────────────────────────────────────────────────

def fetch_reddit_karma():
    """Comment karma from the public about.json. 403 from datacenter IPs is expected sometimes."""
    if requests is None:
        return None, NA_NO_REQUESTS
    try:
        resp = requests.get(
            f"https://www.reddit.com/user/{REDDIT_USER}/about.json",
            headers={"User-Agent": BROWSER_UA},
            timeout=15,
        )
        if resp.status_code == 403:
            return None, "N/A (Reddit returned 403 — blocked IP, check manually at reddit.com/user/%s)" % REDDIT_USER
        if not resp.ok:
            return None, f"N/A (Reddit HTTP {resp.status_code})"
        data = resp.json().get("data") or {}
        karma = data.get("comment_karma")
        if karma is None:
            return None, "N/A (no comment_karma field in response)"
        return int(karma), "auto (reddit.com about.json)"
    except Exception as e:
        return None, f"N/A (Reddit error: {type(e).__name__})"


def _update_github_secret(name, value):
    if not GH_PAT or not GH_REPO:
        return
    try:
        subprocess.run(
            ["gh", "secret", "set", name, "--body", value, "--repo", GH_REPO],
            env={**os.environ, "GH_TOKEN": GH_PAT},
            capture_output=True, text=True, timeout=60,
        )
        log(f"  GitHub secret {name} rotated.")
    except Exception as e:
        log(f"  WARN: could not rotate secret {name}: {e}")


def _pinterest_access_token():
    """Refresh-token flow, same pattern as scripts/fetch-pinterest-analytics.py, but non-fatal."""
    basic = b64encode(f"{PINTEREST_APP_ID}:{PINTEREST_APP_SECRET}".encode()).decode()
    resp = requests.post(
        f"{PINTEREST_API}/oauth/token",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "refresh_token", "refresh_token": PINTEREST_REFRESH_TOKEN},
        timeout=15,
    )
    if not resp.ok:
        log(f"  Pinterest token refresh failed {resp.status_code}: {resp.text[:200]}")
        return None
    data = resp.json()
    access_token = data.get("access_token")
    new_refresh = data.get("refresh_token")
    if new_refresh and new_refresh != PINTEREST_REFRESH_TOKEN:
        log("  New Pinterest refresh_token received — updating GitHub Secret...")
        _update_github_secret("PINTEREST_REFRESH_TOKEN", new_refresh)
    return access_token


def fetch_pinterest_30d():
    """Returns ({'impressions': int, 'outbound_clicks': int} | None, note)."""
    if requests is None:
        return None, NA_NO_REQUESTS
    if not (PINTEREST_APP_ID and PINTEREST_APP_SECRET and PINTEREST_REFRESH_TOKEN):
        return None, NA_NO_SECRET
    try:
        token = _pinterest_access_token()
        if not token:
            return None, "N/A (Pinterest token refresh failed)"
        end = date.today()
        start = end - timedelta(days=30)
        resp = requests.get(
            f"{PINTEREST_API}/user_account/analytics",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "metric_types": "IMPRESSION,OUTBOUND_CLICK",
                "granularity": "TOTAL",
            },
            timeout=20,
        )
        if not resp.ok:
            return None, f"N/A (Pinterest analytics HTTP {resp.status_code})"
        data = resp.json()
        # Shape: {"all": {"summary_metrics": {"IMPRESSION": n, "OUTBOUND_CLICK": n}, ...}}
        # Be tolerant of variations.
        summary = {}
        if isinstance(data.get("all"), dict):
            summary = data["all"].get("summary_metrics") or {}
        if not summary and isinstance(data.get("summary_metrics"), dict):
            summary = data["summary_metrics"]
        if not summary:
            # Fall back: sum daily_metrics if present
            daily = (data.get("all") or {}).get("daily_metrics") or []
            imp = sum((d.get("metrics") or {}).get("IMPRESSION", 0) or 0 for d in daily)
            oc = sum((d.get("metrics") or {}).get("OUTBOUND_CLICK", 0) or 0 for d in daily)
            if not daily:
                return None, "N/A (unexpected Pinterest response shape)"
            return {"impressions": int(imp), "outbound_clicks": int(oc)}, "auto (Pinterest user_account/analytics, daily sum)"
        return {
            "impressions": int(summary.get("IMPRESSION", 0) or 0),
            "outbound_clicks": int(summary.get("OUTBOUND_CLICK", 0) or 0),
        }, "auto (Pinterest user_account/analytics, 30d)"
    except Exception as e:
        return None, f"N/A (Pinterest error: {type(e).__name__})"


def fetch_subscribers():
    """Total email subscribers from /api/stats (auth: ?key=STATS_KEY)."""
    if requests is None:
        return None, NA_NO_REQUESTS
    if not STATS_KEY:
        return None, NA_NO_SECRET
    try:
        resp = requests.get(
            f"{SITE_URL}/api/stats",
            params={"key": STATS_KEY},
            headers={"x-api-key": STATS_KEY},  # harmless; endpoint reads ?key=
            timeout=20,
        )
        if not resp.ok:
            return None, f"N/A (/api/stats HTTP {resp.status_code})"
        total = resp.json().get("total")
        if total is None:
            return None, "N/A (no 'total' field in /api/stats response)"
        return int(total), "auto (/api/stats total)"
    except Exception as e:
        return None, f"N/A (/api/stats error: {type(e).__name__})"


def parse_page_views_7d(data):
    """Validate and sum the API's exact seven-complete-UTC-day page-view series."""
    window = data.get("page_views_window") or {}
    rows = data.get("page_views_by_day") or []
    if window.get("event_type") != "page_view":
        raise ValueError("page_views_window.event_type must be page_view")
    if window.get("timezone") != "UTC" or window.get("complete_days") is not True:
        raise ValueError("page-view window must contain complete UTC days")
    if window.get("days") != 7 or len(rows) != 7:
        raise ValueError("page-view series must contain exactly 7 days")

    start = datetime.fromisoformat(str(window.get("start", "")).replace("Z", "+00:00"))
    end = datetime.fromisoformat(str(window.get("end_exclusive", "")).replace("Z", "+00:00"))
    if start.tzinfo is None or end.tzinfo is None or end - start != timedelta(days=7):
        raise ValueError("page-view window must be exactly 7 timezone-aware days")

    expected_days = [(start + timedelta(days=i)).date().isoformat() for i in range(7)]
    actual_days = [str(row.get("day", "")) for row in rows]
    if actual_days != expected_days:
        raise ValueError("page-view rows must cover each UTC day exactly once in order")

    total = sum(int(row.get("count") or 0) for row in rows)
    source = (
        "auto (/api/analytics page_views_by_day; event_type=page_view; "
        f"UTC window [{window['start']}, {window['end_exclusive']}); 7 complete days)"
    )
    return total, source


def fetch_page_views_7d():
    """Fetch page views for exactly the last seven complete UTC calendar days."""
    if requests is None:
        return None, NA_NO_REQUESTS
    if not STATS_KEY:
        return None, NA_NO_SECRET
    try:
        resp = requests.get(
            f"{SITE_URL}/api/analytics",
            params={"key": STATS_KEY},
            timeout=20,
        )
        if not resp.ok:
            return None, f"N/A (/api/analytics HTTP {resp.status_code})"
        return parse_page_views_7d(resp.json())
    except Exception as e:
        return None, f"N/A (/api/analytics error: {type(e).__name__})"


# ── Previous scorecard (for trend arrows) ─────────────────────────────────────

def load_previous_scorecard(current_filename):
    """Find the newest scorecard file that isn't this week's, parse its embedded JSON."""
    if not SCORECARDS_DIR.exists():
        return {}
    candidates = sorted(
        p for p in SCORECARDS_DIR.glob("scorecard-*.md") if p.name != current_filename
    )
    if not candidates:
        return {}
    prev = candidates[-1]
    try:
        text = prev.read_text(encoding="utf-8")
        m = re.search(r"<!--\s*scorecard-data:\s*(\{.*?\})\s*-->", text, re.DOTALL)
        if m:
            return json.loads(m.group(1)).get("values", {})
    except Exception as e:
        log(f"  WARN: could not parse previous scorecard {prev.name}: {e}")
    return {}


def trend_arrow(current, previous):
    if current is None or previous is None:
        return "—"
    try:
        cur, prev = float(current), float(previous)
    except (TypeError, ValueError):
        return "—"
    if cur > prev:
        return "↑"  # ↑
    if cur < prev:
        return "↓"  # ↓
    return "→"      # →


def pct_progress(current, target):
    if current is None or not target:
        return "—"
    pct = min(100.0, 100.0 * float(current) / float(target))
    return f"{pct:.0f}%"


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    today = date.today()
    iso_year, iso_week, _ = today.isocalendar()
    week_tag = f"{iso_year}-W{iso_week:02d}"
    filename = f"scorecard-{week_tag}.md"
    out_path = SCORECARDS_DIR / filename

    log(f"Weekly scorecard {week_tag} — {today.isoformat()}")
    log("Collecting metrics (each degrades to N/A on failure)...")

    values = {}   # key -> numeric value or None
    notes = {}    # key -> source/failure note

    log("[1/4] Reddit comment karma")
    values["reddit_comment_karma"], notes["reddit_comment_karma"] = fetch_reddit_karma()

    log("[2/4] Pinterest 30d analytics")
    pin, pin_note = fetch_pinterest_30d()
    if pin:
        values["pinterest_impressions_30d"] = pin["impressions"]
        values["pinterest_outbound_clicks_30d"] = pin["outbound_clicks"]
    else:
        values["pinterest_impressions_30d"] = None
        values["pinterest_outbound_clicks_30d"] = None
    notes["pinterest_impressions_30d"] = pin_note
    notes["pinterest_outbound_clicks_30d"] = pin_note

    log("[3/4] Email subscribers (/api/stats)")
    values["email_subscribers"], notes["email_subscribers"] = fetch_subscribers()

    log("[4/4] Site page views — last 7 complete UTC days (/api/analytics)")
    values["page_views_7d"], notes["page_views_7d"] = fetch_page_views_7d()

    for key in ("google_impressions_day", "google_clicks_day", "ai_citations_day"):
        values[key] = None
        notes[key] = "manual — fill in by hand (see instructions below)"

    previous = load_previous_scorecard(filename)

    # ── Render markdown ────────────────────────────────────────────────────────
    lines = []
    lines.append(f"# Growth Scorecard — {week_tag}")
    lines.append("")
    lines.append(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append(f"Targets: `pipeline-data/growth-targets.md` (Stage 1 — אות חיים, deadline 2026-08-01)")
    lines.append("")
    lines.append("| Metric | Baseline (2026-07-12) | Current | Stage-1 Target | Progress | Trend |")
    lines.append("|--------|----------------------|---------|----------------|----------|-------|")

    for key, label, baseline, target, mode in METRICS:
        cur = values.get(key)
        cur_str = str(cur) if cur is not None else "_fill in_" if mode == "manual" else "N/A"
        target_str = str(target) if target is not None else "— (info only)"
        prog = pct_progress(cur, target)
        arrow = trend_arrow(cur, previous.get(key))
        lines.append(f"| {label} | {baseline} | {cur_str} | {target_str} | {prog} | {arrow} |")

    lines.append("")
    lines.append("## Notes per metric")
    lines.append("")
    for key, label, _, _, _ in METRICS:
        lines.append(f"- **{label}**: {notes.get(key, '—')}")
    lines.append("")
    lines.append("## Manual fill instructions")
    lines.append("")
    for key, instr in MANUAL_INSTRUCTIONS.items():
        label = next(l for k, l, *_ in METRICS if k == key)
        lines.append(f"- **{label}** — {instr}")
    lines.append("")
    if not previous:
        lines.append("_No previous scorecard found — trend arrows start next week._")
        lines.append("")

    # Machine-readable block for next week's trend arrows.
    payload = {
        "week": week_tag,
        "generated": today.isoformat(),
        "values": values,
        "notes": notes,
    }
    lines.append(f"<!-- scorecard-data: {json.dumps(payload)} -->")
    lines.append("")

    SCORECARDS_DIR.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    log(f"\nWrote {out_path}")

    # Summary to stdout
    log("\n=== Summary ===")
    for key, label, _, target, _ in METRICS:
        v = values.get(key)
        log(f"  {label}: {v if v is not None else 'N/A'}"
            + (f" / target {target}" if target else ""))

    # Always exit 0 — a scorecard full of N/A is still a scorecard.
    return 0


if __name__ == "__main__":
    sys.exit(main())
