"""
Notify search engines about new/updated pages after deploy.

- IndexNow: Bing, DuckDuckGo, Yandex (instant indexing)
- Google: sitemap ping

Usage:
  python scripts/notify-indexnow.py                # auto-detect new articles from last git diff
  python scripts/notify-indexnow.py --urls /slug1 /slug2  # explicit URLs
  python scripts/notify-indexnow.py --all          # submit all articles
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

SITE = "https://www.daily-life-hacks.com"
INDEXNOW_KEY = "618542d1be1649429b2de77572afc9e8"
INDEXNOW_ENDPOINT = "https://www.bing.com/indexnow"
ARTICLES_DIR = Path(__file__).resolve().parent.parent / "src" / "data" / "articles"


def get_all_slugs():
    return sorted(p.stem for p in ARTICLES_DIR.glob("*.md"))


def get_new_slugs_from_git():
    try:
        result = subprocess.run(
            ["git", "diff", "HEAD~1", "--name-only", "--diff-filter=A"],
            capture_output=True, text=True, cwd=ARTICLES_DIR.parent.parent.parent
        )
        new_files = result.stdout.strip().splitlines()
        slugs = []
        for f in new_files:
            if "src/data/articles/" in f and f.endswith(".md"):
                slug = Path(f).stem
                slugs.append(slug)
        return slugs
    except Exception:
        return []


def submit_indexnow(urls):
    if not urls:
        print("No URLs to submit.")
        return

    payload = {
        "host": "www.daily-life-hacks.com",
        "key": INDEXNOW_KEY,
        "keyLocation": f"{SITE}/{INDEXNOW_KEY}.txt",
        "urlList": urls,
    }

    req = Request(
        INDEXNOW_ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        resp = urlopen(req, timeout=15)
        print(f"IndexNow: {resp.status} - submitted {len(urls)} URL(s)")
    except URLError as e:
        print(f"IndexNow error: {e}")


def ping_google_sitemap():
    print("Google sitemap ping: deprecated (Google removed ping endpoint June 2023). Sitemap is crawled automatically.")


def main():
    parser = argparse.ArgumentParser(description="Notify search engines about new pages")
    parser.add_argument("--urls", nargs="+", help="Explicit URL paths (e.g. /slug1 /slug2)")
    parser.add_argument("--all", action="store_true", help="Submit all articles")
    args = parser.parse_args()

    if args.urls:
        slugs_raw = [u.lstrip("/").split("/")[-1] for u in args.urls]
        urls = [f"{SITE}/{s}" for s in slugs_raw]
    elif args.all:
        slugs = get_all_slugs()
        urls = [f"{SITE}/{s}" for s in slugs]
    else:
        slugs = get_new_slugs_from_git()
        if not slugs:
            print("No new articles detected in last commit. Use --urls or --all.")
            return
        urls = [f"{SITE}/{s}" for s in slugs]

    print(f"Submitting {len(urls)} URL(s):")
    for u in urls[:10]:
        print(f"  {u}")
    if len(urls) > 10:
        print(f"  ... and {len(urls) - 10} more")

    submit_indexnow(urls)
    ping_google_sitemap()


if __name__ == "__main__":
    main()
