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
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
REPO_ROOT = _SCRIPT_DIR.parent.parent

from lib.d1_sources import fetch_articles_from_sql, load_hero_alts_from_sql
from lib.d1_csv import inject_image_alt
from lib.frontmatter import clean_frontmatter

DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
DEFAULT_OUT_DIR = REPO_ROOT / "src" / "data" / "articles"


def build_article_md(article_md: str, hero_alt: str | None) -> str:
    """Inject hero alt into the frontmatter, then clean. Pure function."""
    md = inject_image_alt(article_md, hero_alt) if hero_alt else article_md
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
            print(f"slug {args.slug!r} not found in write_outputs (status='reviewed')",
                  file=sys.stderr)
            return 2

    hero_alts = load_hero_alts_from_sql(args.db)

    written = 0
    skipped = 0
    for a in articles:
        slug = a["slug"]
        target = out_dir / f"{slug}.md"
        new_md = build_article_md(a["markdown"], hero_alts.get(slug))
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
