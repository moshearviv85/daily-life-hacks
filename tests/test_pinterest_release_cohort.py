"""Tests for controlled Pinterest cohort release helpers."""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.pinterest_release import (  # noqa: E402
    CONFIRM_TOKEN,
    LEDGER_FIELDS,
    ReleaseSafetyError,
    ValidationError,
    WriteGuard,
    advance_gate,
    apply_production_schedule,
    apply_replacements_to_queue,
    build_approval_artifact,
    cohort_report,
    confirmation_ok,
    isolate_report_payload,
    load_json,
    prepare_cohort_dry_run,
    propose_utc_slots,
    reject_duplicates,
    selected_pins,
)
from scripts import pinterest_release_cohort as cli  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "pinterest_release" / "cohort-fixture.json"
REPLACE = ROOT / "tests" / "fixtures" / "pinterest_release" / "cohort-replace-fixture.json"
QUEUE_REPLACE = ROOT / "tests" / "fixtures" / "pinterest_release" / "queue-replace-snapshot.json"
LIVE_COHORT = ROOT / "pipeline-data" / "experiments" / "pinterest-research-cohort-2026-07-13.json"


def _ok_url(_url: str) -> tuple[bool, str]:
    return True, "mock-ok"


def _bad_url(_url: str) -> tuple[bool, str]:
    return False, "mock-404"


def test_ledger_schema_fields_complete():
    assert "channel" in LEDGER_FIELDS
    assert "decision" in LEDGER_FIELDS
    assert "measurement_due_14d" in LEDGER_FIELDS
    assert len(LEDGER_FIELDS) == 20


def test_selected_pins_only():
    cohort = load_json(FIXTURE)
    pins = selected_pins(cohort, ["pin-a1", "pin-b1"])
    assert [p["pin_slug"] for p in pins] == ["pin-a1", "pin-b1"]


def test_reject_duplicate_row_ids():
    pins = [
        {"pin_slug": "x", "row_id": "same", "destination_url": "https://a/", "asset_path": "a.jpg"},
        {"pin_slug": "y", "row_id": "same", "destination_url": "https://b/", "asset_path": "b.jpg"},
    ]
    with pytest.raises(ValidationError, match="duplicate row_id"):
        reject_duplicates(pins)


def test_reject_duplicate_links_and_images():
    pins = [
        {"pin_slug": "x", "row_id": "1", "destination_url": "https://a/", "asset_path": "a.jpg"},
        {"pin_slug": "y", "row_id": "2", "destination_url": "https://a/", "asset_path": "b.jpg"},
    ]
    with pytest.raises(ValidationError, match="duplicate destination_url"):
        reject_duplicates(pins)
    pins2 = [
        {"pin_slug": "x", "row_id": "1", "destination_url": "https://a/", "asset_path": "a.jpg"},
        {"pin_slug": "y", "row_id": "2", "destination_url": "https://b/", "asset_path": "a.jpg"},
    ]
    with pytest.raises(ValidationError, match="duplicate asset_path"):
        reject_duplicates(pins2)


def test_invalid_url_rejected():
    cohort = load_json(FIXTURE)
    with pytest.raises(ValidationError, match="Destination not live"):
        prepare_cohort_dry_run(
            cohort,
            repo_root=ROOT,
            check_urls=True,
            url_checker=_bad_url,
        )


def test_utc_slot_generation_and_no_consecutive_same_article():
    cohort = load_json(FIXTURE)
    slotted = propose_utc_slots(
        cohort["pins"],
        append_after_utc=cohort["append_after_utc"],
        spacing_hours=12,
    )
    assert len(slotted) == 6
    assert slotted[0]["scheduled_at_utc"] == "2026-10-28T11:59:00Z"
    articles = [p["article_slug"] for p in slotted]
    for i in range(1, len(articles)):
        assert articles[i] != articles[i - 1]


def test_consecutive_same_article_impossible_raises():
    pins = [
        {
            "pin_slug": "only-1",
            "article_slug": "solo",
            "destination_url": "https://a/1/",
            "asset_path": "tests/fixtures/pinterest_release/images/a.jpg",
            "row_id": "r1",
        },
        {
            "pin_slug": "only-2",
            "article_slug": "solo",
            "destination_url": "https://a/2/",
            "asset_path": "tests/fixtures/pinterest_release/images/b.jpg",
            "row_id": "r2",
        },
    ]
    with pytest.raises(ValidationError, match="(?i)consecutive same-article"):
        propose_utc_slots(pins, append_after_utc="2026-10-27T23:59:00Z", spacing_hours=12)


def test_dry_run_zero_d1_writes(tmp_path: Path):
    cohort = load_json(FIXTURE)
    guard = WriteGuard(allowed=False, confirm_ok=False)
    result = prepare_cohort_dry_run(
        cohort,
        repo_root=ROOT,
        check_urls=True,
        url_checker=_ok_url,
        write_guard=guard,
    )
    assert result.d1_write_attempts == 0
    assert guard.d1_write_attempts == 0
    assert result.approval["gate"] == "REVIEW"
    assert result.approval["d1_write_attempts"] == 0
    assert all(r.status == "REVIEW" for r in result.rows)


def test_cli_dry_run_writes_approval_not_d1(tmp_path: Path, monkeypatch):
    approval_dir = tmp_path / "approvals"
    ledger = tmp_path / "ledger.jsonl"
    monkeypatch.setattr(cli, "ROOT", ROOT)
    code = cli.main(
        [
            "--cohort",
            str(FIXTURE),
            "--approval-dir",
            str(approval_dir),
            "--ledger",
            str(ledger),
            "--skip-live-url",
            "--write-ledger",
        ]
    )
    assert code == 0
    approval = json.loads((approval_dir / "cohort-fixture-approval.json").read_text(encoding="utf-8"))
    assert approval["d1_write_attempts"] == 0
    assert approval["production_write"] is False
    assert ledger.is_file()
    lines = [ln for ln in ledger.read_text(encoding="utf-8").splitlines() if ln.strip()]
    assert len(lines) == 6


def test_apply_production_requires_dual_gate():
    guard = WriteGuard(allowed=False, confirm_ok=False)
    with pytest.raises(ReleaseSafetyError):
        apply_production_schedule({"gate": "APPROVED"}, guard=guard, upload_fn=lambda rows: rows)

    guard2 = WriteGuard(allowed=True, confirm_ok=False)
    with pytest.raises(ReleaseSafetyError):
        apply_production_schedule({"gate": "APPROVED"}, guard=guard2, upload_fn=lambda rows: "wrote")

    assert confirmation_ok(CONFIRM_TOKEN)
    guard3 = WriteGuard(allowed=True, confirm_ok=True)
    assert apply_production_schedule(
        {"gate": "APPROVED"},
        guard=guard3,
        upload_fn=lambda rows: "ok",
        csv_rows=[],
    ) == "ok"


def test_approval_gate_flow():
    artifact = build_approval_artifact(
        {"cohort_id": "c", "experiment_id": "e", "channel": "pinterest"},
        [],
        mode="dry-run",
        d1_writes=0,
    )
    approved = advance_gate(artifact, "APPROVED")
    assert approved["gate"] == "APPROVED"
    pending = advance_gate(approved, "PENDING")
    assert pending["gate"] == "PENDING"
    with pytest.raises(ValidationError):
        advance_gate(artifact, "PENDING")


def test_cohort_report_keeps_population_isolated():
    cohort = load_json(FIXTURE)
    metrics = {
        "pin-a1": {"impressions": 200, "outbound_clicks": 10, "saves": 2},
        "pin-a2": {"impressions": 180, "outbound_clicks": 4, "saves": 1},
        "pin-b1": {"impressions": 10, "outbound_clicks": 0, "saves": 0},
        "pin-b2": {"impressions": 12, "outbound_clicks": 0, "saves": 0},
        "pin-c1": {"impressions": 300, "outbound_clicks": 0, "saves": 0},
        "pin-c2": {"impressions": 280, "outbound_clicks": 0, "saves": 0},
    }
    report = cohort_report(cohort, metrics, window="24h")
    assert report["report_type"] == "cohort_measurement"
    assert "account_30d" in report["do_not_mix_with"]
    assert report["matched_pairs"][0]["decision"] in ("keep", "kill", "iterate")
    wrapped = isolate_report_payload("account_30d", {"impressions": 1})
    assert wrapped["report_type"] == "account_30d"
    assert "cohort" in wrapped["do_not_mix_with"]


def test_replacement_slots_remain_unchanged():
    cohort = load_json(REPLACE)
    queue = load_json(QUEUE_REPLACE)["rows"]
    result = prepare_cohort_dry_run(
        cohort,
        repo_root=ROOT,
        check_urls=False,
        url_checker=_ok_url,
        queue_rows=queue,
    )
    expected = [r["preserved_slot_utc"] for r in cohort["replacements"]]
    assert [r.scheduled_at_utc for r in result.rows] == expected
    for item in result.transaction_preview:
        assert item["preserved_utc_slot"] in expected


def test_old_rows_preserved_pending_to_review():
    cohort = load_json(REPLACE)
    result = prepare_cohort_dry_run(
        cohort,
        repo_root=ROOT,
        check_urls=False,
        url_checker=_ok_url,
        queue_rows=load_json(QUEUE_REPLACE)["rows"],
    )
    manifest = result.replacement_manifest
    assert manifest["never_delete_old_rows"] is True
    assert manifest["old_row_status_change"] == {"from": "PENDING", "to": "REVIEW"}
    old_ids = [r["row_id"] for r in manifest["preserved_old_rows"]]
    assert old_ids == [r["old_row_id"] for r in cohort["replacements"]]
    assert all(r["delete"] is False for r in manifest["preserved_old_rows"])
    assert all(r["proposed_status"] == "REVIEW" for r in manifest["preserved_old_rows"])
    assert all(r["current_status"] == "PENDING" for r in manifest["preserved_old_rows"])


def test_selected_replacement_disappears_from_proposed_active_queue():
    cohort = load_json(REPLACE)
    queue = load_json(QUEUE_REPLACE)["rows"]
    result = prepare_cohort_dry_run(
        cohort,
        repo_root=ROOT,
        check_urls=False,
        url_checker=_ok_url,
        queue_rows=queue,
    )
    active_ids = {r["row_id"] for r in result.proposed_active_queue}
    for old in cohort["replacements"]:
        assert old["old_row_id"] not in active_ids
    for incoming in result.replacement_manifest["incoming_replacement_rows"]:
        assert incoming["row_id"] in active_ids
    assert "keep-pending" in active_ids


def test_replacement_plan_no_consecutive_same_article():
    cohort = load_json(REPLACE)
    result = prepare_cohort_dry_run(
        cohort,
        repo_root=ROOT,
        check_urls=False,
        url_checker=_ok_url,
    )
    articles = [r.article_slug for r in result.rows]
    for i in range(1, len(articles)):
        assert articles[i] != articles[i - 1]


def test_rejected_claude_candidates_cannot_enter_cohort():
    cohort = load_json(REPLACE)
    with pytest.raises(ValidationError, match="Rejected Claude candidates"):
        prepare_cohort_dry_run(
            cohort,
            repo_root=ROOT,
            selected=["pin-a1", "get-50g-protein-before-lunch"],
            check_urls=False,
            url_checker=_ok_url,
        )
    bad = copy.deepcopy(cohort)
    bad["selected_pin_slugs"] = ["you-re-overspending-protein-month"]
    bad["pins"] = [
        {
            "pin_slug": "you-re-overspending-protein-month",
            "article_slug": "high-protein-on-a-budget-complete-guide",
            "variant": "X",
            "title": "bad",
            "description": "d",
            "alt_text": "a",
            "asset_path": "tests/fixtures/pinterest_release/images/a.jpg",
            "destination_url": "https://www.daily-life-hacks.com/you-re-overspending-protein-month/",
            "board_id": "1",
            "row_id": "bad-row",
            "selected": True,
        }
    ]
    bad["replacements"] = [
        {
            "replacement_pin_slug": "you-re-overspending-protein-month",
            "old_row_id": "old-slot-1",
            "old_title": "Old",
            "preserved_slot_utc": "2026-07-17T15:06:00Z",
            "reason": "should fail",
        }
    ]
    with pytest.raises(ValidationError, match="Rejected Claude candidates"):
        prepare_cohort_dry_run(
            bad,
            repo_root=ROOT,
            check_urls=False,
            url_checker=_ok_url,
        )


def test_live_cohort_exact_replacement_plan():
    cohort = load_json(LIVE_COHORT)
    assert cohort["schedule_mode"] == "replace_next_30d"
    assert "append_after_utc" not in cohort
    assert set(cohort["selected_pin_slugs"]) == {
        "beans-98g-protein-per-dollar",
        "build-day-dry-goods-aisle",
        "stop-paying-protein-it-costs",
        "protein-days-priced-dry-goods",
        "restaurant-fiber-meal-costs-same",
        "only-foods-you-need-high",
    }
    assert "get-50g-protein-before-lunch" in cohort["rejected_pin_slugs"]
    assert "you-re-overspending-protein-month" in cohort["rejected_pin_slugs"]
    result = prepare_cohort_dry_run(
        cohort,
        repo_root=ROOT,
        check_urls=False,
        url_checker=_ok_url,
    )
    assert result.d1_write_attempts == 0
    plan = {
        (p["old_row_id"], p["replacement_row_id"], p["preserved_utc_slot"])
        for p in result.transaction_preview
    }
    assert plan == {
        (
            "build-protein-meals-without-guesswork",
            "exp-20260713-beans-98g-protein-per-dollar",
            "2026-07-17T15:06:00Z",
        ),
        (
            "cold-breakfast-bowl-energy-without",
            "exp-20260713-build-day-dry-goods-aisle",
            "2026-07-22T19:55:00Z",
        ),
        (
            "crispy-separated-grains-every-bite",
            "exp-20260713-stop-paying-protein-it-costs",
            "2026-07-26T20:58:00Z",
        ),
        (
            "finally-get-golden-brown-crust",
            "exp-20260713-restaurant-fiber-meal-costs-same",
            "2026-08-02T14:40:00Z",
        ),
        (
            "food-doesn-t-need-much",
            "exp-20260713-protein-days-priced-dry-goods",
            "2026-08-03T14:02:00Z",
        ),
        (
            "fresh-vs-frozen-only-question",
            "exp-20260713-only-foods-you-need-high",
            "2026-08-05T19:57:00Z",
        ),
    }


def test_apply_replacements_removes_old_from_active_only():
    cohort = load_json(REPLACE)
    queue = load_json(QUEUE_REPLACE)["rows"]
    result = prepare_cohort_dry_run(
        cohort,
        repo_root=ROOT,
        check_urls=False,
        url_checker=_ok_url,
        queue_rows=queue,
    )
    proposed = apply_replacements_to_queue(queue, result.replacement_manifest)
    assert "old-slot-1" not in {r["row_id"] for r in proposed}
    assert "row-a1" in {r["row_id"] for r in proposed}
