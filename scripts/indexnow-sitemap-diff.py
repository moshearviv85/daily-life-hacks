"""Diff a freshly built site against the last submitted IndexNow snapshot.

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

This script is state-based instead of event-based. It compares the site this
build produced against a snapshot of the last build that was successfully
processed. A URL is a candidate when it is new, its main-content sha256 changed, or its
sitemap `lastmod` moved forward. A `dateModified` that only moved backward
(a restored older day, as #252 did) is not a change: the content hash is the
source of truth. Removed sitemap URLs (gone, noindex, 410) and the source
paths of new `dist/_redirects` lines are candidates too.

`lastmod` is day-granular, so same-day body edits are detected from a hash of
the rendered page, from the H1 (or the hero caption / article wrapper just
above it) through the end of `<main>`, with Keep Reading, build hashes, nonces,
and publish dates stripped. Link-only Keep Reading changes do not hash as a
content edit.

It does not talk to IndexNow. It prints absolute URLs, one per line, to be
handed to `notify-indexnow.py --urls`, which remains the single submission
path (canonicalisation, sitemap / redirect / removed checks, HTTP logging).

At most `--max-urls` (default 60) are emitted for this run. The rest are
written to the queue file and drained on the next run, highest priority first:
added, then hash-changed, then a forward lastmod move, then removed and redirected
together. The snapshot and the queue advance together only after
`--write-snapshot`, which the workflow runs once submission has succeeded.

Cold start (no previous snapshot) writes the snapshot and emits nothing, so a
lost cache can never cause a full-site resubmission.

A legacy snapshot (lastmod strings, no sha256) keeps those days and fills in
hashes from `--baseline`. The committed baseline is the last build IndexNow
actually submitted, so the first run after this change submits pages whose
content changed since then. A later backward dateModified does not, by itself,
put a page back on the list.

Examples:
  py -3 scripts/indexnow-sitemap-diff.py --sitemap-dir dist \
      --snapshot .indexnow/sitemap-snapshot.json \
      --queue .indexnow/queue.json \
      --output changed-urls.txt --reasons changed-urls.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

REPO_ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.daily-life-hacks.com"
HOST = "www.daily-life-hacks.com"
DEFAULT_MAX_URLS = 60
FILE_SUFFIXES = (".xml", ".json", ".txt")

# Added pages first, then real body edits, then a lastmod-only move, then URLs
# that left the sitemap or gained a redirect. Same-priority URLs sort by URL
# so a queued remainder is stable across runs.
REASON_PRIORITY = {
    "added": 0,
    "hash-changed": 1,
    "lastmod": 2,
    "removed": 3,
    "redirected": 3,
}

_MAIN_RE = re.compile(r"<main\b[^>]*>(.*)</main>", re.IGNORECASE | re.DOTALL)
_KEEP_READING_RE = re.compile(
    r'<section\b[^>]*\baria-label="Related articles"[^>]*>.*?</section>',
    re.IGNORECASE | re.DOTALL,
)
_START_RE = re.compile(r"<h1\b|<article\b|<figcaption\b", re.IGNORECASE)
_TIME_RE = re.compile(r"<time\b[^>]*>.*?</time>", re.IGNORECASE | re.DOTALL)
_NONCE_RE = re.compile(r"""\snonce=(['"]).*?\1""", re.IGNORECASE)
_DATETIME_ATTR_RE = re.compile(r"""\sdatetime=(['"]).*?\1""", re.IGNORECASE)
_INTEGRITY_RE = re.compile(r"""\sintegrity=(['"]).*?\1""", re.IGNORECASE)
_ASTRO_CID_RE = re.compile(r"""\sdata-astro-cid-[a-z0-9]+(?:=(['"]).*?\1)?""", re.IGNORECASE)
_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
_BUILD_HASH_RE = re.compile(
    r"(/_astro/[^\"'?\s]+?)\.[A-Za-z0-9_-]{6,}"
    r"(\.(?:css|js|mjs|map|woff2?|png|jpe?g|webp|avif|gif|svg))",
    re.IGNORECASE,
)
_ASSET_QUERY_RE = re.compile(
    r"((?:/_astro/|_image/|/images/)[^\"'\s>]+)\?[^\"'\s>]*",
    re.IGNORECASE,
)
_PUBLISHED_RE = re.compile(r"\b(?:Published|Updated)\b[^<]{0,60}", re.IGNORECASE)
_WS_RE = re.compile(r"\s+")


def canonicalize_url(value: str) -> str | None:
    """Return the site's canonical URL, or None when the value is not one."""
    value = value.strip()
    if not value or "*" in value or "?" in value or "#" in value:
        return None

    if value.startswith("/"):
        path = value
    else:
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or parsed.netloc.lower() != HOST:
            return None
        if parsed.query or parsed.fragment:
            return None
        path = parsed.path

    path = "/" + path.strip("/")
    if path != "/" and not path.lower().endswith(FILE_SUFFIXES):
        path += "/"
    return f"{SITE}{path if path != '//' else '/'}"


def html_path_for_url(dist_dir: Path, url: str) -> Path:
    path = urlsplit(url).path
    if path in {"", "/"}:
        return dist_dir / "index.html"
    return dist_dir / path.strip("/") / "index.html"


def content_hash_html(html: str) -> str:
    """Hash the rendered main content, ignoring chrome that is not the article.

    The window starts at the first H1, article wrapper, or hero figcaption
    inside `<main>` (whichever comes first) and stops before Keep Reading.
    Publish dates, CSP nonces, and hashed build asset names are stripped so a
    rebuild of the same article does not look like an edit.
    """
    main_match = _MAIN_RE.search(html)
    fragment = main_match.group(1) if main_match else html
    fragment = _KEEP_READING_RE.sub(" ", fragment)
    start = _START_RE.search(fragment)
    if start:
        fragment = fragment[start.start() :]
    fragment = _COMMENT_RE.sub(" ", fragment)
    fragment = _TIME_RE.sub(" ", fragment)
    fragment = _PUBLISHED_RE.sub(" ", fragment)
    fragment = _NONCE_RE.sub("", fragment)
    fragment = _DATETIME_ATTR_RE.sub("", fragment)
    fragment = _INTEGRITY_RE.sub("", fragment)
    fragment = _ASTRO_CID_RE.sub("", fragment)
    fragment = _BUILD_HASH_RE.sub(r"\1\2", fragment)
    fragment = _ASSET_QUERY_RE.sub(r"\1", fragment)
    fragment = _WS_RE.sub(" ", fragment).strip()
    return hashlib.sha256(fragment.encode("utf-8")).hexdigest()


def hash_built_page(dist_dir: Path, url: str) -> str:
    path = html_path_for_url(dist_dir, url)
    if not path.is_file():
        return ""
    return content_hash_html(path.read_text(encoding="utf-8", errors="replace"))


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


def read_redirect_lines(dist_dir: Path) -> list[str]:
    path = dist_dir / "_redirects"
    if not path.is_file():
        return []
    lines: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        lines.append(line)
    return lines


def redirect_source_urls(lines: list[str]) -> set[str]:
    urls: set[str] = set()
    for line in lines:
        parts = line.split()
        if not parts:
            continue
        url = canonicalize_url(parts[0])
        if url:
            urls.add(url)
    return urls


def load_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return data if isinstance(data, dict) else None


def load_snapshot(path: Path) -> dict | None:
    data = load_json(path)
    if not data:
        return None
    urls = data.get("urls")
    if not isinstance(urls, dict):
        return None
    redirects = data.get("redirects")
    return {
        "urls": urls,
        "redirects": redirects if isinstance(redirects, list) else None,
    }


def load_queue(path: Path) -> list[dict[str, str]]:
    data = load_json(path)
    if not data:
        return []
    items = data.get("urls")
    if not isinstance(items, list):
        return []
    queue: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        url = item.get("url")
        reason = item.get("reason")
        if isinstance(url, str) and reason in REASON_PRIORITY:
            queue.append({"url": url, "reason": reason})
    return queue


def urls_have_hashes(urls: dict) -> bool:
    """True when this snapshot was written by the content-hash format.

    An empty sha256 is still known (the HTML file was missing). Only a legacy
    lastmod string, or a dict with no sha256 key, means the hash was never stored.
    """
    if not urls:
        return False
    return all(isinstance(value, dict) and "sha256" in value for value in urls.values())


def _normalize_entries(urls: dict, *, hashes_known: bool) -> dict[str, dict]:
    normalized: dict[str, dict] = {}
    for url, value in urls.items():
        if not isinstance(url, str):
            continue
        if isinstance(value, dict):
            sha = value.get("sha256")
            known = sha if isinstance(sha, str) and sha else ("" if hashes_known else None)
            normalized[url] = {
                "lastmod": value.get("lastmod") or "",
                "sha256": known,
            }
        elif isinstance(value, str):
            normalized[url] = {"lastmod": value, "sha256": None}
    return normalized


def _entry_lastmod(value: object) -> str:
    if isinstance(value, dict):
        return value.get("lastmod") or ""
    if isinstance(value, str):
        return value
    return ""


def _entry_hash(value: object) -> str | None:
    if isinstance(value, dict) and "sha256" in value:
        sha = value.get("sha256")
        return sha if isinstance(sha, str) else ""
    return None


def parse_lastmod_day(value: str) -> str | None:
    """Calendar day (UTC) of a sitemap lastmod, or None when it is not a date."""
    text = (value or "").strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).date().isoformat()


def lastmod_moved_forward(previous: str, current: str) -> bool:
    """True when the public day advanced.

    A dateModified restored to an older day (#252 did this for pages whose
    dates had been bulk-bumped) is not a change. The content hash decides
    whether those pages actually changed.
    """
    before = parse_lastmod_day(previous)
    after = parse_lastmod_day(current)
    if not before or not after or before == after:
        return False
    return after > before


def resolve_previous(snapshot: dict | None, baseline: dict | None) -> tuple[dict | None, list | None, bool, bool]:
    """Return previous entries, previous redirects, cold_start, legacy_upgrade.

    A missing snapshot is a cold start even when a baseline file exists, so a
    lost cache cannot resubmit the site. A snapshot that only stored lastmod
    strings keeps those days (so a later backward restore is visible) and
    takes content hashes from the baseline.
    """
    if snapshot is None:
        return None, None, True, False

    urls = snapshot["urls"]
    if urls_have_hashes(urls):
        redirects = snapshot.get("redirects")
        return _normalize_entries(urls, hashes_known=True), redirects if isinstance(redirects, list) else None, False, False

    baseline_urls = baseline.get("urls") if isinstance(baseline, dict) else None
    if not isinstance(baseline_urls, dict) or not baseline_urls:
        return _normalize_entries(urls, hashes_known=False), None, False, False

    merged: dict[str, dict] = {}
    for url in set(urls) | set(baseline_urls):
        if not isinstance(url, str):
            continue
        snap_val = urls.get(url)
        base_val = baseline_urls.get(url)
        if snap_val is not None:
            lastmod = _entry_lastmod(snap_val)
        else:
            lastmod = _entry_lastmod(base_val)
        sha = _entry_hash(snap_val) if snap_val is not None else None
        if sha is None:
            sha = _entry_hash(base_val)
        merged[url] = {
            "lastmod": lastmod,
            "sha256": sha,
            # In the snapshot but never hashed, and absent from the baseline:
            # the last submitted content state did not include this URL.
            "unseen": snap_val is not None and base_val is None and sha is None,
        }

    redirects = baseline.get("redirects") if isinstance(baseline, dict) else None
    return merged, redirects if isinstance(redirects, list) else None, False, True


def index_current(dist_dir: Path, sitemap: dict[str, str]) -> dict[str, dict]:
    return {
        url: {"lastmod": lastmod, "sha256": hash_built_page(dist_dir, url)}
        for url, lastmod in sitemap.items()
    }


def classify_candidates(
    previous: dict[str, dict],
    current: dict[str, dict],
    previous_redirects: list[str] | None,
    current_redirects: list[str],
) -> list[dict[str, str]]:
    """Return deduped candidates tagged with a reason. Order is not significant."""
    found: dict[str, str] = {}

    for url in current:
        if url not in previous:
            found[url] = "added"
            continue
        prev = previous[url]
        if prev.get("unseen"):
            found[url] = "added"
            continue
        prev_hash = prev.get("sha256")
        cur_hash = current[url].get("sha256") or ""
        if prev_hash is not None and prev_hash != cur_hash and (prev_hash or cur_hash):
            found[url] = "hash-changed"
            continue
        # Hash is the source of truth. A lastmod day counts only when it
        # moved forward; restoring an older dateModified is not a change.
        if lastmod_moved_forward(prev.get("lastmod") or "", current[url].get("lastmod") or ""):
            found[url] = "lastmod"

    new_redirect_urls: set[str] = set()
    if previous_redirects is not None:
        new_lines = set(current_redirects) - set(previous_redirects)
        new_redirect_urls = redirect_source_urls(sorted(new_lines))

    for url in previous:
        if url in current or url in found:
            continue
        if url in new_redirect_urls:
            found[url] = "redirected"
        else:
            found[url] = "removed"

    for url in new_redirect_urls:
        found.setdefault(url, "redirected")

    return [{"url": url, "reason": reason} for url, reason in found.items()]


def merge_queue(existing: list[dict[str, str]], fresh: list[dict[str, str]]) -> list[dict[str, str]]:
    """Union the persisted queue with newly detected URLs, keeping the stronger reason."""
    merged: dict[str, str] = {}
    for item in list(existing) + list(fresh):
        url = item["url"]
        reason = item["reason"]
        current = merged.get(url)
        if current is None or REASON_PRIORITY[reason] < REASON_PRIORITY[current]:
            merged[url] = reason
    return [
        {"url": url, "reason": reason}
        for url, reason in sorted(merged.items(), key=lambda pair: (REASON_PRIORITY[pair[1]], pair[0]))
    ]


def take_batch(candidates: list[dict[str, str]], max_urls: int) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    if max_urls < 0:
        raise ValueError("max_urls must be >= 0")
    return candidates[:max_urls], candidates[max_urls:]


def group_urls(items: list[dict[str, str]]) -> dict[str, list[str]]:
    grouped = {reason: [] for reason in REASON_PRIORITY}
    for item in items:
        grouped[item["reason"]].append(item["url"])
    for reason in grouped:
        grouped[reason] = sorted(grouped[reason])
    return grouped


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def snapshot_payload(entries: dict[str, dict], redirects: list[str]) -> dict:
    return {
        "schema_version": 2,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(entries),
        "redirects": redirects,
        "urls": entries,
    }


def queue_payload(items: list[dict[str, str]]) -> dict:
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(items),
        "urls": items,
    }


def build_report(
    *,
    cold_start: bool,
    legacy_upgrade: bool,
    current: dict[str, dict],
    previous: dict[str, dict] | None,
    detected: list[dict[str, str]],
    submitted: list[dict[str, str]],
    queued: list[dict[str, str]],
) -> dict:
    detected_groups = group_urls(detected)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cold_start": cold_start,
        "legacy_upgrade": legacy_upgrade,
        "sitemap_url_count": len(current),
        "previous_url_count": 0 if previous is None else len(previous),
        "candidate_count": len(detected),
        "submitting_count": len(submitted),
        "queued_count": len(queued),
        "candidate_urls": [item["url"] for item in submitted],
        "submitted": submitted,
        "queued": queued,
        "added": detected_groups["added"],
        "hash_changed": detected_groups["hash-changed"],
        "lastmod": detected_groups["lastmod"],
        "removed": detected_groups["removed"],
        "redirected": detected_groups["redirected"],
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sitemap-dir", type=Path, default=REPO_ROOT / "dist")
    parser.add_argument(
        "--dist-dir",
        type=Path,
        help="Built site (HTML + _redirects). Defaults to --sitemap-dir.",
    )
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=REPO_ROOT / ".indexnow" / "sitemap-snapshot.json",
        help="Snapshot of the last processed site.",
    )
    parser.add_argument(
        "--queue",
        type=Path,
        default=REPO_ROOT / ".indexnow" / "queue.json",
        help="URLs detected earlier that have not been submitted yet.",
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=REPO_ROOT / "scripts" / "indexnow-content-baseline.json",
        help="Committed hashes used once, when the snapshot has no sha256.",
    )
    parser.add_argument("--output", type=Path, help="Write this run's URLs here, one per line.")
    parser.add_argument(
        "--reasons",
        type=Path,
        help="Write {url, reason} for this run's URLs. Passed to notify-indexnow.py.",
    )
    parser.add_argument("--log-file", type=Path, help="Write the full diff as JSON.")
    parser.add_argument("--max-urls", type=int, default=DEFAULT_MAX_URLS)
    parser.add_argument(
        "--write-snapshot",
        action="store_true",
        help="Advance the snapshot and persist the unsubmitted queue.",
    )
    parser.add_argument(
        "--drain-queue-only",
        action="store_true",
        help="Submit the persisted queue only. Do not detect new changes.",
    )
    parser.add_argument(
        "--write-baseline",
        type=Path,
        help="Write a content-hash baseline from this build and exit.",
    )
    parser.add_argument(
        "--source-commit",
        default="",
        help="Recorded on --write-baseline.",
    )
    return parser.parse_args(argv)


def write_baseline(dist_dir: Path, sitemap: dict[str, str], destination: Path, source_commit: str) -> None:
    entries = index_current(dist_dir, sitemap)
    redirects = read_redirect_lines(dist_dir)
    payload = snapshot_payload(entries, redirects)
    payload["source_commit"] = source_commit
    payload["note"] = (
        "Content hashes of the last IndexNow-submitted build. "
        "scripts/indexnow-sitemap-diff.py uses this only when the Actions cache "
        "snapshot stores lastmod strings and no sha256. Later runs use the cache."
    )
    write_json(destination, payload)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.max_urls < 0:
        print("Sitemap diff failed closed: --max-urls must be >= 0", file=sys.stderr)
        return 1

    dist_dir = args.dist_dir or args.sitemap_dir

    try:
        sitemap = read_sitemap(args.sitemap_dir)
    except (FileNotFoundError, RuntimeError, ET.ParseError) as error:
        print(f"Sitemap diff failed closed: {error}", file=sys.stderr)
        return 1

    if args.write_baseline:
        write_baseline(dist_dir, sitemap, args.write_baseline, args.source_commit)
        print(f"Wrote content baseline ({len(sitemap)} URLs) to {args.write_baseline}")
        return 0

    current_redirects = read_redirect_lines(dist_dir)
    current = index_current(dist_dir, sitemap)
    snapshot = load_snapshot(args.snapshot)
    baseline = load_json(args.baseline)
    previous, previous_redirects, cold_start, legacy_upgrade = resolve_previous(snapshot, baseline)
    existing_queue = [] if cold_start else load_queue(args.queue)

    if cold_start:
        detected: list[dict[str, str]] = []
        combined: list[dict[str, str]] = []
        print(
            f"Cold start: seeding snapshot with {len(current)} URLs, submitting none.",
            file=sys.stderr,
        )
    elif args.drain_queue_only:
        detected = []
        combined = merge_queue(existing_queue, [])
        print(
            f"Draining queue only: {len(combined)} URL(s) waiting.",
            file=sys.stderr,
        )
    else:
        detected = classify_candidates(previous or {}, current, previous_redirects, current_redirects)
        combined = merge_queue(existing_queue, detected)
        if legacy_upgrade:
            print(
                "Legacy snapshot has no content hashes; comparing with the committed baseline.",
                file=sys.stderr,
            )

    submitted, queued = take_batch(combined, args.max_urls)
    report = build_report(
        cold_start=cold_start,
        legacy_upgrade=legacy_upgrade,
        current=current,
        previous=previous,
        detected=detected if not cold_start else [],
        submitted=submitted,
        queued=queued,
    )

    if args.log_file:
        write_json(args.log_file, report)

    groups = group_urls(detected if not args.drain_queue_only else combined)
    print(f"Sitemap URLs: {len(current)}")
    print(
        f"Added: {len(groups['added'])}  "
        f"Hash-changed: {len(groups['hash-changed'])}  "
        f"Lastmod: {len(groups['lastmod'])}  "
        f"Removed: {len(groups['removed'])}  "
        f"Redirected: {len(groups['redirected'])}"
    )
    print(f"Submitting: {len(submitted)}  Queued: {len(queued)}")
    for item in submitted:
        print(f"  [{item['reason']}] {item['url']}")

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        text = "".join(f"{item['url']}\n" for item in submitted)
        args.output.write_text(text, encoding="utf-8")

    if args.reasons:
        write_json(args.reasons, {"submitted": submitted})

    if args.write_snapshot:
        # Drain-only must not record today's HTML as "already seen", or the
        # next real diff would skip changes this run was told to ignore.
        if not args.drain_queue_only:
            write_json(args.snapshot, snapshot_payload(current, current_redirects))
        write_json(args.queue, queue_payload(queued))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
