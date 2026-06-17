"""PinBrief + PinBriefSet — schemas for pin image briefs.

PinBrief is one Pinterest pin. PinBriefSet wraps exactly 4 unique pins
(unique slugs, unique titles) for one article. Persisted as one record
per article in the pin_briefs SQL table (topic-research.sqlite).

Validation rules from .claude/rules/content.md.
"""
from __future__ import annotations

from dataclasses import dataclass
import re
from typing import List

from lib.hero_brief import _check_clean_text


_WORD_RE = re.compile(r"[a-z0-9]+")
_BANNED_PROMPT_BODY_PART_RE = re.compile(
    r"\b(?:hand|hands|finger|fingers|person|people|woman|man|child|kid|arm|arms)\b",
    re.IGNORECASE,
)
_BANNED_PROMPT_FORMAT_RE = re.compile(
    r"\b(?:infographic|graphic|icon|icons|chart|diagram)\b",
    re.IGNORECASE,
)
_QUOTED_TEXT_RE = re.compile(r'["“]([^"”]+)["”]')
_RENDER_TEXT_RE = re.compile(
    r'\s*Render the text\s*["“][^"”]*["”][^.]*\.?\s*',
    re.IGNORECASE,
)


def _title_tokens(title: str) -> list[str]:
    return _WORD_RE.findall(title.lower())


def _repeated_title_phrases(titles: list[str], *, n: int = 6) -> list[str]:
    """Return repeated n-word phrases across pin titles.

    Exact title uniqueness is not enough for Pinterest. Four different
    headings can still be near-duplicates if they share a long subtitle
    such as "the only way you should ever cook prime rib".
    """
    seen: dict[tuple[str, ...], int] = {}
    repeated: set[tuple[str, ...]] = set()
    for idx, title in enumerate(titles):
        tokens = _title_tokens(title)
        phrases = {tuple(tokens[i:i + n]) for i in range(0, max(0, len(tokens) - n + 1))}
        for phrase in phrases:
            previous = seen.setdefault(phrase, idx)
            if previous != idx:
                repeated.add(phrase)
    return [" ".join(phrase) for phrase in sorted(repeated)]


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
        if len(self.title) < 30:
            raise ValueError(f"title too short ({len(self.title)} < 30 chars): {self.title!r}")
        if len(self.title) > 100:
            raise ValueError(f"title too long ({len(self.title)} > 100 chars): {self.title!r}")
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
        _check_clean_text(self.title, "title", context="pin_title")
        _check_clean_text(self.alt, "alt", context="pin_alt")
        _check_clean_text(self.description, "description", context="pin_description")
        if self.title not in self.prompt:
            raise ValueError(
                f"prompt must contain the title as a literal substring: {self.title!r}"
            )
        visual_prompt = _RENDER_TEXT_RE.sub(" ", self.prompt)
        match = _BANNED_PROMPT_BODY_PART_RE.search(visual_prompt)
        if match:
            raise ValueError(
                "prompt must avoid people, hands, and body parts for image stability: "
                f"{match.group(0)!r}"
            )
        match = _BANNED_PROMPT_FORMAT_RE.search(visual_prompt)
        if match:
            raise ValueError(
                "prompt must be a food or kitchen photograph, not a graphic/diagram: "
                f"{match.group(0)!r}"
            )
        extra_quoted_text = [
            text for text in _QUOTED_TEXT_RE.findall(self.prompt)
            if text != self.title
        ]
        if extra_quoted_text:
            raise ValueError(
                "prompt must not request extra rendered text beyond the exact title: "
                f"{extra_quoted_text[:3]!r}"
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
        repeated_phrases = _repeated_title_phrases(titles)
        if repeated_phrases:
            raise ValueError(
                "pin titles are too similar; repeated long phrase(s): "
                + ", ".join(repeated_phrases[:3])
            )
