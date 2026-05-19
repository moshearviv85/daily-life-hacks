"""SQLite schema + helpers for stage 1.5 (multi-model writer)."""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"


SCHEMA = """
CREATE TABLE IF NOT EXISTS stage_1_5_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    topic_ids TEXT NOT NULL,
    model_count INTEGER NOT NULL,
    target_words INTEGER NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS stage_1_5_outputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES stage_1_5_runs(id),
    topic_id INTEGER NOT NULL,
    topic_run_id INTEGER NOT NULL,
    topic_rank INTEGER NOT NULL,
    topic TEXT NOT NULL,
    category TEXT NOT NULL,
    slug TEXT NOT NULL,
    model_id TEXT NOT NULL,
    model_name TEXT,
    provider TEXT,
    markdown TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    cost_usd REAL,
    latency_ms INTEGER,
    status TEXT NOT NULL,
    error TEXT,
    finish_reason TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stage_1_5_outputs_run
    ON stage_1_5_outputs(run_id);
CREATE INDEX IF NOT EXISTS idx_stage_1_5_outputs_topic
    ON stage_1_5_outputs(topic_id);
"""


def connect(db_path: Path | str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    # check_same_thread=False: writer.py runs a ThreadPoolExecutor. Writes are
    # serialized by _DB_LOCK in writer.py, so cross-thread access is safe here.
    conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA)
    return conn


def start_run(
    conn: sqlite3.Connection,
    *,
    started_at: str,
    topic_ids: str,
    model_count: int,
    target_words: int,
    notes: str = "",
) -> int:
    cur = conn.execute(
        "INSERT INTO stage_1_5_runs (started_at, status, topic_ids, model_count, target_words, notes) "
        "VALUES (?, 'running', ?, ?, ?, ?)",
        (started_at, topic_ids, model_count, target_words, notes),
    )
    conn.commit()
    return int(cur.lastrowid)


def finish_run(
    conn: sqlite3.Connection,
    run_id: int,
    *,
    finished_at: str,
    status: str,
) -> None:
    conn.execute(
        "UPDATE stage_1_5_runs SET finished_at=?, status=? WHERE id=?",
        (finished_at, status, run_id),
    )
    conn.commit()


def insert_output(conn: sqlite3.Connection, row: dict[str, Any]) -> int:
    cols = [
        "run_id", "topic_id", "topic_run_id", "topic_rank", "topic",
        "category", "slug", "model_id", "model_name", "provider",
        "markdown", "tokens_in", "tokens_out", "cost_usd", "latency_ms",
        "status", "error", "finish_reason", "created_at",
    ]
    placeholders = ", ".join("?" for _ in cols)
    cur = conn.execute(
        f"INSERT INTO stage_1_5_outputs ({', '.join(cols)}) VALUES ({placeholders})",
        tuple(row.get(c) for c in cols),
    )
    conn.commit()
    return int(cur.lastrowid)


def fetch_topic(
    conn: sqlite3.Connection, topic_run_id: int, topic_rank: int
) -> sqlite3.Row | None:
    cur = conn.execute(
        "SELECT id, run_id, rank, topic, category, slug, score, rationale "
        "FROM stage2_output WHERE run_id=? AND rank=?",
        (topic_run_id, topic_rank),
    )
    return cur.fetchone()
