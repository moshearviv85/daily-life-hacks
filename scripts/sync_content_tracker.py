"""
Sync pipeline-data/content-tracker.json with files in src/data/articles/.
- Sets published=true when a matching {slug}.md exists.
- Sets status to PUBLISHED when file exists (unless you prefer keeping IMAGES_READY; we normalize to PUBLISHED for live posts).
- Fixes known slug drift for IDs 101 and 105 to match on-disk article filenames.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKER = ROOT / "pipeline-data" / "content-tracker.json"
ARTICLES = ROOT / "src" / "data" / "articles"

SLUG_FIXES = {
    101: "high-fiber-meals-for-constipation-relief",
    105: "vegetarian-high-fiber-dinners-for-natural-relief",
}


def main() -> None:
    data = json.loads(TRACKER.read_text(encoding="utf-8"))
    live_slugs = {p.stem for p in ARTICLES.glob("*.md")}

    for row in data:
        rid = row.get("id")
        if rid in SLUG_FIXES:
            row["slug"] = SLUG_FIXES[rid]

        slug = row.get("slug")
        if not slug:
            continue

        if slug in live_slugs:
            row["published"] = True
            row["status"] = "PUBLISHED"
        else:
            row["published"] = False

    TRACKER.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Synced {TRACKER.relative_to(ROOT)} — {len(live_slugs)} article files on disk.")


if __name__ == "__main__":
    main()
