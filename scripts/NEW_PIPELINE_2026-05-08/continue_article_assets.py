"""Continue an approved article into hero image and pin assets.

This stage intentionally runs only after the article draft exists on staging
and has been approved from the dashboard. It does not rewrite the article.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
ARTICLE_DIR = REPO_ROOT / "src" / "data" / "articles"
ENV_PATH = REPO_ROOT / ".env"


def load_env() -> None:
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))


def log(message: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}", flush=True)


def run_step(label: str, cmd: list[str], *, timeout: int = 600) -> bool:
    log(f"--- {label} ---")
    log(f"  cmd: {' '.join(cmd)}")
    start = time.monotonic()
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    elapsed = time.monotonic() - start

    if result.stdout:
        for line in result.stdout.strip().splitlines():
            print(f"  {line}")
    if result.stderr:
        for line in result.stderr.strip().splitlines():
            print(f"  [err] {line}")

    if result.returncode != 0:
        log(f"  FAILED (exit {result.returncode}) in {elapsed:.1f}s")
        return False
    log(f"  OK in {elapsed:.1f}s")
    return True


def init_brief_schema(db_path: str) -> None:
    sys.path.insert(0, str(SCRIPT_DIR))
    from lib import brief_store

    con = brief_store.connect(db_path)
    try:
        brief_store.init_schema(con)
    finally:
        con.close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate image and pin assets for an approved article.")
    parser.add_argument("--slug", required=True, help="Article slug already deployed to staging.")
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--skip-images", action="store_true", help="Generate briefs only, no FAL image calls.")
    parser.add_argument("--hero-only", action="store_true", help="Regenerate only the hero brief/image and article imageAlt.")
    parser.add_argument("--support-only", action="store_true", help="Regenerate only the mid-article support image.")
    parser.add_argument("--force-images", action="store_true", help="Overwrite existing image files.")
    args = parser.parse_args(argv)

    load_env()
    if args.hero_only and args.support_only:
        log("ERROR: choose either --hero-only or --support-only, not both")
        return 1
    if not args.support_only and not os.environ.get("OPENROUTER_API_KEY"):
        log("ERROR: OPENROUTER_API_KEY not set")
        return 1
    if not args.skip_images and not os.environ.get("FAL_KEY"):
        log("ERROR: FAL_KEY not set")
        return 1

    article_path = ARTICLE_DIR / f"{args.slug}.md"
    if not article_path.exists():
        log(f"ERROR: approved article draft is missing: {article_path}")
        return 1

    py = sys.executable
    total_start = time.monotonic()
    log(f"Continuing approved article assets: {args.slug}")
    init_brief_schema(args.db)

    if args.support_only:
        steps = [(
            "Support Image",
            [
                py, str(SCRIPT_DIR / "generate_support_image.py"),
                "--slug", args.slug,
                "--force",
            ],
            300,
        )]
    else:
        hero_brief_cmd = [
            py, str(SCRIPT_DIR / "generate_hero_brief.py"),
            "--slug", args.slug,
            "--db", args.db,
        ]
        if args.force_images:
            hero_brief_cmd.append("--force")

        steps = [("Hero Brief", hero_brief_cmd, 120)]

        if not args.hero_only:
            steps.append((
                "Pin Briefs",
                [py, str(SCRIPT_DIR / "generate_pin_briefs.py"), "--slug", args.slug, "--db", args.db],
                180,
            ))

        if not args.skip_images:
            hero_image_cmd = [
                py, str(SCRIPT_DIR / "generate_images.py"),
                "--slug", args.slug,
                "--db", args.db,
            ]
            if args.force_images:
                hero_image_cmd.append("--force")
            steps.append(("Hero Image", hero_image_cmd, 300))

            if not args.hero_only:
                pin_image_cmd = [
                    py, str(SCRIPT_DIR / "generate_pin_images.py"),
                    "--slug", args.slug,
                    "--db", args.db,
                ]
                if args.force_images:
                    pin_image_cmd.append("--force")
                steps.append(("Pin Images", pin_image_cmd, 600))

        steps.append((
            "Refresh Article Markdown",
            [py, str(SCRIPT_DIR / "bulk_deploy_articles.py"), "--slug", args.slug, "--db", args.db],
            30,
        ))

    for label, cmd, timeout in steps:
        if not run_step(label, cmd, timeout=timeout):
            log(f"ASSET PIPELINE FAILED at {label}")
            return 1
        print()

    log("=" * 60)
    log(f"ARTICLE ASSETS COMPLETE: {args.slug}")
    log(f"Total time: {time.monotonic() - total_start:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
