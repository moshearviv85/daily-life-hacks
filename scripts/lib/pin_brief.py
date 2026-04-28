"""PinBrief + PinBriefSet — schemas for pin image briefs.

PinBrief is one Pinterest pin. PinBriefSet wraps exactly 4 unique pins
(unique slugs, unique titles) for one article. Persisted as one record
per article in the pin_briefs SQL table (topic-research.sqlite).

Validation rules from .claude/rules/content.md.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List

from scripts.lib.hero_brief import _check_clean_text


@dataclass
class PinBrief:
    slug: str
    title: str
    prompt: str
    alt: str
    description: str

    def __post_init__(self) -> None:
        if not self.slug:
            raise ValueError("slug must be non-empty")
        if not self.title:
            raise ValueError("title must be non-empty")
        if not self.prompt:
            raise ValueError("prompt must be non-empty")
        if len(self.alt) < 30:
            raise ValueError(f"alt too short ({len(self.alt)} < 30 chars)")
        if len(self.alt) > 200:
            raise ValueError(f"alt too long ({len(self.alt)} > 200 chars)")
        if not self.description:
            raise ValueError("description must be non-empty")
        if len(self.description) < 80:
            raise ValueError(f"description too short ({len(self.description)} < 80 chars)")
        if len(self.description) > 200:
            raise ValueError(f"description too long ({len(self.description)} > 200 chars)")
        if not self.title.isascii():
            non_ascii = [c for c in self.title if not c.isascii()]
            raise ValueError(
                f"title must be ASCII-only (rendered on the pin image): "
                f"non-ASCII chars {non_ascii!r} in {self.title!r}"
            )
        _check_clean_text(self.title, "title")
        _check_clean_text(self.alt, "alt")
        _check_clean_text(self.description, "description")
        if self.title not in self.prompt:
            raise ValueError(
                f"prompt must contain the title as a literal substring: {self.title!r}"
            )


@dataclass
class PinBriefSet:
    article_slug: str
    pins: List[PinBrief]

    def __post_init__(self) -> None:
        if not self.article_slug:
            raise ValueError("article_slug must be non-empty")
        if len(self.pins) != 4:
            raise ValueError(
                f"PinBriefSet must contain exactly 4 pins (got {len(self.pins)})"
            )
        slugs = [p.slug for p in self.pins]
        if len(set(slugs)) != 4:
            raise ValueError(f"pin slugs must be unique: {slugs}")
        titles = [p.title for p in self.pins]
        if len(set(titles)) != 4:
            raise ValueError(f"pin titles must be unique: {titles}")
