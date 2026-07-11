"""Fail closed if produced article slugs lack pin destinations in the registry.

CLI:
  python scripts/NEW_PIPELINE_2026-05-08/assert_pin_destinations.py \\
    --topics pipeline-data/produced-topics.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEST_PATH = REPO_ROOT / "pipeline-data" / "pin-destinations.json"
FLAT_PATH = REPO_ROOT / "public" / "data" / "pin-destinations-flat.json"


def normalize_slug(value: str | None) -> str:
    return str(value or "").strip().strip("/")


def load_topics(path: Path) -> list[str]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return [normalize_slug(item.get("slug")) for item in raw if isinstance(item, dict)]
    if isinstance(raw, dict) and "topics" in raw:
        return [normalize_slug(item.get("slug")) for item in raw["topics"] if isinstance(item, dict)]
    raise SystemExit(f"Unrecognized topics file shape: {path}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Assert pin destinations exist for produced slugs")
    parser.add_argument("--topics", required=True, help="JSON list of produced topics with slug fields")
    parser.add_argument("--destinations", default=str(DEST_PATH))
    parser.add_argument("--flat", default=str(FLAT_PATH))
    parser.add_argument("--min-pins", type=int, default=4)
    args = parser.parse_args(argv)

    topics_path = Path(args.topics)
    if not topics_path.exists():
        print(f"[assert_pin_destinations] missing topics file: {topics_path}", file=sys.stderr)
        return 1

    slugs = [s for s in load_topics(topics_path) if s]
    if not slugs:
        print("[assert_pin_destinations] no slugs in topics file — nothing to assert")
        return 0

    dest_path = Path(args.destinations)
    flat_path = Path(args.flat)
    if not dest_path.exists():
        print(f"[assert_pin_destinations] missing registry: {dest_path}", file=sys.stderr)
        return 1
    if not flat_path.exists():
        print(f"[assert_pin_destinations] missing flat map: {flat_path}", file=sys.stderr)
        return 1

    doc = json.loads(dest_path.read_text(encoding="utf-8"))
    flat = json.loads(flat_path.read_text(encoding="utf-8"))
    articles = doc.get("articles") or {}

    errors: list[str] = []
    for slug in slugs:
        entry = articles.get(slug)
        if not entry:
            errors.append(f"{slug}: missing from pin-destinations.json")
            continue
        pin_dests = [
            d
            for d in (entry.get("destinations") or [])
            if d.get("origin") == "pin" and normalize_slug(d.get("url_slug"))
        ]
        if len(pin_dests) < args.min_pins:
            errors.append(
                f"{slug}: expected >= {args.min_pins} pin destinations, found {len(pin_dests)}"
            )
        for d in pin_dests:
            url_slug = normalize_slug(d.get("url_slug"))
            if flat.get(url_slug) != slug:
                errors.append(
                    f"{slug}: flat map missing/wrong for '{url_slug}' (got {flat.get(url_slug)!r})"
                )

    if errors:
        print("[assert_pin_destinations] FAIL:", file=sys.stderr)
        for err in errors:
            print(f"- {err}", file=sys.stderr)
        return 1

    print(
        f"[assert_pin_destinations] OK: {len(slugs)} slug(s) have >= {args.min_pins} pin destinations in registry+flat"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
