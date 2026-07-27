"""Suggest internal-link targets for articles that are short on outbound links.

Scores every (source, target) pair by tag overlap, category match, title-token
overlap, and whether the source body already mentions words from the target
title (a strong signal that a natural anchor already exists in the prose).
Targets are boosted by how badly they need inbound links.

Usage:
    py -3 scripts/internal-linking/suggest_targets.py --min-out 3 --top 12
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
    ap.add_argument("--min-out", type=int, default=3)
    ap.add_argument("--top", type=int, default=12)
    ap.add_argument("--only", default=None, help="comma-separated source slugs")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    data = json.loads(MAP.read_text(encoding="utf-8"))
    nodes = data["nodes"]
    datasets_src = (ROOT / "src" / "content" / "datasets.ts").read_text(encoding="utf-8")
    dataset_slugs = set(re.findall(r'^  "([a-z0-9-]+)": \{', datasets_src, re.M))

    bodies = {s: body_of(s) for s in nodes}
    tag_sets = {s: {t.lower() for t in v["tags"]} for s, v in nodes.items()}
    title_tok = {s: tokens(v["title"]) for s, v in nodes.items()}

    if args.only:
        sources = [s.strip() for s in args.only.split(",") if s.strip()]
    else:
        sources = [s for s, v in nodes.items() if v["outbound_count"] < args.min_out]

    result = {}
    for src in sources:
        node = nodes[src]
        already = {l["to"] for l in node["outbound"]}
        body = bodies[src]
        cands = []
        for tgt, tnode in nodes.items():
            if tgt == src or tgt in already:
                continue
            score = 0.0
            shared_tags = tag_sets[src] & tag_sets[tgt]
            score += 3.0 * len(shared_tags)
            if node["category"] == tnode["category"]:
                score += 1.0
            shared_title = title_tok[src] & title_tok[tgt]
            score += 1.5 * len(shared_title)
            # Does the source prose already talk about the target's subject?
            mentioned = sorted(w for w in title_tok[tgt] if w in body)
            score += 1.2 * len(mentioned)
            # Need-based boost: send links where they are missing.
            ib = tnode["inbound_count"]
            need = 0.0
            if ib == 0:
                need = 14.0
            elif ib == 1:
                need = 9.0
            elif ib < 4 and tgt in dataset_slugs:
                need = 7.0
            elif tgt in dataset_slugs:
                need = 4.0
            score += need
            if score < 8:
                continue
            cands.append({
                "slug": tgt,
                "title": tnode["title"],
                "score": round(score, 1),
                "inbound_now": ib,
                "is_dataset": tgt in dataset_slugs,
                "shared_tags": sorted(shared_tags),
                "words_already_in_source_prose": mentioned[:8],
            })
        cands.sort(key=lambda c: -c["score"])
        result[src] = {
            "title": node["title"],
            "category": node["category"],
            "tags": node["tags"],
            "outbound_now": node["outbound_count"],
            "existing_targets": sorted(already),
            "needs": max(0, args.min_out - node["outbound_count"]),
            "candidates": cands[: args.top],
        }

    payload = json.dumps(result, indent=2, ensure_ascii=False)
    if args.out:
        Path(args.out).write_text(payload, encoding="utf-8")
        print(f"wrote {args.out} ({len(result)} sources)")
    else:
        print(payload)


if __name__ == "__main__":
    main()
