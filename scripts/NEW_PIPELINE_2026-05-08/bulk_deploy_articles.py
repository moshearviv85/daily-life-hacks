"""One-shot bulk deploy of every article in write_outputs (status='written')
to src/data/articles/{slug}.md. Hero alt from hero_briefs is injected into
the frontmatter (replacing whatever stale imageAlt the writer left).

Use this when a batch of articles is ready and you want to bypass the
2/day publish-articles.py cron cap. After running, git add + commit + push
to trigger Cloudflare Pages build.

CLI:
    python scripts/bulk_deploy_articles.py
    python scripts/bulk_deploy_articles.py --dry-run
    python scripts/bulk_deploy_articles.py --slug <one-slug>
    python scripts/bulk_deploy_articles.py --out-dir /path/to/articles
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
REPO_ROOT = _SCRIPT_DIR.parent.parent

from lib.d1_sources import fetch_articles_from_sql, load_hero_alts_from_sql
from lib.d1_csv import inject_image_alt
from lib.frontmatter import clean_frontmatter
from lib.validator import validate

DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
DEFAULT_OUT_DIR = REPO_ROOT / "src" / "data" / "articles"

_TITLE_LINE_RE = re.compile(r'^title:\s*(.+?)\s*$', re.MULTILINE)
_IMAGE_ALT_LINE_RE = re.compile(r'^imageAlt:\s*(.*?)\s*$', re.MULTILINE)


def _clean_yaml_scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1].strip()
    return value


def _frontmatter_value(markdown: str, pattern: re.Pattern[str]) -> str:
    match = pattern.search(markdown)
    return _clean_yaml_scalar(match.group(1)) if match else ""


def _valid_image_alt(value: str) -> bool:
    return 30 <= len(value.strip()) <= 200


def _draft_image_alt(markdown: str) -> str:
    title = _frontmatter_value(markdown, _TITLE_LINE_RE) or "this article"
    alt = f"Draft image placeholder for {title} article hero image"
    if len(alt) > 200:
        alt = alt[:197].rstrip() + "..."
    return alt


def _deploy_image_alt(article_md: str, hero_alt: str | None) -> str | None:
    if hero_alt:
        return hero_alt
    existing = _frontmatter_value(article_md, _IMAGE_ALT_LINE_RE)
    if _valid_image_alt(existing):
        return None
    return _draft_image_alt(article_md)


def _article_from_disk(slug: str, out_dir: Path) -> dict | None:
    path = out_dir / f"{slug}.md"
    if not path.exists():
        return None
    markdown = path.read_text(encoding="utf-8")
    title = _frontmatter_value(markdown, _TITLE_LINE_RE)
    return {
        "slug": slug,
        "title": title,
        "category": "",
        "markdown": markdown,
        "image_filename": f"{slug}-main.jpg",
    }


def build_article_md(article_md: str, hero_alt: str | None) -> str:
    """Inject hero alt into the frontmatter, then clean. Pure function."""
    deploy_alt = _deploy_image_alt(article_md, hero_alt)
    md = inject_image_alt(article_md, deploy_alt) if deploy_alt else article_md
    return clean_frontmatter(md)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--db", default=str(DEFAULT_DB))
    p.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))
    p.add_argument("--slug", help="deploy only this slug, not the whole batch")
    p.add_argument("--dry-run", action="store_true",
                   help="print plan, do not write to disk")
    args = p.parse_args(argv)

    out_dir = Path(args.out_dir)
    articles = fetch_articles_from_sql(args.db)
    if args.slug:
        articles = [a for a in articles if a["slug"] == args.slug]
        if not articles:
            disk_article = _article_from_disk(args.slug, out_dir)
            if disk_article:
                articles = [disk_article]
            else:
                print(f"slug {args.slug!r} not found in write_outputs or {out_dir}",
                      file=sys.stderr)
                return 2

    hero_alts = load_hero_alts_from_sql(args.db)

    written = 0
    skipped = 0
    for a in articles:
        slug = a["slug"]
        target = out_dir / f"{slug}.md"
        new_md = build_article_md(a["markdown"], hero_alts.get(slug))
        tier1 = [
            v for v in validate(new_md, context="article", slug=slug)
            if v.tier == 1
        ]
        if tier1:
            print(
                f"slug {slug!r} failed final article validation: "
                + ", ".join(f"{v.rule_id}: {v.detail}" for v in tier1),
                file=sys.stderr,
            )
            return 1
        if args.dry_run:
            existed = "exists" if target.exists() else "new"
            alt_note = "with-hero-alt" if hero_alts.get(slug) else "no-hero-alt"
            try:
                rel = target.relative_to(REPO_ROOT)
            except ValueError:
                rel = target
            print(f"DRY  {slug}  ({existed}, {alt_note})  -> {rel}")
            continue
        out_dir.mkdir(parents=True, exist_ok=True)
        target.write_text(new_md, encoding="utf-8")
        written += 1

    if args.dry_run:
        print(f"DRY RUN. would deploy {len(articles)} article(s) to {out_dir}")
        return 0

    print(f"deployed {written} article(s) to {out_dir} (skipped={skipped})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
