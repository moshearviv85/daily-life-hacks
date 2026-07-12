#!/usr/bin/env python3
"""Inject one contextual pillar (or sibling) internal link into article bodies.

Safe defaults:
- Skip if body already links to the pillar
- Insert after first H2 section paragraph when possible
- Does not rewrite whole articles

Usage:
  py -3 scripts/NEW_PIPELINE_2026-05-08/inject_pillar_links.py --dry-run --limit 10
  py -3 scripts/NEW_PIPELINE_2026-05-08/inject_pillar_links.py --limit 10
  py -3 scripts/NEW_PIPELINE_2026-05-08/inject_pillar_links.py --slug some-slug
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ARTICLES = REPO / "src" / "data" / "articles"
QUEUE = REPO / "pipeline-data" / "upgrade-queue" / "upgrade-queue-latest.json"

PILLARS = {
    "fiber": {
        "slug": "how-to-eat-more-fiber-on-a-budget-complete-guide",
        "anchor": "how to eat more fiber on a budget",
    },
    "budget": {
        "slug": "eat-healthy-on-a-budget-complete-playbook",
        "anchor": "eat healthy on a budget playbook",
    },
    "protein": {
        "slug": "high-protein-on-a-budget-complete-guide",
        "anchor": "high protein on a budget guide",
    },
}

CLUSTER_HINTS = {
    "fiber": ["fiber", "gut", "bean", "lentil", "oat", "bran", "chia"],
    "budget": ["budget", "cheap", "grocery", "affordable", "dollar", "frugal"],
    "protein": ["protein", "egg", "tofu", "chicken", "turkey", "yogurt"],
}


def detect_cluster(slug: str, title: str, body: str) -> str | None:
    hay = f"{slug} {title} {body[:1500]}".lower()
    # Require a real topical hit — avoid false positives like "egg" in baking.
    scores = {c: sum(1 for w in words if w in hay) for c, words in CLUSTER_HINTS.items()}
    best = max(scores, key=scores.get)
    if scores[best] < 2:
        return None
    # Tie-break preference when fiber/budget/protein collide
    if scores["fiber"] >= 2 and scores["fiber"] >= scores[best] - 0:
        if "fiber" in hay or "gut" in hay or "bran" in hay or "chia" in hay:
            return "fiber"
    return best


def already_links(body: str, slug: str) -> bool:
    return f"](/{slug}/)" in body or f"](/{slug})" in body


def insert_link_block(body: str, pillar_slug: str, anchor: str) -> str | None:
    if already_links(body, pillar_slug):
        return None
    sentence = (
        f"If you want the full system behind this, read the "
        f"[{anchor}](/{pillar_slug}/)."
    )
    # Prefer after first ## section's first paragraph
    parts = re.split(r"(^## .+$)", body, maxsplit=2, flags=re.M)
    if len(parts) >= 3:
        # parts: before, heading, rest
        rest = parts[2]
        # find end of first paragraph in rest
        m = re.match(r"(\n+.*?\n\n)", rest, re.S)
        if m:
            insert_at = m.end()
            new_rest = rest[:insert_at] + sentence + "\n\n" + rest[insert_at:]
            return parts[0] + parts[1] + new_rest
    # Fallback: before first FAQ-looking heading or at end before last blank
    return body.rstrip() + "\n\n" + sentence + "\n"


def set_date_modified(fm: str, today: str) -> str:
    if re.search(r"^dateModified:", fm, re.M):
        return re.sub(
            r"^dateModified:.*$",
            f"dateModified: {today}",
            fm,
            count=1,
            flags=re.M,
        )
    # insert after date line
    if re.search(r"^date:", fm, re.M):
        return re.sub(
            r"^(date:.*)$",
            rf"\1\ndateModified: {today}",
            fm,
            count=1,
            flags=re.M,
        )
    return fm + f"\ndateModified: {today}\n"


def process_file(path: Path, cluster: str | None, dry_run: bool) -> dict:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        return {"slug": path.stem, "status": "skip", "reason": "no_frontmatter"}
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return {"slug": path.stem, "status": "skip", "reason": "bad_frontmatter"}
    fm, body = parts[1], parts[2]
    title_m = re.search(r'^title:\s*"([^"]+)"', fm, re.M)
    title = title_m.group(1) if title_m else path.stem
    # Prefer queue-provided cluster; never invent protein for baking-only topics
    baking_blocklist = {
        "how-to-make-sourdough-pizza-dough-same-day",
        "easy-sandwich-bread-recipe-beginners",
        "how-to-keep-bread-fresh-longer-without-mold",
        "how-to-measure-sourdough-discard-grams",
    }
    if path.stem in baking_blocklist:
        return {
            "slug": path.stem,
            "status": "skip",
            "reason": "baking_blocklist",
        }
    cluster = cluster or detect_cluster(path.stem, title, body)
    if not cluster or cluster not in PILLARS:
        return {"slug": path.stem, "status": "skip", "reason": "no_cluster"}
    pillar = PILLARS[cluster]
    new_body = insert_link_block(body, pillar["slug"], pillar["anchor"])
    if new_body is None:
        return {
            "slug": path.stem,
            "status": "skip",
            "reason": "already_linked",
            "pillar": pillar["slug"],
        }
    today = date.today().isoformat()
    new_fm = set_date_modified(fm, today)
    new_raw = f"---{new_fm}---{new_body}"
    if not dry_run:
        path.write_text(new_raw, encoding="utf-8")
    return {
        "slug": path.stem,
        "status": "updated" if not dry_run else "dry_run",
        "cluster": cluster,
        "pillar": pillar["slug"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queue", type=Path, default=QUEUE)
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--slug")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    results = []
    if args.slug:
        path = ARTICLES / f"{args.slug}.md"
        results.append(process_file(path, None, args.dry_run))
    else:
        queue = []
        if args.queue.exists():
            queue = json.loads(args.queue.read_text(encoding="utf-8")).get("queue") or []
        if not queue:
            # fallback: all articles missing any pillar link
            queue = [{"slug": p.stem} for p in sorted(ARTICLES.glob("*.md"))]
        count = 0
        for item in queue:
            if count >= args.limit:
                break
            slug = item["slug"]
            path = ARTICLES / f"{slug}.md"
            if not path.exists():
                continue
            res = process_file(path, item.get("cluster"), args.dry_run)
            results.append(res)
            if res["status"] in {"updated", "dry_run"}:
                count += 1

    updated = sum(1 for r in results if r["status"] in {"updated", "dry_run"})
    print(json.dumps({"updated": updated, "results": results}, indent=2))


if __name__ == "__main__":
    main()
