#!/usr/bin/env python3
"""Build an evidence-first KEEP/MERGE/NOINDEX/REMOVE article matrix.

This script is deliberately conservative. A missing row in a search export is
evidence that the export contains no activity for that URL, not proof that the
page is useless. MERGE is assigned only when all four gates are met:

1. strong duplicate search intent,
2. objective thinness,
3. zero search evidence in both supplied exports, and
4. a demonstrably stronger canonical target.

NOINDEX and REMOVE are never inferred from traffic alone. They require explicit
manual evidence that is outside this local/export audit.
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse
from xml.etree import ElementTree

import yaml


SITE_HOST = "www.daily-life-hacks.com"
ARTICLE_LINK_RE = re.compile(
    r"(?:\]\(|href=[\"'])(/[^)\s#?\"']+)", re.IGNORECASE
)
H2_RE = re.compile(r"^##\s+(.+)$", re.MULTILINE)
WORD_RE = re.compile(r"\b[\w'-]+\b", re.UNICODE)
EXTERNAL_LINK_RE = re.compile(r"https?://", re.IGNORECASE)

# Generic modifiers do not establish duplicate intent.
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "best",
    "can",
    "complete",
    "easy",
    "for",
    "from",
    "guide",
    "healthy",
    "how",
    "in",
    "is",
    "it",
    "make",
    "of",
    "on",
    "or",
    "that",
    "the",
    "these",
    "this",
    "to",
    "use",
    "using",
    "vs",
    "what",
    "when",
    "with",
    "without",
    "you",
    "your",
}


@dataclass
class Article:
    slug: str
    path: Path
    title: str
    category: str
    published: str
    body: str
    word_count: int
    h2_count: int
    faq_count: int
    external_source_count: int
    intent_tokens: set[str]
    outbound_slugs: set[str]


def normalize_url(value: str) -> str:
    """Normalize host variants and slash variants to one article URL."""
    value = (value or "").strip()
    if not value:
        return ""
    parsed = urlparse(value if "://" in value else f"https://{SITE_HOST}/{value.lstrip('/')}")
    path = re.sub(r"/+", "/", parsed.path or "/")
    if path != "/":
        path = path.rstrip("/") + "/"
    return f"https://{SITE_HOST}{path}"


def slug_from_url(value: str) -> str:
    path = urlparse(normalize_url(value)).path.strip("/")
    if not path or "/" in path:
        return ""
    return path


def split_frontmatter(raw: str) -> tuple[dict, str]:
    match = re.match(r"^\s*---\s*\r?\n(.*?)\r?\n---\s*\r?\n?(.*)$", raw, re.DOTALL)
    if not match:
        raise ValueError("missing or malformed frontmatter")
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        raise ValueError("frontmatter is not a mapping")
    return data, match.group(2)


def tokenize_intent(title: str, slug: str) -> set[str]:
    text = f"{title} {slug.replace('-', ' ')}".lower()
    tokens = {
        token.strip("'-")
        for token in WORD_RE.findall(text)
        if len(token.strip("'-")) >= 3 and token.strip("'-") not in STOPWORDS
    }
    return tokens


def count_body_words(body: str) -> int:
    # Remove URLs and lightweight Markdown syntax before counting prose words.
    cleaned = re.sub(r"https?://\S+", " ", body)
    cleaned = re.sub(r"[#*`>|_\[\](){}]", " ", cleaned)
    return len(WORD_RE.findall(cleaned))


def load_articles(article_dir: Path) -> list[Article]:
    rows: list[Article] = []
    for path in sorted(article_dir.glob("*.md")):
        raw = path.read_text(encoding="utf-8-sig")
        frontmatter, body = split_frontmatter(raw)
        title = str(frontmatter.get("title") or path.stem)
        category = str(frontmatter.get("category") or "unknown")
        faq = frontmatter.get("faq") or []
        outbound = {
            link.strip("/").split("/")[0]
            for link in ARTICLE_LINK_RE.findall(body)
            if link.strip("/") and "/" not in link.strip("/")
        }
        published_value = frontmatter.get("date")
        if isinstance(published_value, date):
            published = published_value.isoformat()
        else:
            published = str(published_value or "")
        rows.append(
            Article(
                slug=path.stem,
                path=path,
                title=title,
                category=category,
                published=published,
                body=body,
                word_count=count_body_words(body),
                h2_count=len(H2_RE.findall(body)),
                faq_count=len(faq) if isinstance(faq, list) else 0,
                external_source_count=len(EXTERNAL_LINK_RE.findall(body)),
                intent_tokens=tokenize_intent(title, path.stem),
                outbound_slugs=outbound,
            )
        )
    return rows


def read_csv_rows_from_zip(path: Path, member_name: str) -> list[dict[str, str]]:
    with zipfile.ZipFile(path) as archive:
        candidates = [name for name in archive.namelist() if Path(name).name == member_name]
        if not candidates:
            raise ValueError(f"{member_name} not found in {path}")
        raw = archive.read(candidates[0]).decode("utf-8-sig")
    return list(csv.DictReader(raw.splitlines()))


def load_gsc_pages(path: Path) -> dict[str, dict[str, float]]:
    result: dict[str, dict[str, float]] = defaultdict(
        lambda: {"clicks": 0.0, "impressions": 0.0, "position_weight": 0.0}
    )
    for row in read_csv_rows_from_zip(path, "Pages.csv"):
        url = normalize_url(row.get("Top pages") or row.get("Page") or row.get("URL") or "")
        if not url:
            continue
        clicks = float((row.get("Clicks") or "0").replace(",", ""))
        impressions = float((row.get("Impressions") or "0").replace(",", ""))
        position = float((row.get("Position") or "0").replace(",", ""))
        result[url]["clicks"] += clicks
        result[url]["impressions"] += impressions
        result[url]["position_weight"] += position * impressions
    for metrics in result.values():
        impressions = metrics["impressions"]
        metrics["position"] = (
            metrics["position_weight"] / impressions if impressions else 0.0
        )
    return dict(result)


def load_bing_urls(path: Path) -> dict[str, dict[str, float]]:
    result: dict[str, dict[str, float]] = defaultdict(
        lambda: {"clicks": 0.0, "impressions": 0.0, "backlinks": 0.0}
    )
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            url = normalize_url(row.get("URL") or "")
            if not url:
                continue
            result[url]["clicks"] += float((row.get("Clicks") or "0").replace(",", ""))
            result[url]["impressions"] += float(
                (row.get("Impressions") or "0").replace(",", "")
            )
            result[url]["backlinks"] = max(
                result[url]["backlinks"],
                float((row.get("Backlinks") or "0").replace(",", "")),
            )
    return dict(result)


def load_sitemap(path: Path) -> set[str]:
    tree = ElementTree.parse(path)
    return {
        normalize_url(node.text or "")
        for node in tree.getroot().iter()
        if node.tag.endswith("loc") and node.text
    }


def load_recovery_slugs(path: Path) -> set[str]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return {
            slug
            for row in csv.DictReader(handle)
            if (slug := slug_from_url(row.get("url") or row.get("URL") or ""))
        }


def similarity(left: set[str], right: set[str]) -> float:
    """Return Jaccard intent similarity, guarded against tiny generic matches."""
    if not left or not right:
        return 0.0
    overlap = left & right
    if len(overlap) < 3:
        return 0.0
    return len(overlap) / len(left | right)


def closest_matches(articles: list[Article]) -> dict[str, tuple[str, float]]:
    result: dict[str, tuple[str, float]] = {}
    for article in articles:
        best_slug = ""
        best_score = 0.0
        for other in articles:
            if other.slug == article.slug:
                continue
            score = similarity(article.intent_tokens, other.intent_tokens)
            if score > best_score or (score == best_score and other.slug < best_slug):
                best_slug, best_score = other.slug, score
        result[article.slug] = (best_slug, best_score)
    return result


def is_objectively_thin(article: Article) -> tuple[bool, str]:
    threshold = 450 if article.category == "recipes" else 700
    low_structure = article.h2_count < (3 if article.category == "recipes" else 4)
    low_evidence = article.external_source_count == 0
    thin = article.word_count < threshold and low_structure and low_evidence
    reason = (
        f"{article.word_count} words < {threshold}; "
        f"{article.h2_count} H2s; {article.external_source_count} external citations"
    )
    return thin, reason


def build_rows(
    articles: list[Article],
    sitemap_urls: set[str],
    gsc: dict[str, dict[str, float]],
    bing: dict[str, dict[str, float]],
    recovery_slugs: set[str],
) -> list[dict[str, object]]:
    by_slug = {article.slug: article for article in articles}
    inbound: Counter[str] = Counter()
    for article in articles:
        for target in article.outbound_slugs:
            if target in by_slug and target != article.slug:
                inbound[target] += 1
    matches = closest_matches(articles)
    rows: list[dict[str, object]] = []

    for article in articles:
        url = normalize_url(article.slug)
        g = gsc.get(url, {})
        b = bing.get(url, {})
        gsc_clicks = int(g.get("clicks", 0))
        gsc_impressions = int(g.get("impressions", 0))
        bing_clicks = int(b.get("clicks", 0))
        bing_impressions = int(b.get("impressions", 0))
        bing_backlinks = int(b.get("backlinks", 0))
        zero_search_evidence = not any(
            [gsc_clicks, gsc_impressions, bing_clicks, bing_impressions, bing_backlinks]
        )
        closest_slug, duplicate_score = matches[article.slug]
        target = by_slug.get(closest_slug)
        thin, thin_reason = is_objectively_thin(article)
        # Pruning needs near-identity, not merely a shared topical cluster. A lower
        # threshold falsely groups valid siblings such as fiber vs protein or
        # plant-only vs all-protein rankings.
        strong_duplicate = bool(target and duplicate_score >= 0.90)

        target_superior = False
        target_reason = ""
        if target:
            target_url = normalize_url(target.slug)
            tg, tb = gsc.get(target_url, {}), bing.get(target_url, {})
            target_search = (
                float(tg.get("clicks", 0))
                + float(tg.get("impressions", 0))
                + float(tb.get("clicks", 0))
                + float(tb.get("impressions", 0))
                + float(tb.get("backlinks", 0))
            )
            current_search = (
                gsc_clicks
                + gsc_impressions
                + bing_clicks
                + bing_impressions
                + bing_backlinks
            )
            materially_deeper = target.word_count >= max(article.word_count + 200, 1.25 * article.word_count)
            better_discovery = target_search > current_search or inbound[target.slug] > inbound[article.slug]
            target_superior = materially_deeper and better_discovery
            target_reason = (
                f"{target.word_count} words vs {article.word_count}; "
                f"{inbound[target.slug]} vs {inbound[article.slug]} inbound article links; "
                f"search score {target_search:.0f} vs {current_search:.0f}"
            )

        protected = article.slug in recovery_slugs
        all_merge_gates = (
            strong_duplicate
            and thin
            and zero_search_evidence
            and target_superior
            and not protected
        )
        decision = "MERGE" if all_merge_gates else "KEEP"
        if protected:
            reason = "Protected fixed recovery cohort; freeze for the measurement window."
        elif all_merge_gates:
            reason = (
                f"All four merge gates passed. Duplicate score {duplicate_score:.2f}; "
                f"{thin_reason}; no GSC/Bing evidence; stronger target {closest_slug} ({target_reason})."
            )
        else:
            failed = []
            if not strong_duplicate:
                failed.append(f"no proven duplicate (best score {duplicate_score:.2f})")
            if not thin:
                failed.append(f"not objectively thin ({thin_reason})")
            if not zero_search_evidence:
                failed.append("has GSC or Bing search/link evidence")
            if not target_superior:
                failed.append(f"no demonstrably superior target ({target_reason or 'none'})")
            reason = "Freeze: " + "; ".join(failed) + "."

        rows.append(
            {
                "slug": article.slug,
                "url": url,
                "title": article.title,
                "category": article.category,
                "date": article.published,
                "word_count": article.word_count,
                "h2_count": article.h2_count,
                "faq_count": article.faq_count,
                "external_citation_count": article.external_source_count,
                "in_sitemap": "YES" if url in sitemap_urls else "NO",
                "outbound_article_links": len(article.outbound_slugs & by_slug.keys()),
                "inbound_article_links": inbound[article.slug],
                "gsc_clicks_3m": gsc_clicks,
                "gsc_impressions_3m": gsc_impressions,
                "gsc_position": f"{float(g.get('position', 0)):.2f}" if gsc_impressions else "",
                "bing_clicks": bing_clicks,
                "bing_impressions": bing_impressions,
                "bing_backlinks": bing_backlinks,
                "zero_search_evidence": "YES" if zero_search_evidence else "NO",
                "recovery_cohort": "YES" if protected else "NO",
                "closest_intent_slug": closest_slug,
                "duplicate_intent_score": f"{duplicate_score:.2f}",
                "strong_duplicate_intent": "YES" if strong_duplicate else "NO",
                "objectively_thin": "YES" if thin else "NO",
                "superior_target": "YES" if target_superior else "NO",
                "decision": decision,
                "decision_reason": reason,
            }
        )
    return rows


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def markdown_table(rows: Iterable[dict[str, object]]) -> list[str]:
    output = [
        "| Decision | Slug | Words | GSC impr. | Bing impr. | Inlinks | Closest intent | Score |",
        "|---|---|---:|---:|---:|---:|---|---:|",
    ]
    for row in rows:
        output.append(
            "| {decision} | `{slug}` | {word_count} | {gsc_impressions_3m} | "
            "{bing_impressions} | {inbound_article_links} | `{closest_intent_slug}` | "
            "{duplicate_intent_score} |".format(**row)
        )
    return output


def write_report(
    path: Path,
    rows: list[dict[str, object]],
    args: argparse.Namespace,
) -> None:
    counts = Counter(str(row["decision"]) for row in rows)
    zero_count = sum(row["zero_search_evidence"] == "YES" for row in rows)
    gsc_evidence_count = sum(
        int(row["gsc_clicks_3m"]) > 0 or int(row["gsc_impressions_3m"]) > 0
        for row in rows
    )
    bing_evidence_count = sum(
        int(row["bing_clicks"]) > 0
        or int(row["bing_impressions"]) > 0
        or int(row["bing_backlinks"]) > 0
        for row in rows
    )
    thin_count = sum(row["objectively_thin"] == "YES" for row in rows)
    duplicate_count = sum(row["strong_duplicate_intent"] == "YES" for row in rows)
    sitemap_missing = [row for row in rows if row["in_sitemap"] == "NO"]
    protected = sum(row["recovery_cohort"] == "YES" for row in rows)
    merge_rows = [row for row in rows if row["decision"] == "MERGE"]
    review_rows = sorted(
        (
            row
            for row in rows
            if row["decision"] == "KEEP"
            and row["zero_search_evidence"] == "YES"
            and (
                row["objectively_thin"] == "YES"
                or float(row["duplicate_intent_score"]) >= 0.70
            )
        ),
        key=lambda row: (
            row["strong_duplicate_intent"] != "YES",
            -float(row["duplicate_intent_score"]),
            int(row["word_count"]),
        ),
    )[:20]

    lines = [
        "# Evidence-first article pruning matrix",
        "",
        "Date: 2026-07-29",
        "",
        "## Bottom line",
        "",
        f"- Articles classified: **{len(rows)}**.",
        f"- KEEP: **{counts['KEEP']}**.",
        f"- MERGE: **{counts['MERGE']}**.",
        f"- NOINDEX: **{counts['NOINDEX']}**.",
        f"- REMOVE: **{counts['REMOVE']}**.",
        f"- Protected fixed recovery-cohort articles: **{protected}**.",
        f"- URLs missing from the built sitemap: **{len(sitemap_missing)}**.",
        "",
        "No article was edited, redirected, noindexed, or removed by this audit. "
        "Traffic absence alone is not a pruning instruction.",
        "",
        "## Evidence sources",
        "",
        f"- Local Markdown: `{args.articles}`.",
        f"- Current built sitemap: `{args.sitemap}`.",
        f"- GSC page export: `{args.gsc_zip}` (filter: Web, last 3 months).",
        f"- Bing Site Explorer export: `{args.bing_csv}`.",
        f"- Fixed recovery cohort: `{args.recovery_csv}`.",
        "",
        "Search exports are snapshots, not a complete value judgment. A URL absent from "
        "an export is recorded as zero observed evidence in that snapshot. It is not "
        "treated as proof that Google or Bing rejected the page.",
        "",
        "## Decision gates",
        "",
        "MERGE requires all four gates: Jaccard duplicate-intent score at least 0.90 with at "
        "least three meaningful shared title/slug tokens; objective thinness; zero "
        "GSC/Bing impressions, clicks, and Bing backlinks; and a target at least 200 "
        "words and 25% deeper with stronger search or internal-link evidence.",
        "",
        "NOINDEX and REMOVE require manual facts this dataset cannot prove, such as a "
        "non-search utility page or an obsolete/unsafe article with no redirect target. "
        "Neither is inferred automatically.",
        "",
        "## Audit signals",
        "",
        f"- Any observed GSC or Bing search/link evidence: **{len(rows) - zero_count}**.",
        f"- GSC evidence: **{gsc_evidence_count}** articles.",
        f"- Bing evidence: **{bing_evidence_count}** articles (overlaps GSC).",
        f"- Zero observed search/link evidence: **{zero_count}**.",
        f"- Objectively thin under the conservative structural rule: **{thin_count}**.",
        f"- Strong duplicate-intent match: **{duplicate_count}**.",
        "",
        "## Proven merge set",
        "",
    ]
    if merge_rows:
        lines.extend(markdown_table(merge_rows))
    else:
        lines.append(
            "None. No article passed all four gates, so the safe action is to freeze "
            "the corpus rather than manufacture a pruning experiment."
        )
    lines.extend(
        [
            "",
            "## Highest-priority manual review candidates",
            "",
            "These remain KEEP. They are shown because they have zero observed search "
            "evidence plus either thinness or a Jaccard intent overlap of at least 0.70, but at least one required "
            "merge gate failed.",
            "",
        ]
    )
    if review_rows:
        lines.extend(markdown_table(review_rows))
    else:
        lines.append("None.")
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "The matrix is a guardrail against blind pruning, not a promise of ranking "
            "growth. The current exports are too young and incomplete to justify "
            "sitewide deletions. Re-run the exact matrix after the fixed cohort has had "
            "a full measurement window; only rows that continue to pass all four gates "
            "should enter a merge plan.",
            "",
            f"Machine-readable matrix: `{args.output_csv}`.",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def find_latest(downloads: Path, pattern: str) -> Path:
    matches = sorted(downloads.glob(pattern), key=lambda item: item.stat().st_mtime)
    if not matches:
        raise FileNotFoundError(f"No file matching {pattern} in {downloads}")
    return matches[-1]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--articles", type=Path, default=Path("src/data/articles"))
    parser.add_argument("--sitemap", type=Path, default=Path("dist/sitemap-0.xml"))
    parser.add_argument("--gsc-zip", type=Path)
    parser.add_argument("--bing-csv", type=Path)
    parser.add_argument(
        "--recovery-csv",
        type=Path,
        default=Path("reports/growth/search-recovery-cohort-2026-07-23.csv"),
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=Path("reports/growth/article-pruning-matrix-2026-07-29.csv"),
    )
    parser.add_argument(
        "--output-md",
        type=Path,
        default=Path("reports/growth/article-pruning-matrix-2026-07-29.md"),
    )
    parser.add_argument(
        "--downloads",
        type=Path,
        default=Path.home() / "Downloads",
        help="Used only when --gsc-zip/--bing-csv are omitted.",
    )
    args = parser.parse_args(argv)
    if args.gsc_zip is None:
        args.gsc_zip = find_latest(
            args.downloads, "daily-life-hacks.com-Performance-on-Search-*.zip"
        )
    if args.bing_csv is None:
        args.bing_csv = find_latest(
            args.downloads, "daily-life-hacks.com_SiteExplorerUrls_*.csv"
        )
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    required = [
        args.articles,
        args.sitemap,
        args.gsc_zip,
        args.bing_csv,
        args.recovery_csv,
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        print("Missing required input: " + ", ".join(missing), file=sys.stderr)
        return 2
    articles = load_articles(args.articles)
    if not articles:
        print("No articles found.", file=sys.stderr)
        return 2
    rows = build_rows(
        articles,
        load_sitemap(args.sitemap),
        load_gsc_pages(args.gsc_zip),
        load_bing_urls(args.bing_csv),
        load_recovery_slugs(args.recovery_csv),
    )
    write_csv(args.output_csv, rows)
    write_report(args.output_md, rows, args)
    counts = Counter(str(row["decision"]) for row in rows)
    print(
        f"articles={len(rows)} KEEP={counts['KEEP']} MERGE={counts['MERGE']} "
        f"NOINDEX={counts['NOINDEX']} REMOVE={counts['REMOVE']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
