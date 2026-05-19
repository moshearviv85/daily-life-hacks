"""Read article markdown from the topic-research SQLite DB.

The article writer (Stage 3) stores every produced article's markdown in
pipeline-data/topic-research.sqlite, table write_outputs, column markdown.
That table is the source of truth per scripts_principles rule 4 — disk
files under src/data/articles/ are an output of the publish stage, not the
read path for downstream stages.

For reviewed articles the source of truth is review_outputs.reviewed_markdown
(the fact-checked version). Falls back to write_outputs.markdown when no
review exists.

Used by generate_hero_brief.py and generate_pin_briefs.py. Returns None
when the slug or its markdown cell is absent so callers can decide what
to do (typically: fall back to disk, then raise).
"""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"


def markdown_for_slug(slug: str, *, db_path: Path = DEFAULT_DB) -> Optional[str]:
    if not db_path.exists():
        return None
    con = sqlite3.connect(str(db_path))
    try:
        row = con.execute(
            "SELECT reviewed_markdown FROM review_outputs "
            "WHERE slug = ? AND reviewed_markdown IS NOT NULL "
            "ORDER BY rowid DESC LIMIT 1",
            (slug,),
        ).fetchone()
        if row and row[0]:
            return row[0]
        row = con.execute(
            "SELECT markdown FROM write_outputs "
            "WHERE slug = ? AND markdown IS NOT NULL "
            "ORDER BY rowid DESC LIMIT 1",
            (slug,),
        ).fetchone()
    finally:
        con.close()
    if row is None:
        return None
    md = row[0]
    if not md:
        return None
    return md
