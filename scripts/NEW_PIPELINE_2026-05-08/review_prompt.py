"""Review-stage prompt for the article fact-checking editor.

Delegates content rules to lib.prompt_builder (single source of truth).
Keeps ROLE, FACT_CHECK, and OUTPUT_FORMAT locally since they are
review-specific and not shared with other pipeline stages.
"""
from __future__ import annotations

from lib.prompt_builder import build_review_system


USER_TEMPLATE = """Review this {category} article (slug: {slug}).

Fix any factual errors, hallucinations, or content rule violations you find. Return the corrected article and change log.

---ARTICLE START---
{markdown}
---ARTICLE END---"""


def build_system() -> str:
    return build_review_system()


def build_user(markdown: str, slug: str, category: str) -> str:
    return USER_TEMPLATE.format(
        markdown=markdown,
        slug=slug,
        category=category,
    )
