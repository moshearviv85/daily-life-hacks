"""Tests for the article writer repair-loop helpers."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from write import _auto_fix_cp04_hedging, _build_repair_user, _mechanical_fix  # noqa: E402
from lib import content_policy as _cp  # noqa: E402
from lib.validator import validate  # noqa: E402


class TestWriteRepairHelpers(unittest.TestCase):

    def test_mechanical_fix_removes_em_dash_variants(self):
        raw = f"One{_cp.EM_DASH}two and three\u2014four"
        fixed = _mechanical_fix(raw)

        self.assertNotIn(_cp.EM_DASH, fixed)
        self.assertNotIn("\u2014", fixed)
        self.assertIn("One-two", fixed)
        self.assertIn("three-four", fixed)

    def test_auto_fix_cp04_hedges_local_sentence_without_model(self):
        raw = "Cinnamon regulates blood sugar levels after dinner."
        fixed, count = _auto_fix_cp04_hedging(raw)

        self.assertEqual(count, 1)
        self.assertEqual(fixed, "Cinnamon may help regulate blood sugar levels after dinner.")
        cp04 = [v for v in validate(fixed, context="pin_description") if v.rule_id == "CP-04"]
        self.assertEqual(cp04, [])

    def test_auto_fix_cp04_leaves_already_hedged_sentence_alone(self):
        raw = "Oats might improve cholesterol when eaten regularly."
        fixed, count = _auto_fix_cp04_hedging(raw)

        self.assertEqual(count, 0)
        self.assertEqual(fixed, raw)

    def test_auto_fix_cp04_handles_for_phrase(self):
        raw = "Simple snacks for gut health."
        fixed, count = _auto_fix_cp04_hedging(raw)

        self.assertEqual(count, 1)
        self.assertEqual(fixed, "Simple snacks that may support gut health.")

    def test_auto_fix_cp04_neutralizes_unclaimed_terms_without_model(self):
        raw = "tags: [blood sugar, metabolism]\nDinner protein can feel surprisingly simple."
        fixed, count = _auto_fix_cp04_hedging(raw)

        self.assertEqual(count, 1)
        self.assertIn("tags: [steady energy, daily energy]", fixed)
        cp04 = [v for v in validate(fixed, context="pin_description") if v.rule_id == "CP-04"]
        self.assertEqual(cp04, [])

    def test_repair_prompt_includes_validation_failures_and_article(self):
        prompt = _build_repair_user(
            topic="summer snack board",
            category="tips",
            slug="summer-snack-board",
            markdown="---\ntitle: Old\n---\n\nThis detox board fixes dinner.",
            issues=[
                {"rule": "CP-06", "detail": "detox/cleanse pattern(s): ['detox']"},
                {"rule": "CP-05", "detail": "absolute health claim pattern(s): ['fixes']"},
            ],
        )

        self.assertIn("Repair the same article", prompt)
        self.assertIn("CP-06", prompt)
        self.assertIn("CP-05", prompt)
        self.assertIn("summer-snack-board", prompt)
        self.assertIn("This detox board fixes dinner.", prompt)
        self.assertIn("Return the complete corrected markdown article only.", prompt)
        self.assertIn("Fix only the listed validation failures.", prompt)
        self.assertIn("Do not summarize, shorten, or rewrite unrelated sections.", prompt)


if __name__ == "__main__":
    unittest.main()
