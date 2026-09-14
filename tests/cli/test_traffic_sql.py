"""Run the production queries against SQLite, the storage engine used by D1."""
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_browser_series_excludes_old_mixed_requests_and_incomplete_today():
    source = (ROOT / "functions/api/analytics.js").read_text(encoding="utf-8")
    sql = re.search(r"PAGE_VIEWS_BY_DAY_SQL = `(.*?)`", source, re.S).group(1)
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE funnel_events (event_type TEXT, created_at TEXT)")
    db.executemany("INSERT INTO funnel_events VALUES (?, ?)", [
        ("browser_page_view", "2026-09-13 00:00:00"),
        ("browser_page_view", "2026-09-13 23:59:59"),
        ("browser_page_view", "2026-09-14 00:00:00"),
        ("page_view", "2026-09-13 12:00:00"),
        ("server_request", "2026-09-13 12:00:00"),
    ])
    assert db.execute(sql, ("2026-09-13T00:00:00Z", "2026-09-14T00:00:00Z")).fetchall() == [("2026-09-13", 2)]


def test_pinterest_query_never_sums_old_and_new_snapshots():
    source = (ROOT / "functions/api/pinterest-analytics.js").read_text(encoding="utf-8")
    sql = re.search(r"`(SELECT pin_id.*?)`", source, re.S).group(1)
    db = sqlite3.connect(":memory:")
    db.execute("CREATE TABLE pinterest_analytics_cache (pin_id TEXT, pin_title TEXT, pin_url TEXT, pin_link TEXT, created_at TEXT, impressions INT, outbound_clicks INT, saves INT, cached_at TEXT)")
    for pin, impressions, stamp in [("stale", 9000, "2026-07-29T01:00:00Z"), ("fresh", 20, "2026-09-14T02:00:00Z")]:
        db.execute("INSERT INTO pinterest_analytics_cache (pin_id, impressions, cached_at) VALUES (?, ?, ?)", (pin, impressions, stamp))
    rows = db.execute(sql).fetchall()
    assert len(rows) == 1
    assert rows[0][0] == "fresh"
    assert rows[0][5] == 20
