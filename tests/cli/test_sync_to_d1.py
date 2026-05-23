"""Tests for scripts/sync_to_d1.py — CLI entrypoint that ships articles +
pins from local pipeline state to Cloudflare D1 via HTTP.

HTTP is mocked. Real production calls happen only when the user runs the
CLI directly (no test triggers a network call)."""
from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

try:
    from scripts.sync_to_d1 import main
    from scripts.lib import brief_store
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

VALID_PIN_TITLE = "A reasonable pin title that fits the length window"
VALID_PIN_DESC = "A reasonable pin description that is long enough to satisfy the check constraint and ends with a CTA."
VALID_PIN_PROMPT = "A cinematic overhead photo of a kitchen scene with text overlay across the top of the frame."
VALID_HERO_PROMPT = "A wide overhead photo of fresh ingredients on a wooden table with morning light."


def _setup_pipeline_state(tmp_path: Path, *, with_pins: bool = True) -> Path:
    """Build a complete tmp pipeline state in one DB. Returns db path."""
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
    md = (
        "---\ntitle: Demo Title\n"
        'image: "/images/demo-main.jpg"\n'
        "imageAlt: stale alt from writer\n"
        "date: 2026-04-27\n---\nBody.\n"
    )
    con.execute(
        "INSERT INTO write_outputs (run_id, topic_id, topic_rank, topic, category, slug, model_id, markdown, status) "
        "VALUES (?,?,?,?,?,?,?,?,?)",
        (1, 1, 1, "Demo", "recipes", "demo", "test", md, "written"),
    )
    con.commit()
    con.close()

    bcon = brief_store.connect(db)
    try:
        brief_store.init_schema(bcon)
        brief_store.upsert_hero_brief(
            bcon,
            article_slug="demo",
            prompt=VALID_HERO_PROMPT,
            alt="Fresh hero alt from the generated image brief",
        )
        if with_pins:
            for i in range(4):
                brief_store.upsert_pin_brief(
                    bcon,
                    article_slug="demo",
                    pin_index=i,
                    pin_slug=f"pin-{i}",
                    title=f"{VALID_PIN_TITLE} {i}",
                    description=f"{VALID_PIN_DESC} v{i}",
                    prompt=VALID_PIN_PROMPT,
                    alt=f"A demo pin alt text for variant {i} that is long enough.",
                )
    finally:
        bcon.close()
    return db


# ── default flow ─────────────────────────────────────────────────────────────

def test_main_calls_articles_then_pins(tmp_path):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    rc = main([
        "--db", str(db),
        "--base-url", "https://test.example.com",
        "--key", "test-key",
    ], post=fake)
    assert rc == 0
    assert len(fake.calls) == 2
    assert "articles-upload" in fake.calls[0]["url"]
    assert "pins-upload" in fake.calls[1]["url"]


def test_main_sends_key_in_query_string(tmp_path):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "secret-key",
    ], post=fake)
    for c in fake.calls:
        assert c["key"] == "secret-key"


def test_main_injects_image_alt_into_articles_csv(tmp_path):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    articles_body = fake.calls[0]["body"]
    assert "Fresh hero alt from the generated image brief" in articles_body
    assert "stale alt from writer" not in articles_body


def test_main_articles_only_skips_pins(tmp_path):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "k",
        "--articles-only",
    ], post=fake)
    assert len(fake.calls) == 1
    assert "articles-upload" in fake.calls[0]["url"]


def test_main_pins_only_skips_articles(tmp_path):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "k",
        "--pins-only",
    ], post=fake)
    assert len(fake.calls) == 1
    assert "pins-upload" in fake.calls[0]["url"]


def test_main_dry_run_does_not_call_http(tmp_path, capsys):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost()
    rc = main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "k",
        "--dry-run",
    ], post=fake)
    assert rc == 0
    assert fake.calls == []
    out = capsys.readouterr().out
    assert "demo" in out


# ── error handling ───────────────────────────────────────────────────────────

def test_main_retries_on_500_then_succeeds(tmp_path):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost(responses=[
        (500, "boom"),
        (200, '{"ok":true}'),
        (200, '{"ok":true}'),
    ])
    rc = main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc == 0
    assert len(fake.calls) == 3


def test_main_does_not_retry_on_401(tmp_path):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost(responses=[
        (401, '{"error":"Unauthorized"}'),
    ])
    rc = main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc != 0
    assert len(fake.calls) == 1


def test_main_gives_up_after_max_500_retries(tmp_path):
    db = _setup_pipeline_state(tmp_path)
    fake = FakePost(responses=[(500, "x")] * 10)
    rc = main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc != 0
    assert 2 <= len(fake.calls) <= 5


def test_main_skips_pins_when_no_records_in_sql(tmp_path):
    """If pin_briefs has no rows for the article, the script must not POST
    an empty CSV to /api/pins-upload."""
    db = _setup_pipeline_state(tmp_path, with_pins=False)
    fake = FakePost()
    rc = main([
        "--db", str(db),
        "--base-url", "https://test.example.com", "--key", "k",
    ], post=fake)
    assert rc == 0
    urls = [c["url"] for c in fake.calls]
    assert any("articles-upload" in u for u in urls)
    assert not any("pins-upload" in u for u in urls)
