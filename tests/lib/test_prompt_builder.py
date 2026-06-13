import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"))

import pytest
from lib.prompt_builder import (
    build_write_system, build_write_user,
    build_review_system, build_pin_system,
    build_pin_desc_system, build_hero_system,
    build_medical_validator_system, load_voice,
)


class TestLoadVoice:
    def test_returns_string(self):
        v = load_voice()
        assert isinstance(v, str) and len(v) > 100

    def test_contains_david(self):
        assert "David" in load_voice()

    def test_contains_voice_traits(self):
        v = load_voice()
        assert "dry humor" in v.lower() or "humor" in v.lower()


class TestBuildWriteSystem:
    def test_contains_voice(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "David" in p

    def test_contains_medical_terms(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "insulin" in p.lower()

    def test_contains_slug(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "test-slug" in p

    def test_contains_category(self):
        p = build_write_system(category="nutrition", slug="test-slug")
        assert "nutrition" in p.lower()

    def test_contains_em_dash_ban(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "em dash" in p.lower() or "em-dash" in p.lower() or "U+2014" in p

    def test_contains_hedge_terms(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "blood sugar" in p.lower()

    def test_contains_ai_words(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "Furthermore" in p

    def test_recipe_prompt_requires_longer_body_and_bottom_recipe_card(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "Minimum body length" in p
        assert "Recipes: 2400 to 3200 useful body words" in p
        assert "Nutrition and tips: 1800 to 2400 useful body words" in p
        assert "Do not stop early" in p
        assert "A 900 to 1200 word body is incomplete" in p
        assert "Main body sections MUST use H2 headings" in p
        assert "Do not use H3 (`###`) for top-level body sections" in p
        assert "Do not target an exact heading count" in p
        assert "Each H2 section needs at least one voice moment" in p
        assert "Do not turn it into a medical or wellness article" in p
        assert "recipe card at the bottom before FAQ" in p
        assert "Do not duplicate the top recipe details box" in p
        assert "Put ingredients, steps, times, servings, calories, and difficulty in YAML only" in p
        assert "servings, calories: plain integers, not quoted" in p
        assert "ingredients: non-empty YAML list of strings" in p
        assert "steps: non-empty YAML list of strings" in p
        assert "Output only the complete markdown file" in p
        assert "Use 3 to 8 plain H2 headings" not in p
        assert "recipes need 9 to 12 H2 sections" not in p
        assert "nutrition and tips need 8 to 11 H2 sections" not in p
        assert "one heading" not in p

    def test_article_prompt_blocks_recent_generic_failures(self):
        p = build_write_system(category="nutrition", slug="test-slug")
        assert "Do not use cutesy generic headings" in p
        assert "The Protein Play" in p
        assert "Fiber Fanatics" in p
        assert "The Beneficial Fat Factor" in p
        assert "The Balanced Bowl" in p
        assert "your future self will thank you" in p
        assert "Do not personify nutrients or the body" in p
        assert "protein tells your brain" in p
        assert "prefer food mechanics over body-system claims" in p
        assert "could this paragraph appear in any food blog" in p

    def test_article_prompt_sets_tighter_excerpt_guidance(self):
        p = build_write_system(category="nutrition", slug="test-slug")
        assert "excerpt: 130 to 170 characters" in p
        assert "Never exceed 200 characters" in p

    def test_article_prompt_uses_general_opening_guidance_without_sample_hooks(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "Start from the real topic" in p
        assert "Let the article find its natural shape" in p
        assert "Do not copy or closely mimic phrasing from this prompt" in p
        assert "You know those nights" not in p
        assert "What David Sounds Like" not in p
        assert "BAD (generic AI)" not in p

    def test_article_prompt_is_concise_and_not_seo_conflicted(self):
        p = build_write_system(category="recipes", slug="test-slug")
        assert "Don't write for SEO robots" not in p
        assert "# SEO / AEO / GEO" not in p
        assert "# DISCOVERY" in p
        assert "Never force keywords over readability" in p
        assert len(p) < 10000


class TestBuildWriteUser:
    def test_contains_topic(self):
        p = build_write_user(topic="easy dinner", category="recipes", slug="easy-dinner", rationale="quick meals")
        assert "easy dinner" in p
        assert "Hit the required body length" in p
        assert "Use H2 (`##`) for top-level body sections" in p
        assert "Do not write the main article sections as H3 (`###`)" in p
        assert "Put the topic keyword in at least one H2" in p
        assert "generic food-blog filler" in p

    def test_contains_rationale(self):
        p = build_write_user(topic="test", category="recipes", slug="test", rationale="keyword angles")
        assert "keyword angles" in p


class TestBuildReviewSystem:
    def test_contains_medical_terms(self):
        p = build_review_system()
        assert "insulin" in p.lower()

    def test_contains_fact_checking(self):
        p = build_review_system()
        assert "fact" in p.lower()

    def test_contains_output_format(self):
        p = build_review_system()
        assert "CHANGES" in p


class TestBuildPinSystem:
    def test_contains_voice(self):
        p = build_pin_system(keyword="easy dinner", variants=["quick dinner"])
        assert "David" in p or "dry humor" in p.lower()

    def test_contains_keyword(self):
        p = build_pin_system(keyword="easy dinner", variants=["quick dinner"])
        assert "easy dinner" in p

    def test_contains_variants(self):
        p = build_pin_system(keyword="test", variants=["variant one", "variant two"])
        assert "variant one" in p

    def test_contains_bans(self):
        p = build_pin_system(keyword="test", variants=[])
        assert "em dash" in p.lower() or "em-dash" in p.lower() or "U+2014" in p

    def test_requires_angle_diversity(self):
        p = build_pin_system(keyword="prime rib", variants=["reverse sear"])
        assert "Use the primary keyword in 2 of the 4 titles at most" in p
        assert "Do NOT reuse the same subtitle" in p
        assert "REQUIRED ANGLE DIVERSITY" in p


class TestBuildPinDescSystem:
    def test_contains_voice_or_tone(self):
        p = build_pin_desc_system()
        assert "David" in p or "voice" in p.lower() or "humor" in p.lower() or "dry" in p.lower()

    def test_contains_char_limits(self):
        p = build_pin_desc_system()
        assert "80" in p and "195" in p


class TestBuildHeroSystem:
    def test_contains_policy(self):
        p = build_hero_system()
        assert "em dash" in p.lower() or "em-dash" in p.lower() or "U+2014" in p


class TestBuildMedicalValidatorSystem:
    def test_contains_hard_ban_terms(self):
        p = build_medical_validator_system()
        assert "insulin" in p.lower()

    def test_contains_hedge_terms(self):
        p = build_medical_validator_system()
        assert "blood sugar" in p.lower()

    def test_contains_hedging_guidance(self):
        p = build_medical_validator_system()
        assert "hedge" in p.lower() or "may" in p.lower()
