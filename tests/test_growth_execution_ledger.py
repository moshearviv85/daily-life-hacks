import importlib.util
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "growth_execution_ledger.py"
SPEC = importlib.util.spec_from_file_location("growth_execution_ledger", SCRIPT)
ledger = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(ledger)


MASTER = [
    {"category": "Search", "title": "Released method", "decision": "EXECUTE_NOW"},
    {"category": "Risk", "title": "Rejected method", "decision": "REJECT"},
    {
        "category": "Search",
        "title": "Dependency method",
        "decision": "DEPENDENCY",
        "prerequisites": "Obtain a current baseline.",
        "execution_owner": "Growth analyst",
    },
    {
        "category": "External",
        "title": "Manual method",
        "decision": "MANUAL_EXTERNAL",
        "prerequisites": "Authenticated account access.",
        "execution_owner": "Site owner",
    },
]
GOOD_COMMIT = "a" * 40


def row(title, status, **overrides):
    if title == "Rejected method":
        category = "Risk"
    elif title == "Manual method":
        category = "External"
    else:
        category = "Search"
    values = {
        "method_id": ledger.method_id(category, title),
        "category": category,
        "title": title,
        "execution_status": status,
        "evidence_commit": "",
        "live_url": "",
        "released_at": "",
        "measurement_due": "",
        "prerequisites": "",
        "execution_owner": "",
        "notes": "",
    }
    values.update(overrides)
    return values


def valid_rows():
    return [
        row(
            "Released method",
            "RELEASED",
            evidence_commit=GOOD_COMMIT,
            live_url="https://example.com/released/",
            released_at="2026-07-28T10:00:00Z",
            measurement_due="2026-08-04T10:00:00Z",
            notes="Release proof.",
        ),
        row(
            "Rejected method",
            "REJECTED",
            evidence_commit=GOOD_COMMIT,
            notes="Version-controlled rejection decision.",
        ),
        row(
            "Dependency method",
            "BLOCKED",
            prerequisites="Obtain a current baseline.",
            execution_owner="Growth analyst",
            notes="Named dependency is unresolved.",
        ),
        row(
            "Manual method",
            "BLOCKED",
            prerequisites="Authenticated account access.",
            execution_owner="Site owner",
            notes="Manual or external execution is required.",
        ),
    ]


def test_valid_proved_rows_pass():
    assert ledger.validate(MASTER, valid_rows(), commit_check=lambda _: True) == []


def test_released_without_commit_or_live_proof_fails():
    rows = valid_rows()
    rows[0].update(
        evidence_commit="",
        live_url="",
        released_at="",
        measurement_due="",
    )
    errors = ledger.validate(MASTER, rows, commit_check=lambda _: True)
    assert any("full 40-character evidence_commit" in error for error in errors)
    assert any("requires an HTTPS live_url" in error for error in errors)
    assert any("released_at must be an ISO-8601" in error for error in errors)


def test_commit_must_be_reachable_from_origin_main():
    errors = ledger.validate(MASTER, valid_rows(), commit_check=lambda _: False)
    assert any("not reachable from origin/main" in error for error in errors)


def test_reject_decision_cannot_be_marked_not_started():
    rows = valid_rows()
    rows[1] = row("Rejected method", "NOT_STARTED")
    errors = ledger.validate(MASTER, rows, commit_check=lambda _: True)
    assert any("REJECT decision must have REJECTED status" in error for error in errors)


def test_dependency_and_manual_rows_cannot_remain_not_started():
    rows = valid_rows()
    rows[2] = row("Dependency method", "NOT_STARTED")
    rows[3] = row("Manual method", "NOT_STARTED")
    errors = ledger.validate(MASTER, rows, commit_check=lambda _: True)
    assert sum("must be BLOCKED or have progressed" in error for error in errors) == 2


def test_blocked_metadata_must_match_master():
    rows = valid_rows()
    rows[2]["prerequisites"] = "Something else"
    rows[3]["execution_owner"] = "Nobody"
    errors = ledger.validate(MASTER, rows, commit_check=lambda _: True)
    assert any("prerequisites must match" in error for error in errors)
    assert any("execution_owner must match" in error for error in errors)


def test_measured_requires_explicit_measurement_proof_in_notes():
    rows = valid_rows()
    rows[0]["execution_status"] = "MEASURED"
    errors = ledger.validate(MASTER, rows, commit_check=lambda _: True)
    assert any("must include 'measurement:' proof" in error for error in errors)
    rows[0]["notes"] = "Measurement: GSC export reports the 28-day outcome."
    assert ledger.validate(MASTER, rows, commit_check=lambda _: True) == []


def test_sync_preserves_existing_evidence_and_only_seeds_named_rows():
    existing = [
        row(
            "Released method",
            "IMPLEMENTED",
            evidence_commit=GOOD_COMMIT,
            notes="Existing proof must survive regeneration.",
        )
    ]
    seed = {"rejection_decision_commit": GOOD_COMMIT, "verified_rows": []}
    synced = ledger.synchronize(MASTER, existing, seed)
    by_title = {item["title"]: item for item in synced}
    assert by_title["Released method"]["execution_status"] == "IMPLEMENTED"
    assert by_title["Released method"]["notes"] == "Existing proof must survive regeneration."
    assert by_title["Rejected method"]["execution_status"] == "REJECTED"
    assert by_title["Dependency method"]["execution_status"] == "BLOCKED"
    assert by_title["Dependency method"]["prerequisites"] == "Obtain a current baseline."
    assert by_title["Dependency method"]["execution_owner"] == "Growth analyst"
    assert by_title["Manual method"]["execution_status"] == "BLOCKED"


def test_summary_does_not_count_rejections_as_implementation():
    summary = ledger.build_summary(MASTER, valid_rows(), [])
    assert summary["executable_rows"] == 3
    assert summary["proved_executable_rows"] == 1
    assert summary["released_or_measured_rows"] == 1
    assert summary["blocked_by_decision"] == {
        "DEPENDENCY": 1,
        "MANUAL_EXTERNAL": 1,
    }
