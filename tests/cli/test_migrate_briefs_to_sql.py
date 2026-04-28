"""Tests for scripts/migrate_briefs_to_sql.py — JSONL -> SQL migration."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

from scripts import migrate_briefs_to_sql as migrate_mod
from scripts.lib import brief_store


VALID_HERO_PROMPT = "A wide overhead photo of fresh ingredients on a wooden table with morning light."
VALID_TITLE = "A reasonable pin title that fits the length window"
VALID_DESC = "A reasonable pin description that is long enough to satisfy the check constraint and feels real."
VALID_PROMPT = "A cinematic overhead photo of a kitchen scene with text overlay across the top."


def _make_db(tmp_path: Path) -> Path:
    db = tmp_path / "test.sqlite"
    con = sqlite3.connect(str(db))
    con.execute(
        "CREATE TABLE write_outputs (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, status TEXT)"
    )
    con.commit()
    con.close()
    return db


def _write_jsonl(path: Path, records: list[dict]) -> None:
    path.write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in records),
        encoding="utf-8",
    )


def test_migrate_hero_basic(tmp_path):
    db = _make_db(tmp_path)
    hero_path = tmp_path / "hero.jsonl"
    _write_jsonl(
        hero_path,
        [
            {"article_slug": "a", "prompt": VALID_HERO_PROMPT, "alt": "alt a"},
            {"article_slug": "b", "prompt": VALID_HERO_PROMPT + " more.", "alt": "alt b"},
        ],
    )
    pin_path = tmp_path / "pin.jsonl"
    pin_path.write_text("", encoding="utf-8")

    rc = migrate_mod.main(
        [
            "--db", str(db),
            "--hero-jsonl", str(hero_path),
            "--pin-jsonl", str(pin_path),
        ]
    )
    assert rc == 0
    con = brief_store.connect(db)
    s = brief_store.coverage_summary(con)
    assert s["hero_ok"] == 2
    a = brief_store.get_hero_brief(con, "a")
    assert a["alt"] == "alt a"


def test_migrate_hero_handles_duplicates(tmp_path, capsys):
    db = _make_db(tmp_path)
    hero_path = tmp_path / "hero.jsonl"
    _write_jsonl(
        hero_path,
        [
            {"article_slug": "a", "prompt": VALID_HERO_PROMPT + " first version."},
            {"article_slug": "a", "prompt": VALID_HERO_PROMPT + " second version (winner)."},
        ],
    )
    pin_path = tmp_path / "pin.jsonl"
    pin_path.write_text("", encoding="utf-8")

    rc = migrate_mod.main(
        [
            "--db", str(db),
            "--hero-jsonl", str(hero_path),
            "--pin-jsonl", str(pin_path),
        ]
    )
    assert rc == 0
    con = brief_store.connect(db)
    s = brief_store.coverage_summary(con)
    assert s["hero_ok"] == 1
    a = brief_store.get_hero_brief(con, "a")
    assert "second version" in a["prompt"]
    out = capsys.readouterr().out
    assert "dup" in out.lower()


def test_migrate_pins_basic(tmp_path):
    db = _make_db(tmp_path)
    hero_path = tmp_path / "hero.jsonl"
    hero_path.write_text("", encoding="utf-8")
    pin_path = tmp_path / "pin.jsonl"
    _write_jsonl(
        pin_path,
        [
            {
                "article_slug": "a",
                "pins": [
                    {
                        "slug": "a-pin-1",
                        "title": VALID_TITLE,
                        "description": VALID_DESC,
                        "prompt": VALID_PROMPT,
                        "alt": "alt 0",
                    },
                    {
                        "slug": "a-pin-2",
                        "title": VALID_TITLE + " v2",
                        "description": VALID_DESC + " v2",
                        "prompt": VALID_PROMPT,
                        "alt": "alt 1",
                    },
                ],
            }
        ],
    )

    rc = migrate_mod.main(
        [
            "--db", str(db),
            "--hero-jsonl", str(hero_path),
            "--pin-jsonl", str(pin_path),
        ]
    )
    assert rc == 0
    con = brief_store.connect(db)
    pins = brief_store.list_pin_briefs(con, "a")
    assert len(pins) == 2
    assert pins[0]["pin_slug"] == "a-pin-1"
    assert pins[0]["alt"] == "alt 0"
    assert pins[1]["pin_index"] == 1


def test_migrate_idempotent(tmp_path):
    db = _make_db(tmp_path)
    hero_path = tmp_path / "hero.jsonl"
    _write_jsonl(
        hero_path,
        [{"article_slug": "a", "prompt": VALID_HERO_PROMPT}],
    )
    pin_path = tmp_path / "pin.jsonl"
    _write_jsonl(
        pin_path,
        [
            {
                "article_slug": "a",
                "pins": [
                    {
                        "slug": "a-1",
                        "title": VALID_TITLE,
                        "description": VALID_DESC,
                        "prompt": VALID_PROMPT,
                    }
                ],
            }
        ],
    )
    args = [
        "--db", str(db),
        "--hero-jsonl", str(hero_path),
        "--pin-jsonl", str(pin_path),
    ]
    assert migrate_mod.main(args) == 0
    assert migrate_mod.main(args) == 0
    con = brief_store.connect(db)
    s = brief_store.coverage_summary(con)
    assert s["hero_ok"] == 1
    assert s["pins_ok"] == 1


def test_dry_run_does_not_write(tmp_path):
    db = _make_db(tmp_path)
    hero_path = tmp_path / "hero.jsonl"
    _write_jsonl(
        hero_path,
        [{"article_slug": "a", "prompt": VALID_HERO_PROMPT}],
    )
    pin_path = tmp_path / "pin.jsonl"
    pin_path.write_text("", encoding="utf-8")
    rc = migrate_mod.main(
        [
            "--db", str(db),
            "--hero-jsonl", str(hero_path),
            "--pin-jsonl", str(pin_path),
            "--dry-run",
        ]
    )
    assert rc == 0
    # tables shouldn't even exist yet on the db (init_schema not called in dry-run)
    con = sqlite3.connect(str(db))
    names = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE name='hero_briefs'")]
    assert names == []
