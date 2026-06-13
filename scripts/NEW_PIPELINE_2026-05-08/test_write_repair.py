"""Tests for the article writer repair-loop helpers."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lib import content_policy as _cp  # noqa: E402
from polish_article_text import build_polish_prompts, normalize_punctuation, polish_article_text  # noqa: E402
from write import _build_repair_user, _mechanical_fix  # noqa: E402


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

    def test_article_polish_prompt_is_single_purpose(self):
        system, user = build_polish_prompts(
            "---\ntitle: Test\n---\n\nThis dinner regulates blood sugar."
        )

        self.assertIn("Replace any em dash with a short hyphen.", system)
        self.assertIn("YMYL copy editor", system)
        self.assertIn("Return the complete corrected Markdown article only.", system)
        self.assertIn("frontmatter, title, excerpt, tags, imageAlt, FAQ, and body", system)
        self.assertIn("Do not summarize, condense, or shorten the article.", system)
        self.assertIn("Preserve the body length.", system)
        self.assertIn("This dinner regulates blood sugar.", user)

    def test_article_polish_strips_code_fences_and_normalizes_punctuation(self):
        result = polish_article_text(
            "old",
            llm_fn=lambda _system, _user: "```markdown\nnew \u2014 text\n```",
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
