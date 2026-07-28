#!/usr/bin/env python3
"""Preview or append cross-channel release/checkpoint rows to the existing ledger."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEDGER = ROOT / "pipeline-data" / "distribution-release-ledger.jsonl"

MEDIUM_BY_CHANNEL = {
    "pinterest": "organic-social",
    "youtube": "organic-social",
    "tiktok": "organic-social",
    "instagram": "organic-social",
    "facebook": "organic-social",
    "threads": "organic-social",
    "bluesky": "organic-social",
    "reddit": "community",
    "quora": "community",
    "forum": "community",
    "newsletter": "email",
    "kit": "email",
    "medium": "syndication",
    "substack": "syndication",
    "flipboard": "syndication",
}


def token(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")
    if not normalized:
        raise ValueError("UTM/release token becomes empty after normalization")
    return normalized


def parse_utc(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc).replace(microsecond=0)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).replace(microsecond=0)


def iso_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_utm_url(
    destination: str,
    *,
    source: str,
    medium: str,
    campaign: str,
    content: str,
) -> str:
    parsed = urlparse(destination)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("destination must be http(s)")
    if parsed.hostname not in {"daily-life-hacks.com", "www.daily-life-hacks.com"}:
        raise ValueError("destination must be on daily-life-hacks.com")
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.update(
        {
            "utm_source": token(source),
            "utm_medium": token(medium),
            "utm_campaign": token(campaign),
            "utm_content": token(content),
        }
    )
    return urlunparse(parsed._replace(query=urlencode(query)))


def release_row(args: argparse.Namespace) -> dict[str, Any]:
    released = parse_utc(args.released_at)
    channel = token(args.channel)
    asset_id = token(args.asset_id)
    source = token(args.source or channel)
    medium = token(args.medium or MEDIUM_BY_CHANNEL.get(channel, "referral"))
    campaign = token(args.campaign)
    content = token(args.content)
    release_id = args.release_id or f"rel-{released:%Y%m%d}-{channel}-{asset_id}"
    utm_url = build_utm_url(
        args.destination,
        source=source,
        medium=medium,
        campaign=campaign,
        content=content,
    )
    return {
        "schema": "growth-release/v1",
        "record_type": "release",
        "release_id": token(release_id),
        "channel": channel,
        "cohort_id": token(args.cohort_id),
        "experiment_id": token(args.experiment_id or "none"),
        "asset_id": asset_id,
        "destination_url": args.destination,
        "utm_url": utm_url,
        "utm_source": source,
        "utm_medium": medium,
        "utm_campaign": campaign,
        "utm_content": content,
        "status": "RELEASED",
        "external_id": args.external_id,
        "released_at_utc": iso_utc(released),
        "published_at_utc": iso_utc(released),
        "measurement_due_24h": iso_utc(released + timedelta(hours=24)),
        "measurement_due_7d": iso_utc(released + timedelta(days=7)),
        "measurement_due_14d": iso_utc(released + timedelta(days=14)),
        # Compatibility fields for release rows created by the earlier
        # 7d/30d/60d governance workflow.
        "measurement_due_30d": iso_utc(released + timedelta(days=30)),
        "measurement_due_60d": iso_utc(released + timedelta(days=60)),
        "decision": "pending",
    }


def recommend_checkpoint(
    *,
    day: int,
    releases: int,
    impressions: int,
    qualified_sessions: int,
    policy_incidents: int,
    destination_errors: int,
) -> tuple[str, str]:
    if policy_incidents or destination_errors:
        return "STOP", "Policy or destination failure overrides traffic metrics."
    if day == 1:
        return "HOLD", "The 24-hour checkpoint verifies delivery; it is too early for a scale decision."
    if day == 7:
        if impressions == 0:
            return "ITERATE", "No distribution signal after seven days; inspect creative, indexing, and eligibility."
        return "HOLD", "Day 7 is a health check; keep the cohort stable until day 30."
    if day == 14:
        if impressions == 0:
            return "ITERATE", "No distribution signal after 14 days; inspect creative, indexing, and eligibility."
        return "HOLD", "Day 14 confirms distribution; keep the cohort stable for a longer outcome window."
    if day == 30:
        if releases >= 5 and impressions == 0:
            return "STOP", "At least five releases produced zero distribution after 30 days."
        if releases >= 3 and qualified_sessions >= releases:
            return "SCALE", "At least three releases averaged one or more qualified sessions each."
        return "ITERATE", "Some evidence exists, but the day-30 scale threshold was not met."
    if releases >= 10 and qualified_sessions == 0:
        return "STOP", "At least ten releases produced zero qualified sessions after 60 days."
    if releases >= 10 and qualified_sessions >= releases:
        return "SCALE", "At least ten releases averaged one or more qualified sessions each."
    return "ITERATE", "Day-60 evidence is insufficient to scale and not bad enough for a hard stop."


def checkpoint_window(args: argparse.Namespace) -> str:
    explicit = str(getattr(args, "window", "") or "").lower()
    if explicit:
        return explicit
    day = getattr(args, "day", None)
    if day is None:
        raise ValueError("checkpoint requires --window or legacy --day")
    return f"{int(day)}d"


def checkpoint_row(args: argparse.Namespace) -> dict[str, Any]:
    window = checkpoint_window(args)
    day = int(window[:-1]) if window.endswith("d") else 1
    decision, reason = recommend_checkpoint(
        day=day,
        releases=args.releases,
        impressions=args.impressions,
        qualified_sessions=args.qualified_sessions,
        policy_incidents=args.policy_incidents,
        destination_errors=args.destination_errors,
    )
    if args.decision:
        decision = args.decision.upper()
        reason = "Human override recorded; see note." if args.note else "Human override recorded."
    row = {
        "schema": "growth-checkpoint/v1",
        "record_type": "checkpoint",
        "release_id": token(args.release_id),
        "checkpoint_window": window,
        "observed_at_utc": iso_utc(parse_utc(args.observed_at)),
        "released_items": args.releases,
        "impressions": args.impressions,
        "outbound_clicks": args.outbound_clicks,
        "qualified_sessions": args.qualified_sessions,
        "policy_incidents": args.policy_incidents,
        "destination_errors": args.destination_errors,
        "decision": decision,
        "decision_reason": reason,
        "note": args.note or "",
    }
    if window.endswith("d"):
        row["checkpoint_day"] = day
    return row


def existing_release_ids(path: Path) -> set[str]:
    if not path.is_file():
        return set()
    ids: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if row.get("record_type") == "release" and row.get("release_id"):
            ids.add(row["release_id"])
    return ids


def existing_checkpoints(path: Path) -> set[tuple[str, str]]:
    if not path.is_file():
        return set()
    checkpoints: set[tuple[str, str]] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        try:
            row = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if row.get("record_type") != "checkpoint" or not row.get("release_id"):
            continue
        window = str(row.get("checkpoint_window") or "").lower()
        if not window and str(row.get("checkpoint_day", "")).isdigit():
            window = f"{int(row['checkpoint_day'])}d"
        if window:
            checkpoints.add((row["release_id"], window))
    return checkpoints


def append_row(path: Path, row: dict[str, Any]) -> None:
    if row.get("record_type") == "release":
        if row["release_id"] in existing_release_ids(path):
            raise ValueError(f"duplicate release_id: {row['release_id']}")
    if row.get("record_type") == "checkpoint":
        window = str(row.get("checkpoint_window") or "").lower()
        if not window and str(row.get("checkpoint_day", "")).isdigit():
            window = f"{int(row['checkpoint_day'])}d"
        if not window:
            raise ValueError("checkpoint_window or checkpoint_day is required")
        key = (row["release_id"], window)
        if row["release_id"] not in existing_release_ids(path):
            raise ValueError(f"checkpoint release_id not found: {row['release_id']}")
        if key in existing_checkpoints(path):
            raise ValueError(
                f"duplicate checkpoint: {row['release_id']} window {window}"
            )
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def _add_write_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    parser.add_argument(
        "--write",
        action="store_true",
        help="Append locally to the existing ledger. Without this flag the command is a dry run.",
    )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    release = sub.add_parser("release", help="Preview or append a release row.")
    release.add_argument("--channel", required=True)
    release.add_argument("--cohort-id", required=True)
    release.add_argument("--experiment-id")
    release.add_argument("--asset-id", required=True)
    release.add_argument("--destination", required=True)
    release.add_argument("--campaign", required=True)
    release.add_argument("--content", required=True)
    release.add_argument("--source")
    release.add_argument("--medium")
    release.add_argument("--external-id")
    release.add_argument("--release-id")
    release.add_argument("--released-at")
    _add_write_flags(release)

    checkpoint = sub.add_parser(
        "checkpoint",
        help="Preview or append a 24h/7d/14d checkpoint (legacy 30d/60d supported).",
    )
    checkpoint.add_argument("--release-id", required=True)
    checkpoint_timing = checkpoint.add_mutually_exclusive_group(required=True)
    checkpoint_timing.add_argument(
        "--window",
        choices=("24h", "7d", "14d", "30d", "60d"),
    )
    checkpoint_timing.add_argument(
        "--day",
        type=int,
        choices=(7, 30, 60),
        help="Legacy alias for --window 7d/30d/60d.",
    )
    checkpoint.add_argument("--releases", type=int, required=True)
    checkpoint.add_argument("--impressions", type=int, default=0)
    checkpoint.add_argument("--outbound-clicks", type=int, default=0)
    checkpoint.add_argument("--qualified-sessions", type=int, default=0)
    checkpoint.add_argument("--policy-incidents", type=int, default=0)
    checkpoint.add_argument("--destination-errors", type=int, default=0)
    checkpoint.add_argument("--decision", choices=("stop", "hold", "iterate", "scale"))
    checkpoint.add_argument("--observed-at")
    checkpoint.add_argument("--note")
    _add_write_flags(checkpoint)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    row = release_row(args) if args.command == "release" else checkpoint_row(args)
    print(json.dumps(row, ensure_ascii=False, indent=2))
    if args.write:
        if args.command == "release" and not args.external_id:
            raise ValueError(
                "--write requires --external-id as proof that the release exists"
            )
        append_row(args.ledger, row)
        print(f"Appended to {args.ledger}")
    else:
        print("Dry run: ledger unchanged. Add --write after review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
