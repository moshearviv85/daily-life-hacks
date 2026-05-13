"""HeroBrief — schema for hero image briefs.

One row per article in the hero_briefs SQL table (topic-research.sqlite).
Validation rules from lib.content_policy (single source of truth).
"""
from __future__ import annotations

from dataclasses import dataclass

from lib.content_policy import EM_DASH, AI_WORDS_BANNED


def _check_clean_text(text: str, field_name: str) -> None:
    if EM_DASH in text:
        raise ValueError(f"{field_name} contains em-dash (U+2014)")
    lowered = text.lower()
    for banned in AI_WORDS_BANNED:
        if banned.lower() in lowered:
            raise ValueError(f"{field_name} contains banned AI word: {banned!r}")


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
        _check_clean_text(self.alt, "alt")
