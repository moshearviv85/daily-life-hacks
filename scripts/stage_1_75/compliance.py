"""Layer A: deterministic compliance checks.

Scores 0-40. Certain violations are 'hard bans' that disqualify the article
outright (compliance_score = 0 and disqualified = True) because the project's
content rules explicitly forbid them.

Hard bans (disqualify):
  - any em dash character (U+2014)
  - any emoji
  - mention of a banned supplement
  - a "## Conclusion" heading
  - frontmatter wrapped in ```yaml code fence (broken Astro parse)

Soft penalties (scaled):
  - banned AI words
  - medical claims without hedging
  - detox/cleanse language
  - word-count deviation from target
  - missing frontmatter fields or FAQ section
  - sign-off phrases at the closing
  - author field not 'David Miller'
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, asdict
from typing import Any

# --- Hard bans ---

EM_DASH = "—"

EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF]"
)

SUPPLEMENT_PATTERNS = [
    r"\bprotein\s+powder\b",
    r"\bcollagen\s+(?:powder|peptide)",
    r"\bgreens\s+powder\b",
    r"\bfiber\s+powder\b",
    r"\bashwagandha\b",
    r"\bsea\s+moss\b",
    r"\bprobiotic\s+capsule",
    r"\bmultivitamin\b",
    r"\bpre-?workout\b",
    r"\bfat\s+burner",
    r"\bherbal\s+extract",
    r"\badaptogen",
]

CONCLUSION_HEADING_RE = re.compile(r"^#{1,6}\s+Conclusion\b", re.MULTILINE | re.IGNORECASE)

CODEFENCE_START_RE = re.compile(r"^\s*```")

# --- Soft penalties ---

BANNED_AI_WORDS = [
    "Furthermore", "Moreover", "In conclusion", "Delve into", "Dive into",
    "It's important to note", "It is important to note",
    "It's worth noting", "It is worth noting",
    "In today's world", "Unlock", "Elevate", "Navigating",
    "Game-changer", "Game changer", "Revolutionize",
    "Take it to the next level", "Mouthwatering",
]

MEDICAL_CLAIM_PATTERNS = [
    # Absolute claims without hedging.
    r"\bcures?\b", r"\btreats?\b(?!\s+like|\s+your)", r"\bheals?\b",
    r"\bprevents?\s+(?:cancer|disease|diabetes|illness)",
    r"\bfights?\s+(?:cancer|disease|infection)",
    r"\bcombats?\s+(?:cancer|disease)",
]

DETOX_PATTERNS = [
    r"\bdetox(?:es|ing|ify)?\b",
    r"\bcleanse(?:s|d)?\b",
    r"\breset\s+your\s+(?:body|system|gut)",
    r"\bflush\s+(?:toxins|your\s+system)",
]

SIGNOFF_PATTERNS = [
    r"happy\s+eating\s*[!.]",
    r"enjoy\s*[!]",
    r"bon\s+appetit\s*[!.]",
    r"your\s+(?:gut|body|taste\s+buds|stomach)\s+will\s+thank\s+you",
    r"you\s+won'?t\s+regret\s+it\s*[!.]",
    r"give\s+it\s+a\s+try\s*[!.]",
    r"dig\s+in\s*[!.]",
]

TARGET_WORDS = 3500
WORD_COUNT_TOLERANCE = 0.25  # +/-25% = full credit

REQUIRED_FRONTMATTER_FIELDS = (
    "title", "excerpt", "category", "tags", "image", "date", "author",
)


@dataclass
class ComplianceDetails:
    word_count: int
    em_dash_count: int
    emoji_count: int
    supplement_hits: list[str]
    banned_ai_hits: list[str]
    medical_claim_hits: list[str]
    detox_hits: list[str]
    sign_off_hits: list[str]
    has_conclusion_heading: bool
    starts_with_codefence: bool
    starts_with_frontmatter: bool
    missing_frontmatter_fields: list[str]
    has_faq_section: bool
    author_correct: bool
    word_count_deviation_pct: float  # 0.0 = on target; 1.0 = 100% off


def _extract_frontmatter(text: str) -> str:
    """Return the YAML frontmatter block (between the first two --- fences) or empty."""
    lines = text.splitlines()
    if not lines or not lines[0].strip() == "---":
        return ""
    out = []
    for ln in lines[1:]:
        if ln.strip() == "---":
            return "\n".join(out)
        out.append(ln)
    return ""


def check(markdown: str) -> tuple[float, bool, str, ComplianceDetails]:
    """Evaluate one article. Returns (score_0_40, disqualified, reason, details)."""
    if not markdown:
        empty = ComplianceDetails(
            word_count=0, em_dash_count=0, emoji_count=0,
            supplement_hits=[], banned_ai_hits=[], medical_claim_hits=[],
            detox_hits=[], sign_off_hits=[], has_conclusion_heading=False,
            starts_with_codefence=False, starts_with_frontmatter=False,
            missing_frontmatter_fields=list(REQUIRED_FRONTMATTER_FIELDS),
            has_faq_section=False, author_correct=False,
            word_count_deviation_pct=1.0,
        )
        return 0.0, True, "empty markdown", empty

    word_count = len(markdown.split())
    em_dash_count = markdown.count(EM_DASH)
    emoji_count = len(EMOJI_RE.findall(markdown))
    supplement_hits = [p for p in SUPPLEMENT_PATTERNS if re.search(p, markdown, re.I)]
    banned_ai_hits = [w for w in BANNED_AI_WORDS if re.search(rf"\b{re.escape(w)}\b", markdown, re.I)]
    medical_claim_hits = [p for p in MEDICAL_CLAIM_PATTERNS if re.search(p, markdown, re.I)]
    detox_hits = [p for p in DETOX_PATTERNS if re.search(p, markdown, re.I)]
    sign_off_hits = [p for p in SIGNOFF_PATTERNS if re.search(p, markdown, re.I)]
    has_conclusion_heading = bool(CONCLUSION_HEADING_RE.search(markdown))

    starts_with_codefence = bool(CODEFENCE_START_RE.match(markdown))
    starts_with_frontmatter = markdown.lstrip().startswith("---")

    frontmatter = _extract_frontmatter(markdown)
    missing_fields: list[str] = []
    for fld in REQUIRED_FRONTMATTER_FIELDS:
        if not re.search(rf"^\s*{fld}\s*:", frontmatter, re.MULTILINE):
            missing_fields.append(fld)

    has_faq_section = bool(
        re.search(r"^#{1,6}\s*(?:Frequently\s+Asked\s+Questions|FAQ)\b", markdown, re.MULTILINE | re.IGNORECASE)
        or ("faq:" in frontmatter.lower())
    )
    author_correct = bool(re.search(r'^\s*author\s*:\s*"?David Miller"?\s*$', frontmatter, re.MULTILINE))

    deviation = abs(word_count - TARGET_WORDS) / TARGET_WORDS

    details = ComplianceDetails(
        word_count=word_count,
        em_dash_count=em_dash_count,
        emoji_count=emoji_count,
        supplement_hits=supplement_hits,
        banned_ai_hits=banned_ai_hits,
        medical_claim_hits=medical_claim_hits,
        detox_hits=detox_hits,
        sign_off_hits=sign_off_hits,
        has_conclusion_heading=has_conclusion_heading,
        starts_with_codefence=starts_with_codefence,
        starts_with_frontmatter=starts_with_frontmatter,
        missing_frontmatter_fields=missing_fields,
        has_faq_section=has_faq_section,
        author_correct=author_correct,
        word_count_deviation_pct=round(deviation, 3),
    )

    # Hard bans
    hard_ban_reasons: list[str] = []
    if em_dash_count > 0:
        hard_ban_reasons.append(f"{em_dash_count} em dash(es)")
    if emoji_count > 0:
        hard_ban_reasons.append(f"{emoji_count} emoji(s)")
    if supplement_hits:
        hard_ban_reasons.append(f"supplements: {supplement_hits[:3]}")
    if has_conclusion_heading:
        hard_ban_reasons.append("Conclusion heading present")
    if starts_with_codefence:
        hard_ban_reasons.append("frontmatter wrapped in ```code fence")
    if not starts_with_frontmatter:
        hard_ban_reasons.append("missing frontmatter fences")

    if hard_ban_reasons:
        return 0.0, True, "; ".join(hard_ban_reasons), details

    # Soft scoring out of 40.
    score = 40.0
    score -= 2 * len(banned_ai_hits)
    score -= 4 * len(medical_claim_hits)
    score -= 4 * len(detox_hits)
    score -= 3 * len(sign_off_hits)
    score -= 2 * len(missing_fields)
    if not has_faq_section:
        score -= 4
    if not author_correct:
        score -= 2
    # Word-count deviation: 0 at <= tolerance, linear penalty up to -10 at 2x tolerance.
    if deviation > WORD_COUNT_TOLERANCE:
        excess = min(deviation - WORD_COUNT_TOLERANCE, WORD_COUNT_TOLERANCE)
        score -= (excess / WORD_COUNT_TOLERANCE) * 10.0

    score = max(0.0, round(score, 2))
    return score, False, "", details


def details_to_json(d: ComplianceDetails) -> str:
    return json.dumps(asdict(d), ensure_ascii=False)
