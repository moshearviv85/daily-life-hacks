"""Select approved pipeline topics for article production.

This is a deterministic gate used by GitHub Actions before spending model
credits. Dashboard approval is necessary, but not sufficient: low-specificity
or duplicated topics are rejected here and can be marked rejected in D1.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from filter_discovered_topics import read_article_titles, quality_score_topic  # noqa: E402


def _parse_topic_ids(raw: str) -> set[int]:
    return {int(x) for x in raw.replace(" ", "").split(",") if x}


def select_topics(
    topics: list[dict[str, Any]],
    *,
    count: int,
    category: str = "",
    topic_ids: set[int] | None = None,
    known_titles: list[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    wanted_ids = topic_ids or set()
    candidates = list(topics)
    if category:
        candidates = [t for t in candidates if t.get("category") == category]
    if wanted_ids:
        candidates = [t for t in candidates if int(t.get("id", 0)) in wanted_ids]

    selected: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    seen_titles = list(known_titles if known_titles is not None else read_article_titles())

    for topic in candidates:
        ok, reason, score = quality_score_topic(str(topic.get("topic", "")), seen_titles)
        if not ok:
            rejected.append({
                **topic,
                "reject_reason": reason,
                "dedup_score": topic.get("dedup_score", score),
            })
            continue
        if wanted_ids:
            selected.append({
                **topic,
                "quality_reason": "manual topic_ids selection passed deterministic quality gate",
                "quality_score": topic.get("dedup_score", score),
            })
            seen_titles.append(str(topic.get("topic", "")))
            continue
        selected.append({
            **topic,
            "quality_reason": reason,
            "quality_score": score,
        })
        seen_titles.append(str(topic.get("topic", "")))
        if not wanted_ids and len(selected) >= count:
            break

    return selected, rejected


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Select production-safe approved topics")
    parser.add_argument("--input", required=True)
    parser.add_argument("--count", type=int, default=3)
    parser.add_argument("--category", default="")
    parser.add_argument("--topic-ids", default="")
    parser.add_argument("--selected-output", required=True)
    parser.add_argument("--rejected-output", required=True)
    args = parser.parse_args(argv)

    data = json.loads(Path(args.input).read_text(encoding="utf-8-sig"))
    topics = data.get("topics", data if isinstance(data, list) else [])
    selected, rejected = select_topics(
        topics,
        count=args.count,
        category=args.category.strip(),
        topic_ids=_parse_topic_ids(args.topic_ids),
    )

    Path(args.selected_output).write_text(json.dumps(selected, indent=2), encoding="utf-8")
    Path(args.rejected_output).write_text(json.dumps(rejected, indent=2), encoding="utf-8")

    print(f"Selected {len(selected)} topic(s); rejected {len(rejected)} low-quality approved topic(s).", file=sys.stderr)
    for topic in selected:
        print(f"  SELECT [{topic.get('category')}] {topic.get('topic')}", file=sys.stderr)
    for topic in rejected:
        print(f"  REJECT [{topic.get('category')}] {topic.get('topic')}: {topic.get('reject_reason')}", file=sys.stderr)
    print(json.dumps([t.get("id") for t in selected]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
