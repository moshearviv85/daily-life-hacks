import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "NEW_PIPELINE_2026-05-08" / "discover_llm_gaps.py"
spec = importlib.util.spec_from_file_location("discover_llm_gaps", SCRIPT)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)


def test_load_article_inventory_parses_frontmatter(tmp_path):
    article_dir = tmp_path / "articles"
    article_dir.mkdir()
    (article_dir / "freezer-breakfast.md").write_text(
        """---
title: "Freezer Breakfast Sandwiches That Reheat Well"
category: recipes
tags: ["freezer breakfast", "meal prep"]
---

Body.
""",
        encoding="utf-8",
    )

    articles = mod.load_article_inventory(article_dir)

    assert articles == [{
        "title": "Freezer Breakfast Sandwiches That Reheat Well",
        "category": "recipes",
        "slug": "freezer-breakfast",
        "tags": ["freezer breakfast", "meal prep"],
    }]


def test_category_targets_keep_requested_mix():
    assert mod.category_targets(50) == {"recipes": 20, "nutrition": 15, "tips": 15}
    assert sum(mod.category_targets(7).values()) == 7


def test_discover_gaps_normalizes_llm_output_without_network():
    articles = [
        {"title": "How to Store Fresh Herbs So They Last Longer", "category": "tips", "slug": "herbs", "tags": []},
        {"title": "Sheet Pan Chicken Dinner Ideas That Actually Work", "category": "recipes", "slug": "chicken", "tags": []},
    ]

    def fake_llm(**kwargs):
        assert kwargs["api_key"] == "test-key"
        assert "How to Store Fresh Herbs So They Last Longer" in kwargs["prompt"]
        assert "2 recipes, 2 nutrition, 1 tips" in kwargs["prompt"]
        return {
            "topics": [
                {
                    "topic": "freezer breakfast burritos for busy mornings",
                    "category": "recipes",
                    "content_type": "recipe",
                    "parent_cluster": "freezer meal prep",
                    "why_this_is_not_duplicate": "Breakfast freezer angle is not covered.",
                    "pinterest_angle": "Make-ahead breakfasts that reheat cleanly.",
                    "seo_angle": "Long-tail freezer breakfast recipe search intent.",
                },
                {
                    "topic": "freezer breakfast burritos for busy mornings",
                    "category": "recipes",
                    "content_type": "recipe",
                    "parent_cluster": "freezer meal prep",
                    "why_this_is_not_duplicate": "Duplicate row should collapse.",
                    "pinterest_angle": "",
                    "seo_angle": "",
                },
            ]
        }, {"cost_usd": 0.001}

    topics, metadata = mod.discover_gaps(
        articles=articles,
        count=5,
        category=None,
        api_key="test-key",
        model="test/model",
        timeout=1,
        llm_fn=fake_llm,
    )

    assert metadata["cost_usd"] == 0.001
    assert len(topics) == 1
    assert topics[0]["source"] == "llm_gap_expansion"
    assert topics[0]["category"] == "recipes"
    assert topics[0]["seed"] == "freezer meal prep"


def test_parse_json_response_extracts_object_from_wrapped_text():
    parsed = mod.parse_json_response(
        'Here is the JSON:\n```json\n{"topics": [{"topic": "x"}]}\n```\nDone.'
    )

    assert parsed == {"topics": [{"topic": "x"}]}


def test_parse_json_response_reports_invalid_snippet():
    try:
        mod.parse_json_response('{\n  "topics": \n')
    except ValueError as exc:
        assert "invalid JSON" in str(exc)
        assert "Snippet" in str(exc)
    else:
        raise AssertionError("expected invalid JSON to raise")
