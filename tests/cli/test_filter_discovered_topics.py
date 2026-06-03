import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "filter_discovered_topics.py"
spec = importlib.util.spec_from_file_location("filter_discovered_topics", SCRIPT)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)


def test_quality_gate_rejects_off_topic_autocomplete_result():
    ok, reason, score = mod.quality_score_topic("how to store pla filament", [])

    assert ok is False
    assert "off-topic" in reason
    assert score == 0.0


def test_quality_gate_rejects_medical_or_diet_program_framing():
    ok, reason, _ = mod.quality_score_topic("food prep bring tips zepbound doctors", [])

    assert ok is False
    assert "medical" in reason


def test_quality_gate_rejects_non_us_locale_modifier():
    ok, reason, _ = mod.quality_score_topic("budget meal ideas uk", [])

    assert ok is False
    assert "US-audience" in reason


def test_quality_gate_rejects_generic_autocomplete_heads():
    for topic in [
        "healthy meal prep",
        "simple lunch recipes",
        "food prep tips",
        "food prep safety tips",
        "healthy food prep tips",
        "nutrition tips for women",
        "kitchen hacks for cooking",
        "simple lunch recipes indian",
    ]:
        ok, reason, _ = mod.quality_score_topic(topic, [])
        assert ok is False, topic
        assert reason == "too generic for autonomous article production"


def test_quality_gate_accepts_specific_food_storage_topic():
    ok, reason, score = mod.quality_score_topic(
        "how to keep berries fresh longer",
        ["How to Store Fresh Herbs So They Last Longer"],
    )

    assert ok is True
    assert reason == "passed deterministic quality gate"
    assert score > 0.5


def test_quality_gate_rejects_near_duplicate_existing_article():
    ok, reason, score = mod.quality_score_topic(
        "how to freeze bananas for smoothies",
        ["How to Freeze Bananas for Smoothies Later"],
    )

    assert ok is False
    assert "too similar" in reason
    assert score >= 0.72


def test_categorize_topic_keeps_recipe_and_nutrition_distinct():
    assert mod.categorize_topic("high protein breakfast recipes") == "recipes"
    assert mod.categorize_topic("protein per serving beans chicken tofu compared") == "nutrition"
    assert mod.categorize_topic("how to store berries longer") == "tips"
