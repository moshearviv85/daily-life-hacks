"""Tests for score_pin_performance.py (CP5.1)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08"
sys.path.insert(0, str(SCRIPT_DIR))

import score_pin_performance as spp  # noqa: E402


def test_score_pins_ranks_by_ctr_and_filters_external(tmp_path: Path):
    pins = [
        {
            "pin_id": "1",
            "pin_title": "How to Season a Cast Iron Skillet Properly",
            "pin_link": "https://www.daily-life-hacks.com/how-to-season-cast-iron",
            "impressions": 100,
            "outbound_clicks": 10,
            "saves": 1,
        },
        {
            "pin_id": "2",
            "pin_title": "Vague Budget Tip",
            "pin_link": "https://www.daily-life-hacks.com/vague",
            "impressions": 100,
            "outbound_clicks": 1,
            "saves": 0,
        },
        {
            "pin_id": "3",
            "pin_title": "External Noise",
            "pin_link": "https://www.healthline.com/foo",
            "impressions": 500,
            "outbound_clicks": 50,
            "saves": 5,
        },
        {
            "pin_id": "4",
            "pin_title": "Low Imp",
            "pin_link": "https://www.daily-life-hacks.com/low",
            "impressions": 10,
            "outbound_clicks": 5,
            "saves": 0,
        },
    ]
    report = spp.score_pins(pins, min_impressions=50, own_domain_only=True)
    assert report["scored_pins"] == 2
    assert report["skipped_external_or_empty_link"] == 1
    assert report["skipped_low_impressions"] == 1
    assert report["top10_by_ctr"][0]["pin_id"] == "1"
    assert report["top10_by_ctr"][0]["ctr_pct"] == 10.0
    assert report["bottom10_by_ctr"][0]["pin_id"] == "2"


def test_cli_writes_json_and_md(tmp_path: Path):
    raw = tmp_path / "raw.json"
    out = tmp_path / "scored.json"
    raw.write_text(
        json.dumps(
            [
                {
                    "results": [
                        {
                            "pin_id": "9",
                            "pin_title": "30 Day High Fiber Challenge Meal Plan",
                            "pin_link": "https://www.daily-life-hacks.com/fiber",
                            "impressions": 80,
                            "outbound_clicks": 8,
                            "saves": 0,
                        }
                    ]
                }
            ]
        ),
        encoding="utf-8",
    )
    assert spp.main(["--input", str(raw), "--out", str(out), "--md", str(tmp_path / "out.md")]) == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["scored_pins"] == 1
    assert "challenge" in data["top10_by_ctr"][0]["patterns"]
    assert (tmp_path / "out.md").exists()
