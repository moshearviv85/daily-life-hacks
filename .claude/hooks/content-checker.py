#!/usr/bin/env python3
"""
PreToolUse hook. Blocks Edit/Write to article files that violate content rules.

Rules enforced (see .claude/rules/content.md):
  - No em-dash (U+2014)
  - No medical claim words (cure, treat, heal, etc.)
  - No supplement mentions
  - No banned AI words

Scope: only runs on files under src/data/articles/ (guarded by path check).

Exit code 2 with stderr = block. Claude receives stderr as feedback.
Exit 0 = allow.
"""

import json
import re
import sys

ARTICLE_PATH_PATTERN = re.compile(r"src[/\\]data[/\\]articles[/\\]")

EM_DASH = "—"  # —

MEDICAL_CLAIMS = [
    r"\bcures?\b",
    r"\btreats?\b",
    r"\bheals?\b",
    r"\brelieves?\b",
    r"\bprevents? (?:disease|cancer|diabetes|heart)",
    r"\bfights? (?:inflammation|disease|cancer)",
    r"\bcombats?\b",
]

SUPPLEMENT_TERMS = [
    r"\bsupplement",
    r"\bashwagandha\b",
    r"\bcollagen\s*powder",
    r"\bprotein\s*powder",
    r"\bpre-?workout",
    r"\bfat\s*burner",
    r"\bgreens\s*powder",
    r"\bsea\s*moss\b",
    r"\bmaca\b",
    r"\badaptogen",
    r"\bprobiotic\s*capsule",
    r"\bfiber\s*powder",
]

BANNED_AI_WORDS = [
    r"\bFurthermore\b",
    r"\bMoreover\b",
    r"\bIn conclusion\b",
    r"\bDelve into\b",
    r"\bDive into\b",
    r"\bIt's important to note\b",
    r"\bIt's worth noting\b",
    r"\bIn today's world\b",
    r"\bUnlock\b",
    r"\bElevate\b",
    r"\bNavigating\b",
    r"\bGame-changer\b",
    r"\bRevolutionize\b",
    r"\bTake it to the next level\b",
    r"\bMouthwatering\b",
]

DETOX_TERMS = [
    r"\bdetox\b",
    r"\bcleanses?\b(?!\s+the\s+dish)",  # not "cleanses the dish"
    r"\breset your system\b",
    r"\bcolon\s+cleanse",
]

BANNED_ENDINGS = [
    r"Happy eating!",
    r"Give it a try!",
    r"You won't regret it!",
    r"will thank you!",
    r"^\s*Enjoy!\s*$",
]


def detect_violations(text: str) -> list[str]:
    """Return list of violation descriptions. Empty list = clean."""
    violations = []

    if EM_DASH in text:
        violations.append(
            f"Em-dash character found (U+2014). Remove it or rewrite the sentence."
        )

    for pattern in MEDICAL_CLAIMS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            violations.append(
                f"Medical claim word: '{m.group(0)}'. Use hedges like 'may support', 'could help'."
            )

    for pattern in SUPPLEMENT_TERMS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            violations.append(
                f"Supplement mention: '{m.group(0)}'. Food-first content only. Reject or rewrite."
            )

    for pattern in BANNED_AI_WORDS:
        m = re.search(pattern, text)
        if m:
            violations.append(
                f"Banned AI word: '{m.group(0)}'. See .claude/rules/content.md for alternatives."
            )

    for pattern in DETOX_TERMS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            violations.append(
                f"Detox/cleanse language: '{m.group(0)}'. Use 'refresh', 'feel refreshed'."
            )

    for pattern in BANNED_ENDINGS:
        m = re.search(pattern, text, re.MULTILINE)
        if m:
            violations.append(
                f"Banned sign-off ending: '{m.group(0)}'. End naturally without a sign-off."
            )

    return violations


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        # Malformed input, let the tool proceed (don't block on our bug)
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    file_path = tool_input.get("file_path", "")

    # Only enforce on article files
    if not ARTICLE_PATH_PATTERN.search(file_path):
        sys.exit(0)

    # Extract the text being written
    if tool_name == "Write":
        new_text = tool_input.get("content", "")
    elif tool_name == "Edit":
        new_text = tool_input.get("new_string", "")
    else:
        sys.exit(0)

    violations = detect_violations(new_text)

    if violations:
        msg_lines = [
            f"BLOCKED by content-checker: {len(violations)} rule violation(s) in {file_path}",
            "",
        ]
        for v in violations:
            msg_lines.append(f"  - {v}")
        msg_lines.append("")
        msg_lines.append("Fix the text and retry. See .claude/rules/content.md for full rules.")
        print("\n".join(msg_lines), file=sys.stderr)
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
