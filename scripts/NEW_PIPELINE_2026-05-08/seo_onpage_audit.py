#!/usr/bin/env python3
"""Lightweight on-page SEO checklist for CP5.3 (no GSC required).

Scans article frontmatter + body for FAQ, imageAlt, H2s, and internal links.
Writes pipeline-data/reports/seo-onpage-YYYY-MM-DD.{json,md}
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
ARTICLES = REPO / "src" / "data" / "articles"
REPORTS = REPO / "pipeline-data" / "reports"
DOCS = REPO / "docs" / "seo-onpage-pass-cp5.md"

FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.S)


def parse(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    m = FM_RE.match(raw)
    fm_text, body = (m.group(1), m.group(2)) if m else ("", raw)
    title_m = re.search(r'^title:\s*"([^"]+)"', fm_text, re.M)
    excerpt_m = re.search(r'^excerpt:\s*"([^"]+)"', fm_text, re.M)
    cat_m = re.search(r'^category:\s*"([^"]+)"', fm_text, re.M)
    image_alt = bool(re.search(r'^imageAlt:\s*"[^"]+"', fm_text, re.M))
    has_faq = "faq:" in fm_text
    title = title_m.group(1) if title_m else path.stem
    excerpt = excerpt_m.group(1) if excerpt_m else ""
    h2s = re.findall(r"^##\s+(.+)$", body, re.M)
    internal = re.findall(r"\]\((/[a-z0-9][^)\s]*)\)", body)
    word_count = len(re.findall(r"\b\w+\b", body))
    issues = []
    if not image_alt:
        issues.append("missing_image_alt")
    if not has_faq:
        issues.append("missing_faq")
    if len(excerpt) < 80:
        issues.append("short_excerpt")
    if len(h2s) < 3:
        issues.append("few_h2")
    if len(internal) < 1:
        issues.append("no_internal_links")
    if word_count < 800:
        issues.append("thin_body")
    return {
        "slug": path.stem,
        "title": title,
        "category": cat_m.group(1) if cat_m else "",
        "word_count": word_count,
        "h2_count": len(h2s),
        "internal_link_count": len(set(internal)),
        "has_faq": has_faq,
        "has_image_alt": image_alt,
        "excerpt_len": len(excerpt),
        "issues": issues,
        "issue_count": len(issues),
    }


def main() -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()
    rows = [parse(p) for p in sorted(ARTICLES.glob("*.md"))]
    rows.sort(key=lambda r: (-r["issue_count"], r["slug"]))
    top50 = rows[:50]
    summary = {
        "date": today,
        "total_articles": len(rows),
        "with_issues": sum(1 for r in rows if r["issue_count"]),
        "missing_faq": sum(1 for r in rows if "missing_faq" in r["issues"]),
        "no_internal_links": sum(1 for r in rows if "no_internal_links" in r["issues"]),
        "thin_body": sum(1 for r in rows if "thin_body" in r["issues"]),
        "top50_priority": top50,
    }
    json_path = REPORTS / f"seo-onpage-{today}.json"
    md_path = REPORTS / f"seo-onpage-{today}.md"
    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    lines = [
        f"# On-page SEO pass ({today})",
        "",
        f"Articles scanned: **{len(rows)}**",
        f"With ≥1 checklist issue: **{summary['with_issues']}**",
        f"Missing FAQ: **{summary['missing_faq']}**",
        f"No internal links in body: **{summary['no_internal_links']}**",
        f"Thin body (<800 words): **{summary['thin_body']}**",
        "",
        "## Top 50 priority (most issues first)",
        "",
    ]
    for r in top50:
        issues = ", ".join(r["issues"]) or "ok"
        lines.append(
            f"- `{r['slug']}` — {r['issue_count']} issues ({issues}); "
            f"{r['word_count']} words; {r['internal_link_count']} internal links"
        )
    md_path.write_text("\n".join(lines), encoding="utf-8")

    docs = f"""# SEO On-Page Pass (CP5.3)

**Date:** {today}  
**Method:** Local frontmatter/body checklist (FAQ, imageAlt, excerpt, H2s, internal links, word count).  
**GSC:** Confirm pin destinations remain 301-only and “Duplicate without user-selected canonical” stays flat after deploy — manual in Search Console.

## Summary

| Metric | Count |
|--------|------:|
| Articles scanned | {len(rows)} |
| With ≥1 issue | {summary['with_issues']} |
| Missing FAQ | {summary['missing_faq']} |
| No body internal links | {summary['no_internal_links']} |
| Thin body (&lt;800 words) | {summary['thin_body']} |

Full list: `pipeline-data/reports/seo-onpage-{today}.*`

## Structural fixes shipped with this pass

1. `/guides/` hub for three pillars + spoke lists.
2. RelatedArticles boosts pillar URLs for cluster relevance.
3. Header nav includes Guides.
4. Thank-you soft-fails to live guides (no broken PDF 404s).

## Follow-ups (manual / later batches)

- Fix FAQ on priority articles from the top-50 list (do not mass-rewrite in one PR).
- Add contextual spoke→pillar links inside body copy where RelatedArticles is not enough.
- Re-check GSC indexing after deploy of CP5.
"""
    DOCS.write_text(docs, encoding="utf-8")
    print(f"Wrote {json_path}")
    print(f"Wrote {md_path}")
    print(f"Wrote {DOCS}")


if __name__ == "__main__":
    main()
