"""
Build `pipeline-data/batch.json` from the drafts we already started.

Goal: one row per article, with columns for whatever already exists today.

By default:
- Takes the first N drafts (sorted by filename) from `pipeline-data/drafts/*.md`
- N defaults to 50 (override with --limit)

Adds:
- Agent 1-ish fields from frontmatter (title/category/excerpt)
- Draft path (Agent 2)
- Whether Pinterest copy exists in `pipeline-data/pinterest-copy-batch.json`
- Whether a v1 entry exists in `pipeline-data/pins.json`
- Whether pin images exist on disk in `public/images/pins/{slug}_v*.jpg`
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


BASE = Path(__file__).resolve().parent.parent


def parse_frontmatter(md_text: str) -> dict:
    fm: dict = {}
    lines = md_text.splitlines()
    if not lines or lines[0].strip() != "---":
        return fm

    # frontmatter block between first and second --- lines
    i = 1
    while i < len(lines):
        line = lines[i]
        if line.strip() == "---":
            break
        if ":" in line:
            k, v = line.split(":", 1)
            fm[k.strip()] = v.strip().strip('"').strip("'")
        i += 1
    return fm


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50)
    args = ap.parse_args()

    drafts_dir = BASE / "pipeline-data" / "drafts"
    pins_dir = BASE / "public" / "images" / "pins"
    out_path = BASE / "pipeline-data" / "batch.json"

    draft_files = sorted(drafts_dir.glob("*.md"))
    picked = draft_files[: max(0, args.limit)]

    copy_path = BASE / "pipeline-data" / "pinterest-copy-batch.json"
    copy = json.loads(copy_path.read_text(encoding="utf-8")) if copy_path.exists() else {}

    pins_json_path = BASE / "pipeline-data" / "pins.json"
    pins = json.loads(pins_json_path.read_text(encoding="utf-8")) if pins_json_path.exists() else []
    pins_v1_slugs = {
        p.get("slug")
        for p in pins
        if isinstance(p, dict) and p.get("slug") and int(p.get("variant") or 0) == 1
    }

    rows = []
    for idx, md_path in enumerate(picked, start=1):
        slug = md_path.stem
        md_text = md_path.read_text(encoding="utf-8")
        fm = parse_frontmatter(md_text)

        pin_imgs = sorted(p.name for p in pins_dir.glob(f"{slug}_v*.jpg"))
        variants = []
        for name in pin_imgs:
            try:
                v = int(name.rsplit("_v", 1)[1].split(".", 1)[0])
                variants.append(v)
            except Exception:
                pass
        variants = sorted(set(variants))

        has_a4 = bool(copy.get(slug))
        has_pins_json_v1 = slug in pins_v1_slugs

        rows.append(
            {
                "row": idx,
                "a1_slug": slug,
                "a1_topic": fm.get("title", ""),
                "a1_category": fm.get("category", ""),
                "a1_excerpt": fm.get("excerpt", ""),
                "a1_done": True,
                "a2_draft_path": md_path.as_posix(),
                "a2_done": True,
                "a3_done": False,
                "a4_done": has_a4,
                "a4_source": "pinterest-copy-batch.json"
                if has_a4
                else ("pins.json(v1 only)" if has_pins_json_v1 else ""),
                "a5_pin_images_found": len(pin_imgs),
                "a5_pin_variants_found": variants,
                "a5_done": len(variants) >= 4,
                "a6_done": False,
                "a7_done": False,
            }
        )

    batch = {
        "batch_created": "2026-04-09",
        "total_rows": len(rows),
        "source": "pipeline-data/drafts/*.md (sorted)",
        "rows": rows,
    }

    out_path.write_text(json.dumps(batch, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_path} with {len(rows)} rows")


if __name__ == "__main__":
    main()

