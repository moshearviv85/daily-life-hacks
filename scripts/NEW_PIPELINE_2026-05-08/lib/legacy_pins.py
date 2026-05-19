"""Read legacy pin metadata from pipeline-data/pins-export.csv and merge with
article categories from src/data/articles/*.md, ready for /api/pins-upload.

The legacy CSV's `board` column is dirty (often contains URLs); we ignore
it and compute board downstream from category. The image_filename column
encodes slug + variant in the form `{slug}_v{N}.jpg`.
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

_FILENAME_RE = re.compile(r"(?:^|/)([^/]+?)_v(\d+)\.jpg$", re.IGNORECASE)
_TITLE_RE = re.compile(r"^title:.*$", re.MULTILINE)
_CATEGORY_RE = re.compile(r"^category:\s*(?:\"([^\"]+)\"|'([^']+)'|(\S+))\s*$", re.MULTILINE)


def extract_slug_variant(filename: str) -> tuple[str, int] | None:
    """Parse `{slug}_v{N}.jpg` (with optional dir prefix). Returns None if
    the filename doesn't match the expected shape."""
    if not filename:
        return None
    m = _FILENAME_RE.search(filename)
    if not m:
        return None
    return m.group(1), int(m.group(2))


def read_legacy_pins_csv(path: Path | str) -> list[dict]:
    """Return the rows of pins-export.csv whose image_filename is a
    parseable pin filename. Each row also gets injected `slug` and
    `variant` keys."""
    out: list[dict] = []
    with open(path, encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            sv = extract_slug_variant(row.get("image_filename", ""))
            if not sv:
                continue
            slug, variant = sv
            row["slug"] = slug
            row["variant"] = variant
            out.append(row)
    return out


def load_article_categories(articles_dir: Path | str) -> dict[str, str]:
    """Return {slug: category} for every .md in articles_dir whose
    frontmatter has a `category:` field."""
    out: dict[str, str] = {}
    d = Path(articles_dir)
    if not d.exists():
        return out
    for f in d.glob("*.md"):
        text = f.read_text(encoding="utf-8")
        if not text.startswith("---"):
            continue
        end = text.find("\n---", 3)
        if end == -1:
            continue
        fm = text[3:end]
        m = _CATEGORY_RE.search(fm)
        if not m:
            continue
        cat = m.group(1) or m.group(2) or m.group(3)
        if cat:
            out[f.stem] = cat
    return out


def build_legacy_pins_records(
    csv_path: Path | str, categories: dict[str, str]
) -> list[dict]:
    """Filter pins-export.csv rows to those whose slug has a known category,
    return a list of {slug, variant, pin_title, description, alt_text,
    category}. Rows missing pin_title or description are dropped."""
    rows = read_legacy_pins_csv(csv_path)
    out: list[dict] = []
    for r in rows:
        slug = r["slug"]
        if slug not in categories:
            continue
        title = (r.get("pin_title") or "").strip()
        desc = (r.get("description") or "").strip()
        if not title or not desc:
            continue
        out.append({
            "slug":         slug,
            "variant":      r["variant"],
            "pin_title":    title,
            "description":  desc,
            "alt_text":     (r.get("alt_text") or "").strip(),
            "category":     categories[slug],
        })
    return out
