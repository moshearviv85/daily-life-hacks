"""Reads the existing content inventory for de-duplication in stage 2.

Published articles come from src/data/articles/*.md (YAML frontmatter).
Pending topics come from pipeline-data/topics-to-write.md (markdown tables).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml


_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
_BULLET_RE = re.compile(r"^\s*-\s+(.+?)\s*$")
_TABLE_ROW_RE = re.compile(r"^\|(.+)\|\s*$")


def _parse_frontmatter(text: str) -> dict[str, Any]:
    """Parse YAML frontmatter from a markdown file."""
    match = _FRONTMATTER_RE.match(text)
    if not match:
        return {}
    try:
        data = yaml.safe_load(match.group(1))
    except yaml.YAMLError:
        return {}
    return data if isinstance(data, dict) else {}


def read_published_articles(articles_dir: str | Path) -> list[dict[str, Any]]:
    """Return list of {slug, title, category, tags, date, excerpt, image} for each .md article."""
    articles_dir = Path(articles_dir)
    if not articles_dir.exists() or not articles_dir.is_dir():
        return []

    out: list[dict[str, Any]] = []
    for md_path in sorted(articles_dir.glob("*.md")):
        try:
            text = md_path.read_text(encoding="utf-8")
        except Exception:
            continue
        fm = _parse_frontmatter(text)
        if not fm:
            continue
        date_val = fm.get("date", "")
        out.append({
            "slug": md_path.stem,
            "title": str(fm.get("title", "")).strip(),
            "excerpt": str(fm.get("excerpt", "")).strip(),
            "category": str(fm.get("category", "")).strip(),
            "tags": list(fm.get("tags", [])) if isinstance(fm.get("tags"), list) else [],
            "date": str(date_val).strip(),
            "image": str(fm.get("image", "")).strip(),
        })
    return out


def read_pending_topics(topics_file: str | Path) -> list[str]:
    """Read pipeline-data/topics-to-write.md.

    Supports two formats (both appear in this codebase over time):
    1. Bullet list: `- Topic name`
    2. Markdown table: `| 101 | recipes | topic keyword | slug |`
       (picks the third cell — the human-readable keyword — when row has >= 4 cells)
    """
    topics_file = Path(topics_file)
    if not topics_file.exists():
        return []
    try:
        text = topics_file.read_text(encoding="utf-8")
    except Exception:
        return []

    topics: list[str] = []
    for line in text.splitlines():
        # Table row
        m_table = _TABLE_ROW_RE.match(line)
        if m_table:
            cells = [c.strip() for c in m_table.group(1).split("|")]
            # Skip header separator rows: |----|----|----|
            if all(set(c).issubset({"-", ":", " "}) for c in cells):
                continue
            # Skip header rows: | ID | Category | Keyword | Slug |
            if any(c.lower() in {"id", "category", "keyword", "slug"} for c in cells[:4]):
                continue
            if len(cells) >= 3 and cells[2]:
                topics.append(cells[2])
            continue

        # Bullet
        m_bullet = _BULLET_RE.match(line)
        if m_bullet:
            topic = m_bullet.group(1).strip()
            if topic and not topic.startswith("#"):
                topics.append(topic)
    return topics


if __name__ == "__main__":
    import json
    import sys
    arts_dir = sys.argv[1] if len(sys.argv) > 1 else "src/data/articles"
    arts = read_published_articles(arts_dir)
    print(f"Published: {len(arts)} articles")
    if arts:
        print(json.dumps(arts[0], indent=2, ensure_ascii=False))
