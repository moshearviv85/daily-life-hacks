"""Sync pin_briefs into pin-destinations.json and derive routing artifacts.

Single source of truth updater for Checkpoint 2.

CLI:
    python scripts/NEW_PIPELINE_2026-05-08/sync_pin_destinations.py
    python scripts/NEW_PIPELINE_2026-05-08/sync_pin_destinations.py --dry-run
    python scripts/NEW_PIPELINE_2026-05-08/sync_pin_destinations.py --only-complete
    python scripts/NEW_PIPELINE_2026-05-08/sync_pin_destinations.py --article-slug my-slug
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
DEST_PATH = REPO_ROOT / "pipeline-data" / "pin-destinations.json"
ALIASES_PATH = REPO_ROOT / "pipeline-data" / "slug-aliases.json"
MAPPING_PATH = REPO_ROOT / "pipeline-data" / "router-mapping.json"
FLAT_PATH = REPO_ROOT / "public" / "data" / "pin-destinations-flat.json"
ARTICLES_DIR = REPO_ROOT / "src" / "data" / "articles"


def normalize_slug(value: str | None) -> str:
    return str(value or "").strip().strip("/")


def list_article_ids() -> set[str]:
    if not ARTICLES_DIR.exists():
        return set()
    return {p.stem for p in ARTICLES_DIR.glob("*.md")}


def load_destinations(path: Path) -> dict:
    if not path.exists():
        return {"version": 1, "updatedAt": None, "articles": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def ensure_article(doc: dict, canonical: str) -> dict:
    articles = doc.setdefault("articles", {})
    if canonical not in articles:
        articles[canonical] = {"canonical": canonical, "destinations": []}
    return articles[canonical]


def upsert_pin_destination(entry: dict, *, url_slug: str, title: str, pin_index: int, created_at: str | None) -> bool:
    """Insert or update a pin-origin destination. Returns True if changed."""
    dests = entry["destinations"]
    for d in dests:
        if d.get("url_slug") == url_slug:
            changed = False
            if d.get("origin") != "pin":
                d["origin"] = "pin"
                changed = True
            if title and d.get("title") != title:
                d["title"] = title
                changed = True
            want_id = f"v{pin_index}"
            if d.get("id") != want_id and str(d.get("id", "")).startswith("legacy"):
                d["id"] = want_id
                changed = True
            return changed

    dests.append(
        {
            "id": f"v{pin_index}",
            "url_slug": url_slug,
            "title": title or "",
            "origin": "pin",
            "created_at": created_at,
        }
    )
    return True


def read_pin_briefs(
    db_path: Path,
    *,
    only_complete: bool,
    article_slug: str | None,
) -> list[sqlite3.Row]:
    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row

    complete_slugs = None
    if only_complete:
        rows = con.execute(
            """
            SELECT article_slug
            FROM pin_briefs
            WHERE status = 'ok'
            GROUP BY article_slug
            HAVING COUNT(*) = 4
            """
        ).fetchall()
        complete_slugs = {r["article_slug"] for r in rows}

    sql = """
        SELECT article_slug, pin_index, pin_slug, title, created_at
        FROM pin_briefs
        WHERE status = 'ok'
        ORDER BY article_slug, pin_index
    """
    rows = con.execute(sql).fetchall()
    con.close()

    out = []
    for r in rows:
        slug = r["article_slug"]
        if article_slug and slug != article_slug:
            continue
        if complete_slugs is not None and slug not in complete_slugs:
            continue
        out.append(r)
    return out


def derive_artifacts(doc: dict) -> dict[str, int]:
    aliases: dict[str, str] = {}
    mapping: dict[str, dict] = {}
    flat: dict[str, str] = {}

    for canonical_raw, entry in (doc.get("articles") or {}).items():
        canonical = normalize_slug(entry.get("canonical") or canonical_raw)
        if not canonical:
            continue

        pin_variants: dict[str, dict] = {}
        pin_idx = 0
        for dest in entry.get("destinations") or []:
            url_slug = normalize_slug(dest.get("url_slug"))
            if not url_slug or url_slug == canonical:
                continue
            aliases[url_slug] = canonical
            flat[url_slug] = canonical
            if dest.get("origin") == "pin":
                pin_idx += 1
                dest_id = str(dest.get("id") or f"v{pin_idx}").lower()
                if not dest_id.startswith("v"):
                    dest_id = f"v{pin_idx}"
                pin_variants[dest_id] = {
                    "url_slug": url_slug,
                    "title": dest.get("title") or "",
                    "created_at": dest.get("created_at"),
                }

        if pin_variants:
            mapping[canonical] = pin_variants

    aliases_sorted = dict(sorted(aliases.items()))
    mapping_sorted = dict(sorted(mapping.items()))
    flat_sorted = dict(sorted(flat.items()))

    ALIASES_PATH.write_text(json.dumps(aliases_sorted, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    MAPPING_PATH.write_text(json.dumps(mapping_sorted, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    FLAT_PATH.parent.mkdir(parents=True, exist_ok=True)
    FLAT_PATH.write_text(json.dumps(flat_sorted, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return {
        "aliases": len(aliases_sorted),
        "routerBases": len(mapping_sorted),
        "flat": len(flat_sorted),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sync pin destinations registry")
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--output", default=str(DEST_PATH))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only-complete", action="store_true")
    parser.add_argument("--article-slug", default=None)
    parser.add_argument(
        "--derive-only",
        action="store_true",
        help="Only rewrite derived artifacts from existing pin-destinations.json",
    )
    args = parser.parse_args(argv)

    output_path = Path(args.output)
    doc = load_destinations(output_path)
    article_ids = list_article_ids()
    changed = 0

    if not args.derive_only:
        db_path = Path(args.db)
        if not db_path.exists():
            print(f"[sync_pin_destinations] DB missing: {db_path} — derive-only mode", file=sys.stderr)
            args.derive_only = True
        else:
            rows = read_pin_briefs(
                db_path,
                only_complete=args.only_complete,
                article_slug=args.article_slug,
            )
            print(f"[sync_pin_destinations] Loaded {len(rows)} pin_brief row(s)", file=sys.stderr)
            for r in rows:
                canonical = normalize_slug(r["article_slug"])
                url_slug = normalize_slug(r["pin_slug"])
                if not canonical or not url_slug:
                    continue
                if article_ids and canonical not in article_ids:
                    print(
                        f"[sync_pin_destinations] skip unknown article: {canonical}",
                        file=sys.stderr,
                    )
                    continue
                entry = ensure_article(doc, canonical)
                if upsert_pin_destination(
                    entry,
                    url_slug=url_slug,
                    title=r["title"] or "",
                    pin_index=int(r["pin_index"] or 1),
                    created_at=r["created_at"],
                ):
                    changed += 1

            for entry in doc.get("articles", {}).values():
                entry["destinations"] = sorted(
                    entry.get("destinations") or [],
                    key=lambda d: d.get("url_slug") or "",
                )

            doc["version"] = 1
            doc["updatedAt"] = datetime.now(timezone.utc).isoformat()
            doc["articles"] = dict(sorted((doc.get("articles") or {}).items()))

    if args.dry_run:
        dest_total = sum(len(a.get("destinations") or []) for a in (doc.get("articles") or {}).values())
        print(
            json.dumps(
                {
                    "articles": len(doc.get("articles") or {}),
                    "destinations": dest_total,
                    "upserts": changed,
                },
                indent=2,
            )
        )
        return 0

    if not args.derive_only:
        output_path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"[sync_pin_destinations] Wrote {output_path} (upserts={changed})", file=sys.stderr)

    derived = derive_artifacts(doc if not args.derive_only else load_destinations(output_path))
    print(f"[sync_pin_destinations] Derived {derived}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
