#!/usr/bin/env python3
"""Synchronize and validate the organic-growth execution ledger.

The research backlog is generated from the triage inventory. Execution state is
kept in a separate file so rebuilding the research backlog cannot erase proof.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import subprocess
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Callable
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
PROGRAM_DIR = ROOT / "reports" / "growth" / "execution-program"
DEFAULT_MASTER = PROGRAM_DIR / "master-execution-backlog.csv"
DEFAULT_LEDGER = PROGRAM_DIR / "execution-ledger.csv"
DEFAULT_SEED = PROGRAM_DIR / "execution-evidence-seed.json"
DEFAULT_JSON_REPORT = PROGRAM_DIR / "execution-ledger-summary.json"
DEFAULT_MD_REPORT = PROGRAM_DIR / "execution-ledger-summary.md"

LEDGER_FIELDS = (
    "method_id",
    "category",
    "title",
    "execution_status",
    "evidence_commit",
    "live_url",
    "released_at",
    "measurement_due",
    "prerequisites",
    "execution_owner",
    "notes",
)
VALID_STATUSES = {
    "NOT_STARTED",
    "IN_PROGRESS",
    "IMPLEMENTED",
    "RELEASED",
    "MEASURED",
    "BLOCKED",
    "REJECTED",
}
PROOF_STATUSES = {"IMPLEMENTED", "RELEASED", "MEASURED", "REJECTED"}
RELEASE_STATUSES = {"RELEASED", "MEASURED"}
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
HTTP_URL_RE = re.compile(r"^https://", re.IGNORECASE)


def method_id(category: str, title: str) -> str:
    value = f"{category.strip()}\x1f{title.strip()}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()[:20]


def load_csv(path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return (
            [
                {key: (value or "").strip() for key, value in row.items()}
                for row in reader
            ],
            list(reader.fieldnames or []),
        )


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=LEDGER_FIELDS)
        writer.writeheader()
        writer.writerows({field: row.get(field, "") for field in LEDGER_FIELDS} for row in rows)


def parse_timestamp(value: str, field: str) -> tuple[datetime | None, str | None]:
    try:
        timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None, f"{field} must be an ISO-8601 timestamp"
    if timestamp.tzinfo is None:
        return None, f"{field} must include a timezone"
    return timestamp, None


def commit_is_on_main(commit: str, repo_root: Path = ROOT) -> bool:
    exists = subprocess.run(
        ["git", "cat-file", "-e", f"{commit}^{{commit}}"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if exists.returncode:
        return False
    reachable = subprocess.run(
        ["git", "merge-base", "--is-ancestor", commit, "origin/main"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    return reachable.returncode == 0


def live_url_works(url: str) -> bool:
    request = Request(url, method="HEAD", headers={"User-Agent": "dlh-ledger-validator/1.0"})
    try:
        with urlopen(request, timeout=15) as response:
            return 200 <= response.status < 400
    except HTTPError as error:
        if error.code not in {403, 405}:
            return False
    except OSError:
        return False

    request = Request(url, method="GET", headers={"User-Agent": "dlh-ledger-validator/1.0"})
    try:
        with urlopen(request, timeout=15) as response:
            return 200 <= response.status < 400
    except (HTTPError, OSError):
        return False


def validate(
    master_rows: list[dict[str, str]],
    ledger_rows: list[dict[str, str]],
    *,
    commit_check: Callable[[str], bool] = commit_is_on_main,
    verify_live: bool = False,
    live_check: Callable[[str], bool] = live_url_works,
) -> list[str]:
    errors: list[str] = []
    master_by_key = {(row["category"], row["title"]): row for row in master_rows}
    ledger_keys = [(row["category"], row["title"]) for row in ledger_rows]
    ledger_counts = Counter(ledger_keys)

    if len(master_by_key) != len(master_rows):
        errors.append("master backlog contains duplicate category/title keys")
    duplicate_ledger = [key for key, count in ledger_counts.items() if count > 1]
    if duplicate_ledger:
        errors.append(f"execution ledger contains {len(duplicate_ledger)} duplicate keys")

    missing = sorted(set(master_by_key) - set(ledger_keys))
    unexpected = sorted(set(ledger_keys) - set(master_by_key))
    if missing:
        errors.append(f"execution ledger is missing {len(missing)} master rows")
    if unexpected:
        errors.append(f"execution ledger contains {len(unexpected)} unexpected rows")

    checked_commits: dict[str, bool] = {}
    checked_urls: dict[str, bool] = {}
    for line_number, row in enumerate(ledger_rows, start=2):
        location = f"execution-ledger.csv:{line_number}"
        key = (row["category"], row["title"])
        master = master_by_key.get(key)
        expected_id = method_id(*key)
        status = row["execution_status"]

        if row["method_id"] != expected_id:
            errors.append(f"{location}: method_id does not match category/title")
        if status not in VALID_STATUSES:
            errors.append(f"{location}: invalid execution_status {status!r}")
            continue
        if master is None:
            continue

        if master["decision"] == "REJECT" and status != "REJECTED":
            errors.append(f"{location}: REJECT decision must have REJECTED status")
        if master["decision"] != "REJECT" and status == "REJECTED":
            errors.append(f"{location}: only a REJECT decision may have REJECTED status")

        if status in {"IN_PROGRESS", "BLOCKED"} and not row["notes"]:
            errors.append(f"{location}: {status} requires notes")

        if master["decision"] in {"DEPENDENCY", "MANUAL_EXTERNAL"}:
            if status == "NOT_STARTED":
                errors.append(
                    f"{location}: {master['decision']} must be BLOCKED or have progressed"
                )
            if status == "BLOCKED":
                if row["prerequisites"] != master["prerequisites"]:
                    errors.append(
                        f"{location}: BLOCKED prerequisites must match the master backlog"
                    )
                if row["execution_owner"] != master["execution_owner"]:
                    errors.append(
                        f"{location}: BLOCKED execution_owner must match the master backlog"
                    )
        elif status == "BLOCKED" and (
            not row["prerequisites"] or not row["execution_owner"]
        ):
            errors.append(
                f"{location}: BLOCKED requires prerequisites and execution_owner"
            )

        if status in PROOF_STATUSES:
            commit = row["evidence_commit"]
            if not COMMIT_RE.fullmatch(commit):
                errors.append(f"{location}: {status} requires a full 40-character evidence_commit")
            else:
                if commit not in checked_commits:
                    checked_commits[commit] = commit_check(commit)
                if not checked_commits[commit]:
                    errors.append(f"{location}: evidence_commit is not reachable from origin/main")
            if not row["notes"]:
                errors.append(f"{location}: {status} requires proof notes")

        if status in RELEASE_STATUSES:
            if not HTTP_URL_RE.match(row["live_url"]):
                errors.append(f"{location}: {status} requires an HTTPS live_url")
            released_at, released_error = parse_timestamp(row["released_at"], "released_at")
            measurement_due, due_error = parse_timestamp(
                row["measurement_due"], "measurement_due"
            )
            if released_error:
                errors.append(f"{location}: {released_error}")
            if due_error:
                errors.append(f"{location}: {due_error}")
            if released_at and measurement_due and measurement_due <= released_at:
                errors.append(f"{location}: measurement_due must be after released_at")
            if verify_live and HTTP_URL_RE.match(row["live_url"]):
                url = row["live_url"]
                if url not in checked_urls:
                    checked_urls[url] = live_check(url)
                if not checked_urls[url]:
                    errors.append(f"{location}: live_url did not return a 2xx/3xx response")
        elif row["released_at"] or row["measurement_due"]:
            errors.append(f"{location}: only RELEASED or MEASURED may have release timestamps")

        if status == "MEASURED" and "measurement:" not in row["notes"].lower():
            errors.append(f"{location}: MEASURED notes must include 'measurement:' proof")

        if status in {"NOT_STARTED", "BLOCKED"} and row["evidence_commit"]:
            errors.append(f"{location}: {status} cannot claim an evidence_commit")

    return errors


def synchronize(
    master_rows: list[dict[str, str]],
    existing_rows: list[dict[str, str]],
    seed: dict,
) -> list[dict[str, str]]:
    existing = {(row["category"], row["title"]): row for row in existing_rows}
    release_seed = {
        (row["category"], row["title"]): row for row in seed.get("verified_rows", [])
    }
    rejection_commit = str(seed.get("rejection_decision_commit", "")).strip()
    rows: list[dict[str, str]] = []

    for master in master_rows:
        key = (master["category"], master["title"])
        if key in existing:
            row = {field: existing[key].get(field, "") for field in LEDGER_FIELDS}
            row["method_id"] = method_id(*key)
            row["category"], row["title"] = key
        elif key in release_seed:
            seeded = release_seed[key]
            row = {field: str(seeded.get(field, "")).strip() for field in LEDGER_FIELDS}
            row["method_id"] = method_id(*key)
            row["category"], row["title"] = key
        elif master["decision"] == "REJECT":
            row = {
                "method_id": method_id(*key),
                "category": key[0],
                "title": key[1],
                "execution_status": "REJECTED",
                "evidence_commit": rejection_commit,
                "live_url": "",
                "released_at": "",
                "measurement_due": "",
                "prerequisites": "",
                "execution_owner": "",
                "notes": (
                    "Rejected by the version-controlled triage decision. "
                    "Reopen only if its documented premise changes."
                ),
            }
        elif master["decision"] in {"DEPENDENCY", "MANUAL_EXTERNAL"}:
            decision_label = (
                "Named dependency is unresolved."
                if master["decision"] == "DEPENDENCY"
                else "Manual or external execution is required."
            )
            row = {
                "method_id": method_id(*key),
                "category": key[0],
                "title": key[1],
                "execution_status": "BLOCKED",
                "evidence_commit": "",
                "live_url": "",
                "released_at": "",
                "measurement_due": "",
                "prerequisites": master["prerequisites"],
                "execution_owner": master["execution_owner"],
                "notes": decision_label,
            }
        else:
            row = {
                "method_id": method_id(*key),
                "category": key[0],
                "title": key[1],
                "execution_status": "NOT_STARTED",
                "evidence_commit": "",
                "live_url": "",
                "released_at": "",
                "measurement_due": "",
                "prerequisites": "",
                "execution_owner": "",
                "notes": "",
            }
        if (
            master["decision"] in {"DEPENDENCY", "MANUAL_EXTERNAL"}
            and row["execution_status"] == "NOT_STARTED"
        ):
            row["execution_status"] = "BLOCKED"
            row["prerequisites"] = master["prerequisites"]
            row["execution_owner"] = master["execution_owner"]
            row["notes"] = (
                "Named dependency is unresolved."
                if master["decision"] == "DEPENDENCY"
                else "Manual or external execution is required."
            )
        rows.append(row)

    return sorted(rows, key=lambda row: (row["category"], row["title"]))


def build_summary(
    master_rows: list[dict[str, str]],
    ledger_rows: list[dict[str, str]],
    errors: list[str],
) -> dict:
    decision_counts = Counter(row["decision"] for row in master_rows)
    status_counts = Counter(row["execution_status"] for row in ledger_rows)
    executable = [row for row in master_rows if row["decision"] != "REJECT"]
    executable_keys = {(row["category"], row["title"]) for row in executable}
    released_or_measured = sum(
        1
        for row in ledger_rows
        if (row["category"], row["title"]) in executable_keys
        and row["execution_status"] in {"RELEASED", "MEASURED"}
    )
    proved = sum(
        1
        for row in ledger_rows
        if (row["category"], row["title"]) in executable_keys
        and row["execution_status"] in {"IMPLEMENTED", "RELEASED", "MEASURED"}
    )
    master_decision_by_key = {
        (row["category"], row["title"]): row["decision"] for row in master_rows
    }
    blocked_by_decision = Counter(
        master_decision_by_key[(row["category"], row["title"])]
        for row in ledger_rows
        if row["execution_status"] == "BLOCKED"
    )
    not_started_by_decision = Counter(
        master_decision_by_key[(row["category"], row["title"])]
        for row in ledger_rows
        if row["execution_status"] == "NOT_STARTED"
    )
    return {
        "status": "PASS" if not errors else "FAIL",
        "master_rows": len(master_rows),
        "ledger_rows": len(ledger_rows),
        "decision_counts": dict(sorted(decision_counts.items())),
        "execution_status_counts": dict(sorted(status_counts.items())),
        "executable_rows": len(executable),
        "proved_executable_rows": proved,
        "released_or_measured_rows": released_or_measured,
        "unproved_executable_rows": len(executable) - proved,
        "blocked_by_decision": dict(sorted(blocked_by_decision.items())),
        "not_started_by_decision": dict(sorted(not_started_by_decision.items())),
        "errors": errors,
    }


def write_reports(summary: dict, json_path: Path, md_path: Path) -> None:
    json_path.write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    counts = summary["execution_status_counts"]
    lines = [
        "# Growth Execution Ledger Summary",
        "",
        f"Validation: **{summary['status']}**",
        "",
        "## Coverage",
        "",
        f"- Master backlog rows: {summary['master_rows']}",
        f"- Ledger rows: {summary['ledger_rows']}",
        f"- Executable rows: {summary['executable_rows']}",
        f"- Executable rows with implementation proof: {summary['proved_executable_rows']}",
        f"- Released or measured executable rows: {summary['released_or_measured_rows']}",
        f"- Executable rows without completion proof: {summary['unproved_executable_rows']}",
        "",
        "## Execution status",
        "",
    ]
    lines.extend(f"- {status}: {counts.get(status, 0)}" for status in sorted(VALID_STATUSES))
    lines.extend(
        [
            "",
            "## Blocking breakdown",
            "",
            *(
                f"- {decision}: {count}"
                for decision, count in summary["blocked_by_decision"].items()
            ),
            "",
            "Rows awaiting direct execution:",
            "",
            *(
                f"- {decision}: {count}"
                for decision, count in summary["not_started_by_decision"].items()
            ),
            "",
            "A row is never counted as implemented, released, measured, or rejected",
            "without a full commit SHA reachable from `origin/main`. Released rows also",
            "require an HTTPS URL and timezone-aware release and measurement timestamps.",
            "",
        ]
    )
    if summary["errors"]:
        lines.extend(["## Errors", ""])
        lines.extend(f"- {error}" for error in summary["errors"])
        lines.append("")
    md_path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--master", type=Path, default=DEFAULT_MASTER)
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    parser.add_argument("--seed", type=Path, default=DEFAULT_SEED)
    parser.add_argument("--sync", action="store_true")
    parser.add_argument("--verify-live", action="store_true")
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--json-report", type=Path, default=DEFAULT_JSON_REPORT)
    parser.add_argument("--md-report", type=Path, default=DEFAULT_MD_REPORT)
    args = parser.parse_args()

    master_rows, master_fields = load_csv(args.master)
    required_master = {"category", "title", "decision"}
    if not required_master.issubset(master_fields):
        print("FAIL: master backlog is missing category, title, or decision")
        return 1

    existing_rows: list[dict[str, str]] = []
    if args.ledger.exists():
        existing_rows, ledger_fields = load_csv(args.ledger)
        missing_fields = [field for field in LEDGER_FIELDS if field not in ledger_fields]
        if missing_fields and not args.sync:
            print(f"FAIL: ledger missing columns: {', '.join(missing_fields)}")
            return 1
    elif not args.sync:
        print(f"FAIL: missing ledger: {args.ledger}")
        return 1

    if args.sync:
        seed = json.loads(args.seed.read_text(encoding="utf-8"))
        existing_rows = synchronize(master_rows, existing_rows, seed)
        write_csv(args.ledger, existing_rows)

    errors = validate(master_rows, existing_rows, verify_live=args.verify_live)
    summary = build_summary(master_rows, existing_rows, errors)
    if args.write_report:
        write_reports(summary, args.json_report, args.md_report)

    print(
        f"{summary['status']}: {summary['ledger_rows']}/{summary['master_rows']} rows; "
        f"{summary['proved_executable_rows']} executable rows with proof; "
        f"{summary['released_or_measured_rows']} released/measured"
    )
    for error in errors:
        print(f"- {error}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
