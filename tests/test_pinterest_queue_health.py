"""Tests for read-only Pinterest queue health."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.pinterest_release import load_json  # noqa: E402
from scripts.pinterest_queue_health import (  # noqa: E402
    approved_missing_from_d1,
    build_health_report,
    fetch_d1_snapshot_readonly,
    load_queue_rows,
    normalize_queue_payload,
    summarize_queue,
)
from scripts import pinterest_queue_health as health_cli  # noqa: E402

SNAPSHOT = ROOT / "tests" / "fixtures" / "pinterest_release" / "queue-snapshot.json"
WRANGLER = ROOT / "tests" / "fixtures" / "pinterest_release" / "wrangler-d1-snapshot.json"


def test_summarize_pending_due_and_next_five():
    rows = load_json(SNAPSHOT)["rows"]
    now = datetime(2026, 7, 11, 12, 0, tzinfo=timezone.utc)
    summary = summarize_queue(rows, now=now)
    assert summary["total_pending"] == 6
    assert summary["due_now"] == 1
    assert summary["due_now_row_ids"] == ["legacy-1"]
    assert len(summary["next_five_scheduled"]) == 5
    assert summary["latest_successful_post"]["row_id"] == "posted-1"
    assert summary["latest_successful_post"]["pinterest_pin_id"] == "999"


def test_approved_cohort_missing_from_d1():
    approval = {
        "gate": "APPROVED",
        "pins": [
            {"queue_row_id": "legacy-1"},
            {"queue_row_id": "exp-missing-1"},
            {"queue_row_id": "exp-missing-2"},
        ],
    }
    rows = load_json(SNAPSHOT)["rows"]
    missing = approved_missing_from_d1(approval, rows)
    assert missing == ["exp-missing-1", "exp-missing-2"]


def test_health_cli_read_only(tmp_path: Path):
    out = tmp_path / "health.json"
    code = health_cli.main(
        [
            "--queue-snapshot",
            str(SNAPSHOT),
            "--workflow-state",
            "active",
            "--json-out",
            str(out),
        ]
    )
    assert code == 0
    report = json.loads(out.read_text(encoding="utf-8"))
    assert report["read_only"] is True
    assert report["d1_writes"] == 0
    assert report["workflow_state"] == "active"
    assert report["queue"]["total_pending"] == 6


def test_build_health_with_approval_gap(tmp_path: Path):
    approval = {
        "gate": "APPROVED",
        "pins": [{"queue_row_id": "not-in-queue"}],
    }
    approval_path = tmp_path / "approval.json"
    approval_path.write_text(json.dumps(approval), encoding="utf-8")

    args = SimpleNamespace(
        queue_snapshot=SNAPSHOT,
        pins_api_url=None,
        workflow_state="active",
        cohort=None,
        approval_file=approval_path,
        check_destinations=False,
        skip_live_url=True,
        fetch_d1_snapshot=False,
        d1_db_name="dlh-production",
        d1_select="SELECT row_id FROM pins_schedule",
        save_d1_snapshot=None,
    )
    report = build_health_report(args)
    assert report["approved_cohort_pins_missing_from_d1"] == ["not-in-queue"]


def test_normalize_wrangler_d1_snapshot_shape():
    rows = normalize_queue_payload(load_json(WRANGLER))
    assert len(rows) == 2
    assert rows[0]["row_id"] == "wrangler-1"
    assert load_queue_rows(WRANGLER, None)[1]["status"] == "POSTED"


def test_fetch_d1_snapshot_refuses_non_select():
    with pytest.raises(ValueError, match="non-SELECT"):
        fetch_d1_snapshot_readonly(db_name="dlh-production", select_sql="DELETE FROM pins_schedule")


def test_fetch_d1_snapshot_readonly_mocked(monkeypatch, tmp_path: Path):
    saved = tmp_path / "live.json"

    def fake_fetch(*, db_name, select_sql, timeout=60):
        assert db_name == "dlh-production"
        assert select_sql.upper().startswith("SELECT")
        return [{"row_id": "live-1", "status": "PENDING", "publish_at": "2026-07-20T10:00:00"}]

    monkeypatch.setattr(health_cli, "fetch_d1_snapshot_readonly", fake_fetch)
    rows = health_cli.load_queue_rows(
        None,
        None,
        fetch_d1=True,
        d1_db_name="dlh-production",
        d1_select="SELECT row_id, status, publish_at FROM pins_schedule",
        save_d1_snapshot=saved,
    )
    assert rows[0]["row_id"] == "live-1"
    assert saved.is_file()
    assert json.loads(saved.read_text(encoding="utf-8"))["source"] == "wrangler-d1-readonly"
