"""SQLite schema for stage 1.75 (judging)."""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"


SCHEMA = """
CREATE TABLE IF NOT EXISTS stage_1_75_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    stage_1_5_run_id INTEGER NOT NULL,
    judge_model TEXT NOT NULL,
    article_count INTEGER NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS stage_1_75_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES stage_1_75_runs(id),
    stage_1_5_output_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    topic_rank INTEGER NOT NULL,
    category TEXT NOT NULL,
    slug TEXT NOT NULL,

    -- Layer A deterministic compliance
    compliance_score REAL NOT NULL,
    compliance_details TEXT NOT NULL,
    disqualified INTEGER NOT NULL,
    disqualify_reason TEXT,

    -- Layer B LLM rubric
    voice_score REAL,
    flow_score REAL,
    seo_score REAL,
    hook_score REAL,
    quality_score REAL,
    judge_reasoning TEXT,
    judge_status TEXT,
    judge_error TEXT,
    judge_latency_ms INTEGER,
    judge_tokens_in INTEGER,
    judge_tokens_out INTEGER,

    -- Total
    total_score REAL NOT NULL,

    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stage_1_75_scores_run
    ON stage_1_75_scores(run_id);
CREATE INDEX IF NOT EXISTS idx_stage_1_75_scores_total
    ON stage_1_75_scores(total_score DESC);
"""


def connect(db_path: Path | str = DEFAULT_DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA)
    return conn


def start_run(
    conn: sqlite3.Connection,
    *,
    started_at: str,
    stage_1_5_run_id: int,
    judge_model: str,
    article_count: int,
) -> int:
    cur = conn.execute(
        "INSERT INTO stage_1_75_runs (started_at, status, stage_1_5_run_id, judge_model, article_count) "
        "VALUES (?, 'running', ?, ?, ?)",
        (started_at, stage_1_5_run_id, judge_model, article_count),
    )
    conn.commit()
    return int(cur.lastrowid)


def finish_run(conn: sqlite3.Connection, run_id: int, *, finished_at: str, status: str) -> None:
    conn.execute(
        "UPDATE stage_1_75_runs SET finished_at=?, status=? WHERE id=?",
        (finished_at, status, run_id),
    )
    conn.commit()


def latest_stage_1_5_run_id(conn: sqlite3.Connection) -> int | None:
    cur = conn.execute(
        "SELECT id FROM stage_1_5_runs WHERE status='done' ORDER BY id DESC LIMIT 1"
    )
    row = cur.fetchone()
    return int(row[0]) if row else None


def fetch_articles(conn: sqlite3.Connection, stage_1_5_run_id: int) -> list[sqlite3.Row]:
    cur = conn.execute(
        "SELECT id, model_id, model_name, provider, topic_rank, category, slug, "
        "topic, markdown, status AS gen_status, error AS gen_error, finish_reason, "
        "tokens_out "
        "FROM stage_1_5_outputs WHERE run_id=? ORDER BY topic_rank, model_id",
        (stage_1_5_run_id,),
    )
    return cur.fetchall()


def insert_score(conn: sqlite3.Connection, row: dict[str, Any]) -> int:
    cols = [
        "run_id", "stage_1_5_output_id", "model_id", "topic_rank", "category", "slug",
        "compliance_score", "compliance_details", "disqualified", "disqualify_reason",
        "voice_score", "flow_score", "seo_score", "hook_score", "quality_score",
        "judge_reasoning", "judge_status", "judge_error", "judge_latency_ms",
        "judge_tokens_in", "judge_tokens_out",
        "total_score", "created_at",
    ]
    placeholders = ", ".join("?" for _ in cols)
    cur = conn.execute(
        f"INSERT INTO stage_1_75_scores ({', '.join(cols)}) VALUES ({placeholders})",
        tuple(row.get(c) for c in cols),
    )
    conn.commit()
    return int(cur.lastrowid)
