#!/usr/bin/env python3
"""Build the growth article-upgrade queue from SEO + cluster + pin reports.

Usage:
  py -3 scripts/NEW_PIPELINE_2026-05-08/build_upgrade_queue.py
  py -3 scripts/NEW_PIPELINE_2026-05-08/build_upgrade_queue.py --limit 15
"""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
REPORTS = REPO / "pipeline-data" / "reports"
QUEUE_DIR = REPO / "pipeline-data" / "upgrade-queue"
ARTICLES = REPO / "src" / "data" / "articles"

PILLARS = {
    "fiber": "how-to-eat-more-fiber-on-a-budget-complete-guide",
    "budget": "eat-healthy-on-a-budget-complete-playbook",
    "protein": "high-protein-on-a-budget-complete-guide",
}


def load_json(path: Path) -> dict | list:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def pin_boost_by_slug(pin_report: dict) -> dict[str, float]:
    boost: dict[str, float] = {}
    for row in pin_report.get("scored") or pin_report.get("pins") or []:
        slug = (
            row.get("article_slug")
            or row.get("canonical")
            or row.get("base_slug")
            or ""
        )
        if not slug:
            link = str(row.get("pin_link") or row.get("link") or "")
            for part in link.split("/"):
                if part and part not in {"https:", "www.daily-life-hacks.com", ""}:
                    slug = part
                    break
        ctr = float(row.get("ctr") or row.get("ctr_pct") or 0)
        if ctr > 1:
            ctr = ctr / 100.0
        impr = float(row.get("impressions") or 0)
        if slug:
            boost[slug] = max(boost.get(slug, 0), ctr * 100 + impr / 100.0)
    return boost


def cluster_for_slug(clusters: dict, slug: str) -> str | None:
    for name, rows in (clusters.get("clusters") or {}).items():
        for row in rows:
            if row.get("slug") == slug:
                return name
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=15)
    parser.add_argument("--date", default=date.today().isoformat())
    args = parser.parse_args()

    seo = load_json(REPORTS / f"seo-onpage-{args.date}.json")
    if not seo:
        # fallback to newest seo-onpage-*.json
        files = sorted(REPORTS.glob("seo-onpage-*.json"), reverse=True)
        seo = load_json(files[0]) if files else {}
    clusters = load_json(REPORTS / f"content-clusters-{args.date}.json")
    if not clusters:
        files = sorted(REPORTS.glob("content-clusters-*.json"), reverse=True)
        clusters = load_json(files[0]) if files else {}
    pin_files = sorted(REPORTS.glob("pin-performance-*.json"), reverse=True)
    pin_report = load_json(pin_files[0]) if pin_files else {}
    pin_boost = pin_boost_by_slug(pin_report if isinstance(pin_report, dict) else {})

    rows = seo.get("articles") or seo.get("top50_priority") or []

    scored = []
    for row in rows:
        issues = row.get("issues") or []
        if not any(i in issues for i in ("thin_body", "no_internal_links")):
            continue
        slug = row["slug"]
        if not (ARTICLES / f"{slug}.md").exists():
            continue
        cluster = cluster_for_slug(clusters, slug) if clusters else None
        priority = 0
        if "no_internal_links" in issues:
            priority += 40
        if "thin_body" in issues:
            priority += 35
        if cluster in PILLARS:
            priority += 20
        priority += int(pin_boost.get(slug, 0))
        priority -= min(int(row.get("word_count") or 0) // 50, 10)
        scored.append(
            {
                "slug": slug,
                "title": row.get("title") or slug,
                "issues": issues,
                "cluster": cluster,
                "pillar_slug": PILLARS.get(cluster) if cluster else None,
                "word_count": row.get("word_count"),
                "internal_link_count": row.get("internal_link_count"),
                "priority_score": priority,
                "status": "pending",
                "upgrade_actions": [
                    "expand_to_1200_plus_words" if "thin_body" in issues else None,
                    "add_pillar_internal_link" if cluster else "add_2_internal_links",
                    "fix_image_alt" if "missing_image_alt" in issues else None,
                    "lengthen_excerpt" if "short_excerpt" in issues else None,
                    "set_dateModified_today",
                ],
            }
        )

    for item in scored:
        item["upgrade_actions"] = [a for a in item["upgrade_actions"] if a]

    scored.sort(key=lambda r: (-r["priority_score"], r["slug"]))
    top = scored[: args.limit]

    QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    out = {
        "generated_at": args.date,
        "limit": args.limit,
        "pillars": PILLARS,
        "queue": top,
    }
    json_path = QUEUE_DIR / f"upgrade-queue-{args.date}.json"
    md_path = QUEUE_DIR / f"upgrade-queue-{args.date}.md"
    latest = QUEUE_DIR / "upgrade-queue-latest.json"
    json_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    latest.write_text(json.dumps(out, indent=2), encoding="utf-8")

    lines = [
        f"# Article upgrade queue ({args.date})",
        "",
        "| # | Slug | Cluster | Issues | Score |",
        "|---|------|---------|--------|------:|",
    ]
    for i, row in enumerate(top, 1):
        lines.append(
            f"| {i} | `{row['slug']}` | {row.get('cluster') or '-'} | "
            f"{', '.join(row['issues'])} | {row['priority_score']} |"
        )
    lines += [
        "",
        "## Run next",
        "",
        "```bash",
        "py -3 scripts/NEW_PIPELINE_2026-05-08/inject_pillar_links.py --queue pipeline-data/upgrade-queue/upgrade-queue-latest.json --limit 10",
        "```",
        "",
    ]
    md_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {json_path} ({len(top)} items)")
    print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
