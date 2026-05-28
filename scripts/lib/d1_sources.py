"""Read articles, pin briefs, hero briefs from local sources for D1 sync.

Authoritative sources:
- pipeline-data/topic-research.sqlite, table write_outputs (articles)
- pipeline-data/topic-research.sqlite, table pin_briefs (pins)
- pipeline-data/topic-research.sqlite, table hero_briefs (hero alts)
"""
from __future__ import annotations

import re
import sqlite3
from pathlib import Path

from scripts.lib import brief_store


_TITLE_RE = re.compile(r"^title:\s*(.+?)\s*$", re.MULTILINE)


def _extract_title(markdown: str) -> str | None:
    """Pull the title field out of YAML frontmatter. Returns None if absent."""
    if not markdown.startswith("---"):
        return None
    end = markdown.find("\n---", 3)
    if end == -1:
        return None
    fm = markdown[3:end]
    m = _TITLE_RE.search(fm)
    if not m:
        return None
    title = m.group(1).strip()
    if title.startswith('"') and title.endswith('"'):
        title = title[1:-1]
    return title or None


def _table_exists(con: sqlite3.Connection, name: str) -> bool:
    return con.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone() is not None


def fetch_articles_from_sql(db_path: Path | str) -> list[dict]:
    """Return [{slug, title, category, markdown, image_filename}] for every
    write_outputs row with status='written' and disqualified=0. Articles
    whose markdown lacks a frontmatter title are skipped (D1 articles_schedule
    requires NOT NULL title)."""
    con = sqlite3.connect(str(db_path))
    try:
        cur = con.cursor()
        if not _table_exists(con, "write_outputs"):
            return []
        cur.execute(
            "SELECT slug, category, markdown FROM write_outputs "
            "WHERE status='written' AND disqualified=0 "
            "ORDER BY topic_rank ASC"
        )
        out: list[dict] = []
        for slug, category, markdown in cur.fetchall():
            title = _extract_title(markdown or "")
            if not title:
                continue
            out.append({
                "slug":           slug,
                "title":          title,
                "category":       category,
                "markdown":       markdown,
                "image_filename": f"{slug}-main.jpg",
            })
        return out
    finally:
        con.close()


def fetch_pin_records_from_sql(
    db_path: Path | str, articles: list[dict]
) -> list[dict]:
    """Return [{article_slug, category, pins[]}] for each article that has
    status='ok' rows in pin_briefs. Articles in `articles` that lack pins
    are skipped silently (in-progress batch).

    Each pin dict has keys (slug, title, prompt, alt, description) for
    backward compatibility with build_pins_csv."""
    con = brief_store.connect(db_path)
    try:
        out: list[dict] = []
        for a in articles:
            slug = a["slug"]
            rows = brief_store.list_pin_briefs(con, slug, only_ok=True)
            if not rows:
                continue
            pins = [
                {
                    "slug":        r["pin_slug"],
                    "title":       r["title"],
                    "prompt":      r["prompt"],
                    "alt":         r["alt"],
                    "description": r["description"],
                }
                for r in rows
            ]
            out.append({
                "article_slug": slug,
                "category":     a.get("category", ""),
                "pins":         pins,
            })
        return out
    finally:
        con.close()


def load_hero_alts_from_sql(db_path: Path | str) -> dict[str, str]:
    """Return {slug: alt} from hero_briefs (status='ok' rows only). Rows
    without an alt are skipped."""
    con = brief_store.connect(db_path)
    try:
        exists = con.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='hero_briefs'"
        ).fetchone()
        if not exists:
            return {}
        rows = con.execute(
            "SELECT article_slug, alt FROM hero_briefs WHERE status='ok' AND alt IS NOT NULL AND alt != ''"
        ).fetchall()
        return {r["article_slug"]: r["alt"] for r in rows}
    finally:
        con.close()
