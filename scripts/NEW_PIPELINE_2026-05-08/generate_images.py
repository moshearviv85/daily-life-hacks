"""Generate hero images from hero_briefs SQL table via the configured hero model.

Reads each row's `prompt` verbatim and sends it to FAL. Output:
public/images/{slug}-main.jpg.

CLI:
    python scripts/generate_images.py --slug <article-slug>
    python scripts/generate_images.py --all
    python scripts/generate_images.py --slug <slug> --force
    python scripts/generate_images.py --slug <slug> --dry-run
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
REPO_ROOT = _SCRIPT_DIR.parent.parent
DISCOVERY_SCRIPTS = REPO_ROOT / "experiments" / "pinterest-50" / "scripts"
if str(DISCOVERY_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(DISCOVERY_SCRIPTS))

from discovery import fal_client  # noqa: E402

from lib.image_resize import to_jpeg  # noqa: E402
from lib import brief_store  # noqa: E402
from lib.image_models import HERO_IMAGE_MODEL_ID  # noqa: E402

DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
OUT_DIR = REPO_ROOT / "public" / "images"
MODEL_ID = HERO_IMAGE_MODEL_ID
ASPECT_RATIO = "16:9"
MAX_WIDTH = 1920
MAX_HEIGHT = 1080
JPEG_QUALITY = 85


def load_briefs(db_path: Path | str = DEFAULT_DB) -> dict[str, dict]:
    """Read hero_briefs (status='ok') as {slug: {prompt, alt}}."""
    con = brief_store.connect(db_path)
    try:
        rows = con.execute(
            "SELECT article_slug, prompt, alt FROM hero_briefs WHERE status='ok'"
        ).fetchall()
        return {r["article_slug"]: {"prompt": r["prompt"], "alt": r["alt"]} for r in rows}
    finally:
        con.close()


def out_path_for(slug: str) -> Path:
    return OUT_DIR / f"{slug}-main.jpg"


def generate_one(slug: str, prompt: str, *, force: bool, dry_run: bool) -> str:
    out = out_path_for(slug)
    if out.exists() and not force and not dry_run:
        return f"SKIP {slug}  (exists: {out.name})"
    if dry_run:
        return (
            f"DRY  {slug}  model={MODEL_ID}  "
            f"({len(prompt)} chars) -> {out.relative_to(REPO_ROOT)}"
        )
    t0 = time.time()
    res = fal_client.generate(
        model_id=MODEL_ID,
        prompt=prompt,
        aspect_ratio=ASPECT_RATIO,
    )
    jpeg_bytes = to_jpeg(
        res["image_bytes"],
        max_width=MAX_WIDTH,
        max_height=MAX_HEIGHT,
        quality=JPEG_QUALITY,
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(jpeg_bytes)
    dt = time.time() - t0
    size = out.stat().st_size if out.exists() else 0
    return (
        f"OK   {slug}  model={MODEL_ID}  {dt:.1f}s  ${res['cost_usd']:.3f}  "
        f"{size:,}B -> {out.relative_to(REPO_ROOT)}"
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--slug", help="single article slug to generate")
    g.add_argument("--all", action="store_true", help="every hero_briefs row (status=ok)")
    ap.add_argument("--force", action="store_true", help="overwrite existing image")
    ap.add_argument("--dry-run", action="store_true", help="print plan, no FAL call")
    ap.add_argument("--db", default=str(DEFAULT_DB), help="SQLite DB path")
    args = ap.parse_args(argv)

    briefs = load_briefs(args.db)
    if args.slug:
        if args.slug not in briefs:
            print(
                f"ERR  no hero_briefs row for slug {args.slug!r}. "
                f"Run scripts/generate_hero_brief.py --slug {args.slug} first.",
                file=sys.stderr,
            )
            return 2
        slugs = [args.slug]
    else:
        slugs = sorted(briefs.keys())

    rc = 0
    for s in slugs:
        try:
            print(generate_one(s, briefs[s]["prompt"], force=args.force, dry_run=args.dry_run))
        except Exception as exc:  # noqa: BLE001
            print(f"FAIL {s}  {type(exc).__name__}: {exc}", file=sys.stderr)
            rc = 2
    return rc


if __name__ == "__main__":
    sys.exit(main())
