"""Parse Pin Inspector CSV exports (keywords + boards)."""
from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path
from typing import Any


def _int_from_comma_number(value: str) -> int:
    """Pin Inspector writes "1,234" — turn into int. Empty/invalid → 0."""
    value = (value or "").strip().replace(",", "")
    if not value or value.lower() == "not-given":
        return 0
    try:
        return int(float(value))
    except ValueError:
        return 0


def _open_csv(path: str | Path) -> list[dict[str, str]]:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Pin Inspector CSV not found: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def parse_pin_inspector_keywords(path: str | Path) -> list[dict[str, Any]]:
    """Autocomplete export. Columns: Keyword, Rank, Word Count, Character Count, Seed, ..."""
    out: list[dict[str, Any]] = []
    for row in _open_csv(path):
        keyword = (row.get("Keyword") or "").strip()
        if not keyword:
            continue
        out.append({
            "keyword": keyword,
            "rank": _int_from_comma_number(row.get("Rank", "")),
            "word_count": _int_from_comma_number(row.get("Word Count", "")),
            "character_count": _int_from_comma_number(row.get("Character Count", "")),
            "seed": (row.get("Seed") or "").strip(),
            "monthly_searches": _int_from_comma_number(row.get("Monthly Searches", "")),
        })
    return out


def parse_pin_inspector_boards(path: str | Path) -> list[dict[str, Any]]:
    """Boards export. Key columns: Board Name, Board Followers, Pin Count,
    Owner Followers, Related Interests."""
    out: list[dict[str, Any]] = []
    for row in _open_csv(path):
        name = (row.get("Board Name") or "").strip()
        if not name:
            continue
        related_raw = (row.get("Related Interests") or "").strip()
        related = [r.strip() for r in related_raw.split(",") if r.strip()] if related_raw and related_raw != "not-given" else []
        out.append({
            "board_id": (row.get("Board ID") or "").strip(),
            "board_name": name,
            "board_followers": _int_from_comma_number(row.get("Board Followers", "")),
            "pin_count": _int_from_comma_number(row.get("Pin Count", "")),
            "board_link": (row.get("Board Link") or "").strip(),
            "description": (row.get("Description") or "").strip(),
            "is_group_board": (row.get("Is Group Board", "").strip().upper() == "YES"),
            "owner_name": (row.get("Owner Name") or "").strip(),
            "owner_followers": _int_from_comma_number(row.get("Owner Followers", "")),
            "owner_username": (row.get("Owner Username") or "").strip(),
            "related_interests": related,
        })
    return out


def aggregate_related_interests(boards: list[dict[str, Any]]) -> dict[str, int]:
    """Count frequency of each Related Interest across a list of boards.
    High-frequency interests signal what Pinterest thinks this niche is about."""
    counter: Counter[str] = Counter()
    for b in boards:
        for interest in b.get("related_interests", []):
            if interest:
                counter[interest] += 1
    return dict(counter.most_common())


if __name__ == "__main__":
    import json
    import sys
    mode, filepath = sys.argv[1], sys.argv[2]
    if mode == "keywords":
        data = parse_pin_inspector_keywords(filepath)
    elif mode == "boards":
        data = parse_pin_inspector_boards(filepath)
    else:
        raise SystemExit("mode must be 'keywords' or 'boards'")
    print(json.dumps(data[:5], indent=2, ensure_ascii=False))
    print(f"Total rows: {len(data)}")
