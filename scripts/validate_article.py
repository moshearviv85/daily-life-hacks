"""Deterministic validator for Daily Life Hacks production articles.

Source of truth for rules: scripts/article_spec.md.
Tests: scripts/test_validate_article.py.

Usage from Python:
    from validate_article import validate, Violation
    violations = validate(markdown_text, slug="easy-foo-bar")
    tier1 = [v for v in violations if v.tier == 1]

Usage from the command line:
    python scripts/validate_article.py src/data/articles/foo-bar.md
    (exits non-zero if any Tier 1 violation is found)

Rule IDs match the spec: S-01 through S-25.
Each check is a small pure function that takes (parsed, text, slug) and returns
either None (passes) or a Violation(rule_id=..., tier=..., detail=...).
The "parsed" argument is the result of parse_frontmatter; if parsing failed,
parsed is None and the frontmatter-dependent checks short-circuit to None
(the YAML failure itself is already reported by S-03).
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import yaml


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Violation:
    rule_id: str
    tier: int
    detail: str


REQUIRED_FIELDS = (
    "title", "excerpt", "category", "tags",
    "image", "date", "author", "faq",
)

ALLOWED_CATEGORIES = {"nutrition", "recipes", "tips"}
ALLOWED_DIFFICULTIES = {"Easy", "Medium", "Hard"}
ALLOWED_AUTHOR = "David Miller"

RECIPE_REQUIRED_FIELDS = (
    "ingredients", "steps", "servings", "calories", "difficulty",
    "prepTime", "cookTime", "totalTime",
)

EM_DASH = "—"

SUPPLEMENT_PATTERNS = [
    r"\bprotein\s+powder\b",
    r"\bcollagen\s+(?:powder|peptide)s?",
    r"\bgreens\s+powder\b",
    r"\bfiber\s+powder\b",
    r"\bashwagandha\b",
    r"\bsea\s+moss\b",
    r"\bprobiotic\s+capsules?",
    r"\bmultivitamins?\b",
    r"\bpre-?workout\b",
    r"\bfat\s+burners?\b",
    r"\bherbal\s+extracts?\b",
    r"\badaptogens?\b",
]

BANNED_AI_WORDS = [
    "Furthermore", "Moreover", "In conclusion",
    "Delve into", "Dive into",
    "It's important to note", "It is important to note",
    "It's worth noting", "It is worth noting",
    "In today's world",
    "Unlock", "Elevate", "Navigating",
    "Game-changer", "Game changer",
    "Revolutionize", "Take it to the next level",
    "Mouthwatering",
]

ABSOLUTE_HEALTH_PATTERNS = [
    r"\bcures?\b",
    r"\bheals?\b",
    r"\btreats?\b(?!\s+(?:like|your|yourself))",
    r"\bprevents?\s+(?:cancer|disease|diabetes|illness)\b",
    r"\bfights?\s+(?:cancer|disease|infection)\b",
]

SIGNOFF_PATTERNS = [
    r"\bhappy\s+eating\s*[!.]?",
    r"\benjoy\s*!",
    r"\bbon\s+appetit\s*[!.]?",
    r"\byour\s+(?:gut|body|taste\s+buds|stomach)\s+will\s+thank\s+you",
    r"\byou\s+won'?t\s+regret\s+it",
    r"\bgive\s+it\s+a\s+try\s*!",
    r"\bdig\s+in\s*!",
]

FAQ_HEADING_RE = re.compile(
    r"^#{1,6}\s*(?:Frequently\s+Asked\s+Questions|FAQs?)\b",
    re.MULTILINE | re.IGNORECASE,
)
CONCLUSION_HEADING_RE = re.compile(
    r"^#{1,6}\s*Conclusion\b", re.MULTILINE | re.IGNORECASE,
)
H2_RE = re.compile(r"^##\s+\S.*$", re.MULTILINE)
CODE_FENCE_RE = re.compile(r"^\s*```", re.MULTILINE)


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------


def parse_frontmatter(text: str) -> tuple[dict[str, Any] | None, str, str | None]:
    """Return (parsed_dict, body, yaml_error).

    On happy path returns (dict, body_str, None). On YAML failure returns
    (None, body_str, "human error message"). Callers can use the body even
    when parsing fails, so regex checks still work.
    """
    stripped = text.lstrip("﻿")  # strip BOM if any
    if not stripped.lstrip().startswith("---"):
        return None, text, "missing opening --- fence"
    # First fence must be on line 1 (after any leading whitespace-only lines
    # which we already stripped).
    lines = stripped.splitlines(keepends=True)
    # find index of first line that's exactly "---"
    first_idx = None
    for i, ln in enumerate(lines):
        if ln.strip() == "---":
            first_idx = i
            break
    if first_idx is None:
        return None, text, "missing opening --- fence"
    # find the closing --- after first_idx
    second_idx = None
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
# Tier 1 checks
# ---------------------------------------------------------------------------


def s01_opens_with_fence(parsed, text, body, slug) -> Violation | None:
    stripped = text.lstrip("﻿").lstrip()
    if stripped.startswith("---"):
        return None
    return Violation("S-01", 1, "first non-empty line is not '---' frontmatter fence")


def s02_frontmatter_closes(parsed, text, body, slug) -> Violation | None:
    # parse_frontmatter already returns body=="" or the whole text when close missing;
    # re-check explicitly: if the markdown lacks a second "---" line, fail.
    stripped = text.lstrip("﻿")
    fences = [i for i, ln in enumerate(stripped.splitlines()) if ln.strip() == "---"]
    if len(fences) < 2:
        return Violation("S-02", 1, "frontmatter does not close with a second '---' fence")
    return None


def s03_yaml_valid(parsed, text, body, slug) -> Violation | None:
    if parsed is None:
        # parse_frontmatter attached an error string via a sentinel stored on the
        # caller's side; we don't have it here. Report generic message.
        # The caller (validate) passes yaml_error via closure, see below.
        return Violation("S-03", 1, "frontmatter YAML failed to parse")
    return None


def s04_required_fields(parsed, text, body, slug) -> Violation | None:
    if parsed is None:
        return None
    missing = [f for f in REQUIRED_FIELDS if f not in parsed]
    if missing:
        return Violation("S-04", 1, f"missing frontmatter fields: {missing}")
    return None


def s05_category_valid(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "category" not in parsed:
        return None
    cat = parsed.get("category")
    if cat not in ALLOWED_CATEGORIES:
        return Violation("S-05", 1, f"category must be one of {sorted(ALLOWED_CATEGORIES)}, got {cat!r}")
    return None


def s06_author_correct(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "author" not in parsed:
        return None
    if parsed.get("author") != ALLOWED_AUTHOR:
        return Violation("S-06", 1, f"author must be {ALLOWED_AUTHOR!r}, got {parsed.get('author')!r}")
    return None


def s07_faq_structure(parsed, text, body, slug) -> Violation | None:
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


def s08_image_matches_slug(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "image" not in parsed:
        return None
    expected = f"/images/{slug}-main.jpg"
    actual = parsed.get("image")
    if actual != expected:
        return Violation("S-08", 1, f"image must be {expected!r}, got {actual!r}")
    return None


def s09_tags_shape(parsed, text, body, slug) -> Violation | None:
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


def s10_recipe_fields(parsed, text, body, slug) -> Violation | None:
    if parsed is None:
        return None
    if parsed.get("category") != "recipes":
        return None
    issues = []
    for f in RECIPE_REQUIRED_FIELDS:
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
    if parsed.get("difficulty") not in ALLOWED_DIFFICULTIES and "difficulty" in parsed:
        issues.append(f"difficulty must be one of {sorted(ALLOWED_DIFFICULTIES)}")
    for f in ("prepTime", "cookTime", "totalTime"):
        if f in parsed and not isinstance(parsed[f], str):
            issues.append(f"{f} must be string")
    if issues:
        return Violation("S-10", 1, "; ".join(issues))
    return None


def s11_no_em_dash(parsed, text, body, slug) -> Violation | None:
    if EM_DASH in text:
        count = text.count(EM_DASH)
        return Violation("S-11", 1, f"found {count} em-dash character(s)")
    return None


def s12_no_body_faq_heading(parsed, text, body, slug) -> Violation | None:
    if FAQ_HEADING_RE.search(body):
        return Violation("S-12", 1, "body contains '## Frequently Asked Questions' or '## FAQ' heading")
    return None


def s13_no_conclusion_heading(parsed, text, body, slug) -> Violation | None:
    if CONCLUSION_HEADING_RE.search(body):
        return Violation("S-13", 1, "body contains 'Conclusion' heading")
    return None


def s14_no_supplements(parsed, text, body, slug) -> Violation | None:
    hits = []
    for pat in SUPPLEMENT_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            hits.append(pat)
    if hits:
        return Violation("S-14", 1, f"supplement mention(s): {hits[:3]}")
    return None


def s15_no_wrapping_code_fence(parsed, text, body, slug) -> Violation | None:
    stripped = text.lstrip("﻿").lstrip()
    if stripped.startswith("```"):
        return Violation("S-15", 1, "file starts with a ``` code fence (frontmatter would be broken)")
    # body should not start or end with a triple-backtick fence
    body_stripped = body.strip()
    if body_stripped.startswith("```") or body_stripped.endswith("```"):
        return Violation("S-15", 1, "body starts or ends with a ``` code fence")
    return None


TIER1_CHECKS: list[Callable[..., Violation | None]] = [
    s01_opens_with_fence,
    s02_frontmatter_closes,
    s03_yaml_valid,
    s04_required_fields,
    s05_category_valid,
    s06_author_correct,
    s07_faq_structure,
    s08_image_matches_slug,
    s09_tags_shape,
    s10_recipe_fields,
    s11_no_em_dash,
    s12_no_body_faq_heading,
    s13_no_conclusion_heading,
    s14_no_supplements,
    s15_no_wrapping_code_fence,
]


# ---------------------------------------------------------------------------
# Tier 2 checks
# ---------------------------------------------------------------------------


def s20_body_word_count(parsed, text, body, slug) -> Violation | None:
    wc = len(body.split())
    if 600 <= wc <= 1200:
        return None
    return Violation("S-20", 2, f"body word count {wc} not in [600, 1200]")


def s21_h2_count(parsed, text, body, slug) -> Violation | None:
    n = len(H2_RE.findall(body))
    if 3 <= n <= 8:
        return None
    return Violation("S-21", 2, f"body H2 heading count {n} not in [3, 8]")


def s22_no_ai_filler(parsed, text, body, slug) -> Violation | None:
    hits = []
    for w in BANNED_AI_WORDS:
        pat = r"\b" + re.escape(w) + r"\b"
        if re.search(pat, body, re.IGNORECASE):
            hits.append(w)
    if hits:
        return Violation("S-22", 2, f"banned AI filler words in body: {hits[:5]}")
    return None


def s23_no_unhedged_health_claims(parsed, text, body, slug) -> Violation | None:
    hits = []
    for pat in ABSOLUTE_HEALTH_PATTERNS:
        if re.search(pat, body, re.IGNORECASE):
            hits.append(pat)
    if hits:
        return Violation("S-23", 2, f"unhedged health claim pattern(s): {hits[:3]}")
    return None


def s24_no_signoff(parsed, text, body, slug) -> Violation | None:
    for pat in SIGNOFF_PATTERNS:
        if re.search(pat, body, re.IGNORECASE):
            return Violation("S-24", 2, f"sign-off phrase matches: {pat}")
    return None


def s25_excerpt_length(parsed, text, body, slug) -> Violation | None:
    if parsed is None or "excerpt" not in parsed:
        return None
    exc = parsed.get("excerpt") or ""
    if not isinstance(exc, str):
        return Violation("S-25", 2, "excerpt is not a string")
    n = len(exc)
    if 100 <= n <= 200:
        return None
    return Violation("S-25", 2, f"excerpt length {n} not in [100, 200]")


TIER2_CHECKS: list[Callable[..., Violation | None]] = [
    s20_body_word_count,
    s21_h2_count,
    s22_no_ai_filler,
    s23_no_unhedged_health_claims,
    s24_no_signoff,
    s25_excerpt_length,
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def validate(markdown: str, slug: str) -> list[Violation]:
    """Return all Tier 1 + Tier 2 violations. Empty list = article passes."""
    parsed, body, yaml_error = parse_frontmatter(markdown)

    violations: list[Violation] = []

    for check in TIER1_CHECKS:
        if check is s03_yaml_valid:
            if parsed is None:
                violations.append(Violation("S-03", 1, yaml_error or "frontmatter YAML failed to parse"))
            continue
        v = check(parsed, markdown, body, slug)
        if v is not None:
            violations.append(v)

    for check in TIER2_CHECKS:
        v = check(parsed, markdown, body, slug)
        if v is not None:
            violations.append(v)

    return violations


def summarize(violations: list[Violation]) -> str:
    if not violations:
        return "PASS"
    lines = []
    t1 = [v for v in violations if v.tier == 1]
    t2 = [v for v in violations if v.tier == 2]
    if t1:
        lines.append(f"Tier 1 failures ({len(t1)}):")
        for v in t1:
            lines.append(f"  {v.rule_id}: {v.detail}")
    if t2:
        lines.append(f"Tier 2 warnings ({len(t2)}):")
        for v in t2:
            lines.append(f"  {v.rule_id}: {v.detail}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Validate a Daily Life Hacks article.")
    p.add_argument("path", type=Path, help="Path to the article .md file")
    p.add_argument("--slug", type=str, default=None,
                   help="Slug to check image path against (default: filename without .md)")
    args = p.parse_args(argv)

    text = args.path.read_text(encoding="utf-8")
    slug = args.slug or args.path.stem
    violations = validate(text, slug)
    print(summarize(violations))
    return 1 if any(v.tier == 1 for v in violations) else 0


if __name__ == "__main__":
    raise SystemExit(main())
