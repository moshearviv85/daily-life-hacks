"""Tests for the article writer repair-loop helpers."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from normalize_punctuation import normalize_punctuation  # noqa: E402
from soften_medical_language import build_soften_prompts, soften_medical_language  # noqa: E402
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

    def test_normalize_punctuation_replaces_em_dash_variants(self):
        raw = f"One{_cp.EM_DASH}two and three\u2014four"
        fixed = normalize_punctuation(raw)

        self.assertEqual(fixed, "One-two and three-four")

    def test_medical_soften_prompt_is_single_purpose(self):
        system, user = build_soften_prompts(
            "---\ntitle: Test\n---\n\nThis dinner regulates blood sugar.",
            issues=[{"rule": "CP-04", "detail": "blood sugar sentence"}],
        )

        self.assertIn("soften or remove medical", system)
        self.assertIn("Return the complete corrected Markdown article only.", system)
        self.assertIn("Update frontmatter title, excerpt, tags, imageAlt, and FAQ answers", system)
        self.assertIn("CP-04", user)
        self.assertIn("This dinner regulates blood sugar.", user)

    def test_medical_soften_strips_code_fences_and_normalizes_punctuation(self):
        result = soften_medical_language(
            "old",
            llm_fn=lambda _system, _user: "```markdown\nnew — text\n```",
        )

        self.assertEqual(result.markdown, "new - text")

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
