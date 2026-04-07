from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = ROOT / "src" / "data" / "articles"


@dataclass
class Row:
    slug: str
    category: str
    title: str
    words: int
    faq_count: int
    h2_count: int
    publish_at: Optional[datetime]
    date: Optional[datetime]


def extract_frontmatter_and_body(text: str) -> tuple[str, str]:
    if not text.startswith("---"):
        return "", text
    parts = re.split(r"^---\s*$", text, maxsplit=2, flags=re.MULTILINE)
    if len(parts) < 3:
        return "", text
    return parts[1], parts[2]


def parse_datetime_maybe(value: str) -> Optional[datetime]:
    value = value.strip().strip('"').strip("'")
    if not value:
        return None
    if re.match(r"^\d{4}-\d{2}-\d{2}T.*Z$", value):
        try:
            v = value.replace("Z", "+00:00")
            return datetime.fromisoformat(v)
        except Exception:
            return None
    if re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        try:
            return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", text))


def main() -> None:
    window_start = datetime(2026, 3, 25, tzinfo=timezone.utc)
    window_end = datetime(2026, 4, 2, tzinfo=timezone.utc)
    rows: list[Row] = []
    for md_path in ARTICLES_DIR.glob("*.md"):
        slug = md_path.stem
        text = md_path.read_text(encoding="utf-8")
        front, body = extract_frontmatter_and_body(text)

        m_pub = re.search(r"^\s*publishAt\s*:\s*(.+)\s*$", front, flags=re.MULTILINE)
        publish_at = parse_datetime_maybe(m_pub.group(1)) if m_pub else None
        if not publish_at:
            continue
        if not (window_start <= publish_at < window_end):
            continue

        m_cat = re.search(r"^\s*category\s*:\s*(.+)\s*$", front, flags=re.MULTILINE)
        category = (m_cat.group(1).strip().strip('"').strip("'") if m_cat else "unknown")
        m_title = re.search(r"^\s*title\s*:\s*(.+)\s*$", front, flags=re.MULTILINE)
        title = (m_title.group(1).strip().strip('"').strip("'") if m_title else slug)

        words = word_count(body)
        faq_count = len(re.findall(r"^\s*-\s*question\s*:", front, flags=re.MULTILINE))
        h2_count = len(re.findall(r"^##\s+", body, flags=re.MULTILINE))

        m_date = re.search(r"^\s*date\s*:\s*(.+)\s*$", front, flags=re.MULTILINE)
        date_dt = parse_datetime_maybe(m_date.group(1)) if m_date else None

        rows.append(
            Row(
                slug=slug,
                category=category,
                title=title,
                words=words,
                faq_count=faq_count,
                h2_count=h2_count,
                publish_at=publish_at,
                date=date_dt,
            )
        )

    rows.sort(key=lambda r: r.publish_at or datetime(1970, 1, 1, tzinfo=timezone.utc), reverse=True)

    print(f"=== Articles with publishAt in [{window_start.date()}..{window_end.date()}) ===")
    for r in rows:
        dt = r.publish_at.isoformat() if r.publish_at else "n/a"
        print(f"{r.slug}\tcat={r.category}\twords={r.words}\tfq={r.faq_count}\th2={r.h2_count}\t(publishAt={dt})")

    recipes = [r for r in rows if r.category == "recipes"]
    if recipes:
        avg_words = sum(r.words for r in recipes) / len(recipes)
        print(f"\nRecipes count={len(recipes)} avg_words={avg_words:.1f}")


if __name__ == "__main__":
    main()

