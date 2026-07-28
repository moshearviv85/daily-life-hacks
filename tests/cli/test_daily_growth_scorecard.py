import importlib.util
import json
import sys
import zipfile
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "daily_growth_scorecard", ROOT / "scripts" / "daily-growth-scorecard.py"
)
scorecard = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = scorecard
SPEC.loader.exec_module(scorecard)


def _write_gsc_zip(path: Path, *, include_page_filter: bool = True):
    start = date(2026, 7, 20)
    chart = ["Date,Clicks,Impressions,CTR,Position"]
    for index in range(8):
        day = start + timedelta(days=index)
        chart.append(f"{day.isoformat()},{index % 2},{10 + index},0%,{20 - index}")
    filters = ["Filter,Value", "Search type,Web", "Date,Custom"]
    if include_page_filter:
        filters.append("Page,Custom regex: recovery cohort")
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("Chart.csv", "\n".join(chart) + "\n")
        archive.writestr("Filters.csv", "\n".join(filters) + "\n")


def _write_bing(path: Path):
    lines = ['"Date","Clicks","Impressions","Avg. CTR"']
    start = date(2026, 7, 20)
    for index in range(8):
        day = start + timedelta(days=index)
        lines.append(
            f'"{day.month}/{day.day}/{day.year} 12:00:00 AM","{index % 2}","{20 + index}","0"'
        )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_pinterest(path: Path):
    lines = [
        "Analytics overview",
        "2026-07-20 - 2026-07-27",
        "Claimed accounts,All Pins",
        "Curated content,Not included",
        "",
        "Date,Impressions",
    ]
    start = date(2026, 7, 20)
    for index in range(8):
        lines.append(f"{(start + timedelta(days=index)).isoformat()},{100 + index}")
    lines.append("Data starting from today is an estimate.")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_clarity_daily(path: Path):
    lines = ["Date,Sessions"]
    start = date(2026, 7, 20)
    for index in range(8):
        lines.append(f"{(start + timedelta(days=index)).isoformat()},{5 + index}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _config():
    return {
        "channels": {
            "gsc": {
                "cohort_id": "recovery-20",
                "file_patterns": ["*Performance-on-Search*.zip"],
                "require_page_filter": True,
            },
            "bing": {
                "cohort_id": "bing-all",
                "file_patterns": ["*SearchPerformanceOverview_All*.csv"],
                "require_filename_token": "_All_",
            },
            "pinterest": {
                "cohort_id": "pin-all",
                "file_patterns": ["Pinterest Analytics overview*.csv"],
                "required_metadata": {
                    "Claimed accounts": "All Pins",
                    "Curated content": "Not included",
                },
            },
            "clarity": {
                "cohort_id": "clarity-all",
                "file_patterns": ["Clarity_*.csv"],
            },
        }
    }


def test_all_four_sources_compare_same_eight_day_window(tmp_path):
    _write_gsc_zip(tmp_path / "site-Performance-on-Search.zip")
    _write_bing(tmp_path / "site_SearchPerformanceOverview_All_7_28_2026.csv")
    _write_pinterest(tmp_path / "Pinterest Analytics overview 20260720-20260727.csv")
    _write_clarity_daily(tmp_path / "Clarity_export.csv")

    target = date(2026, 7, 27)
    snapshots = scorecard.build_snapshots([tmp_path], _config(), target)

    assert [snapshot.status for snapshot in snapshots] == ["READY"] * 4
    for snapshot in snapshots:
        rows = scorecard.compare(snapshot, target)
        assert rows
        assert all(row["prior_7d_average"] >= 0 for row in rows)


def test_gsc_without_page_filter_is_not_treated_as_fixed_cohort(tmp_path):
    path = tmp_path / "site-Performance-on-Search.zip"
    _write_gsc_zip(path, include_page_filter=False)

    snapshot = scorecard.parse_gsc(path, _config()["channels"]["gsc"])
    snapshot = scorecard.finalize_snapshot(snapshot, date(2026, 7, 27))

    assert snapshot.status == "COHORT_MISMATCH"
    assert scorecard.compare(snapshot, date(2026, 7, 27)) == []


def test_missing_yesterday_is_stale_not_zero(tmp_path):
    path = tmp_path / "site_SearchPerformanceOverview_All_7_28_2026.csv"
    _write_bing(path)
    snapshot = scorecard.parse_bing(path, _config()["channels"]["bing"])
    snapshot = scorecard.finalize_snapshot(snapshot, date(2026, 7, 28))

    assert snapshot.status == "STALE"
    assert scorecard.compare(snapshot, date(2026, 7, 28)) == []


def test_aggregate_clarity_export_is_explicitly_non_comparable(tmp_path):
    path = tmp_path / "Clarity_Dashboard.csv"
    path.write_text(
        '"Project name","Daily-life-hacks"\n'
        '"Date range","07/12/2025 12:00 AM - 07/11/2026 11:59 PM"\n\n'
        '"Metric","Sessions"\n'
        '"","Total sessions","701"\n',
        encoding="utf-8",
    )
    snapshot = scorecard.parse_clarity(path, _config()["channels"]["clarity"])

    assert snapshot.status == "NON_COMPARABLE"
    assert snapshot.aggregate["sessions"] == 701


def test_report_separates_operational_health_from_growth(tmp_path):
    snapshots = [
        scorecard.Snapshot(
            channel="gsc",
            cohort_id="recovery-20",
            source_path=None,
            status="UNAVAILABLE",
            note="missing",
        )
    ]
    report, payload = scorecard.build_report(
        snapshots,
        as_of=date(2026, 7, 28),
        release_summary={"published": 0, "due": [], "overdue": []},
    )

    assert "תקינות תפעולית של המדידה" in report
    assert "צמיחה מדידה בתנועה" in report
    assert "מקור חסר או מיושן אינו 0" in report
    assert payload["target_date"] == "2026-07-27"


def test_release_governance_lists_due_and_overdue(tmp_path):
    ledger = tmp_path / "ledger.jsonl"
    rows = [
        {
            "record_type": "release",
            "release_id": "rel-a",
            "status": "RELEASED",
            "published_at_utc": "2026-07-20T00:00:00Z",
            "channel": "pinterest",
            "measurement_due_7d": "2026-07-27T00:00:00Z",
            "measurement_due_30d": "2026-08-19T00:00:00Z",
        },
        {
            "record_type": "release",
            "release_id": "rel-b",
            "status": "RELEASED",
            "published_at_utc": "2026-07-10T00:00:00Z",
            "channel": "youtube",
            "measurement_due_7d": "2026-07-17T00:00:00Z",
        },
        {
            "record_type": "checkpoint",
            "release_id": "rel-b",
            "checkpoint_day": 7,
            "decision": "HOLD",
        },
        {
            "record_type": "release",
            "release_id": "rel-c",
            "status": "RELEASED",
            "published_at_utc": "2026-07-10T00:00:00Z",
            "channel": "reddit",
            "measurement_due_7d": "2026-07-17T00:00:00Z",
        },
    ]
    ledger.write_text(
        "\n".join(json.dumps(row) for row in rows) + "\n",
        encoding="utf-8",
    )

    summary = scorecard.read_release_governance(ledger, date(2026, 7, 27))

    assert summary["published"] == 3
    assert [item["release_id"] for item in summary["due"]] == ["rel-a"]
    assert [item["release_id"] for item in summary["overdue"]] == ["rel-c"]
