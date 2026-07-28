import argparse
import importlib.util
import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "growth_release_log", ROOT / "scripts" / "growth-release-log.py"
)
release_log = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release_log)


def _args(**overrides):
    values = {
        "channel": "Pinterest",
        "cohort_id": "Research July",
        "experiment_id": "Protein Cost",
        "asset_id": "Beans Chart V1",
        "destination": "https://www.daily-life-hacks.com/protein-per-dollar/?ref=old",
        "campaign": "2026-07 Protein Cost",
        "content": "Beans Chart V1",
        "source": None,
        "medium": None,
        "external_id": "pin-123",
        "release_id": None,
        "released_at": "2026-07-28T12:00:00Z",
    }
    values.update(overrides)
    return argparse.Namespace(**values)


def test_release_row_builds_full_utm_and_7_30_60_checkpoints():
    row = release_log.release_row(_args())

    assert row["release_id"] == "rel-20260728-pinterest-beans-chart-v1"
    assert "ref=old" in row["utm_url"]
    assert "utm_source=pinterest" in row["utm_url"]
    assert "utm_medium=organic-social" in row["utm_url"]
    assert "utm_campaign=2026-07-protein-cost" in row["utm_url"]
    assert "utm_content=beans-chart-v1" in row["utm_url"]
    assert row["measurement_due_7d"] == "2026-08-04T12:00:00Z"
    assert row["measurement_due_30d"] == "2026-08-27T12:00:00Z"
    assert row["measurement_due_60d"] == "2026-09-26T12:00:00Z"


def test_release_rejects_external_destination():
    with pytest.raises(ValueError, match="daily-life-hacks.com"):
        release_log.release_row(_args(destination="https://example.com/article"))


@pytest.mark.parametrize(
    "day,releases,impressions,sessions,incidents,errors,expected",
    [
        (7, 1, 100, 0, 0, 0, "HOLD"),
        (7, 1, 0, 0, 0, 0, "ITERATE"),
        (30, 5, 0, 0, 0, 0, "STOP"),
        (30, 3, 100, 3, 0, 0, "SCALE"),
        (60, 10, 1000, 0, 0, 0, "STOP"),
        (60, 10, 1000, 10, 0, 0, "SCALE"),
        (30, 3, 1000, 20, 1, 0, "STOP"),
        (30, 3, 1000, 20, 0, 1, "STOP"),
    ],
)
def test_checkpoint_decisions(
    day,
    releases,
    impressions,
    sessions,
    incidents,
    errors,
    expected,
):
    decision, _ = release_log.recommend_checkpoint(
        day=day,
        releases=releases,
        impressions=impressions,
        qualified_sessions=sessions,
        policy_incidents=incidents,
        destination_errors=errors,
    )
    assert decision == expected


def test_append_rejects_duplicate_release_id(tmp_path):
    ledger = tmp_path / "ledger.jsonl"
    row = release_log.release_row(_args())
    release_log.append_row(ledger, row)

    with pytest.raises(ValueError, match="duplicate release_id"):
        release_log.append_row(ledger, row)

    stored = json.loads(ledger.read_text(encoding="utf-8").strip())
    assert stored["record_type"] == "release"


def test_checkpoint_must_reference_existing_release_and_is_unique(tmp_path):
    ledger = tmp_path / "ledger.jsonl"
    checkpoint = {
        "record_type": "checkpoint",
        "release_id": "rel-missing",
        "checkpoint_day": 7,
    }
    with pytest.raises(ValueError, match="not found"):
        release_log.append_row(ledger, checkpoint)

    release = release_log.release_row(_args())
    release_log.append_row(ledger, release)
    checkpoint["release_id"] = release["release_id"]
    release_log.append_row(ledger, checkpoint)

    with pytest.raises(ValueError, match="duplicate checkpoint"):
        release_log.append_row(ledger, checkpoint)
