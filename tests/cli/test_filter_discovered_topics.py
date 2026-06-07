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


def test_quality_gate_rejects_postpartum_audience_framing():
    ok, reason, _ = mod.quality_score_topic("meal prep freezer meals for postpartum", [])

    assert ok is False
    assert "audience" in reason


def test_quality_gate_rejects_non_us_locale_modifier():
    ok, reason, _ = mod.quality_score_topic("budget meal ideas uk", [])

    assert ok is False
    assert "US-audience" in reason


def test_quality_gate_rejects_generic_autocomplete_heads():
    for topic in [
        "healthy meal prep",
        "healthy meal prep ideas",
        "healthy meal prep ideas high protein",
        "quick dinner recipes with chicken",
        "quick dinner recipes with rotisserie chicken",
        "easy breakfast ideas with eggs",
        "healthy snack ideas for work",
        "budget meal ideas for one",
        "simple lunch recipes",
        "simple lunch recipes vegetarian",
        "food preparation tips",
        "food prep tips",
        "food prep safety tips",
        "healthy food prep tips",
        "nutrition tips for women",
        "kitchen hacks for cooking",
        "kitchen hacks for storage",
        "healthy eating habits for beginners",
    ]:
        ok, reason, _ = mod.quality_score_topic(topic, [])
        assert ok is False, topic
        assert reason == "too generic for autonomous article production"


def test_quality_gate_rejects_locale_autocomplete_variants():
    for topic in [
        "simple lunch recipes indian",
        "budget meal ideas philippines",
        "quick dinner recipes south indian",
    ]:
        ok, reason, _ = mod.quality_score_topic(topic, [])
        assert ok is False, topic
        assert "US-audience" in reason


def test_quality_gate_rejects_low_article_intent_modifiers():
    for topic in [
        "food prep guide youtube",
        "healthy eating habits worksheets",
        "kitchen hacks for small spaces",
    ]:
        ok, reason, _ = mod.quality_score_topic(topic, [])
        assert ok is False, topic
        assert (
            "low article intent" in reason
            or "off-topic" in reason
            or reason == "too generic for autonomous article production"
        )


def test_quality_gate_accepts_specific_food_storage_topic():
    ok, reason, score = mod.quality_score_topic(
        "how to keep berries fresh longer",
        ["How to Store Fresh Herbs So They Last Longer"],
    )

    assert ok is True
    assert reason == "passed deterministic quality gate"
    assert score > 0.5


def test_quality_gate_accepts_specific_new_seed_families():
    for topic in [
        "meal prep rotisserie chicken rice bowls",
        "how to keep salmon moist in the oven",
        "low sodium pantry swaps for busy weeknight dinners",
    ]:
        ok, reason, score = mod.quality_score_topic(topic, [])
        assert ok is True, topic
        assert reason == "passed deterministic quality gate"
        assert score >= 0.7


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
