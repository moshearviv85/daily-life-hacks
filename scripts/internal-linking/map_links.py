"""Build the internal link graph for src/data/articles/.

Parses every article markdown file, extracts in-prose internal links
(markdown links whose href starts with "/"), and writes a JSON map to
pipeline-data/internal-link-map.json.

Usage:
    py -3 scripts/internal-linking/map_links.py [--out PATH]
"""
from __future__ import annotations

import argparse
import json
import re
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTICLES = ROOT / "src" / "data" / "articles"
PAGES = ROOT / "src" / "pages"

# Negative lookbehind on "!" so markdown images are not counted as links.
LINK_RE = re.compile(r"(?<!!)\[([^\]\[]+)\]\((/[^)\s]*)\)")
FM_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def normalise(href: str) -> str:
    """Strip query/hash, collapse to a leading+trailing-slash path."""
    href = href.split("#")[0].split("?")[0]
    if not href.startswith("/"):
        href = "/" + href
    if not href.endswith("/"):
        href += "/"
    return href


def real_pages() -> set[str]:
    """Every non-article route that exists under src/pages/."""
    out = {"/"}
    for p in PAGES.rglob("*.astro"):
        rel = p.relative_to(PAGES).as_posix()
        if "[" in rel:  # dynamic route, handled via slugs
            continue
        rel = rel[: -len(".astro")]
        if rel.endswith("/index"):
            rel = rel[: -len("/index")]
        if rel == "index":
            out.add("/")
            continue
        out.add(f"/{rel}/")
    for p in PAGES.rglob("*.ts"):
        rel = p.relative_to(PAGES).as_posix()
        if "[" in rel:
            continue
        out.add("/" + rel.replace(".ts", ""))
    return out


def parse_body(text: str) -> str:
    m = FM_RE.match(text)
    return text[m.end():] if m else text


def frontmatter_raw(text: str) -> str:
    m = FM_RE.match(text)
    return m.group(1) if m else ""


def field(fm: str, name: str) -> str | None:
    m = re.search(rf"^{name}:\s*\"?([^\"\n]+)\"?\s*$", fm, re.MULTILINE)
    return m.group(1).strip().strip('"') if m else None


def tags_of(fm: str) -> list[str]:
    m = re.search(r"^tags:\s*\n((?:\s*-\s*.+\n)+)", fm, re.MULTILINE)
    if m:
        return [ln.strip().lstrip("-").strip().strip('"') for ln in m.group(1).splitlines() if ln.strip()]
    m = re.search(r"^tags:\s*\[(.+)\]\s*$", fm, re.MULTILINE)
    if m:
        return [t.strip().strip('"').strip("'") for t in m.group(1).split(",")]
    return []


def build() -> dict:
    slugs = {p.stem for p in ARTICLES.glob("*.md")}
    pages = real_pages()
    nodes: dict[str, dict] = {}
    broken: list[dict] = []

    for p in sorted(ARTICLES.glob("*.md")):
        slug = p.stem
        text = p.read_text(encoding="utf-8")
        fm = frontmatter_raw(text)
        body = parse_body(text)
        out_links: list[dict] = []
        seen: set[str] = set()
        for m in LINK_RE.finditer(body):
            anchor, href = m.group(1), m.group(2)
            n = normalise(href)
            target_slug = n.strip("/")
            is_article = target_slug in slugs
            is_page = n in pages or n.rstrip("/") + "/" in pages
            if not is_page:
                # Static asset served straight out of public/ (CSV downloads, images).
                asset = (ROOT / "public" / href.split("#")[0].split("?")[0].lstrip("/"))
                is_page = asset.is_file()
            if not (is_article or is_page):
                broken.append({"from": slug, "href": href, "anchor": anchor})
            if is_article:
                if target_slug == slug:
                    continue
                dup = target_slug in seen
                seen.add(target_slug)
                out_links.append({"to": target_slug, "anchor": anchor, "duplicate": dup})
        nodes[slug] = {
            "slug": slug,
            "title": field(fm, "title"),
            "category": field(fm, "category"),
            "tags": tags_of(fm),
            "date": field(fm, "date"),
            "outbound": out_links,
            "outbound_count": len(out_links),
            "inbound": [],
            "inbound_count": 0,
        }

    for slug, node in nodes.items():
        for link in node["outbound"]:
            tgt = nodes.get(link["to"])
            if tgt is not None:
                tgt["inbound"].append(slug)
    for node in nodes.values():
        node["inbound"] = sorted(set(node["inbound"]))
        node["inbound_count"] = len(node["inbound"])

    inbound_counts = [n["inbound_count"] for n in nodes.values()]
    outbound_counts = [n["outbound_count"] for n in nodes.values()]
    orphans = sorted(s for s, n in nodes.items() if n["inbound_count"] == 0)
    thin = sorted(s for s, n in nodes.items() if n["inbound_count"] < 2)
    thin_out = sorted(s for s, n in nodes.items() if n["outbound_count"] < 3)

    return {
        "generated_from": "scripts/internal-linking/map_links.py",
        "article_count": len(nodes),
        "summary": {
            "total_internal_article_links": sum(outbound_counts),
            "orphans": len(orphans),
            "under_2_inbound": len(thin),
            "under_3_outbound": len(thin_out),
            "median_inbound": statistics.median(inbound_counts) if inbound_counts else 0,
            "mean_inbound": round(statistics.mean(inbound_counts), 2) if inbound_counts else 0,
            "median_outbound": statistics.median(outbound_counts) if outbound_counts else 0,
            "broken_links": len(broken),
        },
        "orphan_slugs": orphans,
        "under_2_inbound_slugs": thin,
        "under_3_outbound_slugs": thin_out,
        "broken": broken,
        "nodes": nodes,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "pipeline-data" / "internal-link-map.json"))
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    data = build()
    Path(args.out).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    if not args.quiet:
        print(json.dumps(data["summary"], indent=2))
        print(f"orphans ({len(data['orphan_slugs'])}): {data['orphan_slugs']}")
        if data["broken"]:
            print(f"BROKEN ({len(data['broken'])}):")
            for b in data["broken"]:
                print("  ", b)


if __name__ == "__main__":
    main()
