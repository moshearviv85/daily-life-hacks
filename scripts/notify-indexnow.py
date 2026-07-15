"""Notify IndexNow about canonical HTML pages changed by a production deploy.

The script deliberately fails closed: a URL is eligible only when it can be
derived from a changed page source (or supplied explicitly) *and* appears in
the sitemap produced by the same build. Assets, redirects, noindex pages,
future-dated articles, tag pages, and duplicate URL variants never reach the
IndexNow request.

Examples:
  py -3 scripts/notify-indexnow.py --base HEAD^ --head HEAD --dry-run
  py -3 scripts/notify-indexnow.py --urls /example/ --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

SITE = "https://www.daily-life-hacks.com"
HOST = "www.daily-life-hacks.com"
DEFAULT_INDEXNOW_KEY = "bfae002c508721fed055bda08154ede6"
INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
REPO_ROOT = Path(__file__).resolve().parent.parent
PAGE_EXTENSIONS = {".astro", ".html", ".md", ".mdx"}


def canonicalize_url(value: str) -> str | None:
    """Return the site's canonical host/trailing-slash URL, or None if unsafe."""
    value = value.strip()
    if not value:
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

    if "?" in path or "#" in path:
        return None
    path = "/" + path.strip("/")
    if path != "/":
        path += "/"
    return urlunsplit(("https", HOST, path, "", ""))


def source_path_to_url(source_path: str) -> str | None:
    """Map a changed content/page source to its public canonical candidate."""
    normalized = source_path.replace("\\", "/").lstrip("./")

    article_prefix = "src/data/articles/"
    if normalized.startswith(article_prefix) and normalized.endswith(".md"):
        slug = Path(normalized).stem
        return canonicalize_url(f"/{slug}/")

    page_prefix = "src/pages/"
    if not normalized.startswith(page_prefix):
        return None

    relative = normalized[len(page_prefix) :]
    path = Path(relative)
    if path.suffix.lower() not in PAGE_EXTENSIONS or "[" in relative or "]" in relative:
        return None

    route_parts = list(path.with_suffix("").parts)
    if route_parts and route_parts[-1] == "index":
        route_parts.pop()
    if route_parts == ["404"]:
        return None
    return canonicalize_url("/" + "/".join(route_parts) + "/")


def get_changed_paths(base: str, head: str, repo_root: Path = REPO_ROOT) -> list[str]:
    """Return added/modified/renamed destination paths for a Git range."""
    command = [
        "git",
        "diff",
        "--name-status",
        "--diff-filter=AMR",
        base,
        head,
        "--",
    ]
    result = subprocess.run(
        command,
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "git diff failed")

    paths: list[str] = []
    for line in result.stdout.splitlines():
        fields = line.split("\t")
        if len(fields) < 2:
            continue
        # Rename output is: R<score> old_path new_path.
        paths.append(fields[-1])
    return paths


def load_sitemap_urls(sitemap_dir: Path) -> set[str]:
    """Load canonical page URLs from built sitemap URL sets."""
    sitemap_files = sorted(sitemap_dir.glob("sitemap*.xml"))
    if not sitemap_files:
        raise FileNotFoundError(f"No sitemap XML files found in {sitemap_dir}")

    urls: set[str] = set()
    for sitemap_file in sitemap_files:
        root = ET.parse(sitemap_file).getroot()
        # Ignore sitemap-index <loc> entries and read only URL-set documents.
        if not root.tag.endswith("urlset"):
            continue
        for loc in root.iter():
            if not loc.tag.endswith("loc") or not loc.text:
                continue
            canonical = canonicalize_url(loc.text)
            if canonical and canonical == loc.text.strip():
                urls.add(canonical)

    if not urls:
        raise RuntimeError(f"No canonical page URLs found in {sitemap_dir}")
    return urls


def build_plan(
    *,
    changed_paths: Iterable[str],
    explicit_urls: Iterable[str],
    sitemap_urls: set[str],
) -> dict:
    candidates: list[dict[str, str]] = []
    ignored_sources: list[str] = []
    skipped: list[dict[str, str]] = []

    for source_path in changed_paths:
        url = source_path_to_url(source_path)
        if url:
            candidates.append({"url": url, "source": source_path})
        else:
            ignored_sources.append(source_path)

    for supplied in explicit_urls:
        url = canonicalize_url(supplied)
        if url:
            candidates.append({"url": url, "source": "--urls"})
        else:
            skipped.append({"url": supplied, "reason": "not a canonical site URL"})

    eligible: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        url = candidate["url"]
        if url in seen:
            skipped.append({"url": url, "reason": "duplicate"})
            continue
        seen.add(url)
        if url not in sitemap_urls:
            skipped.append(
                {
                    "url": url,
                    "reason": "not in built sitemap (unreleased, noindex, redirect, or missing)",
                }
            )
            continue
        eligible.append(url)

    return {
        "eligible_urls": sorted(eligible),
        "skipped": skipped,
        "ignored_source_paths": sorted(ignored_sources),
    }


def submit_indexnow(urls: list[str], key: str) -> dict:
    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": f"{SITE}/{key}.txt",
        "urlList": urls,
    }
    request = Request(
        INDEXNOW_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "daily-life-hacks-indexnow/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8", errors="replace")[:1000]
            return {"ok": 200 <= response.status < 300, "status": response.status, "body": body}
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")[:1000]
        return {"ok": False, "status": error.code, "body": body}
    except URLError as error:
        return {"ok": False, "status": None, "body": str(error.reason)}


def write_log(path: Path | None, report: dict) -> None:
    if not path:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Submit only changed canonical HTML pages found in the built sitemap"
    )
    parser.add_argument("--base", default="HEAD^", help="Git diff base (default: HEAD^)")
    parser.add_argument("--head", default="HEAD", help="Git diff head (default: HEAD)")
    parser.add_argument("--urls", nargs="*", default=[], help="Explicit site URL paths")
    parser.add_argument("--sitemap-dir", type=Path, default=REPO_ROOT / "dist")
    parser.add_argument("--log-file", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="Plan and log without HTTP calls")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        changed_paths = [] if args.urls else get_changed_paths(args.base, args.head)
        sitemap_urls = load_sitemap_urls(args.sitemap_dir)
        plan = build_plan(
            changed_paths=changed_paths,
            explicit_urls=args.urls,
            sitemap_urls=sitemap_urls,
        )
    except (FileNotFoundError, RuntimeError, ET.ParseError) as error:
        report = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "dry_run": args.dry_run,
            "ok": False,
            "error": str(error),
            "eligible_urls": [],
        }
        write_log(args.log_file, report)
        print(f"IndexNow planning failed closed: {error}", file=sys.stderr)
        return 1

    urls = plan["eligible_urls"]
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "git_range": None if args.urls else {"base": args.base, "head": args.head},
        "dry_run": args.dry_run,
        **plan,
    }

    print(f"IndexNow eligible canonical pages: {len(urls)}")
    for url in urls:
        print(f"  {url}")
    print(f"Ignored non-page source paths: {len(plan['ignored_source_paths'])}")
    print(f"Skipped URL candidates: {len(plan['skipped'])}")

    if args.dry_run or not urls:
        report["ok"] = True
        report["submission"] = {"attempted": False, "reason": "dry-run" if args.dry_run else "no eligible URLs"}
        write_log(args.log_file, report)
        print("IndexNow: no HTTP request made.")
        return 0

    key = os.environ.get("INDEXNOW_KEY", DEFAULT_INDEXNOW_KEY).strip()
    if not key:
        report["ok"] = False
        report["submission"] = {"attempted": False, "reason": "INDEXNOW_KEY is empty"}
        write_log(args.log_file, report)
        print("IndexNow: INDEXNOW_KEY is empty.", file=sys.stderr)
        return 1

    submission = submit_indexnow(urls, key)
    report["ok"] = submission["ok"]
    report["submission"] = {"attempted": True, **submission}
    write_log(args.log_file, report)
    print(f"IndexNow response: status={submission['status']} ok={submission['ok']}")
    return 0 if submission["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
