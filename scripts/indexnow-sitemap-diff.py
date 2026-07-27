"""Diff a freshly built sitemap against the previous run's snapshot.

Why this exists alongside `notify-indexnow.py`:

`notify-indexnow.py` derives candidates from a *Git range*. That is correct for
a normal push, but it loses URLs in three situations this repo actually hits:

1. Scheduled rebuilds. Articles carrying a future `publishAt` enter the sitemap
   on a later daily rebuild with no commit behind them, so a Git diff finds
   nothing and they are never submitted.
2. Failed deploys. If the build fails, the deploy workflow never reaches its
   IndexNow step. The next push starts its diff *after* those commits, so the
   URLs from the failed push are silently lost forever.
3. Force-pushes and merges, where `github.event.before` is not a useful base.

This script is state-based instead of event-based: it compares the sitemap this
build produced against a snapshot of the last sitemap that was successfully
processed. Anything new, or whose `lastmod` moved, is a candidate. Nothing can
be lost by a failed run, because the snapshot is only advanced after success.

It does not talk to IndexNow. It prints absolute canonical URLs, one per line,
to be handed to `notify-indexnow.py --urls`, which remains the single audited
submission path (sitemap allowlist, canonicalisation, HTTP logging).

Cold start (no previous snapshot) writes the snapshot and emits nothing, so a
lost cache can never cause a full-site resubmission.

Examples:
  py -3 scripts/indexnow-sitemap-diff.py --sitemap-dir dist \
      --snapshot .indexnow/sitemap-snapshot.json --output changed-urls.txt
"""

from __future__ import annotations

import argparse
import json
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.daily-life-hacks.com"

# A single build should never legitimately change this many URLs. If it does,
# something structural moved (a template touched every page, or the snapshot is
# stale) and blasting the whole site at IndexNow would be a spam signal rather
# than a useful notification. Fail loudly and let a human decide.
DEFAULT_MAX_URLS = 60


def read_sitemap(sitemap_dir: Path) -> dict[str, str]:
    """Return {url: lastmod} for every URL-set entry, following the index."""
    sitemap_files = sorted(sitemap_dir.glob("sitemap*.xml"))
    if not sitemap_files:
        raise FileNotFoundError(f"No sitemap XML files found in {sitemap_dir}")

    entries: dict[str, str] = {}
    for sitemap_file in sitemap_files:
        root = ET.parse(sitemap_file).getroot()
        # Skip the <sitemapindex>; its children are the files already globbed.
        if not root.tag.endswith("urlset"):
            continue
        for url_node in root:
            if not url_node.tag.endswith("url"):
                continue
            loc = lastmod = None
            for child in url_node:
                if child.tag.endswith("loc"):
                    loc = (child.text or "").strip()
                elif child.tag.endswith("lastmod"):
                    lastmod = (child.text or "").strip()
            if not loc or not loc.startswith(f"{SITE}/"):
                continue
            entries[loc] = lastmod or ""

    if not entries:
        raise RuntimeError(f"No canonical URLs found in {sitemap_dir}")
    return entries


def load_snapshot(path: Path) -> dict[str, str] | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    urls = data.get("urls")
    return urls if isinstance(urls, dict) else None


def write_snapshot(path: Path, entries: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "count": len(entries),
                "urls": entries,
            },
            indent=1,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


def diff(previous: dict[str, str], current: dict[str, str]) -> dict[str, list[str]]:
    added = sorted(u for u in current if u not in previous)
    changed = sorted(
        u for u in current if u in previous and current[u] and current[u] != previous[u]
    )
    removed = sorted(u for u in previous if u not in current)
    return {"added": added, "changed": changed, "removed": removed}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sitemap-dir", type=Path, default=REPO_ROOT / "dist")
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=REPO_ROOT / ".indexnow" / "sitemap-snapshot.json",
        help="Snapshot of the last processed sitemap.",
    )
    parser.add_argument("--output", type=Path, help="Write candidate URLs here, one per line.")
    parser.add_argument("--log-file", type=Path, help="Write the full diff as JSON.")
    parser.add_argument("--max-urls", type=int, default=DEFAULT_MAX_URLS)
    parser.add_argument(
        "--write-snapshot",
        action="store_true",
        help="Advance the snapshot. Omit to inspect a diff without consuming it.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        current = read_sitemap(args.sitemap_dir)
    except (FileNotFoundError, RuntimeError, ET.ParseError) as error:
        print(f"Sitemap diff failed closed: {error}", file=sys.stderr)
        return 1

    previous = load_snapshot(args.snapshot)
    cold_start = previous is None

    if cold_start:
        result = {"added": [], "changed": [], "removed": []}
        candidates: list[str] = []
        print(
            f"Cold start: seeding snapshot with {len(current)} URLs, submitting none.",
            file=sys.stderr,
        )
    else:
        result = diff(previous, current)
        candidates = sorted(set(result["added"]) | set(result["changed"]))

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cold_start": cold_start,
        "sitemap_url_count": len(current),
        "previous_url_count": 0 if previous is None else len(previous),
        "candidate_urls": candidates,
        **result,
    }

    if args.log_file:
        args.log_file.parent.mkdir(parents=True, exist_ok=True)
        args.log_file.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"Sitemap URLs: {len(current)}")
    print(f"Added: {len(result['added'])}  Changed: {len(result['changed'])}  Removed: {len(result['removed'])}")
    for url in candidates:
        print(f"  {url}")

    if len(candidates) > args.max_urls:
        print(
            f"Refusing to submit {len(candidates)} URLs (limit {args.max_urls}). "
            "The snapshot is stale or a sitewide template changed. "
            "Review, then re-run with a higher --max-urls if this is intended.",
            file=sys.stderr,
        )
        return 1

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text("\n".join(candidates) + ("\n" if candidates else ""), encoding="utf-8")

    if args.write_snapshot:
        write_snapshot(args.snapshot, current)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
