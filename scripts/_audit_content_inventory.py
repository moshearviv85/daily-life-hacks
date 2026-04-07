"""One-off audit: list articles with category, dates, publishAt. Run from repo root."""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "src" / "data" / "articles"


def parse_frontmatter(text: str) -> dict:
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}
    try:
        return yaml.safe_load(parts[1]) or {}
    except Exception:
        return {}


def main() -> None:
    rows = []
    for p in sorted(ART_DIR.glob("*.md")):
        slug = p.stem
        data = parse_frontmatter(p.read_text(encoding="utf-8"))
        cat = data.get("category") or ""
        pub = data.get("publishAt")
        d = data.get("date")
        title = data.get("title") or ""
        rows.append(
            {
                "slug": slug,
                "category": cat,
                "title": title,
                "date": str(d) if d else "",
                "publishAt": str(pub) if pub else "",
            }
        )

    c = Counter(r["category"] for r in rows)
    print("articles", len(rows), "by_category", dict(c))

    pubs = []
    for r in rows:
        if not r["publishAt"]:
            continue
        s = r["publishAt"].replace("Z", "+00:00")
        try:
            pubs.append(datetime.fromisoformat(s))
        except ValueError:
            pass
    if pubs:
        print("publishAt count", len(pubs), "min", min(pubs), "max", max(pubs))

    out = ROOT / "pipeline-data" / "_inventory-articles.json"
    out.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main()
