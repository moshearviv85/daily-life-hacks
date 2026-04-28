"""Tests for scripts/lib/brief_store.py — SQL-backed hero/pin brief storage."""
from __future__ import annotations

import sqlite3

import pytest

try:
    from scripts.lib import brief_store
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False


VALID_TITLE = "A reasonable pin title that fits the length window"
VALID_DESC = "A reasonable pin description that is long enough to satisfy the check constraint and feels like real text."
VALID_PROMPT = "A cinematic overhead photo of a kitchen scene with text overlay across the top of the frame."
VALID_HERO_PROMPT = "A wide overhead photo of fresh ingredients on a wooden table with morning light."


def _make_db() -> sqlite3.Connection:
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.execute(
        "CREATE TABLE write_outputs (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, status TEXT)"
    )
    brief_store.init_schema(con)
    return con


def _seed_articles(con: sqlite3.Connection, slugs: list[str]) -> None:
    for s in slugs:
        con.execute(
            "INSERT INTO write_outputs (slug, status) VALUES (?, 'written')", (s,)
        )
    con.commit()


def _valid_pin_kwargs():
    return dict(title=VALID_TITLE, description=VALID_DESC, prompt=VALID_PROMPT)


def test_module_imports():
    assert _IMPORT_OK


def test_init_schema_creates_tables():
    con = _make_db()
    names = sorted(
        r[0]
        for r in con.execute(
            "SELECT name FROM sqlite_master WHERE name IN ('hero_briefs','pin_briefs')"
        )
    )
    assert names == ["hero_briefs", "pin_briefs"]


# ── hero_briefs ──────────────────────────────────────────────────────────────


def test_upsert_hero_brief_success():
    con = _make_db()
    _seed_articles(con, ["foo"])
    rid = brief_store.upsert_hero_brief(
        con,
        article_slug="foo",
        prompt=VALID_HERO_PROMPT,
        scene="kitchen",
        model_id="test-model",
    )
    assert rid > 0
    row = brief_store.get_hero_brief(con, "foo")
    assert row["status"] == "ok"
    assert row["scene"] == "kitchen"
    assert row["model_id"] == "test-model"


def test_upsert_hero_brief_replaces_on_conflict():
    con = _make_db()
    brief_store.upsert_hero_brief(
        con,
        article_slug="foo",
        prompt="First prompt that is long enough for the check.",
    )
    brief_store.upsert_hero_brief(
        con,
        article_slug="foo",
        prompt="Second prompt that replaces the first one entirely.",
    )
    row = brief_store.get_hero_brief(con, "foo")
    assert "Second" in row["prompt"]
    count = con.execute(
        "SELECT COUNT(*) FROM hero_briefs WHERE article_slug='foo'"
    ).fetchone()[0]
    assert count == 1


def test_hero_brief_short_prompt_rejected():
    con = _make_db()
    with pytest.raises(sqlite3.IntegrityError):
        brief_store.upsert_hero_brief(con, article_slug="foo", prompt="too short")


def test_record_failure_hero_writes_failed_row():
    con = _make_db()
    brief_store.record_failure_hero(con, "foo", "JSON parse error", model_id="bad-model")
    row = brief_store.get_hero_brief(con, "foo")
    assert row["status"] == "failed"
    assert row["error"] == "JSON parse error"
    assert row["prompt"] is None
    assert row["retry_count"] == 1


def test_record_failure_hero_increments_retry_count():
    con = _make_db()
    brief_store.record_failure_hero(con, "foo", "first")
    brief_store.record_failure_hero(con, "foo", "second")
    brief_store.record_failure_hero(con, "foo", "third")
    row = brief_store.get_hero_brief(con, "foo")
    assert row["retry_count"] == 3
    assert row["error"] == "third"


def test_get_hero_brief_returns_none_for_missing():
    con = _make_db()
    assert brief_store.get_hero_brief(con, "nonexistent") is None


# ── pin_briefs ───────────────────────────────────────────────────────────────


def test_upsert_pin_brief_success():
    con = _make_db()
    rid = brief_store.upsert_pin_brief(
        con,
        article_slug="foo",
        pin_index=0,
        pin_slug="foo-pin-1",
        **_valid_pin_kwargs(),
    )
    assert rid > 0
    pins = brief_store.list_pin_briefs(con, "foo")
    assert len(pins) == 1
    assert pins[0]["pin_index"] == 0
    assert pins[0]["pin_slug"] == "foo-pin-1"


def test_upsert_pin_brief_replaces_on_conflict():
    con = _make_db()
    brief_store.upsert_pin_brief(
        con, article_slug="foo", pin_index=0, **_valid_pin_kwargs()
    )
    new_kw = _valid_pin_kwargs()
    new_kw["title"] = "A different pin title that also meets length constraints"
    brief_store.upsert_pin_brief(con, article_slug="foo", pin_index=0, **new_kw)
    pins = brief_store.list_pin_briefs(con, "foo")
    assert len(pins) == 1
    assert "different" in pins[0]["title"]


def test_pin_brief_short_title_rejected():
    con = _make_db()
    bad = _valid_pin_kwargs()
    bad["title"] = "too short"
    with pytest.raises(sqlite3.IntegrityError):
        brief_store.upsert_pin_brief(con, article_slug="foo", pin_index=0, **bad)


def test_pin_brief_short_description_rejected():
    con = _make_db()
    bad = _valid_pin_kwargs()
    bad["description"] = "too short"
    with pytest.raises(sqlite3.IntegrityError):
        brief_store.upsert_pin_brief(con, article_slug="foo", pin_index=0, **bad)


def test_one_failing_pin_does_not_kill_others():
    """The point of the migration: pin #2 has a length problem, pins 0/1/3 still get saved."""
    con = _make_db()
    for i in (0, 1, 3):
        brief_store.upsert_pin_brief(
            con, article_slug="foo", pin_index=i, **_valid_pin_kwargs()
        )
    bad = _valid_pin_kwargs()
    bad["title"] = "x"
    with pytest.raises(sqlite3.IntegrityError):
        brief_store.upsert_pin_brief(con, article_slug="foo", pin_index=2, **bad)
    brief_store.record_failure_pin(con, "foo", 2, "title too short")
    pins_all = brief_store.list_pin_briefs(con, "foo", only_ok=False)
    pins_ok = brief_store.list_pin_briefs(con, "foo", only_ok=True)
    assert len(pins_all) == 4
    assert len(pins_ok) == 3
    assert [p["pin_index"] for p in pins_ok] == [0, 1, 3]
    failed = [p for p in pins_all if p["status"] == "failed"]
    assert len(failed) == 1
    assert failed[0]["pin_index"] == 2


def test_record_failure_pin_increments_retry_count():
    con = _make_db()
    brief_store.record_failure_pin(con, "foo", 0, "first error")
    brief_store.record_failure_pin(con, "foo", 0, "second error")
    rows = brief_store.list_pin_briefs(con, "foo", only_ok=False)
    assert len(rows) == 1
    assert rows[0]["retry_count"] == 2
    assert rows[0]["error"] == "second error"


def test_delete_pin_briefs():
    con = _make_db()
    for i in range(4):
        brief_store.upsert_pin_brief(
            con, article_slug="foo", pin_index=i, **_valid_pin_kwargs()
        )
    n = brief_store.delete_pin_briefs(con, "foo")
    assert n == 4
    assert brief_store.list_pin_briefs(con, "foo", only_ok=False) == []


def test_pin_index_out_of_range_rejected():
    con = _make_db()
    with pytest.raises(sqlite3.IntegrityError):
        brief_store.upsert_pin_brief(
            con, article_slug="foo", pin_index=99, **_valid_pin_kwargs()
        )


# ── coverage queries ─────────────────────────────────────────────────────────


def test_list_missing_hero_briefs():
    con = _make_db()
    _seed_articles(con, ["a", "b", "c"])
    brief_store.upsert_hero_brief(con, article_slug="a", prompt=VALID_HERO_PROMPT)
    brief_store.record_failure_hero(con, "b", "model error")
    missing = brief_store.list_missing_hero_briefs(con)
    assert sorted(missing) == ["b", "c"]


def test_list_missing_pin_briefs():
    con = _make_db()
    _seed_articles(con, ["a", "b", "c"])
    for i in range(4):
        brief_store.upsert_pin_brief(
            con, article_slug="a", pin_index=i, **_valid_pin_kwargs()
        )
    for i in range(2):
        brief_store.upsert_pin_brief(
            con, article_slug="b", pin_index=i, **_valid_pin_kwargs()
        )
    missing = brief_store.list_missing_pin_briefs(con, expected_per_article=4)
    slugs = sorted(m[0] for m in missing)
    assert slugs == ["b", "c"]


def test_coverage_summary():
    con = _make_db()
    _seed_articles(con, ["a", "b"])
    brief_store.upsert_hero_brief(con, article_slug="a", prompt=VALID_HERO_PROMPT)
    brief_store.record_failure_hero(con, "b", "boom")
    for i in range(4):
        brief_store.upsert_pin_brief(
            con, article_slug="a", pin_index=i, **_valid_pin_kwargs()
        )
    brief_store.record_failure_pin(con, "b", 0, "boom")
    s = brief_store.coverage_summary(con)
    assert s["total_written"] == 2
    assert s["hero_ok"] == 1
    assert s["hero_failed"] == 1
    assert s["articles_with_pins_ok"] == 1
    assert s["pins_ok"] == 4
    assert s["pins_failed"] == 1
