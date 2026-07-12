"""Regression tests for inject_pillar_links.insert_link_block.

The maxsplit=2 bug (fixed 2026-07-12) silently deleted everything from the
second H2 heading onward in any article with two or more H2 sections.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "NEW_PIPELINE_2026-05-08"))

from inject_pillar_links import insert_link_block, already_links

MULTI_SECTION_BODY = """
Intro paragraph before any heading.

## First Section

First paragraph of section one.

More text in section one.

## Ingredients

- 2 cups flour
- 1 egg

## Instructions

Mix everything together and bake.
"""


class InsertLinkBlockTest(unittest.TestCase):
    def test_preserves_all_sections(self):
        out = insert_link_block(MULTI_SECTION_BODY, "some-pillar-guide", "the guide")
        self.assertIn("## First Section", out)
        self.assertIn("## Ingredients", out)
        self.assertIn("## Instructions", out)
        self.assertIn("2 cups flour", out)
        self.assertIn("Mix everything together and bake.", out)

    def test_link_inserted_once_after_first_section_paragraph(self):
        out = insert_link_block(MULTI_SECTION_BODY, "some-pillar-guide", "the guide")
        self.assertEqual(out.count("](/some-pillar-guide/)"), 1)
        self.assertLess(
            out.index("First paragraph of section one."),
            out.index("](/some-pillar-guide/)"),
        )
        self.assertLess(out.index("](/some-pillar-guide/)"), out.index("## Ingredients"))

    def test_no_content_lost(self):
        out = insert_link_block(MULTI_SECTION_BODY, "some-pillar-guide", "the guide")
        for line in MULTI_SECTION_BODY.strip().splitlines():
            self.assertIn(line, out)

    def test_skips_when_link_exists(self):
        body = MULTI_SECTION_BODY + "\nSee the [guide](/some-pillar-guide/).\n"
        self.assertTrue(already_links(body, "some-pillar-guide"))
        self.assertIsNone(insert_link_block(body, "some-pillar-guide", "the guide"))

    def test_single_section_fallback_appends(self):
        body = "Just an intro with no headings.\n"
        out = insert_link_block(body, "some-pillar-guide", "the guide")
        self.assertIn("Just an intro with no headings.", out)
        self.assertIn("](/some-pillar-guide/)", out)


if __name__ == "__main__":
    unittest.main()
