import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"))

from lib.validator import Violation
from write import _retry_instruction


def test_retry_instruction_includes_recipe_yaml_types_for_s10():
    note = _retry_instruction([
        Violation("S-10", 1, "calories must be int; steps must be non-empty list of strings")
    ])

    assert "S-10" in note
    assert "calories must be int" in note
    assert "prepTime/cookTime/totalTime as quoted strings" in note
    assert "servings and calories as plain integers" in note
    assert "ingredients as a non-empty list of strings" in note
    assert "steps as a non-empty list of strings" in note


def test_retry_instruction_includes_content_policy_rewrite_for_cp_rules():
    note = _retry_instruction([
        Violation("CP-02", 1, "supplement mention"),
        Violation("CP-03", 1, "hard-banned medical term"),
    ])

    assert "CP-02" in note
    assert "CP-03" in note
    assert "plain food and cooking language only" in note
    assert "supplement references" in note
    assert "hard-banned health terms" in note
