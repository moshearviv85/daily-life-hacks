"""HeroBrief — schema for hero image briefs.

One row per article in the hero_briefs SQL table (topic-research.sqlite).
Validation rules from lib.content_policy (single source of truth).
"""
from __future__ import annotations

from dataclasses import dataclass

from lib.validator import validate


def _check_clean_text(text: str, field_name: str, *, context: str = "hero_alt") -> None:
    tier1 = [v for v in validate(text, context=context) if v.tier == 1]
    if tier1:
        details = ", ".join(f"{v.rule_id}: {v.detail}" for v in tier1[:3])
        raise ValueError(f"{field_name} fails content policy: {details}")


@dataclass
class HeroBrief:
    article_slug: str
    prompt: str
    alt: str

    def __post_init__(self) -> None:
        if not self.article_slug:
            raise ValueError("article_slug must be non-empty")
        if not self.prompt:
            raise ValueError("prompt must be non-empty")
        if len(self.alt) < 30:
            raise ValueError(f"alt too short ({len(self.alt)} < 30 chars)")
        if len(self.alt) > 200:
            raise ValueError(f"alt too long ({len(self.alt)} > 200 chars)")
        _check_clean_text(self.alt, "alt", context="hero_alt")
