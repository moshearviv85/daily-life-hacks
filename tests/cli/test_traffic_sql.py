"""Run the production queries against SQLite, the storage engine used by D1."""
import importlib.util
import json
import re
import sqlite3
import sys
from types import SimpleNamespace
from pathlib import Path

import pytest
import requests

ROOT = Path(__file__).resolve().parents[2]


def _load_pinterest_analytics(monkeypatch):
    monkeypatch.setenv("PINTEREST_APP_ID", "app")
    monkeypatch.setenv("PINTEREST_APP_SECRET", "secret")
    monkeypatch.setenv("PINTEREST_REFRESH_TOKEN", "refresh")
    monkeypatch.setenv("PINS_API_URL", "https://example.test")
    monkeypatch.setenv("PINS_API_KEY", "key")
    path = ROOT / "scripts/fetch-pinterest-analytics.py"
    spec = importlib.util.spec_from_file_location("fetch_pinterest_analytics", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    monkeypatch.setattr(module.time, "sleep", lambda *_args, **_kwargs: None)
    return module


def _http_response(status, payload=None, text=""):
    body = payload if payload is not None else {}
    return SimpleNamespace(
        ok=200 <= status < 300,
        status_code=status,
        text=text or json.dumps(body),
        json=lambda: body,
    )


def test_failed_pinterest_fetch_cannot_publish_a_partial_fresh_snapshot(monkeypatch, capsys):
    module = _load_pinterest_analytics(monkeypatch)
    get_calls = []
    post_calls = []

    def fake_get(url, *args, **kwargs):
        get_calls.append(url)
        return _http_response(
            500,
            {"code": 12, "message": "Something went wrong on our end. Sorry about that."},
        )

    def fake_post(url, *args, **kwargs):
        post_calls.append(url)
        raise AssertionError("save must not run after a transient analytics failure")

    monkeypatch.setattr(module, "get_access_token", lambda: "test-token")
    monkeypatch.setattr(module.requests, "get", fake_get)
    monkeypatch.setattr(module.requests, "post", fake_post)

    with pytest.raises(SystemExit) as exited:
        module.main()

    assert exited.value.code == 0
    assert len(get_calls) == 3
    assert post_calls == []
    output = capsys.readouterr().out
    assert "WARNING" in output
    assert "existing cache was not replaced" in output
    assert "org_analytics" not in output


def test_fetch_top_pins_retries_then_returns_none_on_5xx(monkeypatch):
    module = _load_pinterest_analytics(monkeypatch)
    calls = {"n": 0}

    def fake_get(*args, **kwargs):
        calls["n"] += 1
        return _http_response(503, {}, text="unavailable")

    monkeypatch.setattr(module.requests, "get", fake_get)
    assert module.fetch_top_pins("test-token", "2026-06-17", "2026-09-14", "SAVE") is None
    assert calls["n"] == 3


def test_fetch_top_pins_retries_timeouts_then_returns_none(monkeypatch):
    module = _load_pinterest_analytics(monkeypatch)
    calls = {"n": 0}

    def fake_get(*args, **kwargs):
        calls["n"] += 1
        raise requests.Timeout("timed out")

    monkeypatch.setattr(module.requests, "get", fake_get)
    assert module.fetch_top_pins("test-token", "2026-06-17", "2026-09-14", "IMPRESSION") is None
    assert calls["n"] == 3


def test_fetch_top_pins_recovers_after_code_12(monkeypatch):
    module = _load_pinterest_analytics(monkeypatch)
    calls = {"n": 0}

    def fake_get(*args, **kwargs):
        calls["n"] += 1
        if calls["n"] < 3:
            return _http_response(500, {"code": 12, "message": "Something went wrong on our end."})
        return _http_response(200, {"pins": [{"pin_id": "1", "metrics": {"IMPRESSION": 9}}]})

    monkeypatch.setattr(module.requests, "get", fake_get)
    items = module.fetch_top_pins("test-token", "2026-06-17", "2026-09-14", "IMPRESSION")
    assert calls["n"] == 3
    assert items == [{"pin_id": "1", "metrics": {"IMPRESSION": 9}}]


def test_fetch_top_pins_client_error_still_raises_without_retry(monkeypatch):
    module = _load_pinterest_analytics(monkeypatch)
    calls = {"n": 0}

    def fake_get(*args, **kwargs):
        calls["n"] += 1
        return _http_response(401, {"message": "Unauthorized"}, text="Unauthorized")

    monkeypatch.setattr(module.requests, "get", fake_get)
    with pytest.raises(RuntimeError, match="existing cache was not replaced"):
        module.fetch_top_pins("test-token", "2026-06-17", "2026-09-14", "SAVE")
    assert calls["n"] == 1


def test_partial_metric_success_then_transient_does_not_replace_cache(monkeypatch, capsys):
    module = _load_pinterest_analytics(monkeypatch)
    post_calls = []
    metrics = {"IMPRESSION": [{"pin_id": "1", "metrics": {"IMPRESSION": 10}}], "OUTBOUND_CLICK": None}

    def fake_fetch(_token, _start, _end, sort_by, **_kwargs):
        return metrics.get(sort_by, [])

    def fake_post(url, *args, **kwargs):
        post_calls.append(url)
        raise AssertionError("partial analytics must not replace the existing cache")

    monkeypatch.setattr(module, "get_access_token", lambda: "test-token")
    monkeypatch.setattr(module, "fetch_top_pins", fake_fetch)
    monkeypatch.setattr(module.requests, "post", fake_post)

    with pytest.raises(SystemExit) as exited:
        module.main()

    assert exited.value.code == 0
    assert post_calls == []
    assert "metric=OUTBOUND_CLICK" in capsys.readouterr().out


def test_empty_successful_top_pins_still_hard_fails_missing_scope(monkeypatch, capsys):
    module = _load_pinterest_analytics(monkeypatch)
    monkeypatch.setattr(module, "get_access_token", lambda: "test-token")
    monkeypatch.setattr(module, "fetch_top_pins", lambda *args, **kwargs: [])
    monkeypatch.setattr(
        module.requests,
        "post",
        lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("save must not run")),
    )

    with pytest.raises(SystemExit) as exited:
        module.main()

    assert exited.value.code == 1
    assert "org_analytics" in capsys.readouterr().out


def test_save_failure_after_successful_fetch_still_hard_fails(monkeypatch, capsys):
    module = _load_pinterest_analytics(monkeypatch)
    pin = {"pin_id": "99", "metrics": {"IMPRESSION": 4, "OUTBOUND_CLICK": 1, "PIN_CLICK": 1, "SAVE": 2}}
    monkeypatch.setattr(module, "get_access_token", lambda: "test-token")
    monkeypatch.setattr(module, "fetch_top_pins", lambda *args, **kwargs: [pin])
    monkeypatch.setattr(module.requests, "get", lambda *args, **kwargs: _http_response(200, {"title": "Pin", "link": "", "created_at": ""}))
    monkeypatch.setattr(
        module.requests,
        "post",
        lambda *args, **kwargs: _http_response(500, {}, text="save failed"),
    )

    with pytest.raises(SystemExit) as exited:
        module.main()

    assert exited.value.code == 1
    assert "ERROR saving" in capsys.readouterr().out


def test_token_refresh_failure_still_hard_fails(monkeypatch, capsys):
    module = _load_pinterest_analytics(monkeypatch)
    monkeypatch.setattr(
        module.requests,
        "post",
        lambda *args, **kwargs: _http_response(401, {}, text="bad token"),
    )

    with pytest.raises(SystemExit) as exited:
        module.get_access_token()

    assert exited.value.code == 1
    assert "Token refresh failed" in capsys.readouterr().out


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
