"""Parse Pinterest "Audience Insights" CSV export.

The export is multi-section: a header block, then sections separated by blank
lines. Each section has its own header row. We normalize the whole thing into
a plain dict with one list per section.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Any


# Maps the section-header token (case-insensitive match on the first cell) to the
# output key + parser mode. 'simple' = two columns (value, percent). 'interests'
# is the wide 8-column interests block.
_SECTIONS = {
    "interests": ("interests", "interests"),
    "countries": ("countries", "simple"),
    "metros": ("metros", "simple"),
    "gender": ("gender", "simple"),
    "device": ("device", "simple"),
    "age": ("age", "simple"),
}


def _to_float(value: str) -> float | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def parse_audience_csv(path: str | Path) -> dict[str, Any]:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Audience CSV not found: {path}")

    # utf-8-sig handles BOM that Pinterest sometimes adds.
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))

    result: dict[str, Any] = {
        "audience_size": None,
        "interests": [],
        "countries": [],
        "metros": [],
        "gender": [],
        "device": [],
        "age": [],
    }

    # First block: "Audience View,Date,Aggregation,Audience Size" then data row.
    if rows and rows[0] and rows[0][0].strip().lower().startswith("audience view"):
        if len(rows) > 1 and len(rows[1]) >= 4:
            try:
                result["audience_size"] = int(float(rows[1][3]))
            except (ValueError, IndexError):
                pass

    section_key: str | None = None
    section_mode: str | None = None
    skip_next_header = False

    for row in rows:
        # Blank row ends a section.
        if not row or all(not cell.strip() for cell in row):
            section_key = None
            section_mode = None
            continue

        first = row[0].strip()

        # Section header: single cell with a known name.
        lower = first.lower()
        if lower in _SECTIONS and (len(row) == 1 or not any(cell.strip() for cell in row[1:])):
            section_key, section_mode = _SECTIONS[lower]
            skip_next_header = True
            continue

        # "Countries,Percent of audience" header-row form — first cell names the section,
        # second cell is the column header.
        if len(row) >= 2 and lower in _SECTIONS and row[1].strip().lower().startswith("percent"):
            section_key, section_mode = _SECTIONS[lower]
            skip_next_header = False
            continue

        if section_key is None:
            continue

        if skip_next_header:
            # Subheader like "Category,Bulk Sheet Category,Percent of audience,..."
            skip_next_header = False
            continue

        if section_mode == "interests":
            # Columns: 0=Category, 1=bulk, 2=cat_pct, 3=cat_aff, 4=Interest, 5=bulk, 6=pct, 7=aff
            if len(row) < 8:
                continue
            result["interests"].append({
                "category": row[0].strip(),
                "category_percent": _to_float(row[2]),
                "category_affinity": _to_float(row[3]),
                "interest": row[4].strip(),
                "percent": _to_float(row[6]),
                "affinity": _to_float(row[7]),
            })
        elif section_mode == "simple":
            if len(row) < 2:
                continue
            value = row[0].strip()
            if not value:
                continue
            result[section_key].append({
                "value": value,
                "percent": _to_float(row[1]),
            })

    return result


if __name__ == "__main__":
    import json
    import sys
    data = parse_audience_csv(sys.argv[1])
    print(json.dumps(data, indent=2, ensure_ascii=False))
