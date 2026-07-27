"""Reverse view: for a needy TARGET, find the best SOURCE articles to link from.

Complements suggest_targets.py. Used to push inbound links into the under-linked
data studies and the orphans, sourcing them from articles that already have
plenty of outbound links (so they are not in the thin-outbound work batch).

Usage:
    py -3 scripts/internal-linking/suggest_sources.py --targets a,b,c --min-out 3
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ARTICLES = ROOT / "src" / "data" / "articles"
MAP = ROOT / "pipeline-data" / "internal-link-map.json"

STOP = {
    "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "your",
    "you", "is", "are", "how", "what", "why", "best", "that", "this", "it", "at",
    "from", "by", "not", "but", "can", "get", "more", "make", "makes", "vs",
    "guide", "recipe", "recipes", "ideas", "way", "ways", "per", "into", "than",
    "when", "without", "about", "one", "two", "up", "out", "do", "does", "my",
}


def tokens(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z]+", (text or "").lower()) if w not in STOP and len(w) > 2}


def body_of(slug: str) -> str:
    text = (ARTICLES / f"{slug}.md").read_text(encoding="utf-8")
    m = re.match(r"^---\n.*?\n---\n", text, re.DOTALL)
    return (text[m.end():] if m else text).lower()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--targets", required=True, help="comma-separated target slugs")
    ap.add_argument("--min-out", type=int, default=3,
                    help="only consider sources with at least this many outbound links "
                         "(keeps us off files the thin-outbound pass is editing)")
    ap.add_argument("--top", type=int, default=8)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    data = json.loads(MAP.read_text(encoding="utf-8"))
    nodes = data["nodes"]
    bodies = {s: body_of(s) for s in nodes}
    tag_sets = {s: {t.lower() for t in v["tags"]} for s, v in nodes.items()}
    title_tok = {s: tokens(v["title"]) for s, v in nodes.items()}

    result = {}
    for tgt in [t.strip() for t in args.targets.split(",") if t.strip()]:
        if tgt not in nodes:
            result[tgt] = {"error": "slug not found in src/data/articles/"}
            continue
        tnode = nodes[tgt]
        linking_already = set(tnode["inbound"])
        cands = []
        for src, snode in nodes.items():
            if src == tgt or src in linking_already:
                continue
            if snode["outbound_count"] < args.min_out:
                continue
            body = bodies[src]
            mentioned = sorted(w for w in title_tok[tgt] if w in body)
            score = 1.2 * len(mentioned)
            score += 3.0 * len(tag_sets[src] & tag_sets[tgt])
            score += 1.5 * len(title_tok[src] & title_tok[tgt])
            if snode["category"] == tnode["category"]:
                score += 1.0
            if score < 8:
                continue
            cands.append({
                "slug": src,
                "title": snode["title"],
                "score": round(score, 1),
                "outbound_now": snode["outbound_count"],
                "target_words_in_source_prose": mentioned[:10],
            })
        cands.sort(key=lambda c: -c["score"])
        result[tgt] = {
            "title": tnode["title"],
            "inbound_now": tnode["inbound_count"],
            "inbound_from": sorted(linking_already),
            "source_candidates": cands[: args.top],
        }

    payload = json.dumps(result, indent=2, ensure_ascii=False)
    if args.out:
        Path(args.out).write_text(payload, encoding="utf-8")
        print(f"wrote {args.out}")
    else:
        print(payload)


if __name__ == "__main__":
    main()
