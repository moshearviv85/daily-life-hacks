import importlib.util
import json
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


def test_semantic_gate_rejects_same_article_angle():
    candidates = [{
        "topic": "chicken veggie tray bake weeknight dinner",
        "source": "autocomplete",
        "category": "recipes",
        "quality_reason": "passed deterministic quality gate",
    }]

    def fake_llm(**kwargs):
        assert kwargs["known_titles"] == ["Sheet Pan Chicken Dinner Ideas That Actually Work"]
        return {
            "verdicts": [{
                "topic": "chicken veggie tray bake weeknight dinner",
                "is_duplicate": True,
                "matched_title": "Sheet Pan Chicken Dinner Ideas That Actually Work",
                "reason": "Same core sheet-pan chicken dinner angle.",
            }]
        }

    accepted, rejected = mod.semantic_dedup_topics(
        candidates,
        ["Sheet Pan Chicken Dinner Ideas That Actually Work"],
        api_key="test-key",
        model="test/model",
        timeout=1,
        llm_fn=fake_llm,
    )

    assert accepted == []
    assert len(rejected) == 1
    assert rejected[0]["semantic_match"] == "Sheet Pan Chicken Dinner Ideas That Actually Work"
    assert "semantic duplicate" in rejected[0]["reason"]


def test_parse_json_response_extracts_wrapped_json_object():
    parsed = mod.parse_json_response(
        '```json\n{"verdicts": [{"topic": "x", "is_duplicate": false, "matched_title": "", "reason": "ok"}]}\n```'
    )

    assert parsed["verdicts"][0]["topic"] == "x"


def test_parse_json_response_reports_invalid_snippet():
    try:
        mod.parse_json_response('{"verdicts": [')
    except ValueError as exc:
        assert "invalid JSON" in str(exc)
        assert "Snippet" in str(exc)
    else:
        raise AssertionError("expected invalid JSON to raise")


def test_semantic_pool_diversifies_across_discovery_seeds():
    candidates = [
        {"topic": "asparagus oven", "source": "autocomplete", "seed": "asparagus"},
        {"topic": "asparagus pan", "source": "autocomplete", "seed": "asparagus"},
        {"topic": "asparagus grill", "source": "autocomplete", "seed": "asparagus"},
        {"topic": "rice bowl chicken", "source": "autocomplete", "seed": "rice bowls"},
        {"topic": "rice bowl vegetarian", "source": "autocomplete", "seed": "rice bowls"},
        {"topic": "freezer meal chicken", "source": "autocomplete", "seed": "freezer meals"},
    ]

    pool, overflow = mod.select_semantic_pool(candidates, 4)

    assert [item["topic"] for item in pool] == [
        "asparagus oven",
        "rice bowl chicken",
        "freezer meal chicken",
        "asparagus pan",
    ]
    assert [item["topic"] for item in overflow] == [
        "asparagus grill",
        "rice bowl vegetarian",
    ]


def test_source_sort_prefers_llm_gaps_before_autocomplete():
    topics = [
        {"topic": "autocomplete idea", "source": "autocomplete"},
        {"topic": "llm gap idea", "source": "llm_gap"},
        {"topic": "gsc idea", "source": "gsc"},
    ]

    assert [item["source"] for item in sorted(topics, key=mod.source_sort_key)] == [
        "gsc",
        "llm_gap",
        "autocomplete",
    ]


def test_categorize_topic_keeps_recipe_and_nutrition_distinct():
    assert mod.categorize_topic("high protein breakfast recipes") == "recipes"
    assert mod.categorize_topic("easy sandwich bread recipe") == "recipes"
    assert mod.categorize_topic("best way to cook salmon") == "recipes"
    assert mod.categorize_topic("protein per serving beans chicken tofu compared") == "nutrition"
    assert mod.categorize_topic("how to store berries longer") == "tips"
    assert mod.categorize_topic("how to store homemade bread") == "tips"
    assert mod.categorize_topic("how to keep bread fresh longer without mold") == "tips"
    assert mod.categorize_topic("how to store sourdough discard in fridge") == "tips"


def test_dry_run_report_applies_limit_and_keeps_overflow(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "ARTICLE_DIR", tmp_path / "missing-articles")
    discovered = [
        {"topic": "meal prep rotisserie chicken rice bowls", "source": "autocomplete"},
        {"topic": "low sodium pantry swaps for busy weeknight dinners", "source": "gsc", "impressions": 40},
        {"topic": "food prep guide youtube", "source": "autocomplete"},
    ]
    input_path = tmp_path / "discovered.json"
    report_path = tmp_path / "report.json"
    input_path.write_text(json.dumps(discovered), encoding="utf-8")

    rc = mod.main([
        "--input", str(input_path),
        "--dry-run",
        "--limit", "1",
        "--report", str(report_path),
    ])

    assert rc == 0
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["accepted_count"] == 1
    assert report["overflow_count"] == 1
    assert report["rejected_count"] == 1
    assert report["accepted"][0]["source"] == "gsc"


def test_dry_run_semantic_report_checks_site_titles_before_accepting(tmp_path, monkeypatch):
    article_dir = tmp_path / "articles"
    article_dir.mkdir()
    (article_dir / "sheet-pan-chicken-dinner.md").write_text(
        'title: "Sheet Pan Chicken Dinner Ideas That Actually Work"\n',
        encoding="utf-8",
    )
    monkeypatch.setattr(mod, "ARTICLE_DIR", article_dir)

    discovered = [
        {"topic": "chicken veggie tray bake weeknight dinner", "source": "autocomplete"},
        {"topic": "low sodium pantry swaps for busy weeknight dinners", "source": "gsc", "impressions": 40},
    ]
    input_path = tmp_path / "discovered.json"
    report_path = tmp_path / "report.json"
    input_path.write_text(json.dumps(discovered), encoding="utf-8")

    def fake_semantic_llm(**kwargs):
        assert kwargs["known_titles"] == ["Sheet Pan Chicken Dinner Ideas That Actually Work"]
        assert len(kwargs["candidates"]) == 2
        return {
            "verdicts": [
                {
                    "topic": "low sodium pantry swaps for busy weeknight dinners",
                    "is_duplicate": False,
                    "matched_title": "",
                    "reason": "Distinct pantry-swap angle.",
                },
                {
                    "topic": "chicken veggie tray bake weeknight dinner",
                    "is_duplicate": True,
                    "matched_title": "Sheet Pan Chicken Dinner Ideas That Actually Work",
                    "reason": "Same core sheet-pan chicken dinner angle.",
                },
            ]
        }

    monkeypatch.setattr(mod, "call_semantic_dedup_llm", fake_semantic_llm)

    rc = mod.main([
        "--input", str(input_path),
        "--dry-run",
        "--limit", "2",
        "--report", str(report_path),
        "--semantic-dedup",
        "--semantic-key", "test-key",
    ])

    assert rc == 0
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["semantic"]["enabled"] is True
    assert report["semantic"]["known_titles_count"] == 1
    assert report["semantic"]["checked_count"] == 2
    assert report["semantic"]["rejected_count"] == 1
    assert report["accepted_count"] == 1
    assert report["accepted"][0]["topic"] == "low sodium pantry swaps for busy weeknight dinners"
    assert "semantic duplicate" in report["rejected"][0]["reason"]
