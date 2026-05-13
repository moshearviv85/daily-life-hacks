"""Sync pin_briefs slugs into router-mapping.json for variant routing.

Reads pin_briefs (status='ok') from SQLite, groups by article, and
builds the router-mapping structure that [slug].astro uses to create
variant pages. Each pin gets a unique URL slug derived from its title.

CLI:
    python scripts/NEW_PIPELINE_2026-05-08/sync_router_mapping.py
    python scripts/NEW_PIPELINE_2026-05-08/sync_router_mapping.py --dry-run
    python scripts/NEW_PIPELINE_2026-05-08/sync_router_mapping.py --only-complete
    python scripts/NEW_PIPELINE_2026-05-08/sync_router_mapping.py --no-merge
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
MAPPING_PATH = REPO_ROOT / "pipeline-data" / "router-mapping.json"


def build_mapping_from_db(
    db_path: Path | str,
    *,
    only_complete: bool = False,
    limit: int | None = None,
) -> dict[str, dict]:
    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row

    if only_complete:
        slugs_row = con.execute(
            """SELECT article_slug
               FROM pin_briefs
               WHERE status = 'ok'
               GROUP BY article_slug
               HAVING COUNT(*) = 4"""
        ).fetchall()
        complete_slugs = {r["article_slug"] for r in slugs_row}
    else:
        complete_slugs = None

    if limit:
        recent = con.execute(
            """SELECT article_slug
               FROM pin_briefs
               WHERE status = 'ok'
               GROUP BY article_slug
               ORDER BY MAX(created_at) DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
        limit_slugs = {r["article_slug"] for r in recent}
    else:
        limit_slugs = None

    rows = con.execute(
        """SELECT article_slug, pin_index, pin_slug, title, created_at
           FROM pin_briefs
           WHERE status = 'ok'
           ORDER BY article_slug, pin_index"""
    ).fetchall()
    con.close()

    mapping: dict[str, dict] = {}
    for r in rows:
        slug = r["article_slug"]
        if complete_slugs is not None and slug not in complete_slugs:
            continue
        if limit_slugs is not None and slug not in limit_slugs:
            continue
        ps = r["pin_slug"]
        if slug not in mapping:
            mapping[slug] = {}
        mapping[slug][ps] = {
            "url_slug": ps,
            "title": r["title"],
            "created_at": r["created_at"],
        }
    return mapping


def merge_mappings(existing: dict, new: dict) -> dict:
    merged = dict(existing)
    merged.update(new)
    return merged


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Sync pin_briefs slugs into router-mapping.json"
    )
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--output", default=str(MAPPING_PATH))
    parser.add_argument("--dry-run", action="store_true",
                        help="Print mapping to stdout, do not write file")
    parser.add_argument("--only-complete", action="store_true",
                        help="Only include articles with all 4 pins OK")
    parser.add_argument("--limit", type=int, default=None,
                        help="Only process the N most recent articles")
    parser.add_argument("--no-merge", action="store_true",
                        help="Do not merge with existing file, overwrite")
    args = parser.parse_args(argv)

    new_mapping = build_mapping_from_db(
        args.db, only_complete=args.only_complete, limit=args.limit,
    )
    print(f"Built mapping for {len(new_mapping)} article(s) from pin_briefs", file=sys.stderr)

    output_path = Path(args.output)

    if args.no_merge:
        final = new_mapping
    else:
        existing: dict = {}
        if output_path.exists():
            existing = json.loads(output_path.read_text(encoding="utf-8"))
            print(f"Loaded {len(existing)} existing article(s) from {output_path.name}", file=sys.stderr)
        final = merge_mappings(existing, new_mapping)
        print(f"Merged total: {len(final)} article(s)", file=sys.stderr)

    if args.dry_run:
        print(json.dumps(final, indent=2, ensure_ascii=False))
        return 0

    output_path.write_text(
        json.dumps(final, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {output_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
