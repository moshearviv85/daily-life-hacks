"""Fail the pipeline when D1 status would not match real staging artifacts.

This script verifies the artifacts produced for reviewed pipeline articles:
- src/data/articles/{slug}.md exists
- public/images/{slug}-main.jpg exists
- public/images/{slug}-ingredients.jpg exists
- SQLite has exactly four OK pin briefs
- every OK pin brief has public/images/pins/{pin_slug}.jpg

It is intentionally local-file based. If an article is going to be marked
deployed, the files must exist in the branch before we sync status to D1.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
DEFAULT_ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"
DEFAULT_HERO_DIR = REPO_ROOT / "public" / "images"
DEFAULT_PIN_DIR = REPO_ROOT / "public" / "images" / "pins"


@dataclass
class ArtifactCheck:
    slug: str
    ok: bool
    errors: list[str]


def slug_from_topic(topic: str) -> str:
    s = topic.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s[:80]


def _table_exists(con: sqlite3.Connection, table: str) -> bool:
    row = con.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return row is not None


def _reviewed_slugs(db_path: Path) -> list[str]:
    con = sqlite3.connect(str(db_path))
    try:
        if not _table_exists(con, "write_outputs"):
            return []
        rows = con.execute(
            "SELECT slug FROM write_outputs "
            "WHERE status = 'reviewed' AND COALESCE(disqualified, 0) = 0 "
            "ORDER BY slug"
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        con.close()


def _pin_slugs(con: sqlite3.Connection, slug: str) -> list[str]:
    if not _table_exists(con, "pin_briefs"):
        return []
    rows = con.execute(
        "SELECT pin_slug FROM pin_briefs "
        "WHERE article_slug = ? AND status = 'ok' "
        "ORDER BY pin_index",
        (slug,),
    ).fetchall()
    return [r[0] for r in rows if r[0]]


def _has_ok_row(con: sqlite3.Connection, table: str, slug_column: str, slug: str) -> bool:
    if not _table_exists(con, table):
        return False
    row = con.execute(
        f"SELECT 1 FROM {table} WHERE {slug_column} = ? AND status = 'ok' LIMIT 1",
        (slug,),
    ).fetchone()
    return row is not None


def _has_article_markdown(slug: str, articles_dir: Path) -> bool:
    return (articles_dir / f"{slug}.md").exists()


def verify_slug(
    slug: str,
    *,
    db_path: Path = DEFAULT_DB,
    articles_dir: Path = DEFAULT_ARTICLES_DIR,
    hero_dir: Path = DEFAULT_HERO_DIR,
    pin_dir: Path = DEFAULT_PIN_DIR,
    article_only: bool = False,
    hero_only: bool = False,
    support_only: bool = False,
) -> ArtifactCheck:
    errors: list[str] = []

    article_exists = _has_article_markdown(slug, articles_dir)
    if not article_exists:
        errors.append(f"missing article markdown: {articles_dir / f'{slug}.md'}")

    con = sqlite3.connect(str(db_path))
    try:
        if not article_exists and not _has_ok_row(con, "review_outputs", "slug", slug):
            errors.append("missing OK review output")

        if article_only:
            return ArtifactCheck(slug=slug, ok=not errors, errors=errors)

        if support_only:
            if not (hero_dir / f"{slug}-ingredients.jpg").exists():
                errors.append(f"missing support image: {hero_dir / f'{slug}-ingredients.jpg'}")
            return ArtifactCheck(slug=slug, ok=not errors, errors=errors)

        if not (hero_dir / f"{slug}-main.jpg").exists():
            errors.append(f"missing hero image: {hero_dir / f'{slug}-main.jpg'}")
        if not _has_ok_row(con, "hero_briefs", "article_slug", slug):
            errors.append("missing OK hero brief")

        if hero_only:
            return ArtifactCheck(slug=slug, ok=not errors, errors=errors)

        if not (hero_dir / f"{slug}-ingredients.jpg").exists():
            errors.append(f"missing support image: {hero_dir / f'{slug}-ingredients.jpg'}")

        pin_slugs = _pin_slugs(con, slug)
        if len(pin_slugs) != 4:
            errors.append(f"expected 4 OK pin briefs, found {len(pin_slugs)}")
        for pin_slug in pin_slugs:
            if not (pin_dir / f"{pin_slug}.jpg").exists():
                errors.append(f"missing pin image: {pin_dir / f'{pin_slug}.jpg'}")
    finally:
        con.close()

    return ArtifactCheck(slug=slug, ok=not errors, errors=errors)


def slugs_from_selected_topics(path: Path) -> list[str]:
    topics = json.loads(path.read_text(encoding="utf-8"))
    return [slug_from_topic(t["topic"]) for t in topics if t.get("topic")]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify generated pipeline artifacts before D1 sync.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--slug", action="append", default=[], help="Article slug to verify. May be repeated.")
    parser.add_argument("--selected-topics", type=Path, help="JSON file from pipeline-data/selected-topics.json")
    parser.add_argument("--all-reviewed", action="store_true", help="Verify every reviewed article in SQLite.")
    parser.add_argument("--article-only", action="store_true", help="Verify article draft artifacts only; images and pin briefs must not be required.")
    parser.add_argument("--hero-only", action="store_true", help="Verify article and hero artifacts only; pin briefs/images must not be required.")
    parser.add_argument("--support-only", action="store_true", help="Verify article and support image artifacts only; hero/pin artifacts must not be required.")
    parser.add_argument("--report", type=Path, help="Optional JSON report path to write.")
    args = parser.parse_args(argv)

    slugs = list(args.slug)
    if args.selected_topics:
        slugs.extend(slugs_from_selected_topics(args.selected_topics))
    if args.all_reviewed:
        slugs.extend(_reviewed_slugs(args.db))
    slugs = sorted(set(slugs))

    if not slugs:
        print("No slugs selected for artifact verification.", file=sys.stderr)
        return 1

    checks = [
        verify_slug(
            slug,
            db_path=args.db,
            article_only=args.article_only,
            hero_only=args.hero_only,
            support_only=args.support_only,
        )
        for slug in slugs
    ]
    failed = [check for check in checks if not check.ok]

    for check in checks:
        status = "OK" if check.ok else "FAIL"
        print(f"{status} {check.slug}")
        for error in check.errors:
            print(f"  - {error}")

    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(
            json.dumps(
                {
                    "ok": not failed,
                    "article_only": args.article_only,
                    "hero_only": args.hero_only,
                    "support_only": args.support_only,
                    "checks": [
                        {
                            "slug": check.slug,
                            "ok": check.ok,
                            "errors": check.errors,
                        }
                        for check in checks
                    ],
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
