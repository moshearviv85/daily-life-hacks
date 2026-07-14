#!/usr/bin/env python3
"""Cohort / account / eligible experiment reports — never mixed.

Windows:
  --population account_30d
  --population eligible_90d
  --population cohort --window 24h|7d|14d

Cohort reports include matched-pair comparison and keep/kill/iterate.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.pinterest_release import (  # noqa: E402
    cohort_report,
    isolate_report_payload,
    load_json,
)


DEFAULT_COHORT = ROOT / "pipeline-data" / "experiments" / "pinterest-research-cohort-2026-07-13.json"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cohort", type=Path, default=DEFAULT_COHORT)
    p.add_argument(
        "--population",
        choices=("account_30d", "eligible_90d", "cohort"),
        required=True,
    )
    p.add_argument("--window", choices=("24h", "7d", "14d"), default=None)
    p.add_argument(
        "--metrics",
        type=Path,
        help="JSON map pin_slug -> {impressions, outbound_clicks, saves}",
    )
    p.add_argument(
        "--payload",
        type=Path,
        help="Raw payload for account_30d / eligible_90d isolation wrapper",
    )
    p.add_argument("--out", type=Path, default=None)
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.population == "cohort":
        if not args.window:
            print("ERROR: --window required for cohort population", file=sys.stderr)
            return 2
        cohort = load_json(args.cohort)
        metrics = load_json(args.metrics) if args.metrics else {}
        report = cohort_report(cohort, metrics, window=args.window)
    else:
        payload = load_json(args.payload) if args.payload else {}
        report = isolate_report_payload(args.population, payload)

    text = json.dumps(report, indent=2, ensure_ascii=False)
    print(text)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
