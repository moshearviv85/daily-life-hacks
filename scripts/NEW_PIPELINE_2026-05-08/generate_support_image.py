"""Generate the mid-article support image for one deployed article.

The article page already auto-inserts /images/{slug}-ingredients.jpg when the
file exists. This script creates that image from the deployed article metadata,
without editing the article Markdown.
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Any

import yaml

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
REPO_ROOT = _SCRIPT_DIR.parent.parent
DISCOVERY_SCRIPTS = REPO_ROOT / "experiments" / "pinterest-50" / "scripts"
if str(DISCOVERY_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(DISCOVERY_SCRIPTS))

from discovery import fal_client  # noqa: E402

from lib.image_models import SUPPORT_IMAGE_MODEL_ID  # noqa: E402
from lib.image_resize import to_jpeg  # noqa: E402

ARTICLE_DIR = REPO_ROOT / "src" / "data" / "articles"
OUT_DIR = REPO_ROOT / "public" / "images"
ASPECT_RATIO = "16:9"
MAX_WIDTH = 1920
MAX_HEIGHT = 1080
JPEG_QUALITY = 85


def _frontmatter(markdown: str) -> dict[str, Any]:
    """Return YAML frontmatter from an article Markdown file."""
    lines = markdown.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("article is missing YAML frontmatter")
    end = None
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end = index
            break
    if end is None:
        raise ValueError("article frontmatter is missing closing fence")
    parsed = yaml.safe_load("\n".join(lines[1:end]))
    if not isinstance(parsed, dict):
        raise ValueError("article frontmatter is not a mapping")
    return parsed


def _clean_ingredient(value: Any) -> str:
    text = str(value).strip()
    return " ".join(text.split())


def support_prompt_from_frontmatter(frontmatter: dict[str, Any], slug: str) -> str:
    """Build a deterministic support-image prompt from article metadata."""
    title = str(frontmatter.get("title") or slug.replace("-", " ").title()).strip()
    ingredients = frontmatter.get("ingredients")
    ingredient_bits: list[str] = []
    if isinstance(ingredients, list):
        ingredient_bits = [_clean_ingredient(item) for item in ingredients[:8]]
        ingredient_bits = [item for item in ingredient_bits if item]

    if ingredient_bits:
        subject = (
            f"the main ingredients for {title}: "
            + ", ".join(ingredient_bits)
        )
    else:
        tags = frontmatter.get("tags")
        tag_bits = tags[:4] if isinstance(tags, list) else []
        tag_text = ", ".join(str(tag).strip() for tag in tag_bits if str(tag).strip())
        subject = f"a practical prep scene for {title}"
        if tag_text:
            subject += f", with visual cues for {tag_text}"

    return (
        "Bright natural-light supporting food photograph for Daily Life Hacks. "
        f"Show {subject}. "
        "Three-quarter overhead angle on a real kitchen counter, fresh colorful "
        "food, a simple pot or cutting board when relevant, clean editorial "
        "food styling, realistic textures, warm but not dark lighting. "
        "No people, no hands, no text, no labels, no brand packaging, no gloomy "
        "restaurant lighting, no artificial-looking plastic food."
    )


def load_frontmatter(slug: str, article_dir: Path = ARTICLE_DIR) -> dict[str, Any]:
    path = article_dir / f"{slug}.md"
    if not path.exists():
        raise FileNotFoundError(f"article not found: {path}")
    return _frontmatter(path.read_text(encoding="utf-8"))


def out_path_for(slug: str) -> Path:
    return OUT_DIR / f"{slug}-ingredients.jpg"


def generate_one(slug: str, *, force: bool = False, dry_run: bool = False) -> str:
    frontmatter = load_frontmatter(slug)
    prompt = support_prompt_from_frontmatter(frontmatter, slug)
    out = out_path_for(slug)
    if out.exists() and not force and not dry_run:
        return f"SKIP {slug}  (exists: {out.name})"
    if dry_run:
        return (
            f"DRY  {slug}  model={SUPPORT_IMAGE_MODEL_ID}  "
            f"({len(prompt)} chars) -> {out.relative_to(REPO_ROOT)}"
        )

    t0 = time.time()
    res = fal_client.generate(
        model_id=SUPPORT_IMAGE_MODEL_ID,
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
        f"OK   {slug}  model={SUPPORT_IMAGE_MODEL_ID}  {dt:.1f}s  "
        f"${res['cost_usd']:.3f}  {size:,}B -> {out.relative_to(REPO_ROOT)}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--slug", required=True, help="article slug")
    parser.add_argument("--force", action="store_true", help="overwrite existing image")
    parser.add_argument("--dry-run", action="store_true", help="print plan, no FAL call")
    args = parser.parse_args(argv)

    try:
        print(generate_one(args.slug, force=args.force, dry_run=args.dry_run))
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL {args.slug}  {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
