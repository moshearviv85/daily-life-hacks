from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parent.parent
LIVE_DIR = ROOT / "src" / "data" / "articles"
READY_DIR = ROOT / "src" / "data" / "ready-articles"
DRAFT_DIR = ROOT / "pipeline-data" / "drafts"
IMAGES_DIR = ROOT / "public" / "images"
OUTPUT_PATH = ROOT / "pipeline-data" / "daily-release-inventory.json"

CATEGORIES = ("nutrition", "recipes", "tips")


def load_frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {}

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}

    data = yaml.safe_load(parts[1]) or {}
    if not isinstance(data, dict):
        return {}
    return data


def collect_records(base_dir: Path) -> list[dict]:
    if not base_dir.exists():
        return []

    records = []
    for path in sorted(base_dir.rglob("*.md")):
        frontmatter = load_frontmatter(path)
        slug = path.stem
        category = frontmatter.get("category") or "unknown"
        image_path = str(frontmatter.get("image", "")).replace("/images/", "")
        image_exists = bool(image_path) and (IMAGES_DIR / image_path).exists()
        records.append(
            {
                "slug": slug,
                "path": str(path.relative_to(ROOT)).replace("\\", "/"),
                "category": category,
                "title": frontmatter.get("title", slug),
                "image": frontmatter.get("image"),
                "image_exists": image_exists,
            }
        )
    return records


def count_by_category(records: list[dict]) -> dict[str, int]:
    counts = Counter(
        record["category"] for record in records if record["category"] in CATEGORIES
    )
    return {category: counts.get(category, 0) for category in CATEGORIES}


def main() -> None:
    live_records = collect_records(LIVE_DIR)
    ready_records = collect_records(READY_DIR)
    draft_records = collect_records(DRAFT_DIR)

    live_slugs = {record["slug"] for record in live_records}
    ready_unpublished = [record for record in ready_records if record["slug"] not in live_slugs]
    draft_unpublished = [record for record in draft_records if record["slug"] not in live_slugs]
    draft_duplicates = [record for record in draft_records if record["slug"] in live_slugs]

    report = {
        "summary": {
            "live_articles": len(live_records),
            "ready_articles": len(ready_records),
            "ready_unpublished": len(ready_unpublished),
            "draft_articles": len(draft_records),
            "draft_unpublished": len(draft_unpublished),
            "draft_duplicates_with_live": len(draft_duplicates),
        },
        "counts": {
            "live_by_category": count_by_category(live_records),
            "ready_by_category": count_by_category(ready_records),
            "ready_unpublished_by_category": count_by_category(ready_unpublished),
            "draft_by_category": count_by_category(draft_records),
            "draft_unpublished_by_category": count_by_category(draft_unpublished),
        },
        "ready_unpublished": ready_unpublished,
        "draft_unpublished": draft_unpublished,
    }

    OUTPUT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"live_articles={report['summary']['live_articles']}")
    print(f"ready_articles={report['summary']['ready_articles']}")
    print(f"ready_unpublished={report['summary']['ready_unpublished']}")
    print(f"draft_articles={report['summary']['draft_articles']}")
    print(f"draft_unpublished={report['summary']['draft_unpublished']}")
    print(json.dumps(report["counts"], indent=2))


if __name__ == "__main__":
    main()
