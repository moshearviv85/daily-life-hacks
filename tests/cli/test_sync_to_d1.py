"""Tests for scripts/sync_to_d1.py — CLI entrypoint that ships articles +
pins from local pipeline state to Cloudflare D1 via HTTP.

HTTP is mocked. Real production calls happen only when the user runs the
CLI directly (no test triggers a network call)."""
from __future__ import annotations

import json
import sqlite3

import pytest

try:
    from scripts.sync_to_d1 import main
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.sync_to_d1"


# ── HTTP fake ────────────────────────────────────────────────────────────────

class FakePost:
    """A fake post(url, *, body, key) recorder. By default returns 200 OK."""
    def __init__(self, responses=None):
        self.calls = []
        self._responses = list(responses) if responses else []

    def __call__(self, url, *, body, key):
        self.calls.append({"url": url, "body": body, "key": key})
        if self._responses:
            return self._responses.pop(0)
        return (200, '{"ok":true}')


# ── fixtures ─────────────────────────────────────────────────────────────────

def _setup_pipeline_state(tmp_path):
    """Build a complete tmp pipeline state and return (db, pins_jsonl,
    hero_jsonl)."""
    db = tmp_path / "topic.sqlite"
    con = sqlite3.connect(str(db))
    con.execute("""
        CREATE TABLE write_outputs (
            id INTEGER PRIMARY KEY,
            run_id INTEGER, topic_id INTEGER, topic_rank INTEGER,
            topic TEXT, category TEXT, slug TEXT,
            model_id TEXT, markdown TEXT,
            status TEXT, disqualified INTEGER DEFAULT 0
        )
    """)
    md_template = (
        "---\ntitle: {title}\n"
        'image: "/images/{slug}-main.jpg"\n'
        "imageAlt: stale alt from writer\n"
        "date: 2026-04-27\n---\nBody.\n"
    )
    con.execute(
        "INSERT INTO write_outputs (run_id, topic_id, topic_rank, topic, category, slug, model_id, markdown, status) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        (1, 1, 1, "Demo", "recipes", "demo",
         "test", md_template.format(title="Demo Title", slug="demo"),
         "written"),
    )
    con.commit()
    con.close()

    pins_jsonl = tmp_path / "pin-briefs.jsonl"
    pins_record = {
        "article_slug": "demo",
        "pins": [
            {"slug": f"p{i}", "title": f"Pin Title {i}", "prompt": f"... {i}",
             "alt": f"Alt {i} long enough for validation purposes here.",
             "description": f"Description {i} that is over 80 characters long for the validator and ends with CTA."}
            for i in range(1, 5)
        ],
    }
    pins_jsonl.write_text(json.dumps(pins_record) + "\n", encoding="utf-8")

    hero_jsonl = tmp_path / "hero-briefs.jsonl"
    hero_jsonl.write_text(
        json.dumps({"article_slug": "demo", "prompt": "...",
                    "alt": "Fresh alt from hero brief"}) + "\n",
        encoding="utf-8",
    )
    return db, pins_jsonl, hero_jsonl


# ── default flow ─────────────────────────────────────────────────────────────

def test_main_calls_articles_then_pins(tmp_path):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    rc = main([
        "--db", str(db),
        "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com",
        "--key", "test-key",
    ], post=fake)
    assert rc == 0
    assert len(fake.calls) == 2
    assert "articles-upload" in fake.calls[0]["url"]
    assert "pins-upload" in fake.calls[1]["url"]


def test_main_sends_key_in_query_string(tmp_path):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    main([
        "--db", str(db), "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "secret-key",
    ], post=fake)
    for c in fake.calls:
        assert c["key"] == "secret-key"


def test_main_injects_image_alt_into_articles_csv(tmp_path):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    main([
        "--db", str(db), "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    articles_body = fake.calls[0]["body"]
    assert "Fresh alt from hero brief" in articles_body
    assert "stale alt from writer" not in articles_body


def test_main_articles_only_skips_pins(tmp_path):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    main([
        "--db", str(db), "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "k",
        "--articles-only",
    ], post=fake)
    assert len(fake.calls) == 1
    assert "articles-upload" in fake.calls[0]["url"]


def test_main_pins_only_skips_articles(tmp_path):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    main([
        "--db", str(db), "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "k",
        "--pins-only",
    ], post=fake)
    assert len(fake.calls) == 1
    assert "pins-upload" in fake.calls[0]["url"]


def test_main_dry_run_does_not_call_http(tmp_path, capsys):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    rc = main([
        "--db", str(db), "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "k",
        "--dry-run",
    ], post=fake)
    assert rc == 0
    assert fake.calls == []
    out = capsys.readouterr().out
    assert "demo" in out  # CSV preview was printed


# ── error handling ───────────────────────────────────────────────────────────

def test_main_retries_on_500_then_succeeds(tmp_path):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost(responses=[
        (500, "boom"),               # articles attempt 1
        (200, '{"ok":true}'),        # articles attempt 2
        (200, '{"ok":true}'),        # pins attempt 1
    ])
    rc = main([
        "--db", str(db), "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc == 0
    # 1 retry on articles + 1 success on pins = 3 calls
    assert len(fake.calls) == 3


def test_main_does_not_retry_on_401(tmp_path):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost(responses=[
        (401, '{"error":"Unauthorized"}'),
    ])
    rc = main([
        "--db", str(db), "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc != 0
    assert len(fake.calls) == 1  # no retry


def test_main_gives_up_after_max_500_retries(tmp_path):
    db, pins_jsonl, hero_jsonl = _setup_pipeline_state(tmp_path)
    fake = FakePost(responses=[(500, "x")] * 10)
    rc = main([
        "--db", str(db), "--pins-jsonl", str(pins_jsonl),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc != 0
    assert 2 <= len(fake.calls) <= 5  # bounded retry


def test_main_skips_pins_when_no_records_in_jsonl(tmp_path):
    """If pin-briefs.jsonl is empty (or all articles lack pin records),
    the script must not POST an empty CSV to /api/pins-upload — the endpoint
    rejects empty bodies."""
    db, _, hero_jsonl = _setup_pipeline_state(tmp_path)
    empty_pins = tmp_path / "empty.jsonl"
    empty_pins.write_text("", encoding="utf-8")
    fake = FakePost()
    rc = main([
        "--db", str(db), "--pins-jsonl", str(empty_pins),
        "--hero-jsonl", str(hero_jsonl),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc == 0
    urls = [c["url"] for c in fake.calls]
    assert any("articles-upload" in u for u in urls)
    assert not any("pins-upload" in u for u in urls)
