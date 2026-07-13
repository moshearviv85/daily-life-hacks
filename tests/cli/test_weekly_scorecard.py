import importlib.util
import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "weekly_scorecard", ROOT / "scripts" / "weekly-scorecard.py"
)
weekly_scorecard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(weekly_scorecard)


@pytest.fixture
def page_view_payload():
    path = ROOT / "tests" / "fixtures" / "analytics-page-views-response.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_parse_page_views_sums_only_exact_seven_day_series(page_view_payload):
    total, source = weekly_scorecard.parse_page_views_7d(page_view_payload)
    assert total == 3
    assert "event_type=page_view" in source
    assert "7 complete days" in source
    assert "2026-07-06T00:00:00.000Z" in source
    assert "2026-07-13T00:00:00.000Z" in source


def test_parse_page_views_rejects_eight_rows(page_view_payload):
    page_view_payload["page_views_by_day"].append(
        {"day": "2026-07-13", "count": 999}
    )
    with pytest.raises(ValueError, match="exactly 7 days"):
        weekly_scorecard.parse_page_views_7d(page_view_payload)


def test_parse_page_views_rejects_mixed_event_series(page_view_payload):
    page_view_payload["page_views_window"]["event_type"] = "all_events"
    with pytest.raises(ValueError, match="must be page_view"):
        weekly_scorecard.parse_page_views_7d(page_view_payload)
