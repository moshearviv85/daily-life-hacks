#!/usr/bin/env python3
"""Validate and merge the organic-growth execution triage files."""

from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "pipeline-data" / "traffic-methods.json"
PROGRAM_DIR = ROOT / "reports" / "growth" / "execution-program"
TRIAGE_FILES = (
    PROGRAM_DIR / "01-search-content-triage.csv",
    PROGRAM_DIR / "02-social-communities-triage.csv",
    PROGRAM_DIR / "03-distribution-people-risk-triage.csv",
)
MASTER = PROGRAM_DIR / "master-execution-backlog.csv"
REPORT = PROGRAM_DIR / "coverage-report.json"

REQUIRED_COLUMNS = (
    "category",
    "title",
    "flag",
    "decision",
    "decision_reason",
    "expected_impact",
    "effort",
    "prerequisites",
    "execution_owner",
    "proof_required",
    "kpi",
    "phase",
)
VALID_DECISIONS = {
    "EXECUTE_NOW",
    "QUEUE",
    "DEPENDENCY",
    "MANUAL_EXTERNAL",
    "REJECT",
}


def load_source() -> list[dict[str, str]]:
    with SOURCE.open(encoding="utf-8") as handle:
        rows = json.load(handle)
    if not isinstance(rows, list):
        raise ValueError(f"{SOURCE} must contain a JSON array")
    return rows


def load_triage() -> tuple[list[dict[str, str]], list[str]]:
    rows: list[dict[str, str]] = []
    errors: list[str] = []
    for path in TRIAGE_FILES:
        if not path.exists():
            errors.append(f"missing triage file: {path.relative_to(ROOT)}")
            continue
        with path.open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            missing_columns = [
                column for column in REQUIRED_COLUMNS if column not in (reader.fieldnames or [])
            ]
            if missing_columns:
                errors.append(
                    f"{path.name}: missing columns {', '.join(missing_columns)}"
                )
                continue
            for line_number, row in enumerate(reader, start=2):
                normalized = {
                    column: (row.get(column) or "").strip()
                    for column in REQUIRED_COLUMNS
                }
                normalized["_source_file"] = path.name
                normalized["_source_line"] = str(line_number)
                rows.append(normalized)
    return rows, errors


def main() -> int:
    source_rows = load_source()
    triage_rows, errors = load_triage()

    source_keys = [
        (str(row.get("category", "")).strip(), str(row.get("title", "")).strip())
        for row in source_rows
    ]
    triage_keys = [(row["category"], row["title"]) for row in triage_rows]
    source_key_set = set(source_keys)
    triage_counts = Counter(triage_keys)

    duplicate_keys = [
        {"category": key[0], "title": key[1], "count": count}
        for key, count in sorted(triage_counts.items())
        if count > 1
    ]
    missing_keys = sorted(source_key_set - set(triage_keys))
    unexpected_keys = sorted(set(triage_keys) - source_key_set)

    row_errors: list[str] = []
    for row in triage_rows:
        location = f"{row['_source_file']}:{row['_source_line']}"
        if row["decision"] not in VALID_DECISIONS:
            row_errors.append(f"{location}: invalid decision {row['decision']!r}")
        for column in REQUIRED_COLUMNS:
            if not row[column]:
                row_errors.append(f"{location}: blank required field {column}")
        if row["decision"] == "REJECT" and len(row["decision_reason"]) < 20:
            row_errors.append(
                f"{location}: rejected method needs a specific decision_reason"
            )
        if row["decision"] == "DEPENDENCY" and not row["prerequisites"]:
            row_errors.append(f"{location}: dependency is missing prerequisites")

    errors.extend(row_errors)
    if duplicate_keys:
        errors.append(f"{len(duplicate_keys)} duplicate source keys in triage")
    if missing_keys:
        errors.append(f"{len(missing_keys)} source methods are unclassified")
    if unexpected_keys:
        errors.append(f"{len(unexpected_keys)} triage rows are not in source inventory")

    report = {
        "source_count": len(source_rows),
        "source_unique_count": len(source_key_set),
        "triage_count": len(triage_rows),
        "covered_unique_count": len(source_key_set & set(triage_keys)),
        "missing_count": len(missing_keys),
        "duplicate_count": len(duplicate_keys),
        "unexpected_count": len(unexpected_keys),
        "decision_counts": dict(
            sorted(Counter(row["decision"] for row in triage_rows).items())
        ),
        "category_counts": dict(
            sorted(Counter(row["category"] for row in triage_rows).items())
        ),
        "missing": [
            {"category": category, "title": title}
            for category, title in missing_keys
        ],
        "duplicates": duplicate_keys,
        "unexpected": [
            {"category": category, "title": title}
            for category, title in unexpected_keys
        ],
        "errors": errors,
        "status": "PASS" if not errors else "FAIL",
    }
    PROGRAM_DIR.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    if errors:
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 1

    source_by_key = {
        (
            str(row.get("category", "")).strip(),
            str(row.get("title", "")).strip(),
        ): row
        for row in source_rows
    }
    with MASTER.open("w", encoding="utf-8-sig", newline="") as handle:
        fieldnames = (
            *REQUIRED_COLUMNS,
            "source_what",
            "source_traffic",
            "source_risk",
        )
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in sorted(
            triage_rows,
            key=lambda item: (
                item["phase"],
                item["decision"],
                item["category"],
                item["title"],
            ),
        ):
            source = source_by_key[(row["category"], row["title"])]
            output = {column: row[column] for column in REQUIRED_COLUMNS}
            output.update(
                {
                    "source_what": str(source.get("what", "")).strip(),
                    "source_traffic": str(source.get("traffic", "")).strip(),
                    "source_risk": str(source.get("risk", "")).strip(),
                }
            )
            writer.writerow(output)

    print(
        "PASS: "
        f"{report['covered_unique_count']}/{report['source_count']} methods covered; "
        "0 missing; 0 duplicates; 0 unexplained rejections"
    )
    print(f"Master backlog: {MASTER.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
