"""One-time migration: pipeline-data/{hero,pin}-briefs.jsonl into the
hero_briefs and pin_briefs tables of topic-research.sqlite.

Idempotent: re-running produces the same final state because brief_store
upserts on (article_slug) for hero and (article_slug, pin_index) for pin.

If the source JSONL has duplicate article_slugs (the 51-vs-50 case for
hero), last-write-wins, with a warning printed naming the dup slug(s).

Usage:
    python scripts/migrate_briefs_to_sql.py
    python scripts/migrate_briefs_to_sql.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from scripts.lib import brief_store

DEFAULT_HERO_JSONL = REPO_ROOT / "pipeline-data" / "hero-briefs.jsonl"
DEFAULT_PIN_JSONL = REPO_ROOT / "pipeline-data" / "pin-briefs.jsonl"
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"


def _load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def migrate_hero_briefs(con, records: list[dict]) -> dict:
    """Returns {processed, dups: list[str]}."""
    slugs = [r["article_slug"] for r in records]
    dups = [s for s, c in Counter(slugs).items() if c > 1]
    for r in records:
        brief_store.upsert_hero_brief(
            con,
            article_slug=r["article_slug"],
            prompt=r["prompt"],
            alt=r.get("alt"),
        )
    return {"processed": len(records), "dups": sorted(dups)}


def migrate_pin_briefs(con, records: list[dict]) -> dict:
    """Returns {articles, total_pins}."""
    total_pins = 0
    for r in records:
        slug = r["article_slug"]
        for idx, pin in enumerate(r["pins"]):
            brief_store.upsert_pin_brief(
                con,
                article_slug=slug,
                pin_index=idx,
                pin_slug=pin.get("slug"),
                title=pin["title"],
                description=pin["description"],
                prompt=pin["prompt"],
                alt=pin.get("alt"),
            )
            total_pins += 1
    return {"articles": len(records), "total_pins": total_pins}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", type=Path, default=DEFAULT_DB)
    p.add_argument("--hero-jsonl", type=Path, default=DEFAULT_HERO_JSONL)
    p.add_argument("--pin-jsonl", type=Path, default=DEFAULT_PIN_JSONL)
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    hero_records = _load_jsonl(args.hero_jsonl)
    pin_records = _load_jsonl(args.pin_jsonl)

    print(f"hero JSONL: {args.hero_jsonl} -> {len(hero_records)} records")
    print(f"pin  JSONL: {args.pin_jsonl} -> {len(pin_records)} records")

    if args.dry_run:
        slugs = [r["article_slug"] for r in hero_records]
        dups = [s for s, c in Counter(slugs).items() if c > 1]
        total_pins = sum(len(r["pins"]) for r in pin_records)
        print(f"DRY RUN. would write {len(hero_records)} hero, {total_pins} pins")
        if dups:
            print(f"DRY RUN. hero dups (last-write-wins): {dups}")
        return 0

    con = brief_store.connect(args.db)
    try:
        brief_store.init_schema(con)
        h = migrate_hero_briefs(con, hero_records)
        p = migrate_pin_briefs(con, pin_records)
    finally:
        con.close()

    print(f"hero: processed={h['processed']}")
    if h["dups"]:
        print(f"  warning: dup slugs (last-write-wins): {h['dups']}")
    print(f"pin:  articles={p['articles']}, total_pins={p['total_pins']}")

    con = brief_store.connect(args.db)
    try:
        s = brief_store.coverage_summary(con)
    finally:
        con.close()
    print(f"after migration: {s}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
