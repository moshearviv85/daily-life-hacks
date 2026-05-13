"""Tests for lib.medical_validator — LLM-based medical claim checker."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"))

import pytest
from lib.medical_validator import (
    build_prompt,
    parse_response,
    MedicalViolation,
    check_article,
)


class TestBuildPrompt:
    def test_returns_system_and_user(self):
        system, user = build_prompt("Some article text about food")
        assert isinstance(system, str)
        assert isinstance(user, str)
        assert len(system) > 100
        assert "Some article" in user

    def test_system_contains_medical_terms(self):
        system, _ = build_prompt("text")
        assert "insulin" in system.lower()

    def test_system_contains_hedging_guidance(self):
        system, _ = build_prompt("text")
        assert "hedge" in system.lower() or "may" in system.lower()


class TestParseResponse:
    def test_clean_article(self):
        raw = '{"violations": []}'
        result = parse_response(raw)
        assert result == []

    def test_one_violation(self):
        raw = '{"violations": [{"term": "insulin", "sentence": "Insulin spikes cause cravings", "hedged": false}]}'
        result = parse_response(raw)
        assert len(result) == 1
        assert result[0].term == "insulin"
        assert result[0].hedged is False

    def test_hedged_passes(self):
        raw = '{"violations": [{"term": "blood sugar", "sentence": "This may help blood sugar", "hedged": true}]}'
        result = parse_response(raw)
        assert len(result) == 1
        assert result[0].hedged is True

    def test_malformed_json_raises(self):
        with pytest.raises(ValueError):
            parse_response("not json at all")

    def test_code_fence_stripped(self):
        raw = '```json\n{"violations": []}\n```'
        result = parse_response(raw)
        assert result == []

    def test_multiple_violations(self):
        raw = '{"violations": [{"term": "a", "sentence": "s1", "hedged": false}, {"term": "b", "sentence": "s2", "hedged": true}]}'
        result = parse_response(raw)
        assert len(result) == 2


class TestCheckArticle:
    def test_with_mock_clean(self):
        def mock_llm(system, user):
            return '{"violations": []}'
        result = check_article("Clean article about cooking", llm_fn=mock_llm)
        assert result == []

    def test_with_mock_violation(self):
        def mock_llm(system, user):
            return '{"violations": [{"term": "cortisol", "sentence": "Cortisol levels drop", "hedged": false}]}'
        result = check_article("Cortisol levels drop when you eat", llm_fn=mock_llm)
        unhedged = [v for v in result if not v.hedged]
        assert len(unhedged) == 1

    def test_mock_receives_article_text(self):
        captured = {}
        def mock_llm(system, user):
            captured["user"] = user
            return '{"violations": []}'
        check_article("My special article text", llm_fn=mock_llm)
        assert "My special article text" in captured["user"]
