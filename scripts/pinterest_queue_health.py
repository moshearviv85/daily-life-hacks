#!/usr/bin/env python3
"""Read-only Pinterest queue health for controlled cohort releases.

Reports workflow state, PENDING totals, due-now, next five slots,
latest successful post, destinations blocked offline, and approved
cohort pins missing from a provided D1 snapshot.

Supports:
  --queue-snapshot PATH     fixture / export JSON
  --pins-api-url URL        read-only /api/pins-status
  --fetch-d1-snapshot       live read-only wrangler d1 SELECT (no writes)

Never writes to D1. Never posts. Never dispatches Actions.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.pinterest_release import (  # noqa: E402
    default_url_checker,
    format_utc,
    load_json,
    parse_utc,
    utc_now,
)

DEFAULT_D1_DB = os.environ.get("D1_DB_NAME", "dlh-production")
DEFAULT_D1_SELECT = (
    "SELECT row_id, status, pin_title, pin_link, publish_at, posted_at, "
    "pinterest_pin_id FROM pins_schedule ORDER BY publish_at ASC"
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--queue-snapshot",
        type=Path,
        help="JSON snapshot of pins_schedule rows (fixture, export, or wrangler JSON)",
    )
    p.add_argument(
        "--fetch-d1-snapshot",
        action="store_true",
        help="Read-only remote D1 SELECT via wrangler (no mutations)",
    )
    p.add_argument(
        "--d1-db-name",
        default=DEFAULT_D1_DB,
        help=f"D1 database name for --fetch-d1-snapshot (default: {DEFAULT_D1_DB})",
    )
    p.add_argument(
        "--d1-select",
        default=DEFAULT_D1_SELECT,
        help="Read-only SELECT used with --fetch-d1-snapshot",
    )
    p.add_argument(
        "--save-d1-snapshot",
        type=Path,
        default=None,
        help="Optional path to save the fetched D1 snapshot JSON",
    )
    p.add_argument(
        "--workflow-state",
        default="active",
        help="Known workflow state label (default: active). Does not dispatch.",
    )
    p.add_argument(
        "--approval-file",
        type=Path,
        help="Approval artifact to compare against queue snapshot",
    )
    p.add_argument(
        "--cohort",
        type=Path,
        help="Cohort JSON for destination checks",
    )
    p.add_argument(
        "--check-destinations",
        action="store_true",
        help="Live-check destination URLs for cohort pins",
    )
    p.add_argument(
        "--skip-live-url",
        action="store_true",
        help="Do not perform network destination checks",
    )
    p.add_argument(
        "--pins-api-url",
        default=None,
        help="Optional read-only /api/pins-status base URL (no writes)",
    )
    p.add_argument("--json-out", type=Path, default=None)
    return p.parse_args(argv)


def normalize_queue_payload(data: Any) -> list[dict[str, Any]]:
    """Accept fixture, API, or wrangler d1 execute --json shapes."""
    if isinstance(data, list):
        if data and isinstance(data[0], dict) and "results" in data[0]:
            return list(data[0].get("results") or [])
        return [row for row in data if isinstance(row, dict)]
    if isinstance(data, dict):
        if "results" in data and isinstance(data["results"], list):
            return list(data["results"])
        return list(data.get("rows") or data.get("pins") or [])
    return []


def fetch_d1_snapshot_readonly(
    *,
    db_name: str,
    select_sql: str,
    timeout: int = 60,
) -> list[dict[str, Any]]:
    """Read-only remote D1 snapshot via wrangler. Refuses non-SELECT SQL."""
    sql = select_sql.strip().rstrip(";")
    if not sql.upper().startswith("SELECT"):
        raise ValueError("Refusing non-SELECT SQL for read-only D1 snapshot")
    forbidden = ("INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "REPLACE", "CREATE")
    upper = sql.upper()
    for token in forbidden:
        if token in upper:
            raise ValueError(f"Refusing D1 snapshot SQL containing {token}")
    cmd = [
        "npx",
        "wrangler",
        "d1",
        "execute",
        db_name,
        "--remote",
        "--json",
        "--command",
        sql,
    ]
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        cwd=str(ROOT),
        shell=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"D1 read failed (rc={result.returncode}): {result.stderr.strip() or result.stdout.strip()}"
        )
    payload = json.loads(result.stdout)
    return normalize_queue_payload(payload)


def load_queue_rows(
    path: Path | None,
    pins_api_url: str | None,
    *,
    fetch_d1: bool = False,
    d1_db_name: str = DEFAULT_D1_DB,
    d1_select: str = DEFAULT_D1_SELECT,
    save_d1_snapshot: Path | None = None,
) -> list[dict[str, Any]]:
    if path:
        return normalize_queue_payload(load_json(path))
    if fetch_d1:
        rows = fetch_d1_snapshot_readonly(db_name=d1_db_name, select_sql=d1_select)
        if save_d1_snapshot:
            save_d1_snapshot.parent.mkdir(parents=True, exist_ok=True)
            save_d1_snapshot.write_text(
                json.dumps({"rows": rows, "source": "wrangler-d1-readonly"}, indent=2)
                + "\n",
                encoding="utf-8",
            )
        return rows
    if pins_api_url:
        url = pins_api_url.rstrip("/") + "/api/pins-status"
        req = Request(url, headers={"User-Agent": "dlh-pinterest-queue-health/1.0"})
        with urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        return normalize_queue_payload(payload)
    return []


def summarize_queue(rows: list[dict[str, Any]], now: datetime | None = None) -> dict[str, Any]:
    now = now or utc_now()
    pending = [r for r in rows if (r.get("status") or "").upper() == "PENDING"]
    posted = [r for r in rows if (r.get("status") or "").upper() == "POSTED"]

    def _publish_at(row: dict[str, Any]) -> datetime | None:
        raw = row.get("publish_at") or row.get("scheduled_at_utc") or row.get("publishAt")
        if not raw:
            return None
        try:
            return parse_utc(
                str(raw)
                if str(raw).endswith("Z")
                else str(raw) + "Z"
                if "T" in str(raw) and "+" not in str(raw)
                else str(raw)
            )
        except Exception:  # noqa: BLE001
            try:
                return parse_utc(
                    str(raw).replace(" ", "T") + ("Z" if "Z" not in str(raw) else "")
                )
            except Exception:  # noqa: BLE001
                return None

    due_now = []
    for row in pending:
        when = _publish_at(row)
        if when is not None and when <= now:
            due_now.append(row)

    upcoming = []
    for row in pending:
        when = _publish_at(row)
        upcoming.append((when or datetime.max.replace(tzinfo=timezone.utc), row))
    upcoming.sort(key=lambda item: item[0])
    next_five = []
    for when, row in upcoming[:5]:
        next_five.append(
            {
                "row_id": row.get("row_id"),
                "pin_title": row.get("pin_title") or row.get("title"),
                "publish_at": format_utc(when) if when.year < 9999 else None,
                "pin_link": row.get("pin_link") or row.get("destination_url"),
            }
        )

    latest = None
    posted_sorted = []
    for row in posted:
        raw = row.get("posted_at") or row.get("published_at_utc") or row.get("updated_at")
        ts = None
        if raw:
            try:
                ts = parse_utc(
                    str(raw)
                    if "Z" in str(raw) or "+" in str(raw)
                    else str(raw) + "Z"
                )
            except Exception:  # noqa: BLE001
                ts = None
        posted_sorted.append((ts or datetime.min.replace(tzinfo=timezone.utc), row))
    posted_sorted.sort(key=lambda item: item[0], reverse=True)
    if posted_sorted:
        ts, row = posted_sorted[0]
        latest = {
            "row_id": row.get("row_id"),
            "pin_title": row.get("pin_title") or row.get("title"),
            "posted_at": format_utc(ts) if ts.year > 1 else None,
            "pinterest_pin_id": row.get("pinterest_pin_id") or row.get("pin_id"),
        }

    return {
        "total_rows": len(rows),
        "total_pending": len(pending),
        "due_now": len(due_now),
        "due_now_row_ids": [r.get("row_id") for r in due_now],
        "next_five_scheduled": next_five,
        "latest_successful_post": latest,
    }


def blocked_destinations(
    cohort: dict[str, Any],
    *,
    check: bool,
    skip_live: bool,
) -> list[dict[str, str]]:
    if not check or skip_live:
        return []
    blocked: list[dict[str, str]] = []
    for pin in cohort.get("pins") or []:
        if pin.get("selected") is False:
            continue
        url = pin.get("destination_url") or ""
        if not url:
            continue
        ok, detail = default_url_checker(url)
        if not ok:
            blocked.append(
                {
                    "pin_slug": pin.get("pin_slug") or "",
                    "destination_url": url,
                    "detail": detail,
                }
            )
    return blocked


def approved_missing_from_d1(
    approval: dict[str, Any] | None,
    queue_rows: list[dict[str, Any]],
) -> list[str]:
    if not approval:
        return []
    if (approval.get("gate") or "") not in ("APPROVED", "PENDING"):
        return []
    present = {r.get("row_id") for r in queue_rows}
    missing: list[str] = []
    for pin in approval.get("pins") or []:
        rid = pin.get("queue_row_id") or pin.get("row_id")
        if rid and rid not in present:
            missing.append(str(rid))
    return missing


def build_health_report(args: argparse.Namespace) -> dict[str, Any]:
    rows = load_queue_rows(
        args.queue_snapshot,
        args.pins_api_url,
        fetch_d1=bool(getattr(args, "fetch_d1_snapshot", False)),
        d1_db_name=getattr(args, "d1_db_name", DEFAULT_D1_DB),
        d1_select=getattr(args, "d1_select", DEFAULT_D1_SELECT),
        save_d1_snapshot=getattr(args, "save_d1_snapshot", None),
    )
    summary = summarize_queue(rows)
    cohort = load_json(args.cohort) if args.cohort else None
    approval = load_json(args.approval_file) if args.approval_file else None
    blocked = blocked_destinations(
        cohort or {},
        check=bool(args.check_destinations and cohort),
        skip_live=bool(args.skip_live_url),
    )
    missing = approved_missing_from_d1(approval, rows)
    source = "empty"
    if args.queue_snapshot:
        source = f"file:{args.queue_snapshot}"
    elif getattr(args, "fetch_d1_snapshot", False):
        source = f"wrangler-d1-readonly:{getattr(args, 'd1_db_name', DEFAULT_D1_DB)}"
    elif args.pins_api_url:
        source = f"api:{args.pins_api_url}"
    return {
        "read_only": True,
        "d1_writes": 0,
        "snapshot_source": source,
        "workflow_state": args.workflow_state,
        "generated_at_utc": format_utc(utc_now()),
        "queue": summary,
        "pins_blocked_by_missing_live_destination": blocked,
        "approved_cohort_pins_missing_from_d1": missing,
        "notes": [
            "Health is read-only; no schedule mutations.",
            "MAX_PINS_PER_RUN remains 1 in production poster.",
            "Use --fetch-d1-snapshot for a live read-only wrangler SELECT.",
        ],
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        report = build_health_report(args)
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    text = json.dumps(report, indent=2, ensure_ascii=False)
    print(text)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(text + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
