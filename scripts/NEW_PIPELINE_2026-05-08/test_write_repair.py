"""Tests for the article writer repair-loop helpers."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from write import _build_repair_user, _mechanical_fix  # noqa: E402
from lib import content_policy as _cp  # noqa: E402


class TestWriteRepairHelpers(unittest.TestCase):

    def test_mechanical_fix_removes_em_dash_variants(self):
        raw = f"One{_cp.EM_DASH}two and three\u2014four"
        fixed = _mechanical_fix(raw)

        self.assertNotIn(_cp.EM_DASH, fixed)
        self.assertNotIn("\u2014", fixed)
        self.assertIn("One-two", fixed)
        self.assertIn("three-four", fixed)

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
