"""SQLite persistence for the 2-stage topic-research pipeline.

Public API
----------
open_db(path)                            → sqlite3.Connection
init_schema(conn)                        → None   (idempotent, CREATE IF NOT EXISTS)
create_run(conn, stage)                  → int    (run_id)
close_run(conn, run_id, status)          → None
get_latest_run_id(conn, stage)           → int | None

insert_audience_interests(conn, run_id, rows)
insert_pin_inspector_keywords(conn, run_id, rows)
insert_pin_inspector_boards(conn, run_id, rows)
insert_reddit_posts(conn, run_id, rows)
insert_autocomplete(conn, run_id, rows)
insert_pinterest_trends(conn, run_id, rows)
insert_stage1_output(conn, run_id, rows)
insert_stage2_output(conn, run_id, rows)

read_stage1_output(conn, run_id)         → list[dict]
read_stage2_output(conn, run_id)         → list[dict]  (ordered by rank ASC)

All insert functions accept the same dict shape the source modules return,
documented inline below.

Stdlib sqlite3 only — no new dependencies.
"""
from __future__ import annotations

import json
import sqlite3
from typing import Any


# ── connection ────────────────────────────────────────────────────────────────

def open_db(path: str) -> sqlite3.Connection:
    """Open (or create) a SQLite database at *path*.

    Use ":memory:" for in-process/test usage.
    Sets WAL mode + foreign keys enabled for all connections.
    """
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


# ── schema ────────────────────────────────────────────────────────────────────

_SCHEMA = """
-- run tracking: one row per pipeline execution
CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    stage       INTEGER NOT NULL CHECK (stage IN (1, 2)),
    started_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    finished_at TEXT,
    status      TEXT    NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running', 'done', 'failed'))
);

-- stage 1 input: audience CSV interests
CREATE TABLE IF NOT EXISTS audience_interests (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id              INTEGER NOT NULL REFERENCES runs(id),
    category            TEXT,
    category_percent    REAL,
    category_affinity   REAL,
    interest            TEXT    NOT NULL,
    percent             REAL,
    affinity            REAL
);

-- stage 2 input: Pin Inspector keyword CSV
CREATE TABLE IF NOT EXISTS pin_inspector_keywords (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id          INTEGER NOT NULL REFERENCES runs(id),
    keyword         TEXT    NOT NULL,
    rank            INTEGER,
    word_count      INTEGER,
    character_count INTEGER,
    seed            TEXT,
    monthly_searches INTEGER
);

-- stage 2 input: Pin Inspector boards CSV
-- related_interests stored as JSON array
CREATE TABLE IF NOT EXISTS pin_inspector_boards (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id           INTEGER NOT NULL REFERENCES runs(id),
    board_id         TEXT,
    board_name       TEXT    NOT NULL,
    board_followers  INTEGER,
    pin_count        INTEGER,
    board_link       TEXT,
    description      TEXT,
    is_group_board   INTEGER,
    owner_name       TEXT,
    owner_followers  INTEGER,
    owner_username   TEXT,
    related_interests TEXT    -- JSON array of strings
);

-- stage 1 source: Reddit top posts
-- (url, run_id) is unique so the same post is not double-counted per run
CREATE TABLE IF NOT EXISTS reddit_posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      INTEGER NOT NULL REFERENCES runs(id),
    title       TEXT    NOT NULL,
    selftext    TEXT,
    upvotes     INTEGER,
    comments    INTEGER,
    url         TEXT,
    subreddit   TEXT,
    created_utc INTEGER,
    nsfw        INTEGER,
    UNIQUE (run_id, url)
);

-- stage 1 source: Google Autocomplete expansions
CREATE TABLE IF NOT EXISTS autocomplete (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id   INTEGER NOT NULL REFERENCES runs(id),
    seed     TEXT    NOT NULL,
    expanded TEXT    NOT NULL
);

-- stage 1 source: Pinterest Trends API results
-- time_series stored as JSON object
CREATE TABLE IF NOT EXISTS pinterest_trends (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      INTEGER NOT NULL REFERENCES runs(id),
    keyword     TEXT    NOT NULL,
    trend_type  TEXT    NOT NULL
                CHECK (trend_type IN ('growing', 'monthly', 'yearly', 'seasonal')),
    region      TEXT,
    wow         REAL,
    mom         REAL,
    yoy         REAL,
    time_series TEXT    -- JSON object
);

-- stage 1 output: 20 content keywords + 20 board keywords ranked by Gemini
CREATE TABLE IF NOT EXISTS stage1_output (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       INTEGER NOT NULL REFERENCES runs(id),
    keyword      TEXT    NOT NULL,
    keyword_type TEXT    NOT NULL CHECK (keyword_type IN ('content', 'board')),
    rank         INTEGER NOT NULL,
    score        REAL,
    rationale    TEXT
);

-- stage 2 output: 50 ranked article topics
CREATE TABLE IF NOT EXISTS stage2_output (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id     INTEGER NOT NULL REFERENCES runs(id),
    rank       INTEGER NOT NULL,
    topic      TEXT    NOT NULL,
    category   TEXT    NOT NULL CHECK (category IN ('recipes', 'nutrition')),
    slug       TEXT    NOT NULL,
    score      REAL,
    rationale  TEXT
);
"""


def init_schema(conn: sqlite3.Connection) -> None:
    """Create all tables if they do not exist (idempotent)."""
    conn.executescript(_SCHEMA)
    conn.commit()


# ── run lifecycle ─────────────────────────────────────────────────────────────

def create_run(conn: sqlite3.Connection, stage: int) -> int:
    """Insert a new run row and return its id.

    Raises sqlite3.IntegrityError (via CHECK constraint) if stage not in {1, 2}.
    """
    cur = conn.execute(
        "INSERT INTO runs (stage) VALUES (?)",
        (stage,),
    )
    conn.commit()
    return cur.lastrowid  # type: ignore[return-value]


def close_run(conn: sqlite3.Connection, run_id: int, status: str = "done") -> None:
    """Mark a run as finished with the given status."""
    conn.execute(
        "UPDATE runs SET finished_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), status = ?"
        " WHERE id = ?",
        (status, run_id),
    )
    conn.commit()


def get_latest_run_id(conn: sqlite3.Connection, stage: int) -> int | None:
    """Return the id of the most recently created run for *stage*, or None."""
    row = conn.execute(
        "SELECT id FROM runs WHERE stage = ? ORDER BY id DESC LIMIT 1",
        (stage,),
    ).fetchone()
    return int(row[0]) if row else None


# ── insert helpers ────────────────────────────────────────────────────────────

def insert_audience_interests(
    conn: sqlite3.Connection,
    run_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """Insert rows from audience_csv.parse_audience_csv()['interests'].

    Expected keys: category, category_percent, category_affinity,
                   interest, percent, affinity
    """
    conn.executemany(
        """INSERT INTO audience_interests
           (run_id, category, category_percent, category_affinity, interest, percent, affinity)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                run_id,
                r.get("category"),
                r.get("category_percent"),
                r.get("category_affinity"),
                r["interest"],
                r.get("percent"),
                r.get("affinity"),
            )
            for r in rows
        ],
    )
    conn.commit()


def insert_pin_inspector_keywords(
    conn: sqlite3.Connection,
    run_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """Insert rows from pin_inspector.parse_pin_inspector_keywords().

    Expected keys: keyword, rank, word_count, character_count, seed, monthly_searches
    """
    conn.executemany(
        """INSERT INTO pin_inspector_keywords
           (run_id, keyword, rank, word_count, character_count, seed, monthly_searches)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                run_id,
                r["keyword"],
                r.get("rank"),
                r.get("word_count"),
                r.get("character_count"),
                r.get("seed"),
                r.get("monthly_searches"),
            )
            for r in rows
        ],
    )
    conn.commit()


def insert_pin_inspector_boards(
    conn: sqlite3.Connection,
    run_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """Insert rows from pin_inspector.parse_pin_inspector_boards().

    related_interests (list[str]) is serialised to JSON.
    """
    conn.executemany(
        """INSERT INTO pin_inspector_boards
           (run_id, board_id, board_name, board_followers, pin_count,
            board_link, description, is_group_board,
            owner_name, owner_followers, owner_username, related_interests)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                run_id,
                r.get("board_id"),
                r["board_name"],
                r.get("board_followers"),
                r.get("pin_count"),
                r.get("board_link"),
                r.get("description"),
                int(bool(r.get("is_group_board"))),
                r.get("owner_name"),
                r.get("owner_followers"),
                r.get("owner_username"),
                json.dumps(r.get("related_interests") or []),
            )
            for r in rows
        ],
    )
    conn.commit()


def insert_reddit_posts(
    conn: sqlite3.Connection,
    run_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """Insert rows from reddit.fetch_subreddit_top() / fetch_all_subreddits().

    Uses INSERT OR IGNORE on (run_id, url) to handle retries without raising.
    """
    conn.executemany(
        """INSERT OR IGNORE INTO reddit_posts
           (run_id, title, selftext, upvotes, comments, url, subreddit, created_utc, nsfw)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                run_id,
                r["title"],
                r.get("selftext", ""),
                r.get("upvotes", 0),
                r.get("comments", 0),
                r.get("url", ""),
                r.get("subreddit", ""),
                r.get("created_utc", 0),
                int(bool(r.get("nsfw"))),
            )
            for r in rows
        ],
    )
    conn.commit()


def insert_autocomplete(
    conn: sqlite3.Connection,
    run_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """Insert rows from google_autocomplete.expand_seeds().

    Expected keys: seed, expanded
    """
    conn.executemany(
        "INSERT INTO autocomplete (run_id, seed, expanded) VALUES (?, ?, ?)",
        [(run_id, r["seed"], r["expanded"]) for r in rows],
    )
    conn.commit()


def insert_pinterest_trends(
    conn: sqlite3.Connection,
    run_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """Insert rows from pinterest_trends.fetch_trending_keywords() / fetch_all_trend_types().

    trend_type must be one of growing/monthly/yearly/seasonal — enforced by
    CHECK constraint, raises sqlite3.IntegrityError for invalid values.
    time_series (dict) is serialised to JSON.
    """
    conn.executemany(
        """INSERT INTO pinterest_trends
           (run_id, keyword, trend_type, region, wow, mom, yoy, time_series)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                run_id,
                r["keyword"],
                r["trend_type"],
                r.get("region", "US"),
                r.get("wow"),
                r.get("mom"),
                r.get("yoy"),
                json.dumps(r.get("time_series") or {}),
            )
            for r in rows
        ],
    )
    conn.commit()


def insert_stage1_output(
    conn: sqlite3.Connection,
    run_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """Insert Gemini-ranked stage 1 keywords.

    keyword_type must be 'content' or 'board' — enforced by CHECK constraint.
    Expected keys: keyword, keyword_type, rank, score, rationale
    """
    conn.executemany(
        """INSERT INTO stage1_output
           (run_id, keyword, keyword_type, rank, score, rationale)
           VALUES (?, ?, ?, ?, ?, ?)""",
        [
            (
                run_id,
                r["keyword"],
                r["keyword_type"],
                r["rank"],
                r.get("score"),
                r.get("rationale", ""),
            )
            for r in rows
        ],
    )
    conn.commit()


def insert_stage2_output(
    conn: sqlite3.Connection,
    run_id: int,
    rows: list[dict[str, Any]],
) -> None:
    """Insert Gemini-ranked stage 2 topics.

    category must be 'recipes' or 'nutrition' — enforced by CHECK constraint.
    Expected keys: rank, topic, category, slug, score, rationale
    """
    conn.executemany(
        """INSERT INTO stage2_output
           (run_id, rank, topic, category, slug, score, rationale)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                run_id,
                r["rank"],
                r["topic"],
                r["category"],
                r["slug"],
                r.get("score"),
                r.get("rationale", ""),
            )
            for r in rows
        ],
    )
    conn.commit()


# ── read helpers ──────────────────────────────────────────────────────────────

def read_stage1_output(
    conn: sqlite3.Connection,
    run_id: int,
) -> list[dict[str, Any]]:
    """Return all stage 1 output rows for *run_id* as plain dicts."""
    rows = conn.execute(
        """SELECT keyword, keyword_type, rank, score, rationale
           FROM stage1_output WHERE run_id = ?
           ORDER BY keyword_type, rank""",
        (run_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def read_stage2_output(
    conn: sqlite3.Connection,
    run_id: int,
) -> list[dict[str, Any]]:
    """Return all stage 2 output rows for *run_id*, ordered by rank ASC."""
    rows = conn.execute(
        """SELECT rank, topic, category, slug, score, rationale
           FROM stage2_output WHERE run_id = ?
           ORDER BY rank ASC""",
        (run_id,),
    ).fetchall()
    return [dict(r) for r in rows]
