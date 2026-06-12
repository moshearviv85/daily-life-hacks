"""Tests for lib.validator — unified deterministic validator."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"))

import pytest
from lib.validator import validate, Violation

# ---------------------------------------------------------------------------
# Test fixture — a minimal but complete recipe article that passes all checks
# ---------------------------------------------------------------------------

GOOD_ARTICLE = '''---
title: Test Recipe
excerpt: This is a sample excerpt that hooks the reader without being too short or long. It gives a clear promise about the recipe for tonight.
category: recipes
tags:
  - easy dinner
  - weeknight meals
  - simple recipe
  - family favorite
image: "/images/test-slug-main.jpg"
imageAlt: A bowl of fluffy white rice with herbs on a wooden table
date: 2026-05-13
author: "David Miller"
featured: false
prepTime: "10 minutes"
cookTime: "20 minutes"
totalTime: "30 minutes"
servings: 4
calories: 320
difficulty: "Easy"
ingredients:
  - "1 cup rice"
  - "2 cups water"
  - "1 tsp salt"
  - "1 tbsp olive oil"
faq:
  - question: "Can I make this ahead?"
    answer: "Yes, you can make this ahead of time. Store it in the fridge and reheat gently. The flavors develop more after a night in the fridge, which is nice."
  - question: "Is this budget friendly?"
    answer: "The ingredients are pantry staples most people already have. You can scale it up for a crowd without the grocery bill getting out of control at all."
  - question: "Can I swap in brown rice?"
    answer: "You can, but increase cook time by fifteen to twenty minutes and add more water. Brown rice holds up better for reheating so it is good for meal prep."
  - question: "How do I store leftovers?"
    answer: "Let it cool then move to an airtight container. It keeps three to four days in the fridge. Reheat with a splash of water so it stays tender and not dried out."
steps:
  - "Rinse rice under cold water."
  - "Combine with water and salt."
  - "Bring to boil, reduce heat, cover 18 min."
  - "Rest 5 min, fluff, drizzle oil."
---

Intro paragraph about rice. I used to mess this up every single time, right? The grains would fuse into a gluey block.

The key to good rice is patience and a timer. Once you nail the ratio and respect the resting phase, rice goes from frustrating to foolproof.

## Why the ratio matters

Every grain of rice wants a slightly different amount of water. But for most long-grain white rice, a two-to-one ratio is solid. The water has to hydrate each grain without flooding the pot.

I check by weight when I am being fussy, but a measuring cup is fine for a weeknight.

## The rinse step

A quick rinse under cold water is the step people love to skip. That starchy cloud on the surface causes the gluey texture. Pour the rice into a strainer and swirl under cool water for thirty seconds.

If you are in a rush, at least give it a splash.

## Cook and rest

Once the water is boiling and the heat is low, put the lid on and set a timer. Do not peek. The pot is a small ecosystem.

When the timer goes off, take the pot off the heat and leave the lid on for another five minutes. This rest is where the residual steam finishes hydrating the grains. After the rest, fluff with a fork, drizzle with olive oil, and taste.''' + ' word' * 600


# ---------------------------------------------------------------------------
# 1. TestContentPolicyAllContexts
# ---------------------------------------------------------------------------

class TestContentPolicyAllContexts:
    """CP rules fire regardless of context."""

    def test_em_dash_triggers_in_article(self):
        text = "This is a sentence—with an em dash."
        violations = validate(text, context="article")
        rule_ids = {v.rule_id for v in violations}
        assert "CP-01" in rule_ids

    def test_em_dash_triggers_in_pin_title(self):
        text = "Quick Dinner—Ready in 30 Minutes"
        violations = validate(text, context="pin_title")
        rule_ids = {v.rule_id for v in violations}
        assert "CP-01" in rule_ids

    def test_em_dash_triggers_in_pin_description(self):
        text = "A great recipe—perfect for weeknights."
        violations = validate(text, context="pin_description")
        rule_ids = {v.rule_id for v in violations}
        assert "CP-01" in rule_ids

    def test_supplement_triggers_in_article(self):
        text = "Add some protein powder to the mix."
        violations = validate(text, context="article")
        rule_ids = {v.rule_id for v in violations}
        assert "CP-02" in rule_ids

    def test_supplement_triggers_in_pin_title(self):
        text = "Ashwagandha smoothie recipe"
        violations = validate(text, context="pin_title")
        rule_ids = {v.rule_id for v in violations}
        assert "CP-02" in rule_ids

    def test_ai_word_triggers_in_pin_description(self):
        text = "Furthermore, this recipe is easy to make."
        violations = validate(text, context="pin_description")
        rule_ids = {v.rule_id for v in violations}
        assert "CP-07" in rule_ids

    def test_clean_pin_title_passes(self):
        text = "Easy weeknight rice recipe"
        violations = validate(text, context="pin_title")
        assert violations == []

    def test_clean_pin_description_passes(self):
        text = "This simple rice dish comes together in under 30 minutes. It's a reliable weeknight staple."
        violations = validate(text, context="pin_description")
        assert violations == []

    def test_clean_hero_alt_passes(self):
        text = "A bowl of fluffy white rice with herbs on a wooden table"
        violations = validate(text, context="hero_alt")
        assert violations == []

    def test_invalid_context_raises(self):
        with pytest.raises(ValueError, match="context must be one of"):
            validate("some text", context="unknown_context")


# ---------------------------------------------------------------------------
# 2. TestMedicalTermsHardBan
# ---------------------------------------------------------------------------

class TestMedicalTermsHardBan:
    """CP-03: hard-banned medical terms trigger tier 1 in any context."""

    def test_insulin_triggers_in_article(self):
        text = "Your body releases insulin after eating."
        violations = validate(text, context="article")
        cp03 = [v for v in violations if v.rule_id == "CP-03"]
        assert cp03, "Expected CP-03 violation for 'insulin'"
        assert cp03[0].tier == 1

    def test_cortisol_triggers_in_pin_title(self):
        text = "Lower cortisol with these foods"
        violations = validate(text, context="pin_title")
        cp03 = [v for v in violations if v.rule_id == "CP-03"]
        assert cp03, "Expected CP-03 violation for 'cortisol'"
        assert cp03[0].tier == 1

    def test_multiple_hard_ban_terms(self):
        text = "Serotonin and dopamine are linked to mood."
        violations = validate(text, context="article")
        cp03 = [v for v in violations if v.rule_id == "CP-03"]
        assert cp03
        assert "serotonin" in cp03[0].detail.lower() or "dopamine" in cp03[0].detail.lower()

    def test_clean_text_no_cp03(self):
        text = "Eating leafy greens may help you feel more energized."
        violations = validate(text, context="pin_description")
        cp03 = [v for v in violations if v.rule_id == "CP-03"]
        assert cp03 == []

    def test_case_insensitive_match(self):
        text = "INSULIN levels rise after a high-carb meal."
        violations = validate(text, context="pin_description")
        cp03 = [v for v in violations if v.rule_id == "CP-03"]
        assert cp03, "Expected CP-03 to catch uppercase INSULIN"


# ---------------------------------------------------------------------------
# 3. TestMedicalTermsHedgeRequired
# ---------------------------------------------------------------------------

class TestMedicalTermsHedgeRequired:
    """CP-04: hedge-required terms require hedging words in the same sentence."""

    def test_unhedged_blood_sugar_triggers(self):
        text = "Cinnamon regulates blood sugar levels."
        violations = validate(text, context="article")
        cp04 = [v for v in violations if v.rule_id == "CP-04"]
        assert cp04, "Expected CP-04 for unhedged 'blood sugar'"
        assert cp04[0].tier == 1

    def test_hedged_blood_sugar_passes(self):
        text = "Cinnamon may help support blood sugar levels."
        violations = validate(text, context="article")
        cp04 = [v for v in violations if v.rule_id == "CP-04"]
        assert cp04 == [], "Hedged 'blood sugar' should not trigger CP-04"

    def test_could_hedge_passes(self):
        text = "This recipe could support gut health when eaten regularly."
        violations = validate(text, context="pin_description")
        cp04 = [v for v in violations if v.rule_id == "CP-04"]
        assert cp04 == []

    def test_might_hedge_passes(self):
        text = "Oats might improve cholesterol when eaten daily."
        violations = validate(text, context="article")
        cp04 = [v for v in violations if v.rule_id == "CP-04"]
        assert cp04 == []

    def test_unhedged_gut_health_triggers(self):
        text = "Fermented foods improve gut health."
        violations = validate(text, context="pin_title")
        cp04 = [v for v in violations if v.rule_id == "CP-04"]
        assert cp04

    def test_unhedged_cholesterol_triggers(self):
        text = "Oats lower cholesterol."
        violations = validate(text, context="article")
        cp04 = [v for v in violations if v.rule_id == "CP-04"]
        assert cp04


# ---------------------------------------------------------------------------
# 4. TestAbsoluteHealthClaims
# ---------------------------------------------------------------------------

class TestAbsoluteHealthClaims:
    """CP-05: absolute health claim patterns trigger tier 1."""

    def test_cures_triggers(self):
        text = "This spice cures diabetes."
        violations = validate(text, context="article")
        cp05 = [v for v in violations if v.rule_id == "CP-05"]
        assert cp05, "Expected CP-05 for 'cures'"
        assert cp05[0].tier == 1

    def test_prevents_disease_triggers(self):
        text = "Eating well prevents disease."
        violations = validate(text, context="pin_description")
        cp05 = [v for v in violations if v.rule_id == "CP-05"]
        assert cp05, "Expected CP-05 for 'prevents disease'"

    def test_heals_triggers(self):
        text = "This tea heals your gut lining."
        violations = validate(text, context="article")
        cp05 = [v for v in violations if v.rule_id == "CP-05"]
        assert cp05

    def test_treats_medical_condition_triggers(self):
        text = "This snack board treats diabetes."
        violations = validate(text, context="article")
        cp05 = [v for v in violations if v.rule_id == "CP-05"]
        assert cp05, "Expected CP-05 for 'treats diabetes'"

    def test_safe_language_passes(self):
        text = "Eating more vegetables may support overall wellness."
        violations = validate(text, context="article")
        cp05 = [v for v in violations if v.rule_id == "CP-05"]
        assert cp05 == []

    def test_treats_like_exception(self):
        # "treats like" should NOT trigger (negative lookahead in pattern)
        text = "Treat yourself like royalty with this recipe."
        violations = validate(text, context="article")
        cp05 = [v for v in violations if v.rule_id == "CP-05"]
        assert cp05 == [], "'treats like' should not trigger CP-05"

    def test_food_treats_passes(self):
        text = "Add sweet treats and salty snacks to the movie night board."
        violations = validate(text, context="article")
        cp05 = [v for v in violations if v.rule_id == "CP-05"]
        assert cp05 == [], "Food treats should not trigger CP-05"


# ---------------------------------------------------------------------------
# 5. TestSignoffs
# ---------------------------------------------------------------------------

class TestSignoffs:
    """CP-08: sign-off phrases are tier-2 warnings."""

    def test_happy_eating_triggers(self):
        text = "This rice is great. Happy eating!"
        violations = validate(text, context="article")
        cp08 = [v for v in violations if v.rule_id == "CP-08"]
        assert cp08, "Expected CP-08 for 'Happy eating!'"
        assert cp08[0].tier == 2

    def test_enjoy_exclamation_triggers(self):
        text = "Try this recipe tonight. Enjoy!"
        violations = validate(text, context="article")
        cp08 = [v for v in violations if v.rule_id == "CP-08"]
        assert cp08

    def test_stomach_thank_you_triggers(self):
        text = "Your stomach will thank you."
        violations = validate(text, context="pin_description")
        cp08 = [v for v in violations if v.rule_id == "CP-08"]
        assert cp08

    def test_no_signoff_passes(self):
        text = "This dish is ready to serve and pairs well with a green salad."
        violations = validate(text, context="article")
        cp08 = [v for v in violations if v.rule_id == "CP-08"]
        assert cp08 == []


# ---------------------------------------------------------------------------
# 6. TestDetox
# ---------------------------------------------------------------------------

class TestDetox:
    """CP-06: detox / cleanse language triggers tier 1."""

    def test_detox_triggers(self):
        text = "This smoothie will detox your body."
        violations = validate(text, context="article")
        cp06 = [v for v in violations if v.rule_id == "CP-06"]
        assert cp06, "Expected CP-06 for 'detox'"
        assert cp06[0].tier == 1

    def test_cleanse_triggers(self):
        text = "Do a juice cleanse for three days."
        violations = validate(text, context="pin_description")
        cp06 = [v for v in violations if v.rule_id == "CP-06"]
        assert cp06

    def test_flush_toxins_triggers(self):
        text = "Lemon water helps flush toxins from your system."
        violations = validate(text, context="article")
        cp06 = [v for v in violations if v.rule_id == "CP-06"]
        assert cp06

    def test_reset_body_triggers(self):
        text = "This plan will reset your body in seven days."
        violations = validate(text, context="article")
        cp06 = [v for v in violations if v.rule_id == "CP-06"]
        assert cp06

    def test_clean_language_passes(self):
        text = "Drinking water keeps you feeling refreshed throughout the day."
        violations = validate(text, context="article")
        cp06 = [v for v in violations if v.rule_id == "CP-06"]
        assert cp06 == []


# ---------------------------------------------------------------------------
# 7. TestArticleStructural
# ---------------------------------------------------------------------------

class TestArticleStructural:
    """Structural S-xx rules fire only for context='article'."""

    def test_good_article_passes(self):
        violations = validate(GOOD_ARTICLE, context="article", slug="test-slug")
        tier1 = [v for v in violations if v.tier == 1]
        assert tier1 == [], f"Expected no Tier 1 violations, got: {tier1}"

    def test_good_article_has_only_length_tier2_under_new_targets(self):
        violations = validate(GOOD_ARTICLE, context="article", slug="test-slug")
        tier2 = [v for v in violations if v.tier == 2]
        assert {v.rule_id for v in tier2} == {"S-20"}, f"Expected only S-20, got: {tier2}"

    def test_missing_frontmatter_triggers_s01(self):
        text = "# Just a plain heading\n\nNo frontmatter here."
        violations = validate(text, context="article")
        rule_ids = {v.rule_id for v in violations}
        assert "S-01" in rule_ids

    def test_unclosed_frontmatter_triggers_s02(self):
        text = "---\ntitle: Test\nauthor: David Miller\n\nBody text here."
        violations = validate(text, context="article")
        rule_ids = {v.rule_id for v in violations}
        assert "S-02" in rule_ids

    def test_wrong_author_triggers_s06(self):
        # Replace "David Miller" with wrong author
        text = GOOD_ARTICLE.replace('author: "David Miller"', 'author: "John Doe"')
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-06" in rule_ids

    def test_conclusion_heading_triggers_s13(self):
        text = GOOD_ARTICLE + "\n## Conclusion\n\nWrap up text."
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-13" in rule_ids

    def test_faq_heading_in_body_triggers_s12(self):
        text = GOOD_ARTICLE + "\n## FAQ\n\nSome questions here."
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-12" in rule_ids

    def test_wrong_image_slug_triggers_s08(self):
        violations = validate(GOOD_ARTICLE, context="article", slug="different-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-08" in rule_ids

    def test_missing_image_alt_triggers_s11(self):
        text = GOOD_ARTICLE.replace(
            "imageAlt: A bowl of fluffy white rice with herbs on a wooden table\n",
            "",
        )
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-11" in rule_ids

    def test_draft_article_can_skip_image_alt_until_hero_brief(self):
        text = GOOD_ARTICLE.replace(
            "imageAlt: A bowl of fluffy white rice with herbs on a wooden table\n",
            "",
        )
        violations = validate(
            text,
            context="article",
            slug="test-slug",
            require_image_alt=False,
        )
        rule_ids = {v.rule_id for v in violations}
        assert "S-11" not in rule_ids

    def test_long_image_alt_triggers_s11(self):
        long_alt = "A " + "very detailed " * 25 + "photo of rice on a table"
        text = GOOD_ARTICLE.replace(
            "imageAlt: A bowl of fluffy white rice with herbs on a wooden table",
            f"imageAlt: {long_alt}",
        )
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-11" in rule_ids

    def test_duplicate_comma_phrase_in_steps_triggers_s14(self):
        text = GOOD_ARTICLE.replace(
            '"Combine with water and salt."',
            '"Combine rice, onion powder, onion powder, and salt."',
        )
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-14" in rule_ids

    def test_stale_phrase_game_changer_triggers_cp09(self):
        text = GOOD_ARTICLE + "\n\nThis method is a total game-changer for weeknights."
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "CP-09" in rule_ids

    def test_no_s08_without_slug(self):
        # S-08 skipped when slug=None
        violations = validate(GOOD_ARTICLE, context="article", slug=None)
        rule_ids = {v.rule_id for v in violations}
        assert "S-08" not in rule_ids

    def test_missing_required_field_triggers_s04(self):
        # Remove the excerpt field from the article
        text = GOOD_ARTICLE.replace(
            "excerpt: This is a sample excerpt that hooks the reader without being too short or long. It gives a clear promise about the recipe for tonight.",
            ""
        )
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-04" in rule_ids

    def test_invalid_category_triggers_s05(self):
        text = GOOD_ARTICLE.replace("category: recipes", "category: fitness")
        violations = validate(text, context="article", slug="test-slug")
        rule_ids = {v.rule_id for v in violations}
        assert "S-05" in rule_ids

    def test_structural_checks_skipped_for_pin_title(self):
        # Structural rule S-01 should NOT fire for non-article contexts
        text = "Quick weeknight dinner idea"
        violations = validate(text, context="pin_title")
        rule_ids = {v.rule_id for v in violations}
        # None of the S-xx rules should appear
        s_rules = {r for r in rule_ids if r.startswith("S-")}
        assert s_rules == set(), f"S-xx rules should not fire for pin_title, got: {s_rules}"

    def test_code_fence_wrapping_triggers_s15(self):
        text = "```\n---\ntitle: Test\n---\nBody\n```"
        violations = validate(text, context="article")
        rule_ids = {v.rule_id for v in violations}
        assert "S-15" in rule_ids

    def test_s20_uses_longer_category_targets(self):
        recipe_violations = validate(GOOD_ARTICLE, context="article", slug="test-slug")
        recipe_s20 = [v for v in recipe_violations if v.rule_id == "S-20"]
        assert recipe_s20
        assert "[2200, 3400]" in recipe_s20[0].detail

        tips_text = GOOD_ARTICLE.replace("category: recipes", "category: tips")
        tips_violations = validate(tips_text, context="article", slug="test-slug")
        tips_s20 = [v for v in tips_violations if v.rule_id == "S-20"]
        assert tips_s20
        assert "[1700, 2600]" in tips_s20[0].detail
