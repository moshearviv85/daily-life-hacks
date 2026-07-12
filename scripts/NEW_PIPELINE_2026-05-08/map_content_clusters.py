#!/usr/bin/env python3
"""Map articles into CP5 content clusters (fiber / budget / protein).

Writes:
  pipeline-data/reports/content-clusters-YYYY-MM-DD.{json,md}
  docs/content-clusters.md (latest snapshot summary)

Usage:
  python scripts/NEW_PIPELINE_2026-05-08/map_content_clusters.py
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ARTICLES = REPO / "src" / "data" / "articles"
REPORTS = REPO / "pipeline-data" / "reports"
DOCS_OUT = REPO / "docs" / "content-clusters.md"

PILLARS = {
    "fiber": "how-to-eat-more-fiber-on-a-budget-complete-guide",
    "budget": "eat-healthy-on-a-budget-complete-playbook",
    "protein": "high-protein-on-a-budget-complete-guide",
}

KEYWORDS = {
    "fiber": [
        "fiber",
        "gut",
        "bean",
        "lentil",
        "oat",
        "chia",
        "whole wheat",
        "constipation",
        "prebiotic",
    ],
    "budget": [
        "budget",
        "cheap",
        "affordable",
        "grocery",
        "frugal",
        "dollar",
        "cost",
        "save money",
        "aldi",
    ],
    "protein": [
        "protein",
        "egg",
        "tofu",
        "turkey",
        "greek yogurt",
        "cottage cheese",
        "chicken",
        "legume",
    ],
}

FM_RE = re.compile(r"^---\s*\n(.*?)\n---", re.S)


def parse_frontmatter(text: str) -> dict:
    m = FM_RE.match(text)
    if not m:
        return {}
    block = m.group(1)
    data: dict = {}
    # crude YAML-ish for title/category/tags
    title_m = re.search(r'^title:\s*"([^"]+)"', block, re.M)
    cat_m = re.search(r'^category:\s*"([^"]+)"', block, re.M)
    tags_m = re.search(r"^tags:\s*\[(.*?)\]", block, re.S | re.M)
    data["title"] = title_m.group(1) if title_m else ""
    data["category"] = cat_m.group(1) if cat_m else ""
    tags: list[str] = []
    if tags_m:
        tags = re.findall(r'"([^"]+)"', tags_m.group(1))
    data["tags"] = tags
    data["has_faq"] = bool(re.search(r"^faq:\s*$", block, re.M) or re.search(r"^faq:\s*\n", block, re.M))
    data["has_image_alt"] = bool(re.search(r'^imageAlt:\s*"', block, re.M))
    return data


def score_clusters(hay: str) -> dict[str, int]:
    hay_l = hay.lower()
    return {
        name: sum(1 for k in keys if k in hay_l) for name, keys in KEYWORDS.items()
    }


def main() -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    clusters: dict[str, list[dict]] = {k: [] for k in PILLARS}
    unassigned: list[dict] = []

    for path in sorted(ARTICLES.glob("*.md")):
        slug = path.stem
        raw = path.read_text(encoding="utf-8")
        fm = parse_frontmatter(raw)
        hay = " ".join([slug, fm.get("title", ""), " ".join(fm.get("tags", [])), raw[:2000]])
        scores = score_clusters(hay)
        best = max(scores, key=scores.get)
        entry = {
            "slug": slug,
            "title": fm.get("title") or slug,
            "category": fm.get("category") or "",
            "scores": scores,
            "is_pillar": slug in PILLARS.values(),
            "has_faq": fm.get("has_faq", False),
            "has_image_alt": fm.get("has_image_alt", False),
        }
        if scores[best] == 0:
            unassigned.append(entry)
        else:
            clusters[best].append(entry)

    for key in clusters:
        clusters[key].sort(key=lambda e: (-e["scores"][key], e["slug"]))

    payload = {
        "date": today,
        "pillars": PILLARS,
        "counts": {k: len(v) for k, v in clusters.items()},
        "unassigned_count": len(unassigned),
        "clusters": clusters,
        "unassigned": unassigned[:40],
    }

    json_path = REPORTS / f"content-clusters-{today}.json"
    md_path = REPORTS / f"content-clusters-{today}.md"
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        f"# Content clusters ({today})",
        "",
        "| Cluster | Pillar | Articles |",
        "|---------|--------|----------|",
    ]
    for cluster, pillar in PILLARS.items():
        lines.append(f"| {cluster} | `{pillar}` | {len(clusters[cluster])} |")
    lines += ["", f"Unassigned (no keyword hits): **{len(unassigned)}**", ""]
    for cluster, pillar in PILLARS.items():
        lines += [f"## {cluster}", "", f"Pillar: `/{pillar}/`", ""]
        for e in clusters[cluster][:25]:
            flag = " *(pillar)*" if e["is_pillar"] else ""
            lines.append(f"- [{e['title']}](/{e['slug']}/){flag}")
        lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")

    docs = [
        "# Content Clusters (CP5.3–5.4)",
        "",
        f"**Generated:** {today} from `map_content_clusters.py`",
        "",
        "Full machine report: `pipeline-data/reports/content-clusters-" + today + ".*`",
        "",
        "## Pillars",
        "",
        "| Cluster | Pillar URL | Mapped articles |",
        "|---------|------------|-----------------|",
    ]
    for cluster, pillar in PILLARS.items():
        docs.append(f"| {cluster} | `/{pillar}/` | {len(clusters[cluster])} |")
    docs += [
        "",
        f"Unassigned: {len(unassigned)} (still valid site content; not forced into a cluster).",
        "",
        "## Hub",
        "",
        "Public index: `/guides/`",
        "",
        "## Linking rules",
        "",
        "1. Spokes surface their cluster pillar via RelatedArticles boost + Guides hub.",
        "2. Pillars link out to top studies/tools already in-body.",
        "3. Do not invent soft-duplicate URLs for cluster pages.",
        "",
    ]
    DOCS_OUT.write_text("\n".join(docs), encoding="utf-8")
    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print(f"Wrote {DOCS_OUT}")
    print("counts", payload["counts"], "unassigned", len(unassigned))


if __name__ == "__main__":
    main()
