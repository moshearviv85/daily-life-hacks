#!/usr/bin/env python3
"""Build a read-only daily growth scorecard from local channel CSV exports.

The report compares yesterday with the preceding seven complete days for the
same fixed channel cohort. Missing, stale, aggregate-only, or cohort-mismatched
inputs are reported as unavailable. They are never converted to zero.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import zipfile
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "pipeline-data" / "growth-measurement" / "cohorts.json"
DEFAULT_LEDGER = ROOT / "pipeline-data" / "distribution-release-ledger.jsonl"

CHANNEL_LABELS = {
    "gsc": "Google Search Console",
    "bing": "Bing Webmaster",
    "pinterest": "Pinterest",
    "clarity": "Microsoft Clarity",
}

STATUS_LABELS = {
    "READY": "🟢 מוכן להשוואה",
    "PARTIAL": "🟡 נתונים חלקיים",
    "STALE": "🟡 מקור מיושן",
    "COHORT_MISMATCH": "🔴 קוהורט לא מאומת",
    "NON_COMPARABLE": "🟡 נמצא אך לא בר־השוואה",
    "UNAVAILABLE": "⚪ לא זמין",
    "ERROR": "🔴 שגיאת קלט",
}

METRIC_LABELS = {
    "clicks": "קליקים",
    "impressions": "חשיפות",
    "outbound_clicks": "קליקים יוצאים",
    "sessions": "סשנים",
    "position": "מיקום ממוצע",
}


@dataclass
class Snapshot:
    channel: str
    cohort_id: str
    source_path: Path | None
    status: str = "UNAVAILABLE"
    note: str = ""
    series: dict[date, dict[str, float]] = field(default_factory=dict)
    observed_end: date | None = None
    aggregate: dict[str, float] = field(default_factory=dict)


def _float(value: Any) -> float:
    raw = str(value or "").strip().replace(",", "").replace("%", "")
    if not raw:
        return 0.0
    return float(raw)


def _date(value: str) -> date | None:
    raw = str(value or "").strip()
    for fmt in (
        "%Y-%m-%d",
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y",
        "%m/%d/%y",
    ):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _latest(input_dirs: Iterable[Path], patterns: Iterable[str]) -> Path | None:
    candidates: list[Path] = []
    for directory in input_dirs:
        if not directory.is_dir():
            continue
        for pattern in patterns:
            candidates.extend(p for p in directory.glob(pattern) if p.is_file())
    if not candidates:
        return None
    return max(candidates, key=lambda p: (p.stat().st_mtime_ns, p.name))


def _csv_rows(text: str) -> list[list[str]]:
    return list(csv.reader(text.replace("\ufeff", "").splitlines()))


def _dict_rows(text: str) -> list[dict[str, str]]:
    return list(csv.DictReader(text.replace("\ufeff", "").splitlines()))


def _normalize_cohort_url(value: str) -> str:
    raw = str(value or "").strip()
    parsed = urlsplit(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"invalid cohort URL: {raw!r}")
    host = (parsed.hostname or "").lower()
    if host not in {"daily-life-hacks.com", "www.daily-life-hacks.com"}:
        raise ValueError(f"cohort URL is outside daily-life-hacks.com: {raw!r}")
    path = re.sub(r"/+", "/", parsed.path or "/")
    if not path.endswith("/"):
        path += "/"
    return urlunsplit(("https", "www.daily-life-hacks.com", path, "", ""))


def _load_fixed_cohort(config: dict[str, Any]) -> set[str]:
    raw_path = config.get("cohort_file")
    if not raw_path:
        raise ValueError("GSC cohort_file is required")
    path = Path(raw_path)
    if not path.is_absolute():
        path = ROOT / path
    if not path.is_file():
        raise ValueError(f"GSC cohort_file not found: {path}")
    rows = _dict_rows(path.read_text(encoding="utf-8-sig"))
    if not rows or "url" not in rows[0]:
        raise ValueError(f"GSC cohort_file must contain a url column: {path}")
    urls = [_normalize_cohort_url(row.get("url", "")) for row in rows]
    unique = set(urls)
    if len(urls) != 20 or len(unique) != 20:
        raise ValueError(
            "GSC cohort_file must contain exactly 20 unique URLs "
            f"(found {len(urls)} rows, {len(unique)} unique)"
        )
    return unique


def _urls_from_page_filters(filter_rows: list[dict[str, str]]) -> set[str] | None:
    values = [
        str(row.get("Value", "")).strip()
        for row in filter_rows
        if str(row.get("Filter", "")).strip().lower() in {"page", "pages"}
    ]
    if not values:
        return None
    extracted: set[str] = set()
    for value in values:
        expression = re.sub(r"\\([./:?&=_~%#-])", r"\1", value)
        urls = re.findall(
            r"https?://[A-Za-z0-9.-]+(?::\d+)?/[A-Za-z0-9._~!$&'+,;=:@%/-]*",
            expression,
        )
        if not urls:
            return None
        remainder = expression
        for url in urls:
            remainder = remainder.replace(url, "", 1)
        remainder = re.sub(r"(?i)custom\s+regex\s*:", "", remainder)
        if re.sub(r"[\s^$()?:|]", "", remainder):
            return None
        extracted.update(_normalize_cohort_url(url) for url in urls)
    return extracted


def parse_gsc(path: Path | None, config: dict[str, Any]) -> Snapshot:
    snap = Snapshot("gsc", config["cohort_id"], path)
    if path is None:
        snap.note = "לא נמצא ZIP של Performance on Search."
        return snap
    try:
        expected_urls = _load_fixed_cohort(config)
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
            if "Chart.csv" not in names:
                raise ValueError("Chart.csv missing from GSC export")
            chart = archive.read("Chart.csv").decode("utf-8-sig")
            filters = (
                archive.read("Filters.csv").decode("utf-8-sig")
                if "Filters.csv" in names
                else ""
            )
        filter_rows = _dict_rows(filters) if filters else []
        filtered_urls = _urls_from_page_filters(filter_rows)
        if filtered_urls != expected_urls:
            snap.status = "COHORT_MISMATCH"
            snap.note = (
                "Filters.csv does not prove the exact 20-URL cohort from "
                f"{config['cohort_file']}; a generic Page filter is not sufficient."
            )
        else:
            snap.status = "READY"
            snap.note = "Filters.csv exactly matches all 20 URLs in the fixed cohort file."
        for row in _dict_rows(chart):
            day = _date(row.get("Date", ""))
            if not day:
                continue
            snap.series[day] = {
                "clicks": _float(row.get("Clicks")),
                "impressions": _float(row.get("Impressions")),
                "position": _float(row.get("Position")),
            }
    except Exception as exc:  # noqa: BLE001
        snap.status = "ERROR"
        snap.note = f"{type(exc).__name__}: {exc}"
    return snap


def parse_bing(path: Path | None, config: dict[str, Any]) -> Snapshot:
    snap = Snapshot("bing", config["cohort_id"], path)
    if path is None:
        snap.note = "לא נמצא SearchPerformanceOverview_All CSV."
        return snap
    try:
        if config.get("require_filename_token") not in path.name:
            snap.status = "COHORT_MISMATCH"
            snap.note = "שם הקובץ אינו מוכיח שהייצוא הוא All-site."
        else:
            snap.status = "READY"
            snap.note = "All-site הוא הקוהורט הקבוע של Bing."
        text = path.read_text(encoding="utf-8-sig")
        for row in _dict_rows(text):
            day = _date(row.get("Date", ""))
            if not day:
                continue
            snap.series[day] = {
                "clicks": _float(row.get("Clicks")),
                "impressions": _float(row.get("Impressions")),
            }
    except Exception as exc:  # noqa: BLE001
        snap.status = "ERROR"
        snap.note = f"{type(exc).__name__}: {exc}"
    return snap


def parse_pinterest(path: Path | None, config: dict[str, Any]) -> Snapshot:
    snap = Snapshot("pinterest", config["cohort_id"], path)
    if path is None:
        snap.note = "לא נמצא Pinterest Analytics overview CSV."
        return snap
    try:
        rows = _csv_rows(path.read_text(encoding="utf-8-sig"))
        metadata = {
            row[0].strip(): row[1].strip()
            for row in rows
            if len(row) >= 2 and row[0].strip() and row[0].strip() != "Date"
        }
        mismatch: list[str] = []
        for key, expected in config.get("required_metadata", {}).items():
            if metadata.get(key) != expected:
                mismatch.append(f"{key}={metadata.get(key, 'missing')!r}")
        header_index = next(
            (
                i
                for i, row in enumerate(rows)
                if row and row[0].strip() == "Date"
            ),
            None,
        )
        if header_index is None:
            raise ValueError("daily Date header missing")
        headers = [h.strip() for h in rows[header_index]]
        metric_map = {
            "Impressions": "impressions",
            "Outbound clicks": "outbound_clicks",
        }
        for raw_row in rows[header_index + 1 :]:
            if not raw_row:
                break
            day = _date(raw_row[0])
            if not day:
                break
            values: dict[str, float] = {}
            for idx, header in enumerate(headers[1:], start=1):
                metric = metric_map.get(header)
                if metric and idx < len(raw_row):
                    values[metric] = _float(raw_row[idx])
            if values:
                snap.series[day] = values
        if mismatch:
            snap.status = "COHORT_MISMATCH"
            snap.note = "מטא־דאטה של הקוהורט אינו תואם: " + ", ".join(mismatch)
        else:
            snap.status = "READY"
            snap.note = (
                "הקוהורט אומת לפי Claimed accounts ו-Curated content. "
                "אם הייצוא כולל רק Impressions, קליקים יוצאים נשארים לא זמינים."
            )
    except Exception as exc:  # noqa: BLE001
        snap.status = "ERROR"
        snap.note = f"{type(exc).__name__}: {exc}"
    return snap


def parse_clarity(path: Path | None, config: dict[str, Any]) -> Snapshot:
    snap = Snapshot("clarity", config["cohort_id"], path)
    if path is None:
        snap.note = "לא נמצא Clarity Dashboard CSV."
        return snap
    try:
        rows = _csv_rows(path.read_text(encoding="utf-8-sig"))
        for idx, row in enumerate(rows):
            normalized = [cell.strip().lower() for cell in row]
            if "date" in normalized and "sessions" in normalized:
                date_idx = normalized.index("date")
                sessions_idx = normalized.index("sessions")
                for data_row in rows[idx + 1 :]:
                    if max(date_idx, sessions_idx) >= len(data_row):
                        break
                    day = _date(data_row[date_idx])
                    if not day:
                        break
                    snap.series[day] = {
                        "sessions": _float(data_row[sessions_idx]),
                    }
                break
        for row in rows:
            if len(row) >= 3 and row[0].strip() == "" and row[1].strip() == "Total sessions":
                snap.aggregate["sessions"] = _float(row[2])
        date_range = next(
            (row[1].strip() for row in rows if len(row) >= 2 and row[0].strip() == "Date range"),
            "",
        )
        if snap.series:
            snap.status = "READY"
            snap.note = "נמצאה סדרה יומית של Sessions."
        else:
            snap.status = "NON_COMPARABLE"
            detail = f" טווח הייצוא: {date_range}." if date_range else ""
            snap.note = (
                "הייצוא הוא snapshot מצטבר ללא Date+Sessions יומי; "
                "אי אפשר לחשב אתמול מול שבעת הימים שלפניו." + detail
            )
    except Exception as exc:  # noqa: BLE001
        snap.status = "ERROR"
        snap.note = f"{type(exc).__name__}: {exc}"
    return snap


def finalize_snapshot(snap: Snapshot, target: date) -> Snapshot:
    if snap.series:
        snap.observed_end = max(snap.series)
    if snap.status != "READY":
        return snap
    history = [target - timedelta(days=offset) for offset in range(1, 8)]
    if target not in snap.series:
        snap.status = "STALE" if snap.observed_end and snap.observed_end < target else "PARTIAL"
        snap.note += f" אין נתון ל-{target.isoformat()}."
    elif any(day not in snap.series for day in history):
        missing = sum(day not in snap.series for day in history)
        snap.status = "PARTIAL"
        snap.note += f" חסרים {missing} מתוך 7 ימי ההשוואה."
    return snap


def compare(snap: Snapshot, target: date) -> list[dict[str, Any]]:
    if snap.status != "READY":
        return []
    prior_days = [target - timedelta(days=offset) for offset in range(1, 8)]
    current = snap.series[target]
    common_metrics = set(current)
    for day in prior_days:
        common_metrics &= set(snap.series[day])
    rows: list[dict[str, Any]] = []
    for metric in sorted(common_metrics):
        values = [snap.series[day][metric] for day in prior_days]
        average = sum(values) / 7
        value = current[metric]
        if average == 0:
            delta = None if value else 0.0
        else:
            delta = (value - average) / average
        rows.append(
            {
                "metric": metric,
                "current": value,
                "prior_7d_average": average,
                "delta_ratio": delta,
            }
        )
    return rows


def _fmt_number(value: float) -> str:
    if float(value).is_integer():
        return f"{int(value):,}"
    return f"{value:,.2f}"


def _fmt_delta(value: float | None, current: float) -> str:
    if value is None:
        return "חדש מעל בסיס 0" if current > 0 else "לא מחושב"
    return f"{value * 100:+.1f}%"


def _traffic_signal(rows: list[dict[str, Any]]) -> tuple[str, str]:
    if not rows:
        return "⚪", "לא ניתן לאמת שינוי"
    priority = ("clicks", "outbound_clicks", "sessions", "impressions")
    row = next((r for name in priority for r in rows if r["metric"] == name), rows[0])
    current = row["current"]
    average = row["prior_7d_average"]
    if current == 0 and average == 0:
        return "🟡", "אין שינוי מדיד; גם אתמול וגם הבסיס היו 0"
    if average == 0 and current > 0:
        return "🟢", "אות חיובי חדש מעל בסיס 0, עדיין לא מגמה"
    ratio = current / average if average else 0
    if ratio >= 1.2:
        return "🟢", "עלייה יומית מול אותו קוהורט"
    if ratio <= 0.8 and average >= 1:
        return "🔴", "ירידה יומית; לא משנים אסטרטגיה על סמך יום יחיד"
    return "🟡", "שטוח או תנודה קטנה"


def read_release_governance(ledger: Path, target: date) -> dict[str, Any]:
    result = {"published": 0, "due": [], "overdue": []}
    if not ledger.is_file():
        return result
    rows: list[dict[str, Any]] = []
    for line in ledger.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        try:
            rows.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    def checkpoint_window(row: dict[str, Any]) -> str | None:
        explicit = str(row.get("checkpoint_window") or "").lower()
        if explicit in {"24h", "7d", "14d", "30d", "60d"}:
            return explicit
        raw_day = str(row.get("checkpoint_day", ""))
        return f"{int(raw_day)}d" if raw_day.isdigit() else None

    completed = {
        (row.get("release_id"), checkpoint_window(row))
        for row in rows
        if row.get("record_type") == "checkpoint"
        and row.get("release_id")
        and checkpoint_window(row)
    }
    for row in rows:
        if row.get("record_type") == "checkpoint":
            continue
        status = str(row.get("status") or "").upper()
        published = row.get("published_at_utc") or row.get("released_at_utc")
        if not published or status not in {"POSTED", "PUBLISHED", "RELEASED"}:
            continue
        result["published"] += 1
        for window in ("24h", "7d", "14d", "30d", "60d"):
            raw_due = row.get(f"measurement_due_{window}")
            if not raw_due:
                continue
            try:
                due = datetime.fromisoformat(raw_due.replace("Z", "+00:00")).date()
            except ValueError:
                continue
            item = {
                "release_id": row.get("release_id") or row.get("queue_row_id") or row.get("pin_slug"),
                "channel": row.get("channel"),
                "checkpoint": window,
                "due": due.isoformat(),
            }
            if (item["release_id"], window) in completed:
                continue
            if due == target:
                result["due"].append(item)
            elif due < target:
                result["overdue"].append(item)
    return result


def build_report(
    snapshots: list[Snapshot],
    *,
    as_of: date,
    release_summary: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    target = as_of - timedelta(days=1)
    prior_start = target - timedelta(days=7)
    prior_end = target - timedelta(days=1)
    comparisons = {snap.channel: compare(snap, target) for snap in snapshots}

    lines = [
        f"# דוח צמיחה יומי — {as_of.isoformat()}",
        "",
        f"**יום נמדד:** {target.isoformat()}",
        f"**בסיס השוואה קבוע:** ממוצע יומי {prior_start.isoformat()} עד {prior_end.isoformat()} לאותו קוהורט בדיוק.",
        "",
        "## 1. תקינות תפעולית של המדידה",
        "",
        "| ערוץ | מצב | קוהורט קבוע | נתונים עד | קובץ והערה |",
        "|---|---|---|---|---|",
    ]
    for snap in snapshots:
        source = snap.source_path.name if snap.source_path else "לא נמצא"
        observed = snap.observed_end.isoformat() if snap.observed_end else "לא ידוע"
        note = f"`{source}`. {snap.note}".replace("|", "\\|")
        lines.append(
            f"| {CHANNEL_LABELS[snap.channel]} | {STATUS_LABELS[snap.status]} | "
            f"`{snap.cohort_id}` | {observed} | {note} |"
        )

    lines.extend(
        [
            "",
            "הטבלה הזו מודדת אם אפשר לסמוך על הנתונים. היא אינה הוכחה לצמיחה בתנועה.",
            "",
            "## 2. צמיחה מדידה בתנועה",
            "",
            "| ערוץ | אות | מדד | אתמול | ממוצע 7 ימים קודמים | שינוי | פירוש |",
            "|---|---|---|---:|---:|---:|---|",
        ]
    )
    for snap in snapshots:
        rows = comparisons[snap.channel]
        signal, interpretation = _traffic_signal(rows)
        if not rows:
            lines.append(
                f"| {CHANNEL_LABELS[snap.channel]} | {signal} | לא זמין | — | — | — | "
                f"{interpretation} |"
            )
            continue
        for index, row in enumerate(rows):
            metric = METRIC_LABELS.get(row["metric"], row["metric"])
            suffix = f" {interpretation}" if index == 0 else ""
            lines.append(
                f"| {CHANNEL_LABELS[snap.channel]} | {signal if index == 0 else ''} | "
                f"{metric} | {_fmt_number(row['current'])} | "
                f"{_fmt_number(row['prior_7d_average'])} | "
                f"{_fmt_delta(row['delta_ratio'], row['current'])} |{suffix} |"
            )

    lines.extend(
        [
            "",
            "## 3. ממשל שחרורים ומדידה",
            "",
            f"- שחרורים שפורסמו ונמצאו ב-ledger: **{release_summary['published']}**.",
            f"- checkpoints שמגיעים ביום הנמדד: **{len(release_summary['due'])}**.",
            f"- checkpoints שעבר מועד המדידה שלהם: **{len(release_summary['overdue'])}**.",
        ]
    )
    for item in release_summary["due"][:10]:
        lines.append(
            f"  - היום: `{item['release_id']}` / {item['channel']} / יום {item['checkpoint']}."
        )
    for item in release_summary["overdue"][:10]:
        lines.append(
            f"  - באיחור: `{item['release_id']}` / {item['channel']} / "
            f"יום {item['checkpoint']} / יעד {item['due']}."
        )

    lines.extend(
        [
            "",
            "## 4. כללי החלטה",
            "",
            "- **יום 7:** בודקים תקינות, אינדוקס/הפצה, יעד תקין ואירועי מדיניות. לא מגדילים נפח בגלל שבוע אחד.",
            "- **יום 30:** SCALE רק עם קוהורט תקין, לפחות 3 שחרורים, תנועה איכותית ואפס אירועי מדיניות. אחרת HOLD או ITERATE.",
            "- **יום 60:** STOP כאשר לפחות 10 שחרורים יצרו 0 סשנים איכותיים, או כאשר יש סיכון חשבון/דומיין. SCALE כאשר יש לפחות סשן איכותי אחד לשחרור ואפס אירועי מדיניות.",
            "",
            "## 5. מה הדוח אינו מוכיח",
            "",
            "- workflow, build, pin מתוזמן או URL תקין מוכיחים בריאות תפעולית בלבד.",
            "- מקור חסר או מיושן אינו 0.",
            "- סך מצטבר מחלון אחר אינו שינוי יומי.",
            "- יום חיובי או שלילי אחד אינו מגמה ואינו מצדיק החלפת URL, כותרת או קוהורט.",
            "",
        ]
    )
    payload = {
        "schema": "daily-growth-scorecard/v1",
        "as_of": as_of.isoformat(),
        "target_date": target.isoformat(),
        "prior_window": [prior_start.isoformat(), prior_end.isoformat()],
        "sources": [
            {
                "channel": snap.channel,
                "cohort_id": snap.cohort_id,
                "status": snap.status,
                "source_path": str(snap.source_path) if snap.source_path else None,
                "observed_end": snap.observed_end.isoformat() if snap.observed_end else None,
                "note": snap.note,
                "comparisons": comparisons[snap.channel],
            }
            for snap in snapshots
        ],
        "release_governance": release_summary,
    }
    lines.append(f"<!-- daily-growth-data: {json.dumps(payload, ensure_ascii=False)} -->")
    lines.append("")
    return "\n".join(lines), payload


def load_config(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def build_snapshots(
    input_dirs: list[Path],
    config: dict[str, Any],
    target: date,
) -> list[Snapshot]:
    channels = config["channels"]
    parsers = {
        "gsc": parse_gsc,
        "bing": parse_bing,
        "pinterest": parse_pinterest,
        "clarity": parse_clarity,
    }
    snapshots: list[Snapshot] = []
    for channel in ("gsc", "bing", "pinterest", "clarity"):
        channel_config = channels[channel]
        source = _latest(input_dirs, channel_config["file_patterns"])
        snapshots.append(
            finalize_snapshot(parsers[channel](source, channel_config), target)
        )
    return snapshots


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input-dir",
        action="append",
        type=Path,
        default=[],
        help="Directory containing exports. Repeatable. Default: ~/Downloads.",
    )
    parser.add_argument("--as-of", type=date.fromisoformat, default=date.today())
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Markdown output. Default: pipeline-data/scorecards/daily/scorecard-YYYY-MM-DD.md",
    )
    parser.add_argument("--json-output", type=Path, default=None)
    parser.add_argument("--stdout", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    input_dirs = args.input_dir or [Path.home() / "Downloads"]
    target = args.as_of - timedelta(days=1)
    config = load_config(args.config)
    snapshots = build_snapshots(input_dirs, config, target)
    release_summary = read_release_governance(args.ledger, target)
    report, payload = build_report(
        snapshots,
        as_of=args.as_of,
        release_summary=release_summary,
    )
    output = args.output or (
        ROOT
        / "pipeline-data"
        / "scorecards"
        / "daily"
        / f"scorecard-{args.as_of.isoformat()}.md"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(report, encoding="utf-8")
    if args.json_output:
        args.json_output.parent.mkdir(parents=True, exist_ok=True)
        args.json_output.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    if args.stdout:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        print(report)
    print(f"Wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
