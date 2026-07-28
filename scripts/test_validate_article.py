"""Tests for scripts/validate_article.py.

Runs on stdlib only (unittest). No pytest dependency.

Run from repo root:
    python scripts/test_validate_article.py
Or:
    python -m unittest scripts.test_validate_article

Strategy: one baseline GOOD article fixture (a minimal recipe that passes every
rule). Each failure test is a surgical mutation of the fixture, and asserts
that the specific rule_id is raised and no unrelated Tier 1 rule is.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from validate_article import validate, Violation  # noqa: E402


SLUG = "test-recipe-slug"


GOOD_RECIPE = """---
title: Test Recipe That Is Easy
excerpt: This is a sample excerpt that hooks the reader without being too short or too long. It gives a clear promise about the recipe.
category: recipes
tags:
  - easy dinner
  - weeknight meals
  - simple recipe
  - family favorite
image: "/images/test-recipe-slug-main.jpg"
imageAlt: "A colorful plate of the finished test recipe"
date: 2026-04-23
author: "David Miller"
featured: false
prepTime: "10 minutes"
cookTime: "20 minutes"
totalTime: "30 minutes"
servings: 4
calories: 320
difficulty: "Easy"
ingredients:
  - "1 cup rice, rinsed"
  - "2 cups water"
  - "1 tsp salt"
  - "1 tbsp olive oil"
faq:
  - question: "Can I make this ahead?"
    answer: "Yes, you can certainly make this ahead of time. Store it in the fridge and reheat gently before serving. The flavors may even develop a bit more after a night in the fridge, which is a nice bonus for busy weeknights."
  - question: "Is this recipe budget friendly?"
    answer: "Absolutely. The ingredients are simple pantry staples that most people already have on hand. You can scale it up for a crowd without your grocery bill getting out of control, which is always a nice surprise these days."
  - question: "Can I swap in brown rice?"
    answer: "You can, but you will need to increase the cooking time by roughly fifteen to twenty minutes and add a little more water. Brown rice may hold up better to reheating, so it is a solid choice if you are meal prepping for the week."
  - question: "How do I store leftovers?"
    answer: "Let the dish cool to room temperature, then move it to an airtight container in the fridge. It keeps well for three to four days. Reheat with a splash of water in the microwave to help it stay tender instead of drying out."
steps:
  - "Rinse the rice under cold water until the water runs clear."
  - "Combine rice, water, and salt in a saucepan over medium heat."
  - "Bring to a boil, then reduce heat and cover. Cook 18 minutes."
  - "Remove from heat and let rest 5 minutes before fluffing."
  - "Drizzle with olive oil and serve warm."
---

This is the intro paragraph of the article. It drops into a short confession: I used to be bad at rice. Every single time I made it, the grains fused into a gluey block that could double as wall putty. It was embarrassing for a cooking blogger. Then my mom sent me a text with a single sentence, and everything clicked.

The key to good rice is not a fancy gadget or a pile of expensive pantry items. It is patience and a timer. Once you nail the ratio and respect the resting phase, rice goes from frustrating to foolproof. You will wonder what you were ever doing wrong in the first place.

## Why the ratio matters

Every grain of rice is different and wants a slightly different amount of water. But for most long-grain white rice, a two-to-one ratio is a solid starting point. The water has to hydrate each grain without flooding the pot and turning the whole thing into soup. If you overshoot, you get mush. If you undershoot, you get crunchy middles and a gritty bite that nobody wants.

I check by weight when I am being fussy, but a measuring cup is fine for a weeknight. A little consistency goes a long way, and the extra ten seconds spent measuring saves you from a sad pot of glue later.

## The rinse is not optional

A quick rinse under cold water is the step people love to skip. It feels silly to wash something you are about to boil. But that starchy cloud on the surface of unrinsed rice is what causes the gluey texture. Pour the rice into a strainer and swirl it under cool water for about thirty seconds, until the water runs mostly clear.

If you are in a rush, at least give it a splash. Any rinsing is better than none. Your finished rice will have distinct, pillowy grains instead of one congealed brick.

## Cover and walk away

Once the water is boiling and the heat is low, put the lid on and set a timer. Do not peek. Every time you lift the lid, you let out steam that the rice needs to finish cooking. The pot is a small ecosystem. Respect it, and it will reward you.

While it cooks, use the eighteen minutes to prep a quick side dish or just stare at your phone. I am not here to judge.

## Let it rest

When the timer goes off, take the pot off the heat and leave the lid on for another five minutes. This rest is where the magic happens. The residual steam finishes hydrating the grains, and the bottom of the pot releases. Skip this step and you get wet grains on top and a stubborn crust on the bottom.

After the rest, fluff with a fork, drizzle with a little olive oil, and taste. Adjust the salt if you need to, though I find the initial teaspoon is usually plenty.

This whole process takes less than a half hour of clock time, and maybe three minutes of actual attention. Rice stopped being my nemesis the day I learned to trust the timer, and once you give it a shot, the same thing will probably happen for you. A good pot of rice is the quiet foundation of so many weeknight dinners, and it deserves to be easy.
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def rule_ids(violations: list[Violation]) -> set[str]:
    return {v.rule_id for v in violations}


def tier1_ids(violations: list[Violation]) -> set[str]:
    return {v.rule_id for v in violations if v.tier == 1}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestValidateGoodArticle(unittest.TestCase):

    def test_good_article_has_no_tier1_violations(self):
        violations = validate(GOOD_RECIPE, SLUG)
        t1 = [v for v in violations if v.tier == 1]
        self.assertEqual(t1, [], f"good article raised tier 1: {t1}")


class TestTier1Detections(unittest.TestCase):

    def assertOnlyRule(self, violations, rule_id):
        ids = tier1_ids(violations)
        self.assertIn(rule_id, ids, f"expected {rule_id}, got {ids}")
        # Must not crash on unrelated rules; only this rule (or zero others)
        # should be the cause of failure. Some rules cascade (e.g. broken YAML
        # will also miss fields), which is why S-03 failures suppress
        # downstream field checks. So we allow rule_id to appear.
        for extra in ids - {rule_id}:
            # extra rules are allowed only when the mutation could cause them
            # cascading; assert the test fixture only flips the target rule.
            self.fail(f"unexpected extra rule {extra} alongside {rule_id}")

    def test_s01_missing_opening_fence(self):
        bad = GOOD_RECIPE.lstrip().lstrip("-").lstrip()
        # the lstrip above also strips the fence content; simpler: just drop leading ---
        bad = "title: No fence\n" + GOOD_RECIPE.split("---", 2)[1] + "\nbody"
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-01", ids)

    def test_s02_missing_closing_fence(self):
        # keep opening --- but drop the closing one
        body_with_open = GOOD_RECIPE.split("---", 2)
        bad = "---\n" + body_with_open[1] + body_with_open[2]  # no 2nd fence
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-02", ids)

    def test_s03_invalid_yaml_faq_block_scalar(self):
        bad = GOOD_RECIPE.replace(
            '  - question: "Can I make this ahead?"',
            '  - question: "Can I make this ahead?"\n    |',
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-03", ids)

    def test_s03_invalid_yaml_dash_answer(self):
        bad = GOOD_RECIPE.replace(
            '    answer: "Yes, you can certainly make this ahead of time.',
            '    - answer: "Yes, you can certainly make this ahead of time.',
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-03", ids)

    def test_s04_missing_required_field(self):
        bad = GOOD_RECIPE.replace("author: \"David Miller\"\n", "", 1)
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-04", ids)

    def test_s05_invalid_category(self):
        bad = GOOD_RECIPE.replace("category: recipes", "category: dessert")
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-05", ids)

    def test_s06_wrong_author(self):
        bad = GOOD_RECIPE.replace('author: "David Miller"', 'author: "Someone Else"')
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-06", ids)

    def test_s07_wrong_faq_count(self):
        # chop off one FAQ entry so we're at 3, not 4-5
        bad = GOOD_RECIPE.replace(
            '  - question: "How do I store leftovers?"\n'
            '    answer: "Let the dish cool to room temperature, then move it to an airtight container in the fridge. '
            'It keeps well for three to four days. Reheat with a splash of water in the microwave to help it stay tender instead of drying out."\n',
            '', 1,
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-07", ids)

    def test_s08_wrong_image_path(self):
        bad = GOOD_RECIPE.replace(
            '/images/test-recipe-slug-main.jpg',
            '/images/wrong-slug-main.jpg',
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-08", ids)

    def test_s09_wrong_tag_count(self):
        # replace tags list with only 2 entries
        bad = GOOD_RECIPE.replace(
            "tags:\n  - easy dinner\n  - weeknight meals\n  - simple recipe\n  - family favorite\n",
            "tags:\n  - easy dinner\n  - weeknight meals\n",
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-09", ids)

    def test_s10_recipe_missing_steps(self):
        # remove the whole steps block
        bad = GOOD_RECIPE.replace(
            'steps:\n'
            '  - "Rinse the rice under cold water until the water runs clear."\n'
            '  - "Combine rice, water, and salt in a saucepan over medium heat."\n'
            '  - "Bring to a boil, then reduce heat and cover. Cook 18 minutes."\n'
            '  - "Remove from heat and let rest 5 minutes before fluffing."\n'
            '  - "Drizzle with olive oil and serve warm."\n',
            '',
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-10", ids)

    def test_s11_em_dash_detected(self):
        bad = GOOD_RECIPE.replace("The key to good rice", "The key — to good rice")
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-11", ids)

    def test_s12_body_faq_heading(self):
        bad = GOOD_RECIPE.replace(
            "## Let it rest",
            "## Let it rest\n\nSome text.\n\n## Frequently Asked Questions\n\n### What about brown rice?\nSome answer.",
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-12", ids)

    def test_s13_conclusion_heading(self):
        bad = GOOD_RECIPE.replace(
            "## Let it rest",
            "## Conclusion",
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-13", ids)

    def test_s14_supplement_mention(self):
        bad = GOOD_RECIPE.replace(
            "A good pot of rice",
            "Add a scoop of protein powder. A good pot of rice",
        )
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-14", ids)

    def test_s15_wrapping_code_fence(self):
        bad = "```yaml\n" + GOOD_RECIPE
        ids = tier1_ids(validate(bad, SLUG))
        self.assertIn("S-15", ids)


class TestTier2Detections(unittest.TestCase):

    def test_s20_body_too_short(self):
        # Keep frontmatter but replace body with a 20-word body
        parts = GOOD_RECIPE.split("---", 2)
        bad = "---" + parts[1] + "---\n\n" + "word " * 20
        violations = validate(bad, SLUG)
        self.assertIn("S-20", {v.rule_id for v in violations})

    def test_s21_too_few_h2(self):
        # Replace all H2s with plain text -> zero H2s
        parts = GOOD_RECIPE.split("---", 2)
        body = parts[2].replace("## ", "WAS_H2 ")
        bad = "---" + parts[1] + "---\n" + body
        violations = validate(bad, SLUG)
        self.assertIn("S-21", {v.rule_id for v in violations})

    def test_s22_banned_ai_word(self):
        bad = GOOD_RECIPE.replace("The key to good rice", "Furthermore, the key to good rice")
        violations = validate(bad, SLUG)
        self.assertIn("S-22", {v.rule_id for v in violations})

    def test_s23_unhedged_health_claim(self):
        bad = GOOD_RECIPE.replace(
            "A good pot of rice is the quiet foundation",
            "This cures diabetes. A good pot of rice is the quiet foundation",
        )
        violations = validate(bad, SLUG)
        self.assertIn("S-23", {v.rule_id for v in violations})

    def test_s24_signoff(self):
        bad = GOOD_RECIPE.rstrip() + "\n\nHappy eating!\n"
        violations = validate(bad, SLUG)
        self.assertIn("S-24", {v.rule_id for v in violations})

    def test_s25_excerpt_too_short(self):
        bad = GOOD_RECIPE.replace(
            "excerpt: This is a sample excerpt that hooks the reader without being too short or too long. It gives a clear promise about the recipe.",
            "excerpt: Too short.",
        )
        violations = validate(bad, SLUG)
        self.assertIn("S-25", {v.rule_id for v in violations})


if __name__ == "__main__":
    unittest.main(verbosity=2)
