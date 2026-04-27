"""Read articles, pin briefs, hero briefs from local sources for D1 sync.

Authoritative sources:
- pipeline-data/topic-research.sqlite, table write_outputs (articles)
- pipeline-data/pin-briefs.jsonl (pins)
- pipeline-data/hero-briefs.jsonl (hero alts for imageAlt injection)
"""
from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path


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


def fetch_articles_from_sql(db_path: Path | str) -> list[dict]:
    """Return [{slug, title, category, markdown, image_filename}] for every
    write_outputs row with status='written' and disqualified=0. Articles
    whose markdown lacks a frontmatter title are skipped (D1 articles_schedule
    requires NOT NULL title)."""
    con = sqlite3.connect(str(db_path))
    try:
        cur = con.cursor()
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


def _load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def fetch_pin_records_from_jsonl(
    path: Path | str, articles: list[dict]
) -> list[dict]:
    """Return [{article_slug, category, pins[]}] for each article that has
    a record in pin-briefs.jsonl. Articles in `articles` that lack a pin
    record are skipped silently (in-progress batch)."""
    p = Path(path)
    raw = _load_jsonl(p)
    by_slug = {r.get("article_slug"): r for r in raw if r.get("article_slug")}
    cat_by_slug = {a["slug"]: a.get("category", "") for a in articles}
    out: list[dict] = []
    for a in articles:
        slug = a["slug"]
        rec = by_slug.get(slug)
        if not rec:
            continue
        out.append({
            "article_slug": slug,
            "category":     cat_by_slug.get(slug, ""),
            "pins":         rec.get("pins") or [],
        })
    return out


def load_hero_alts(path: Path | str) -> dict[str, str]:
    """Return {slug: alt} from hero-briefs.jsonl. Records without alt or
    without article_slug are skipped. Missing file returns {}."""
    p = Path(path)
    out: dict[str, str] = {}
    for rec in _load_jsonl(p):
        slug = rec.get("article_slug")
        alt = rec.get("alt")
        if slug and alt:
            out[slug] = alt
    return out
