"""Tests for lib.content_policy — structured content rules."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"))

import pytest
from lib.content_policy import (
    MEDICAL_TERMS_HARD_BAN,
    MEDICAL_TERMS_HEDGE_REQUIRED,
    HEDGING_WORDS,
    SUPPLEMENT_PATTERNS,
    AI_WORDS_BANNED,
    SIGNOFF_PATTERNS,
    ABSOLUTE_HEALTH_PATTERNS,
    DETOX_PATTERNS,
    EM_DASH,
    ALLOWED_CATEGORIES,
    ALLOWED_AUTHOR,
    REQUIRED_FIELDS,
    RECIPE_REQUIRED_FIELDS,
)


def test_medical_hard_ban_is_nonempty_list():
    assert isinstance(MEDICAL_TERMS_HARD_BAN, list)
    assert len(MEDICAL_TERMS_HARD_BAN) >= 7


def test_medical_hard_ban_includes_known_terms():
    for term in ["insulin", "cortisol", "serotonin", "dopamine", "microbiome", "glycemic"]:
        assert term in MEDICAL_TERMS_HARD_BAN, f"{term} missing from MEDICAL_TERMS_HARD_BAN"


def test_hedge_required_is_nonempty():
    assert isinstance(MEDICAL_TERMS_HEDGE_REQUIRED, list)
    assert len(MEDICAL_TERMS_HEDGE_REQUIRED) >= 3


def test_hedge_required_includes_known_terms():
    for term in ["blood sugar", "gut health", "bone health"]:
        assert term in MEDICAL_TERMS_HEDGE_REQUIRED, f"{term} missing"


def test_hedging_words():
    assert isinstance(HEDGING_WORDS, list)
    assert "may" in HEDGING_WORDS
    assert "could" in HEDGING_WORDS


def test_supplement_patterns_nonempty():
    assert isinstance(SUPPLEMENT_PATTERNS, list)
    assert len(SUPPLEMENT_PATTERNS) >= 10


def test_ai_words_banned_nonempty():
    assert isinstance(AI_WORDS_BANNED, list)
    assert "Furthermore" in AI_WORDS_BANNED
    assert "Mouthwatering" in AI_WORDS_BANNED


def test_signoff_patterns_nonempty():
    assert isinstance(SIGNOFF_PATTERNS, list)
    assert len(SIGNOFF_PATTERNS) >= 5


def test_absolute_health_patterns_nonempty():
    assert isinstance(ABSOLUTE_HEALTH_PATTERNS, list)
    assert len(ABSOLUTE_HEALTH_PATTERNS) >= 4


def test_detox_patterns_nonempty():
    assert isinstance(DETOX_PATTERNS, list)
    assert len(DETOX_PATTERNS) >= 3


def test_em_dash_is_correct_char():
    assert EM_DASH == "—"


def test_no_overlap_hard_ban_and_hedge():
    hard = set(MEDICAL_TERMS_HARD_BAN)
    hedge = set(MEDICAL_TERMS_HEDGE_REQUIRED)
    overlap = hard & hedge
    assert overlap == set(), f"terms in both hard-ban and hedge-required: {overlap}"


def test_allowed_categories():
    assert ALLOWED_CATEGORIES == {"nutrition", "recipes", "tips"}


def test_required_fields_has_title():
    assert "title" in REQUIRED_FIELDS


def test_recipe_required_fields_has_ingredients():
    assert "ingredients" in RECIPE_REQUIRED_FIELDS
