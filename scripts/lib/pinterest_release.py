"""Controlled Pinterest cohort release helpers.

Safety invariants:
- Default path is dry-run only (no D1, no Pinterest, no Actions).
- Production writes require --apply-production AND a confirmation token/env.
- MAX_PINS_PER_RUN and posting cadence are never changed here.
"""

from __future__ import annotations

import json
import os
import struct
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Iterable
from urllib.parse import urlparse

CONFIRM_TOKEN = "RELEASE_COHORT_OK"
CONFIRM_ENV = "PINTEREST_RELEASE_CONFIRM"

LEDGER_FIELDS = (
    "channel",
    "cohort_id",
    "experiment_id",
    "pin_slug",
    "destination_url",
    "asset_path",
    "variant",
    "status",
    "queue_row_id",
    "pinterest_pin_id",
    "scheduled_at_utc",
    "published_at_utc",
    "measurement_due_24h",
    "measurement_due_7d",
    "measurement_due_14d",
    "impressions",
    "outbound_clicks",
    "saves",
    "ctr",
    "decision",
)

VALID_STATUSES = ("REVIEW", "APPROVED", "PENDING", "POSTED", "FAILED", "KILLED")
DECISIONS = ("keep", "kill", "iterate", "pending")

MIN_PIN_WIDTH = 600
MIN_PIN_HEIGHT = 900

# Explicit report populations — never mix these windows.
REPORT_POPULATIONS = {
    "account_30d": {
        "label": "30-day account analytics",
        "window_days": 30,
        "population": "all_account_pins",
    },
    "eligible_90d": {
        "label": "90-day eligible-pin analysis",
        "window_days": 90,
        "population": "eligible_pins",
    },
    "cohort": {
        "label": "cohort-specific measurement",
        "window_days": None,
        "population": "experiment_cohort",
    },
}


class ReleaseSafetyError(RuntimeError):
    """Raised when a production write is attempted without dual confirmation."""


class ValidationError(ValueError):
    """Cohort validation failure."""


@dataclass
class WriteGuard:
    """Tracks whether any production D1 write was attempted."""

    d1_write_attempts: int = 0
    allowed: bool = False
    confirm_ok: bool = False

    def assert_can_write(self, action: str) -> None:
        self.d1_write_attempts += 1
        if not (self.allowed and self.confirm_ok):
            raise ReleaseSafetyError(
                f"Blocked production write ({action}). "
                f"Require --apply-production and confirmation token "
                f"{CONFIRM_TOKEN!r} (flag or {CONFIRM_ENV})."
            )


@dataclass
class LedgerRow:
    channel: str = "pinterest"
    cohort_id: str = ""
    experiment_id: str = ""
    pin_slug: str = ""
    destination_url: str = ""
    asset_path: str = ""
    variant: str = ""
    status: str = "REVIEW"
    queue_row_id: str = ""
    pinterest_pin_id: str | None = None
    scheduled_at_utc: str | None = None
    published_at_utc: str | None = None
    measurement_due_24h: str | None = None
    measurement_due_7d: str | None = None
    measurement_due_14d: str | None = None
    impressions: int | None = None
    outbound_clicks: int | None = None
    saves: int | None = None
    ctr: float | None = None
    decision: str = "pending"
    article_slug: str = ""
    pair_id: str = ""

    def to_ledger_dict(self) -> dict[str, Any]:
        data = asdict(self)
        return {k: data.get(k) for k in LEDGER_FIELDS}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_utc(value: str) -> datetime:
    raw = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def format_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def confirmation_ok(token: str | None, env: dict[str, str] | None = None) -> bool:
    env = env if env is not None else os.environ
    candidates = {
        (token or "").strip(),
        (env.get(CONFIRM_ENV) or "").strip(),
    }
    return CONFIRM_TOKEN in candidates


def jpeg_dimensions(path: Path) -> tuple[int, int]:
    """Read JPEG SOF dimensions without decoding the full image."""
    data = path.read_bytes()
    if len(data) < 4 or data[0:2] != b"\xff\xd8":
        raise ValidationError(f"Not a JPEG: {path}")
    i = 2
    while i < len(data) - 8:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xD8, 0xD9):
            i += 2
            continue
        if marker == 0x01 or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        length = struct.unpack(">H", data[i + 2 : i + 4])[0]
        # SOF0 / SOF2
        if marker in (0xC0, 0xC2) and length >= 7:
            height, width = struct.unpack(">HH", data[i + 5 : i + 9])
            return int(width), int(height)
        i += 2 + length
    raise ValidationError(f"Could not read JPEG dimensions: {path}")


def validate_image(path: Path, *, min_w: int = MIN_PIN_WIDTH, min_h: int = MIN_PIN_HEIGHT) -> tuple[int, int]:
    if not path.is_file():
        raise ValidationError(f"Missing image: {path}")
    width, height = jpeg_dimensions(path)
    if width < min_w or height < min_h:
        raise ValidationError(
            f"Image too small for pin ({width}x{height}): {path} "
            f"(min {min_w}x{min_h})"
        )
    return width, height


def default_url_checker(url: str, timeout: float = 10.0) -> tuple[bool, str]:
    """HEAD/GET a destination URL; treat 2xx/3xx as live."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return False, "invalid URL shape"
    req = urllib.request.Request(
        url,
        method="HEAD",
        headers={"User-Agent": "dlh-pinterest-release-check/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = getattr(resp, "status", None) or resp.getcode()
            if 200 <= int(code) < 400:
                return True, f"HTTP {code}"
            return False, f"HTTP {code}"
    except urllib.error.HTTPError as exc:
        # Some hosts reject HEAD; retry GET.
        if exc.code in (403, 405, 501):
            try:
                get_req = urllib.request.Request(
                    url,
                    method="GET",
                    headers={"User-Agent": "dlh-pinterest-release-check/1.0"},
                )
                with urllib.request.urlopen(get_req, timeout=timeout) as resp:
                    code = getattr(resp, "status", None) or resp.getcode()
                    if 200 <= int(code) < 400:
                        return True, f"HTTP {code} (GET fallback)"
                    return False, f"HTTP {code}"
            except Exception as get_exc:  # noqa: BLE001
                return False, str(get_exc)
        return False, f"HTTP {exc.code}"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def selected_pins(cohort: dict[str, Any], selected: Iterable[str] | None) -> list[dict[str, Any]]:
    wanted = list(selected) if selected is not None else list(cohort.get("selected_pin_slugs") or [])
    if not wanted:
        raise ValidationError("No selected pins provided")
    rejected = rejected_slug_set(cohort)
    blocked = [s for s in wanted if s in rejected]
    if blocked:
        raise ValidationError(
            "Rejected Claude candidates cannot enter the cohort: " + ", ".join(blocked)
        )
    by_slug = {p["pin_slug"]: p for p in cohort.get("pins") or []}
    missing = [s for s in wanted if s not in by_slug]
    if missing:
        raise ValidationError(f"Selected pin_slug not in cohort pins: {missing}")
    return [by_slug[s] for s in wanted]


def reject_duplicates(pins: list[dict[str, Any]]) -> None:
    row_ids: dict[str, str] = {}
    links: dict[str, str] = {}
    images: dict[str, str] = {}
    errors: list[str] = []
    for pin in pins:
        rid = pin.get("row_id") or ""
        link = (pin.get("destination_url") or "").rstrip("/")
        asset = pin.get("asset_path") or ""
        slug = pin.get("pin_slug") or "?"
        if not rid:
            errors.append(f"{slug}: missing row_id")
        elif rid in row_ids:
            errors.append(f"duplicate row_id {rid!r}: {row_ids[rid]} and {slug}")
        else:
            row_ids[rid] = slug
        if not link:
            errors.append(f"{slug}: missing destination_url")
        elif link in links:
            errors.append(f"duplicate destination_url {link!r}: {links[link]} and {slug}")
        else:
            links[link] = slug
        if not asset:
            errors.append(f"{slug}: missing asset_path")
        elif asset in images:
            errors.append(f"duplicate asset_path {asset!r}: {images[asset]} and {slug}")
        else:
            images[asset] = slug
    if errors:
        raise ValidationError("; ".join(errors))


def interleave_without_consecutive_articles(pins: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Order pins so two variants of the same article are never adjacent.

    Strategy: group by article, then round-robin across article queues.
    """
    buckets: dict[str, list[dict[str, Any]]] = {}
    order: list[str] = []
    for pin in pins:
        article = pin.get("article_slug") or pin["pin_slug"]
        if article not in buckets:
            buckets[article] = []
            order.append(article)
        buckets[article].append(pin)

    scheduled: list[dict[str, Any]] = []
    last_article: str | None = None
    while any(buckets.values()):
        progressed = False
        for article in order:
            queue = buckets[article]
            if not queue:
                continue
            if last_article == article and any(
                buckets[a] for a in order if a != article
            ):
                continue
            scheduled.append(queue.pop(0))
            last_article = article
            progressed = True
        if not progressed:
            # Only one article left with multiple variants — cannot satisfy.
            remaining = [p for q in buckets.values() for p in q]
            raise ValidationError(
                "Cannot schedule without consecutive same-article variants: "
                + ", ".join(p["pin_slug"] for p in remaining)
            )
    return scheduled


def propose_utc_slots(
    pins: list[dict[str, Any]],
    *,
    append_after_utc: str,
    spacing_hours: float = 12.0,
) -> list[dict[str, Any]]:
    ordered = interleave_without_consecutive_articles(pins)
    start = parse_utc(append_after_utc) + timedelta(hours=spacing_hours)
    out: list[dict[str, Any]] = []
    cursor = start
    prev_article: str | None = None
    for pin in ordered:
        article = pin.get("article_slug") or pin["pin_slug"]
        if prev_article is not None and article == prev_article:
            raise ValidationError(
                f"Consecutive same-article slots for {article}: "
                f"would place {pin['pin_slug']} after previous"
            )
        slot = format_utc(cursor)
        enriched = dict(pin)
        enriched["scheduled_at_utc"] = slot
        out.append(enriched)
        prev_article = article
        cursor = cursor + timedelta(hours=spacing_hours)
    return out


def measurement_dues(scheduled_at_utc: str) -> dict[str, str]:
    base = parse_utc(scheduled_at_utc)
    return {
        "measurement_due_24h": format_utc(base + timedelta(hours=24)),
        "measurement_due_7d": format_utc(base + timedelta(days=7)),
        "measurement_due_14d": format_utc(base + timedelta(days=14)),
    }


def build_ledger_rows(
    cohort: dict[str, Any],
    slotted: list[dict[str, Any]],
    *,
    status: str = "REVIEW",
) -> list[LedgerRow]:
    rows: list[LedgerRow] = []
    for pin in slotted:
        dues = measurement_dues(pin["scheduled_at_utc"])
        rows.append(
            LedgerRow(
                channel=cohort.get("channel") or "pinterest",
                cohort_id=cohort["cohort_id"],
                experiment_id=cohort["experiment_id"],
                pin_slug=pin["pin_slug"],
                destination_url=pin["destination_url"],
                asset_path=pin["asset_path"],
                variant=pin.get("variant") or "",
                status=status,
                queue_row_id=pin["row_id"],
                scheduled_at_utc=pin["scheduled_at_utc"],
                measurement_due_24h=dues["measurement_due_24h"],
                measurement_due_7d=dues["measurement_due_7d"],
                measurement_due_14d=dues["measurement_due_14d"],
                article_slug=pin.get("article_slug") or "",
                pair_id=pin.get("pair_id") or "",
            )
        )
    return rows


def append_ledger(path: Path, rows: Iterable[LedgerRow]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row.to_ledger_dict(), ensure_ascii=False) + "\n")


def read_ledger(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        rows.append(json.loads(line))
    return rows


def validate_cohort_pins(
    cohort: dict[str, Any],
    pins: list[dict[str, Any]],
    *,
    repo_root: Path,
    check_urls: bool = True,
    url_checker: Callable[[str], tuple[bool, str]] | None = None,
) -> list[str]:
    """Validate pins; return human-readable warnings. Raises on hard failures."""
    reject_duplicates(pins)
    warnings: list[str] = []
    checker = url_checker or default_url_checker
    for pin in pins:
        asset = repo_root / pin["asset_path"]
        validate_image(asset)
        if check_urls:
            ok, detail = checker(pin["destination_url"])
            if not ok:
                raise ValidationError(
                    f"Destination not live for {pin['pin_slug']}: "
                    f"{pin['destination_url']} ({detail})"
                )
    return warnings


def build_approval_artifact(
    cohort: dict[str, Any],
    rows: list[LedgerRow],
    *,
    mode: str,
    d1_writes: int,
) -> dict[str, Any]:
    return {
        "schema": "pinterest-cohort-approval/v1",
        "mode": mode,
        "gate": "REVIEW",
        "status_flow": ["REVIEW", "APPROVED", "PENDING"],
        "channel": cohort.get("channel") or "pinterest",
        "cohort_id": cohort["cohort_id"],
        "experiment_id": cohort["experiment_id"],
        "created_at_utc": format_utc(utc_now()),
        "d1_write_attempts": d1_writes,
        "production_write": False,
        "max_pins_per_run_unchanged": 1,
        "pins": [row.to_ledger_dict() | {
            "article_slug": row.article_slug,
            "pair_id": row.pair_id,
        } for row in rows],
        "proposed_slots_utc": [r.scheduled_at_utc for r in rows],
        "next_gate": "Set gate to APPROVED after human review, then promote to PENDING via existing production upload path.",
    }


def advance_gate(artifact: dict[str, Any], target: str) -> dict[str, Any]:
    current = artifact.get("gate") or "REVIEW"
    flow = artifact.get("status_flow") or ["REVIEW", "APPROVED", "PENDING"]
    if target not in flow:
        raise ValidationError(f"Unknown gate {target!r}")
    cur_i = flow.index(current) if current in flow else -1
    tgt_i = flow.index(target)
    if tgt_i != cur_i + 1:
        raise ValidationError(
            f"Invalid gate transition {current} -> {target}; allowed next is "
            f"{flow[cur_i + 1] if 0 <= cur_i < len(flow) - 1 else 'none'}"
        )
    updated = dict(artifact)
    updated["gate"] = target
    updated["gate_updated_at_utc"] = format_utc(utc_now())
    for pin in updated.get("pins") or []:
        pin["status"] = target
    return updated


def production_csv_rows(rows: list[LedgerRow] | list[dict[str, Any]], pins_by_slug: dict[str, dict[str, Any]]) -> list[dict[str, str]]:
    """CSV shape compatible with existing pins-upload / generate_pinterest_csv path."""
    out: list[dict[str, str]] = []
    for row in rows:
        data = row.to_ledger_dict() if isinstance(row, LedgerRow) else dict(row)
        pin = pins_by_slug[data["pin_slug"]]
        out.append(
            {
                "row_id": data["queue_row_id"],
                "board_id": str(pin.get("board_id") or ""),
                "pin_title": pin.get("title") or "",
                "pin_description": pin.get("description") or "",
                "pin_link": data["destination_url"],
                "pin_alt_text": pin.get("alt_text") or "",
                "media_url": data["asset_path"].replace("public/", "/").replace("\\", "/"),
                "publish_at": (data.get("scheduled_at_utc") or "").replace("Z", ""),
                "status": "PENDING",
            }
        )
    return out


def ctr(impressions: int | None, outbound_clicks: int | None) -> float | None:
    if impressions is None or outbound_clicks is None or impressions <= 0:
        return None
    return round(outbound_clicks / impressions, 6)


def decide_pair(a: dict[str, Any], b: dict[str, Any]) -> str:
    """keep / kill / iterate from matched-pair CTR + saves."""
    a_ctr = a.get("ctr")
    b_ctr = b.get("ctr")
    a_saves = int(a.get("saves") or 0)
    b_saves = int(b.get("saves") or 0)
    a_impr = int(a.get("impressions") or 0)
    b_impr = int(b.get("impressions") or 0)
    if a_impr < 50 and b_impr < 50:
        return "iterate"
    if a_ctr is None or b_ctr is None:
        return "iterate"
    winner_ctr = max(a_ctr, b_ctr)
    loser_ctr = min(a_ctr, b_ctr)
    if winner_ctr >= loser_ctr * 1.25 and max(a_saves, b_saves) >= 1:
        return "keep"
    if winner_ctr < 0.002 and a_saves + b_saves == 0 and a_impr + b_impr >= 200:
        return "kill"
    return "iterate"


def cohort_report(
    cohort: dict[str, Any],
    metrics_by_slug: dict[str, dict[str, Any]],
    *,
    window: str,
) -> dict[str, Any]:
    """Build a cohort-only report. window must be 24h, 7d, or 14d."""
    if window not in ("24h", "7d", "14d"):
        raise ValidationError(f"Unknown cohort window {window!r}")
    pop = REPORT_POPULATIONS["cohort"]
    pairs_out: list[dict[str, Any]] = []
    pins_out: list[dict[str, Any]] = []
    for pin in cohort.get("pins") or []:
        slug = pin["pin_slug"]
        m = metrics_by_slug.get(slug) or {}
        row = {
            "pin_slug": slug,
            "variant": pin.get("variant"),
            "pair_id": pin.get("pair_id"),
            "article_slug": pin.get("article_slug"),
            "impressions": m.get("impressions"),
            "outbound_clicks": m.get("outbound_clicks"),
            "saves": m.get("saves"),
            "ctr": ctr(m.get("impressions"), m.get("outbound_clicks")),
        }
        pins_out.append(row)
    by_slug = {p["pin_slug"]: p for p in pins_out}
    for pair in cohort.get("matched_pairs") or []:
        a = by_slug.get(pair["a"])
        b = by_slug.get(pair["b"])
        if not a or not b:
            continue
        decision = decide_pair(a, b)
        pairs_out.append(
            {
                "pair_id": pair["pair_id"],
                "article_slug": pair["article_slug"],
                "a": a,
                "b": b,
                "decision": decision,
            }
        )
    return {
        "report_type": "cohort_measurement",
        "population": pop["population"],
        "population_label": pop["label"],
        "window": window,
        "experiment_id": cohort["experiment_id"],
        "cohort_id": cohort["cohort_id"],
        "generated_at_utc": format_utc(utc_now()),
        "do_not_mix_with": ["account_30d", "eligible_90d"],
        "pins": pins_out,
        "matched_pairs": pairs_out,
    }


def isolate_report_payload(kind: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Wrap analytics so account/eligible/cohort windows stay explicit."""
    if kind not in REPORT_POPULATIONS:
        raise ValidationError(f"Unknown report population {kind!r}")
    meta = REPORT_POPULATIONS[kind]
    return {
        "report_type": kind,
        "population": meta["population"],
        "population_label": meta["label"],
        "window_days": meta["window_days"],
        "generated_at_utc": format_utc(utc_now()),
        "do_not_mix_with": [k for k in REPORT_POPULATIONS if k != kind],
        "payload": payload,
    }


@dataclass
class DryRunResult:
    rows: list[LedgerRow] = field(default_factory=list)
    approval: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    d1_write_attempts: int = 0
    slotted: list[dict[str, Any]] = field(default_factory=list)
    schedule_mode: str = "append_after_tail"
    transaction_preview: list[dict[str, Any]] = field(default_factory=list)
    replacement_manifest: dict[str, Any] = field(default_factory=dict)
    proposed_active_queue: list[dict[str, Any]] = field(default_factory=list)


def rejected_slug_set(cohort: dict[str, Any]) -> set[str]:
    return {str(s) for s in (cohort.get("rejected_pin_slugs") or [])}


def assert_no_rejected_selected(
    cohort: dict[str, Any],
    pins: list[dict[str, Any]],
) -> None:
    rejected = rejected_slug_set(cohort)
    bad = [p["pin_slug"] for p in pins if p["pin_slug"] in rejected]
    if bad:
        raise ValidationError(
            "Rejected Claude candidates cannot enter the cohort: " + ", ".join(bad)
        )


def assert_active_queue_no_consecutive_articles(
    active_rows: list[dict[str, Any]],
) -> None:
    prev: str | None = None
    for row in active_rows:
        article = row.get("article_slug") or ""
        if prev and article and article == prev:
            raise ValidationError(
                f"Consecutive same-article variants in proposed active queue: {article}"
            )
        if article:
            prev = article


def build_transaction_preview(
    cohort: dict[str, Any],
    pins_by_slug: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    preview: list[dict[str, Any]] = []
    for item in cohort.get("replacements") or []:
        slug = item["replacement_pin_slug"]
        pin = pins_by_slug.get(slug)
        if not pin:
            raise ValidationError(f"Replacement pin missing from cohort pins: {slug}")
        preview.append(
            {
                "old_row_id": item["old_row_id"],
                "old_title": item["old_title"],
                "replacement_row_id": pin["row_id"],
                "replacement_title": pin.get("title") or "",
                "preserved_utc_slot": item["preserved_slot_utc"],
                "reason": item.get("reason") or "",
            }
        )
    return preview


def build_replacement_manifest(
    cohort: dict[str, Any],
    pins_by_slug: dict[str, dict[str, Any]],
    transaction_preview: list[dict[str, Any]],
) -> dict[str, Any]:
    """Preserve old rows; propose PENDING → REVIEW. Never delete."""
    preserved_old_rows: list[dict[str, Any]] = []
    incoming_rows: list[dict[str, Any]] = []
    for item, preview in zip(cohort.get("replacements") or [], transaction_preview):
        preserved_old_rows.append(
            {
                "row_id": item["old_row_id"],
                "title": item["old_title"],
                "current_status": "PENDING",
                "proposed_status": "REVIEW",
                "action": "preserve_status_change",
                "delete": False,
                "preserved_utc_slot": item["preserved_slot_utc"],
                "replaced_by_row_id": preview["replacement_row_id"],
            }
        )
        pin = pins_by_slug[item["replacement_pin_slug"]]
        incoming_rows.append(
            {
                "row_id": pin["row_id"],
                "pin_slug": pin["pin_slug"],
                "title": pin.get("title") or "",
                "article_slug": pin.get("article_slug") or "",
                "proposed_status": "PENDING",
                "preserved_utc_slot": item["preserved_slot_utc"],
                "replaces_row_id": item["old_row_id"],
            }
        )
    return {
        "schema": "pinterest-replacement-manifest/v1",
        "schedule_mode": "replace_next_30d",
        "never_delete_old_rows": True,
        "old_row_status_change": {"from": "PENDING", "to": "REVIEW"},
        "preserved_old_rows": preserved_old_rows,
        "incoming_replacement_rows": incoming_rows,
        "transaction_preview": transaction_preview,
    }


def apply_replacements_to_queue(
    queue_rows: list[dict[str, Any]],
    manifest: dict[str, Any],
) -> list[dict[str, Any]]:
    """Return proposed active PENDING queue after replacements (dry-run only)."""
    outgoing = {
        row["row_id"] for row in (manifest.get("preserved_old_rows") or [])
    }
    incoming_by_slot = {
        row["preserved_utc_slot"]: row
        for row in (manifest.get("incoming_replacement_rows") or [])
    }
    proposed: list[dict[str, Any]] = []
    for row in queue_rows:
        status = (row.get("status") or "").upper()
        rid = row.get("row_id")
        if rid in outgoing:
            # Old row leaves the active PENDING queue (preserved as REVIEW).
            continue
        if status != "PENDING":
            continue
        publish = row.get("publish_at") or row.get("scheduled_at_utc")
        proposed.append(
            {
                "row_id": rid,
                "pin_title": row.get("pin_title") or row.get("title"),
                "publish_at": publish,
                "article_slug": row.get("article_slug") or "",
                "status": "PENDING",
            }
        )
    for slot, incoming in incoming_by_slot.items():
        proposed.append(
            {
                "row_id": incoming["row_id"],
                "pin_title": incoming["title"],
                "publish_at": slot,
                "article_slug": incoming.get("article_slug") or "",
                "status": "PENDING",
            }
        )

    def _key(item: dict[str, Any]) -> datetime:
        raw = item.get("publish_at")
        if not raw:
            return datetime.max.replace(tzinfo=timezone.utc)
        text = str(raw)
        if "T" in text and not text.endswith("Z") and "+" not in text:
            text = text + "Z"
        try:
            return parse_utc(text)
        except Exception:  # noqa: BLE001
            return datetime.max.replace(tzinfo=timezone.utc)

    proposed.sort(key=_key)
    return proposed


def propose_replacement_slots(
    cohort: dict[str, Any],
    pins: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_slug = {p["pin_slug"]: p for p in pins}
    replacements = cohort.get("replacements") or []
    if not replacements:
        raise ValidationError("replace_next_30d requires replacements[]")
    slotted: list[dict[str, Any]] = []
    for item in replacements:
        slug = item["replacement_pin_slug"]
        if slug not in by_slug:
            raise ValidationError(f"Replacement pin not in selected set: {slug}")
        pin = dict(by_slug[slug])
        pin["scheduled_at_utc"] = item["preserved_slot_utc"]
        pin["replaces_row_id"] = item["old_row_id"]
        slotted.append(pin)
    slotted.sort(key=lambda p: parse_utc(p["scheduled_at_utc"]))
    assert_active_queue_no_consecutive_articles(
        [
            {
                "article_slug": p.get("article_slug"),
                "pin_slug": p.get("pin_slug"),
            }
            for p in slotted
        ]
    )
    return slotted


def prepare_replacement_dry_run(
    cohort: dict[str, Any],
    *,
    repo_root: Path,
    selected: Iterable[str] | None = None,
    check_urls: bool = True,
    url_checker: Callable[[str], tuple[bool, str]] | None = None,
    write_guard: WriteGuard | None = None,
    queue_rows: list[dict[str, Any]] | None = None,
) -> DryRunResult:
    guard = write_guard or WriteGuard(allowed=False, confirm_ok=False)
    pins = selected_pins(cohort, selected)
    assert_no_rejected_selected(cohort, pins)
    wanted = {p["pin_slug"] for p in pins}
    for item in cohort.get("replacements") or []:
        if item["replacement_pin_slug"] not in wanted:
            raise ValidationError(
                "Replacement references pin not in selected set: "
                + item["replacement_pin_slug"]
            )
    warnings = validate_cohort_pins(
        cohort,
        pins,
        repo_root=repo_root,
        check_urls=check_urls,
        url_checker=url_checker,
    )
    slotted = propose_replacement_slots(cohort, pins)
    pins_by_slug = {p["pin_slug"]: p for p in pins}
    preview = build_transaction_preview(cohort, pins_by_slug)
    manifest = build_replacement_manifest(cohort, pins_by_slug, preview)
    proposed_active = apply_replacements_to_queue(queue_rows or [], manifest)
    # Even without a full queue snapshot, cohort replacements themselves must
    # not place two variants of the same article on consecutive replacement slots.
    assert_active_queue_no_consecutive_articles(
        [
            {
                "article_slug": p.get("article_slug"),
                "pin_slug": p.get("pin_slug"),
            }
            for p in slotted
        ]
    )
    rows = build_ledger_rows(cohort, slotted, status="REVIEW")
    approval = build_approval_artifact(
        cohort,
        rows,
        mode="dry-run-replace_next_30d",
        d1_writes=guard.d1_write_attempts,
    )
    approval["schedule_mode"] = "replace_next_30d"
    approval["transaction_preview"] = preview
    approval["replacement_manifest"] = manifest
    approval["proposed_active_queue_sample"] = proposed_active[:20]
    approval["old_rows_preserved"] = True
    approval["old_row_status_change"] = {"from": "PENDING", "to": "REVIEW"}
    return DryRunResult(
        rows=rows,
        approval=approval,
        warnings=warnings,
        d1_write_attempts=guard.d1_write_attempts,
        slotted=slotted,
        schedule_mode="replace_next_30d",
        transaction_preview=preview,
        replacement_manifest=manifest,
        proposed_active_queue=proposed_active,
    )


def prepare_cohort_dry_run(
    cohort: dict[str, Any],
    *,
    repo_root: Path,
    selected: Iterable[str] | None = None,
    check_urls: bool = True,
    url_checker: Callable[[str], tuple[bool, str]] | None = None,
    write_guard: WriteGuard | None = None,
    queue_rows: list[dict[str, Any]] | None = None,
) -> DryRunResult:
    guard = write_guard or WriteGuard(allowed=False, confirm_ok=False)
    mode = cohort.get("schedule_mode") or "append_after_tail"
    if mode == "replace_next_30d":
        return prepare_replacement_dry_run(
            cohort,
            repo_root=repo_root,
            selected=selected,
            check_urls=check_urls,
            url_checker=url_checker,
            write_guard=guard,
            queue_rows=queue_rows,
        )
    if mode != "append_after_tail":
        raise ValidationError(f"Unknown schedule_mode: {mode}")
    if "append_after_utc" not in cohort:
        raise ValidationError("append_after_tail mode requires append_after_utc")
    pins = selected_pins(cohort, selected)
    assert_no_rejected_selected(cohort, pins)
    warnings = validate_cohort_pins(
        cohort,
        pins,
        repo_root=repo_root,
        check_urls=check_urls,
        url_checker=url_checker,
    )
    slotted = propose_utc_slots(
        pins,
        append_after_utc=cohort["append_after_utc"],
        spacing_hours=float(cohort.get("slot_spacing_hours") or 12),
    )
    rows = build_ledger_rows(cohort, slotted, status="REVIEW")
    approval = build_approval_artifact(
        cohort,
        rows,
        mode="dry-run",
        d1_writes=guard.d1_write_attempts,
    )
    approval["schedule_mode"] = "append_after_tail"
    return DryRunResult(
        rows=rows,
        approval=approval,
        warnings=warnings,
        d1_write_attempts=guard.d1_write_attempts,
        slotted=slotted,
        schedule_mode="append_after_tail",
    )


def apply_production_schedule(
    artifact: dict[str, Any],
    *,
    guard: WriteGuard,
    upload_fn: Callable[[list[dict[str, str]]], Any] | None = None,
    csv_rows: list[dict[str, str]] | None = None,
) -> Any:
    """Future production write path. Requires dual confirmation via WriteGuard."""
    guard.assert_can_write("pins_schedule upsert")
    if artifact.get("gate") != "APPROVED":
        raise ValidationError("Production apply requires gate=APPROVED first")
    if upload_fn is None:
        raise ReleaseSafetyError(
            "No upload_fn provided; refusing blind D1 write. "
            "Pass an explicit uploader that uses the existing production path."
        )
    return upload_fn(csv_rows or [])
