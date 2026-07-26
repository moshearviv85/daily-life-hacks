#!/usr/bin/env python3
"""Harvest real search queries from Google/Bing/DuckDuckGo autocomplete.

These are queries people ACTUALLY type. Alphabet + question-prefix expansion
turns a handful of seeds into thousands of real long-tail phrases, which is
the only reliable free source of demand data we have.

Usage:
  py -3 scripts/harvest_search_queries.py --seeds seeds.txt --out queries.json
  py -3 scripts/harvest_search_queries.py --demo
"""
from __future__ import annotations

import argparse
import json
import re
import string
import subprocess
import sys
import time
from collections import defaultdict
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

ENDPOINTS = {
    "google": "http://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q={q}",
    "bing": "https://api.bing.com/osjson.aspx?query={q}",
    "ddg": "https://duckduckgo.com/ac/?q={q}&type=list",
}

QUESTION_PREFIXES = ["how to", "how much", "how many", "how long", "what is", "what are",
                     "why is", "why does", "which", "can you", "is it", "does",
                     "best", "cheapest", "easiest"]
SUFFIX_MODS = ["for", "without", "vs", "at home", "on a budget", "reddit", "recipe", "list"]


def fetch(url: str, timeout: int = 12) -> list[str]:
    try:
        r = subprocess.run(["curl", "-s", "-H", f"User-Agent: {UA}", url, "--max-time", str(timeout)],
                           capture_output=True, text=True, timeout=timeout + 5)
        data = json.loads(r.stdout)
        return [s for s in data[1] if isinstance(s, str)] if len(data) > 1 else []
    except Exception:
        return []


def expand(seed: str, engines: list[str], deep: bool = True) -> dict[str, list[str]]:
    """Return {query: [engines that suggested it]} for one seed."""
    found: dict[str, set] = defaultdict(set)
    variants = [seed]
    if deep:
        variants += [f"{seed} {c}" for c in string.ascii_lowercase]
        variants += [f"{p} {seed}" for p in QUESTION_PREFIXES]
        variants += [f"{seed} {m}" for m in SUFFIX_MODS]
    for v in variants:
        q = v.replace(" ", "+")
        for eng in engines:
            for s in fetch(ENDPOINTS[eng].format(q=q)):
                s = s.strip().lower()
                if 3 <= len(s.split()) <= 12:
                    found[s].add(eng)
        time.sleep(0.12)
    return {k: sorted(v) for k, v in found.items()}


def score(query: str, engines: list[str]) -> dict:
    """Heuristic winnability + intent scoring for a low-authority site."""
    words = query.split()
    is_question = bool(re.match(r"^(how|what|why|which|when|can|is|are|does|do|should)\b", query))
    has_reddit = "reddit" in query
    commercial = any(w in query for w in ["cheapest", "cheap", "budget", "best", "worth it", "vs"])
    specific = len(words) >= 5
    # long-tail + question + specific = winnable without backlinks
    winnable = (2 if is_question else 0) + (2 if specific else 0) + (1 if len(engines) >= 2 else 0) \
               + (1 if has_reddit else 0) + (1 if commercial else 0)
    return {"query": query, "engines": engines, "words": len(words),
            "question": is_question, "commercial": commercial,
            "reddit_intent": has_reddit, "winnable_score": winnable}


DEMO_SEEDS = ["cheapest protein", "high fiber foods", "cheap meals", "dried beans",
              "meal prep", "protein on a budget", "how to cook beans", "fiber supplement food"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=Path)
    ap.add_argument("--out", type=Path, default=Path("pipeline-data/keyword-research/harvest.json"))
    ap.add_argument("--engines", default="google,bing,ddg")
    ap.add_argument("--shallow", action="store_true")
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()

    seeds = DEMO_SEEDS if args.demo else [
        s.strip() for s in args.seeds.read_text(encoding="utf-8").splitlines() if s.strip()]
    engines = args.engines.split(",")

    all_q: dict[str, list[str]] = {}
    for i, seed in enumerate(seeds, 1):
        got = expand(seed, engines, deep=not args.shallow)
        for q, eng in got.items():
            all_q.setdefault(q, [])
            all_q[q] = sorted(set(all_q[q]) | set(eng))
        print(f"[{i}/{len(seeds)}] {seed}: +{len(got)} (total {len(all_q)})", file=sys.stderr, flush=True)

    scored = sorted((score(q, e) for q, e in all_q.items()),
                    key=lambda r: (-r["winnable_score"], -r["words"]))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"seeds": seeds, "count": len(scored), "queries": scored},
                                   indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nharvested {len(scored)} unique real queries -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
