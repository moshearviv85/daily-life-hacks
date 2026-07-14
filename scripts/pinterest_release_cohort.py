#!/usr/bin/env python3
"""Prepare / gate / (optionally) apply a controlled Pinterest cohort release.

Default mode is dry-run:
  - validates selected pins only
  - for schedule_mode=replace_next_30d: preserves UTC slots via replacements
  - writes approval artifact + transaction preview + replacement manifest
  - performs ZERO D1 writes

The CLI is intentionally dry-run only. Exact-slot production replacement uses
the separately reviewed, fail-closed SQL release artifact after deployment.

This script never changes MAX_PINS_PER_RUN and never posts to Pinterest.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.pinterest_release import (  # noqa: E402
    CONFIRM_TOKEN,
    WriteGuard,
    advance_gate,
    append_ledger,
    confirmation_ok,
    load_json,
    prepare_cohort_dry_run,
    production_csv_rows,
)
from scripts.pinterest_queue_health import load_queue_rows  # noqa: E402


DEFAULT_COHORT = ROOT / "pipeline-data" / "experiments" / "pinterest-research-cohort-2026-07-13.json"
DEFAULT_LEDGER = ROOT / "pipeline-data" / "distribution-release-ledger.jsonl"
DEFAULT_APPROVAL_DIR = ROOT / "pipeline-data" / "approvals"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cohort", type=Path, default=DEFAULT_COHORT)
    p.add_argument(
        "--select",
        nargs="+",
        default=None,
        help="Selected pin_slug values only (default: cohort.selected_pin_slugs)",
    )
    p.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    p.add_argument("--approval-dir", type=Path, default=DEFAULT_APPROVAL_DIR)
    p.add_argument(
        "--queue-snapshot",
        type=Path,
        default=None,
        help="Optional queue snapshot for proposed active-queue preview",
    )
    p.add_argument(
        "--skip-live-url",
        action="store_true",
        help="Skip live destination URL checks (tests / offline)",
    )
    p.add_argument(
        "--advance-gate",
        choices=("APPROVED", "PENDING"),
        default=None,
        help="Advance an existing approval artifact gate REVIEW->APPROVED or APPROVED->PENDING",
    )
    p.add_argument(
        "--approval-file",
        type=Path,
        default=None,
        help="Existing approval artifact for --advance-gate",
    )
    p.add_argument(
        "--apply-production",
        action="store_true",
        help="Enable production write path (still requires confirmation token)",
    )
    p.add_argument(
        "--confirm-token",
        default=None,
        help=f"Must equal {CONFIRM_TOKEN!r} (or set PINTEREST_RELEASE_CONFIRM)",
    )
    p.add_argument(
        "--write-ledger",
        action="store_true",
        help="Append REVIEW rows to local ledger JSONL (still not D1)",
    )
    return p.parse_args(argv)


def _print_slots(result) -> None:
    mode = result.schedule_mode
    print(f"Proposed UTC slots (mode={mode}):")
    for row in result.rows:
        print(
            f"  {row.scheduled_at_utc}  [{row.variant}]  {row.pin_slug}  "
            f"article={row.article_slug}  row_id={row.queue_row_id}"
        )


def _print_transaction_preview(preview: list[dict]) -> None:
    if not preview:
        return
    print("Transaction preview (old preserved PENDING->REVIEW; slots unchanged):")
    for item in preview:
        print(
            f"  {item['old_row_id']} ({item['old_title']}) -> "
            f"{item['replacement_row_id']} ({item['replacement_title']}) "
            f"@ {item['preserved_utc_slot']}"
        )
        print(f"    reason: {item['reason']}")


def run_dry_run(args: argparse.Namespace) -> int:
    cohort = load_json(args.cohort)
    guard = WriteGuard(
        allowed=bool(args.apply_production),
        confirm_ok=confirmation_ok(args.confirm_token),
    )
    queue_rows = load_queue_rows(args.queue_snapshot, None) if args.queue_snapshot else []
    result = prepare_cohort_dry_run(
        cohort,
        repo_root=ROOT,
        selected=args.select,
        check_urls=not args.skip_live_url,
        write_guard=guard,
        queue_rows=queue_rows,
    )
    approval_dir = args.approval_dir
    approval_dir.mkdir(parents=True, exist_ok=True)
    cohort_id = cohort.get("cohort_id") or cohort.get("experiment") or "cohort"
    approval_path = approval_dir / f"{cohort_id}-approval.json"
    approval_path.write_text(
        json.dumps(result.approval, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    if result.transaction_preview:
        preview_path = approval_dir / f"{cohort_id}-transaction-preview.json"
        preview_path.write_text(
            json.dumps(result.transaction_preview, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        manifest_path = approval_dir / f"{cohort_id}-replacement-manifest.json"
        manifest_path.write_text(
            json.dumps(result.replacement_manifest, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    else:
        preview_path = None
        manifest_path = None

    csv_path = approval_dir / f"{cohort_id}-pending-draft.csv"
    pins_by_slug = {p["pin_slug"]: p for p in cohort["pins"]}
    csv_rows = production_csv_rows(result.rows, pins_by_slug)
    with csv_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(csv_rows[0].keys()))
        writer.writeheader()
        writer.writerows(csv_rows)

    if args.write_ledger:
        append_ledger(args.ledger, result.rows)

    print(f"Cohort: {cohort_id}")
    print(f"Experiment: {cohort.get('experiment_id')}")
    print(f"Schedule mode: {result.schedule_mode}")
    print("Mode: dry-run")
    print(f"Selected pins: {len(result.rows)}")
    print(f"D1 write attempts: {result.d1_write_attempts}")
    print(f"Approval artifact: {approval_path}")
    if preview_path:
        print(f"Transaction preview: {preview_path}")
    if manifest_path:
        print(f"Replacement manifest: {manifest_path}")
    print(f"Pending draft CSV (not uploaded): {csv_path}")
    if args.write_ledger:
        print(f"Ledger appended: {args.ledger}")
    _print_transaction_preview(result.transaction_preview)
    _print_slots(result)

    if args.apply_production:
        if not confirmation_ok(args.confirm_token):
            print(
                f"ERROR: --apply-production set but confirmation missing. "
                f"Pass --confirm-token {CONFIRM_TOKEN} or set env "
                f"PINTEREST_RELEASE_CONFIRM={CONFIRM_TOKEN}",
                file=sys.stderr,
            )
            return 2
        print(
            "ERROR: production apply is intentionally unavailable in this CLI. "
            "Use the reviewed fail-closed SQL release artifact after live asset verification.",
            file=sys.stderr,
        )
        print("No D1 write performed.", file=sys.stderr)
        return 2
    else:
        print("Production write: disabled (omit --apply-production).")

    print("OK: dry-run complete with zero D1 writes.")
    return 0


def run_advance_gate(args: argparse.Namespace) -> int:
    if not args.approval_file or not args.approval_file.is_file():
        print("ERROR: --approval-file required for --advance-gate", file=sys.stderr)
        return 2
    artifact = load_json(args.approval_file)
    updated = advance_gate(artifact, args.advance_gate)
    args.approval_file.write_text(
        json.dumps(updated, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Gate advanced to {updated['gate']}: {args.approval_file}")
    if updated["gate"] == "PENDING":
        print(
            "PENDING means ready for the existing production upload path "
            "(pins-upload / dashboard). This command did not write D1."
        )
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.advance_gate:
        return run_advance_gate(args)
    return run_dry_run(args)


if __name__ == "__main__":
    raise SystemExit(main())
