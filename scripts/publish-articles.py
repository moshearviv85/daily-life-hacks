#!/usr/bin/env python3
"""
Daily Article Publisher
Fetches due articles from D1, checks images in GitHub, batch-commits all publishable .md files.
Articles without images are skipped (left PENDING) — they'll be retried next run.

Required env vars (GitHub Actions secrets):
  PINS_API_URL   e.g. https://www.daily-life-hacks.com
  PINS_API_KEY   same value as STATS_KEY in Cloudflare
  GH_PAT         GitHub Personal Access Token (contents:write)
  GITHUB_REPOSITORY  e.g. moshearviv85/daily-life-hacks (auto-set by GH Actions)
"""

import os
import sys
import json
import base64
import time
from datetime import date

import re
import requests

PINS_API_URL = os.environ["PINS_API_URL"].rstrip("/")
PINS_API_KEY = os.environ["PINS_API_KEY"]
GH_PAT       = os.environ["GH_PAT"]
GH_REPO      = os.environ.get("GITHUB_REPOSITORY", "moshearviv85/daily-life-hacks")

GH_API   = "https://api.github.com"
GH_HEADS = {"Authorization": f"Bearer {GH_PAT}",
             "Accept": "application/vnd.github+json",
             "X-GitHub-Api-Version": "2022-11-28",
             "User-Agent": "daily-life-hacks-publisher"}

# ── Frontmatter cleaner ────────────────────────────────────────────────────────

def clean_frontmatter(markdown: str) -> str:
    """Fix frontmatter before committing to GitHub:
    - Remove publishAt with empty value (causes Astro build failure)
    - Set date to today (so article appears as newest on homepage)
    - Set author to David Miller
    """
    today = date.today().isoformat()
    fixed = markdown
    # Remove publishAt: "" or publishAt: '' or publishAt: (bare empty)
    fixed = re.sub(r'^publishAt:\s*["\']?\s*["\']?\s*$', '', fixed, flags=re.MULTILINE)
    # Update date to today
    fixed = re.sub(r'^date:\s*.+$', f'date: {today}', fixed, flags=re.MULTILINE)
    # Normalize author
    fixed = re.sub(r'^author:\s*.+$', 'author: "David Miller"', fixed, flags=re.MULTILINE)
    # Clean up extra blank lines
    fixed = re.sub(r'\n{3,}', '\n\n', fixed)
    return fixed

# ── Helpers ────────────────────────────────────────────────────────────────────

def gh_get(path):
    r = requests.get(f"{GH_API}{path}", headers=GH_HEADS, timeout=15)
    return r

def gh_post(path, body):
    r = requests.post(f"{GH_API}{path}", headers=GH_HEADS, json=body, timeout=15)
    return r

def gh_patch(path, body):
    r = requests.patch(f"{GH_API}{path}", headers=GH_HEADS, json=body, timeout=15)
    return r

def gh_put(path, body):
    r = requests.put(f"{GH_API}{path}", headers=GH_HEADS, json=body, timeout=15)
    return r

def image_exists_in_github(image_filename):
    """Returns True if the image file exists in the repo."""
    if not image_filename:
        return True  # No image required — allow publish
    r = gh_get(f"/repos/{GH_REPO}/contents/public/images/{image_filename}")
    return r.status_code == 200

def article_exists_in_github(slug):
    """Returns True if src/data/articles/{slug}.md already exists in the repo (duplicate check)."""
    r = gh_get(f"/repos/{GH_REPO}/contents/src/data/articles/{slug}.md")
    return r.status_code == 200

def get_file_sha(file_path):
    """Returns current file SHA if it exists (needed for update), else None."""
    r = gh_get(f"/repos/{GH_REPO}/contents/{file_path}")
    if r.status_code == 200:
        return r.json().get("sha")
    return None

# ── Batch commit via Git tree API ──────────────────────────────────────────────

def batch_commit(articles):
    """
    Commits multiple .md files in a single Git commit using the tree API.
    Returns True on success.
    """
    print(f"\nCommitting {len(articles)} article(s) via Git tree API...")

    # 1. Get current HEAD SHA
    ref_res = gh_get(f"/repos/{GH_REPO}/git/ref/heads/main")
    if not ref_res.ok:
        print(f"ERROR getting ref: {ref_res.status_code} {ref_res.text[:200]}")
        return False
    head_sha = ref_res.json()["object"]["sha"]
    print(f"  HEAD SHA: {head_sha}")

    # 2. Get current tree SHA
    commit_res = gh_get(f"/repos/{GH_REPO}/git/commits/{head_sha}")
    if not commit_res.ok:
        print(f"ERROR getting commit: {commit_res.status_code}")
        return False
    tree_sha = commit_res.json()["tree"]["sha"]

    # 3. Create blobs for each article
    tree_items = []
    for article in articles:
        slug    = article["slug"]
        content = clean_frontmatter(article["markdown_content"])
        encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")

        blob_res = gh_post(f"/repos/{GH_REPO}/git/blobs", {
            "content":  encoded,
            "encoding": "base64",
        })
        if not blob_res.ok:
            print(f"  ERROR creating blob for {slug}: {blob_res.text[:200]}")
            return False
        blob_sha = blob_res.json()["sha"]
        tree_items.append({
            "path": f"src/data/articles/{slug}.md",
            "mode": "100644",
            "type": "blob",
            "sha":  blob_sha,
        })
        print(f"  Blob created: {slug}.md ({blob_sha[:8]})")
        time.sleep(0.2)

    # 4. Create new tree
    tree_res = gh_post(f"/repos/{GH_REPO}/git/trees", {
        "base_tree": tree_sha,
        "tree":      tree_items,
    })
    if not tree_res.ok:
        print(f"ERROR creating tree: {tree_res.text[:200]}")
        return False
    new_tree_sha = tree_res.json()["sha"]

    # 5. Create commit
    today_str = date.today().isoformat()
    slugs     = ", ".join(a["slug"] for a in articles)
    commit_msg = f"feat: publish {len(articles)} article(s) for {today_str}\n\n{slugs}"
    commit_res = gh_post(f"/repos/{GH_REPO}/git/commits", {
        "message": commit_msg,
        "tree":    new_tree_sha,
        "parents": [head_sha],
    })
    if not commit_res.ok:
        print(f"ERROR creating commit: {commit_res.text[:200]}")
        return False
    new_commit_sha = commit_res.json()["sha"]
    print(f"  Commit created: {new_commit_sha[:8]}")

    # 6. Update branch ref
    update_res = gh_patch(f"/repos/{GH_REPO}/git/refs/heads/main", {
        "sha": new_commit_sha,
    })
    if not update_res.ok:
        print(f"ERROR updating ref: {update_res.text[:200]}")
        return False

    print(f"  Branch updated to {new_commit_sha[:8]}")
    return True

# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    today = date.today().isoformat()
    print(f"Article Publisher — {today}")
    print(f"Fetching due articles from D1...")

    # Get all PENDING articles due today or earlier
    resp = requests.get(
        f"{PINS_API_URL}/api/articles-due",
        params={"key": PINS_API_KEY},
        timeout=15,
    )
    if not resp.ok:
        print(f"ERROR fetching due articles: {resp.status_code} {resp.text[:200]}")
        sys.exit(1)

    data     = resp.json()
    articles = data.get("articles", [])
    print(f"Due articles: {len(articles)}")

    if not articles:
        print("Nothing to publish today.")
        return

    # Check duplicates and images, filter publishable articles
    to_publish  = []
    no_image    = []
    duplicates  = []

    for art in articles:
        slug    = art["slug"]
        imgfile = art.get("image_filename", "")
        print(f"  Checking {slug} — image: {imgfile or '(none)'}")

        # 1. Duplicate check — article already exists on site?
        if article_exists_in_github(slug):
            duplicates.append(slug)
            print(f"    ⚠ DUPLICATE — {slug}.md already exists on site, marking and skipping")
            requests.post(
                f"{PINS_API_URL}/api/articles-set-status",
                params={"key": PINS_API_KEY},
                json={"slug": slug, "status": "DUPLICATE", "published_at": None},
                timeout=10,
            )
            time.sleep(0.3)
            continue

        # 2. Image check
        if image_exists_in_github(imgfile):
            to_publish.append(art)
            print(f"    ✓ Image found — queued for publish")
        else:
            no_image.append(slug)
            print(f"    ✗ Image NOT found — skipping (will retry next run)")
        time.sleep(0.3)

    print(f"\nScanned: {len(articles)} | Duplicates: {len(duplicates)} | Ready: {len(to_publish)} | No image: {len(no_image)}")

    if duplicates:
        print(f"⚠ DUPLICATES found (marked in D1, review manually): {', '.join(duplicates)}")

    if no_image:
        print(f"Articles waiting for image: {', '.join(no_image)}")

    if not to_publish:
        print("Nothing to publish today — all pending articles are missing images.")
        return

    # Publish only ONE article per day (the first one in order that has an image)
    to_publish = to_publish[:1]
    print(f"\nPublishing 1 article today: {to_publish[0]['slug']}")

    # Batch commit the single article
    success = batch_commit(to_publish)

    if not success:
        print("Batch commit FAILED. No statuses updated.")
        sys.exit(1)

    # Mark all as PUBLISHED in D1
    published_at = today + "T00:00:00Z"
    print(f"\nMarking {len(to_publish)} article(s) as PUBLISHED in D1...")
    for art in to_publish:
        slug = art["slug"]
        r = requests.post(
            f"{PINS_API_URL}/api/articles-set-status",
            params={"key": PINS_API_KEY},
            json={"slug": slug, "status": "PUBLISHED", "published_at": published_at},
            timeout=10,
        )
        if r.ok:
            print(f"  ✓ {slug}")
        else:
            print(f"  ✗ {slug} — {r.status_code} {r.text[:100]}")

    print(f"\nDone. Published: {len(to_publish)}, Skipped: {len(no_image)}")

if __name__ == "__main__":
    main()
