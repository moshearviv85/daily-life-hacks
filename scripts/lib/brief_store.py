"""Data access layer for hero_briefs and pin_briefs in topic-research.sqlite.

Replaces the JSONL files at pipeline-data/{pin,hero}-briefs.jsonl.
All brief generation and consumption goes through this module so schema
constraints (CHECK, UNIQUE, FK) are the single point of validation.

Each upsert_* call commits its own transaction. For multi-pin generation,
call upsert_pin_brief once per pin so a CHECK violation on one pin does
not roll back the others. record_failure_* writes a status='failed' row
so failures are visible in SQL instead of disappearing.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
SCHEMA_PATH = REPO_ROOT / "scripts" / "migrations" / "2026-04-28-brief-tables.sql"


def connect(db_path: Path | str = DEFAULT_DB) -> sqlite3.Connection:
    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row
    return con


def init_schema(con: sqlite3.Connection) -> None:
    con.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    con.commit()


def upsert_hero_brief(
    con: sqlite3.Connection,
    *,
    article_slug: str,
    prompt: str,
    alt: str | None = None,
    scene: str | None = None,
    composition: str | None = None,
    model_id: str | None = None,
    status: str = "ok",
    error: str | None = None,
    retry_count: int = 0,
) -> int:
    cur = con.execute(
        """
        INSERT INTO hero_briefs (article_slug, status, error, retry_count, model_id, prompt, alt, scene, composition, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(article_slug) DO UPDATE SET
          status = excluded.status,
          error = excluded.error,
          retry_count = excluded.retry_count,
          model_id = excluded.model_id,
          prompt = excluded.prompt,
          alt = excluded.alt,
          scene = excluded.scene,
          composition = excluded.composition,
          updated_at = CURRENT_TIMESTAMP
        """,
        (article_slug, status, error, retry_count, model_id, prompt, alt, scene, composition),
    )
    con.commit()
    return cur.lastrowid


def record_failure_hero(
    con: sqlite3.Connection,
    article_slug: str,
    error: str,
    model_id: str | None = None,
) -> int:
    cur = con.execute(
        """
        INSERT INTO hero_briefs (article_slug, status, error, model_id, retry_count, updated_at)
        VALUES (?, 'failed', ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(article_slug) DO UPDATE SET
          status = 'failed',
          error = excluded.error,
          model_id = excluded.model_id,
          retry_count = retry_count + 1,
          updated_at = CURRENT_TIMESTAMP
        """,
        (article_slug, error, model_id),
    )
    con.commit()
    return cur.lastrowid


def get_hero_brief(con: sqlite3.Connection, article_slug: str) -> dict | None:
    row = con.execute(
        "SELECT * FROM hero_briefs WHERE article_slug = ?",
        (article_slug,),
    ).fetchone()
    return dict(row) if row else None


def upsert_pin_brief(
    con: sqlite3.Connection,
    *,
    article_slug: str,
    pin_index: int,
    title: str,
    description: str,
    prompt: str,
    alt: str | None = None,
    pin_slug: str | None = None,
    model_id: str | None = None,
    status: str = "ok",
    error: str | None = None,
    retry_count: int = 0,
) -> int:
    cur = con.execute(
        """
        INSERT INTO pin_briefs (article_slug, pin_index, status, error, retry_count, model_id, pin_slug, title, description, prompt, alt, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(article_slug, pin_index) DO UPDATE SET
          status = excluded.status,
          error = excluded.error,
          retry_count = excluded.retry_count,
          model_id = excluded.model_id,
          pin_slug = excluded.pin_slug,
          title = excluded.title,
          description = excluded.description,
          prompt = excluded.prompt,
          alt = excluded.alt,
          updated_at = CURRENT_TIMESTAMP
        """,
        (article_slug, pin_index, status, error, retry_count, model_id, pin_slug, title, description, prompt, alt),
    )
    con.commit()
    return cur.lastrowid


def record_failure_pin(
    con: sqlite3.Connection,
    article_slug: str,
    pin_index: int,
    error: str,
    model_id: str | None = None,
) -> int:
    cur = con.execute(
        """
        INSERT INTO pin_briefs (article_slug, pin_index, status, error, model_id, retry_count, updated_at)
        VALUES (?, ?, 'failed', ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(article_slug, pin_index) DO UPDATE SET
          status = 'failed',
          error = excluded.error,
          model_id = excluded.model_id,
          retry_count = retry_count + 1,
          updated_at = CURRENT_TIMESTAMP
        """,
        (article_slug, pin_index, error, model_id),
    )
    con.commit()
    return cur.lastrowid


def list_pin_briefs(
    con: sqlite3.Connection,
    article_slug: str,
    *,
    only_ok: bool = True,
) -> list[dict]:
    if only_ok:
        rows = con.execute(
            "SELECT * FROM pin_briefs WHERE article_slug = ? AND status = 'ok' ORDER BY pin_index",
            (article_slug,),
        ).fetchall()
    else:
        rows = con.execute(
            "SELECT * FROM pin_briefs WHERE article_slug = ? ORDER BY pin_index",
            (article_slug,),
        ).fetchall()
    return [dict(r) for r in rows]


def delete_pin_briefs(con: sqlite3.Connection, article_slug: str) -> int:
    cur = con.execute("DELETE FROM pin_briefs WHERE article_slug = ?", (article_slug,))
    con.commit()
    return cur.rowcount


def list_missing_hero_briefs(con: sqlite3.Connection) -> list[str]:
    rows = con.execute(
        """
        SELECT w.slug FROM write_outputs w
        LEFT JOIN hero_briefs h ON h.article_slug = w.slug AND h.status = 'ok'
        WHERE w.status = 'written' AND h.id IS NULL
        ORDER BY w.slug
        """
    ).fetchall()
    return [r["slug"] for r in rows]


def list_missing_pin_briefs(
    con: sqlite3.Connection,
    expected_per_article: int = 4,
) -> list[tuple[str, int]]:
    rows = con.execute(
        """
        SELECT w.slug, COUNT(p.id) AS pin_count
        FROM write_outputs w
        LEFT JOIN pin_briefs p ON p.article_slug = w.slug AND p.status = 'ok'
        WHERE w.status = 'written'
        GROUP BY w.slug
        HAVING COUNT(p.id) < ?
        ORDER BY pin_count ASC, w.slug
        """,
        (expected_per_article,),
    ).fetchall()
    return [(r["slug"], r["pin_count"]) for r in rows]


def coverage_summary(con: sqlite3.Connection) -> dict:
    """One-shot coverage report. Used by ad-hoc checks and tests."""
    return {
        "total_written": con.execute(
            "SELECT COUNT(*) FROM write_outputs WHERE status='written'"
        ).fetchone()[0],
        "hero_ok": con.execute(
            "SELECT COUNT(*) FROM hero_briefs WHERE status='ok'"
        ).fetchone()[0],
        "hero_failed": con.execute(
            "SELECT COUNT(*) FROM hero_briefs WHERE status='failed'"
        ).fetchone()[0],
        "articles_with_pins_ok": con.execute(
            "SELECT COUNT(DISTINCT article_slug) FROM pin_briefs WHERE status='ok'"
        ).fetchone()[0],
        "pins_ok": con.execute(
            "SELECT COUNT(*) FROM pin_briefs WHERE status='ok'"
        ).fetchone()[0],
        "pins_failed": con.execute(
            "SELECT COUNT(*) FROM pin_briefs WHERE status='failed'"
        ).fetchone()[0],
    }
