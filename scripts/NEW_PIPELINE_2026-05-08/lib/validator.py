"""Unified deterministic validator for Daily Life Hacks content.

Public API:
    validate(text, *, context="article", slug=None) -> list[Violation]

Contexts:
    "article"          — full structural + content policy checks
    "pin_title"        — content policy only
    "pin_description"  — content policy only
    "pin_alt"          — content policy only
    "hero_alt"         — content policy only

Violation tiers:
    1 = blocker (content policy hard bans, structural errors)
    2 = warning (style issues, count ranges)

Rule IDs:
    CP-01  em-dash character present
    CP-02  supplement mention
    CP-03  medical hard-ban term
    CP-04  medical hedge-required term without hedging
    CP-05  absolute health claim
    CP-06  detox / cleanse language
    CP-07  (tier 2) banned AI filler word
    CP-08  (tier 2) sign-off phrase

    S-01   article does not open with ---
    S-02   frontmatter closing --- missing
    S-03   YAML parse error
    S-04   required field(s) missing
    S-05   category not in allowed set
    S-06   author not "David Miller"
    S-07   faq structure invalid
    S-08   image path does not match slug
    S-09   tags shape invalid
    S-10   recipe required fields missing / invalid
    S-12   FAQ heading found in body
    S-13   Conclusion heading found in body
    S-15   wrapping code fence
    S-20   (tier 2) body word count out of [600, 1200]
    S-21   (tier 2) H2 count out of [3, 8]
    S-25   (tier 2) excerpt length out of [100, 200]
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import yaml

from lib import content_policy as _cp


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

VALID_CONTEXTS = frozenset(
    {"article", "pin_title", "pin_description", "pin_alt", "hero_alt"}
)


@dataclass(frozen=True)
class Violation:
    rule_id: str
    tier: int
    detail: str


# ---------------------------------------------------------------------------
# Compiled regex helpers
# ---------------------------------------------------------------------------

_FAQ_HEADING_RE = re.compile(
    r"^#{1,6}\s*(?:Frequently\s+Asked\s+Questions|FAQs?)\b",
    re.MULTILINE | re.IGNORECASE,
)
_CONCLUSION_HEADING_RE = re.compile(
    r"^#{1,6}\s*Conclusion\b", re.MULTILINE | re.IGNORECASE
)
_H2_RE = re.compile(r"^##\s+\S.*$", re.MULTILINE)


# ---------------------------------------------------------------------------
# Frontmatter parser (shared with article structural checks)
# ---------------------------------------------------------------------------


def _parse_frontmatter(text: str) -> tuple[dict[str, Any] | None, str, str | None]:
    """Return (parsed_dict, body, yaml_error).

    On success: (dict, body_str, None).
    On failure: (None, body_or_full_text, error_message).
    """
    stripped = text.lstrip("﻿")  # strip BOM
    if not stripped.lstrip().startswith("---"):
        return None, text, "missing opening --- fence"

    lines = stripped.splitlines(keepends=True)
    first_idx: int | None = None
    for i, ln in enumerate(lines):
        if ln.strip() == "---":
            first_idx = i
            break
    if first_idx is None:
        return None, text, "missing opening --- fence"

    second_idx: int | None = None
    for j in range(first_idx + 1, len(lines)):
        if lines[j].strip() == "---":
            second_idx = j
            break
    if second_idx is None:
        return None, text, "missing closing --- fence"

    fm_text = "".join(lines[first_idx + 1:second_idx])
    body = "".join(lines[second_idx + 1:])
    try:
        parsed = yaml.safe_load(fm_text)
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        where = f" at line {mark.line + 1}" if mark is not None else ""
        return None, body, f"YAML parse error{where}: {str(exc)[:200]}"
    if not isinstance(parsed, dict):
        return None, body, "frontmatter is not a YAML mapping"
    return parsed, body, None


# ---------------------------------------------------------------------------
# Content policy checks (run on ALL contexts)
# ---------------------------------------------------------------------------


def _check_em_dash(text: str) -> Violation | None:
    """CP-01 tier 1: em-dash character."""
    count = text.count(_cp.EM_DASH)
    if count:
        return Violation("CP-01", 1, f"found {count} em-dash character(s)")
    return None


def _check_supplements(text: str) -> Violation | None:
    """CP-02 tier 1: supplement mention."""
    hits = [p for p in _cp.SUPPLEMENT_PATTERNS if re.search(p, text, re.IGNORECASE)]
    if hits:
        return Violation("CP-02", 1, f"supplement mention(s) matching: {hits[:3]}")
    return None


def _check_medical_hard_ban(text: str) -> Violation | None:
    """CP-03 tier 1: hard-banned medical term (substring match, case-insensitive)."""
    lower = text.lower()
    hits = [t for t in _cp.MEDICAL_TERMS_HARD_BAN if t.lower() in lower]
    if hits:
        return Violation("CP-03", 1, f"hard-banned medical term(s): {hits[:5]}")
    return None


def _check_medical_hedge_required(text: str) -> Violation | None:
    """CP-04 tier 1: hedge-required term in sentence without hedging word."""
    # Split on sentence boundaries (. ! ? followed by whitespace, or newlines).
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
    unhedged: list[str] = []
    hedging_lower = [w.lower() for w in _cp.HEDGING_WORDS]
    for sentence in sentences:
        s_lower = sentence.lower()
        for term in _cp.MEDICAL_TERMS_HEDGE_REQUIRED:
            if term.lower() not in s_lower:
                continue
            # Check whether any hedging word appears in the same sentence.
            if not any(h in s_lower for h in hedging_lower):
                unhedged.append(term)
    if unhedged:
        unique = list(dict.fromkeys(unhedged))  # preserve order, deduplicate
        return Violation("CP-04", 1, f"hedge-required term(s) used without hedging: {unique[:5]}")
    return None


def _check_absolute_health(text: str) -> Violation | None:
    """CP-05 tier 1: absolute health claim."""
    hits = [p for p in _cp.ABSOLUTE_HEALTH_PATTERNS if re.search(p, text, re.IGNORECASE)]
    if hits:
        return Violation("CP-05", 1, f"absolute health claim pattern(s): {hits[:3]}")
    return None


def _check_detox(text: str) -> Violation | None:
    """CP-06 tier 1: detox / cleanse language."""
    hits = [p for p in _cp.DETOX_PATTERNS if re.search(p, text, re.IGNORECASE)]
    if hits:
        return Violation("CP-06", 1, f"detox/cleanse pattern(s): {hits[:3]}")
    return None


def _check_ai_words(text: str) -> Violation | None:
    """CP-07 tier 2: banned AI filler words."""
    hits = []
    for w in _cp.AI_WORDS_BANNED:
        if re.search(r"\b" + re.escape(w) + r"\b", text, re.IGNORECASE):
            hits.append(w)
    if hits:
        return Violation("CP-07", 2, f"banned AI filler word(s): {hits[:5]}")
    return None


def _check_signoffs(text: str) -> Violation | None:
    """CP-08 tier 2: sign-off phrase."""
    for pat in _cp.SIGNOFF_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return Violation("CP-08", 2, f"sign-off phrase matches pattern: {pat}")
    return None


_CONTENT_POLICY_CHECKS = (
    _check_em_dash,
    _check_supplements,
    _check_medical_hard_ban,
    _check_medical_hedge_required,
    _check_absolute_health,
    _check_detox,
    _check_ai_words,
    _check_signoffs,
)


# ---------------------------------------------------------------------------
# Article structural checks (article context only)
# ---------------------------------------------------------------------------


def _s01(parsed, text, body, slug) -> Violation | None:
    stripped = text.lstrip("﻿").lstrip()
    if stripped.startswith("---"):
        return None
    return Violation("S-01", 1, "first non-empty line is not '---' frontmatter fence")


def _s02(parsed, text, body, slug) -> Violation | None:
    stripped = text.lstrip("﻿")
    fences = [i for i, ln in enumerate(stripped.splitlines()) if ln.strip() == "---"]
    if len(fences) < 2:
        return Violation("S-02", 1, "frontmatter does not close with a second '---' fence")
    return None


def _s03(parsed, text, body, yaml_error) -> Violation | None:
    if parsed is None:
        return Violation("S-03", 1, yaml_error or "frontmatter YAML failed to parse")
    return None


def _s04(parsed, text, body, slug) -> Violation | None:
    if parsed is None:
        return None
    missing = [f for f in _cp.REQUIRED_FIELDS if f not in parsed]
    if missing:
        return Violation("S-04", 1, f"missing frontmatter fields: {missing}")
    return None


def _s05(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "category" not in parsed:
        return None
    cat = parsed.get("category")
    if cat not in _cp.ALLOWED_CATEGORIES:
        return Violation("S-05", 1, f"category must be one of {sorted(_cp.ALLOWED_CATEGORIES)}, got {cat!r}")
    return None


def _s06(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "author" not in parsed:
        return None
    if parsed.get("author") != _cp.ALLOWED_AUTHOR:
        return Violation("S-06", 1, f"author must be {_cp.ALLOWED_AUTHOR!r}, got {parsed.get('author')!r}")
    return None


def _s07(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "faq" not in parsed:
        return None
    faq = parsed["faq"]
    if not isinstance(faq, list):
        return Violation("S-07", 1, "faq is not a list")
    if not (4 <= len(faq) <= 5):
        return Violation("S-07", 1, f"faq must have 4-5 items, got {len(faq)}")
    for i, item in enumerate(faq):
        if not isinstance(item, dict):
            return Violation("S-07", 1, f"faq[{i}] is not an object")
        q = item.get("question")
        a = item.get("answer")
        if not isinstance(q, str) or not q.strip():
            return Violation("S-07", 1, f"faq[{i}].question missing or not a non-empty string")
        if not isinstance(a, str) or not a.strip():
            return Violation("S-07", 1, f"faq[{i}].answer missing or not a non-empty string")
    return None


def _s08(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "image" not in parsed or slug is None:
        return None
    expected = f"/images/{slug}-main.jpg"
    actual = parsed.get("image")
    if actual != expected:
        return Violation("S-08", 1, f"image must be {expected!r}, got {actual!r}")
    return None


def _s09(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "tags" not in parsed:
        return None
    tags = parsed["tags"]
    if not isinstance(tags, list):
        return Violation("S-09", 1, "tags is not a list")
    if not (4 <= len(tags) <= 6):
        return Violation("S-09", 1, f"tags must have 4-6 entries, got {len(tags)}")
    for i, t in enumerate(tags):
        if not isinstance(t, str) or not t.strip():
            return Violation("S-09", 1, f"tags[{i}] is not a non-empty string")
    return None


def _s10(parsed, text, body, slug) -> Violation | None:
    if parsed is None:
        return None
    if parsed.get("category") != "recipes":
        return None
    issues = []
    for f in _cp.RECIPE_REQUIRED_FIELDS:
        if f not in parsed:
            issues.append(f"missing {f}")
    ing = parsed.get("ingredients")
    steps = parsed.get("steps")
    if not isinstance(ing, list) or not ing or not all(isinstance(x, str) and x.strip() for x in ing):
        issues.append("ingredients must be non-empty list of strings")
    if not isinstance(steps, list) or not steps or not all(isinstance(x, str) and x.strip() for x in steps):
        issues.append("steps must be non-empty list of strings")
    if "servings" in parsed and not isinstance(parsed["servings"], int):
        issues.append("servings must be int")
    if "calories" in parsed and not isinstance(parsed["calories"], int):
        issues.append("calories must be int")
    if "difficulty" in parsed and parsed.get("difficulty") not in _cp.ALLOWED_DIFFICULTIES:
        issues.append(f"difficulty must be one of {sorted(_cp.ALLOWED_DIFFICULTIES)}")
    for f in ("prepTime", "cookTime", "totalTime"):
        if f in parsed and not isinstance(parsed[f], str):
            issues.append(f"{f} must be string")
    if issues:
        return Violation("S-10", 1, "; ".join(issues))
    return None


def _s12(parsed, text, body, slug) -> Violation | None:
    if _FAQ_HEADING_RE.search(body):
        return Violation("S-12", 1, "body contains FAQ / Frequently Asked Questions heading")
    return None


def _s13(parsed, text, body, slug) -> Violation | None:
    if _CONCLUSION_HEADING_RE.search(body):
        return Violation("S-13", 1, "body contains 'Conclusion' heading")
    return None


def _s15(parsed, text, body, slug) -> Violation | None:
    stripped = text.lstrip("﻿").lstrip()
    if stripped.startswith("```"):
        return Violation("S-15", 1, "file starts with a ``` code fence (frontmatter would be broken)")
    body_stripped = body.strip()
    if body_stripped.startswith("```") or body_stripped.endswith("```"):
        return Violation("S-15", 1, "body starts or ends with a ``` code fence")
    return None


def _s20(parsed, text, body, slug) -> Violation | None:
    wc = len(body.split())
    if 810 <= wc <= 1320:
        return None
    return Violation("S-20", 2, f"body word count {wc} not in [810, 1320]")


def _s21(parsed, text, body, slug) -> Violation | None:
    n = len(_H2_RE.findall(body))
    if 3 <= n <= 8:
        return None
    return Violation("S-21", 2, f"body H2 heading count {n} not in [3, 8]")


def _s25(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "excerpt" not in parsed:
        return None
    exc = parsed.get("excerpt") or ""
    if not isinstance(exc, str):
        return Violation("S-25", 2, "excerpt is not a string")
    n = len(exc)
    if 100 <= n <= 200:
        return None
    return Violation("S-25", 2, f"excerpt length {n} not in [100, 200]")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def validate(text: str, *, context: str = "article", slug: str | None = None) -> list[Violation]:
    """Validate *text* and return a list of Violation objects.

    Parameters
    ----------
    text:
        The content string to validate. For "article" context this should be
        the full markdown with frontmatter. For other contexts, raw text.
    context:
        One of "article", "pin_title", "pin_description", "pin_alt", "hero_alt".
    slug:
        Article slug used for the S-08 image-path check. Only meaningful when
        context="article". If None, S-08 is skipped.

    Returns
    -------
    list[Violation]
        Empty list means the content passes. Tier 1 = blockers, Tier 2 = warnings.
    """
    if context not in VALID_CONTEXTS:
        raise ValueError(f"context must be one of {sorted(VALID_CONTEXTS)}, got {context!r}")

    violations: list[Violation] = []

    # --- Content policy checks (all contexts) ---
    for check in _CONTENT_POLICY_CHECKS:
        v = check(text)
        if v is not None:
            violations.append(v)

    # --- Article structural checks ---
    if context != "article":
        return violations

    parsed, body, yaml_error = _parse_frontmatter(text)

    # S-01, S-02 use text directly
    for check_fn in (_s01, _s02):
        v = check_fn(parsed, text, body, slug)
        if v is not None:
            violations.append(v)

    # S-03 uses yaml_error from the parser
    v = _s03(parsed, text, body, yaml_error)
    if v is not None:
        violations.append(v)

    # Remaining tier-1 structural checks
    for check_fn in (_s04, _s05, _s06, _s07, _s08, _s09, _s10, _s12, _s13, _s15):
        v = check_fn(parsed, text, body, slug)
        if v is not None:
            violations.append(v)

    # Tier-2 structural checks
    for check_fn in (_s20, _s21, _s25):
        v = check_fn(parsed, text, body, slug)
        if v is not None:
            violations.append(v)

    return violations
