#!/usr/bin/env python3
"""
memory-guard.py — PreToolUse hook enforcing memory management rules on MEMORY.md.

Only fires when the Write / Edit / MultiEdit target path ends with MEMORY.md.
Blocks (exit 2) if the resulting file:
  - exceeds MAX_LINES
  - has any line exceeding MAX_LINE_CHARS
  - contains numeric project-state snapshots (stale-by-design counts)
  - contains credential-shaped strings
Otherwise passes through (exit 0).

Rule source of truth: .claude/rules/memory.md
"""

import json
import re
import sys
from pathlib import Path

MAX_LINES = 60
MAX_LINE_CHARS = 200

# Numeric project-state snapshot patterns. Counts of site entities decay in days
# and cause false claims when recalled from memory instead of queried live.
SNAPSHOT_PATTERNS = [
    re.compile(
        r"\b\d+\s*(articles?|pins?|images?|posts?|subscribers?|products?|affiliates?|leads?)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b\d+\s*(כתבות|כתבה|פינים|פין|תמונות|תמונה|מנויים|מנוי|פוסטים|פוסט)\b"
    ),  # Hebrew: articles, pins, images, subscribers, posts
    re.compile(r"\b(POSTED|PENDING|FAILED|DUPLICATE)\s*[:=]\s*\d+\b", re.IGNORECASE),
]

# Credential-shaped strings. Block even if the user claims they're public.
CREDENTIAL_PATTERNS = [
    re.compile(
        r"(?:api[_-]?key|secret|password|token|app[_ ]?secret)\s*[:=]\s*[\"']?[a-zA-Z0-9_\-]{12,}",
        re.IGNORECASE,
    ),
    re.compile(r"\bghp_[a-zA-Z0-9]{30,}\b"),          # GitHub personal tokens
    re.compile(r"\bsk-[a-zA-Z0-9_\-]{20,}\b"),        # OpenAI / Anthropic API keys
    re.compile(r"\b[a-f0-9]{40,}\b"),                  # long hex (SHA-ish secrets)
]


def apply_edit(current: str, old_string: str, new_string: str, replace_all: bool) -> str:
    if replace_all:
        return current.replace(old_string, new_string)
    return current.replace(old_string, new_string, 1)


def apply_multi_edit(current: str, edits: list) -> str:
    result = current
    for edit in edits:
        result = apply_edit(
            result,
            edit.get("old_string", ""),
            edit.get("new_string", ""),
            edit.get("replace_all", False),
        )
    return result


def check_content(content: str) -> list:
    violations = []
    lines = content.splitlines()

    if len(lines) > MAX_LINES:
        violations.append(
            f"line count {len(lines)} exceeds max {MAX_LINES}. MEMORY.md is an index; put content in a sub-file."
        )

    for i, line in enumerate(lines, 1):
        if len(line) > MAX_LINE_CHARS:
            snippet = line[:80] + "..." if len(line) > 80 else line
            violations.append(
                f"line {i} has {len(line)} chars, exceeds max {MAX_LINE_CHARS}: {snippet!r}"
            )

    for pat in SNAPSHOT_PATTERNS:
        for m in pat.finditer(content):
            line_no = content[: m.start()].count("\n") + 1
            violations.append(
                f"line {line_no}: numeric snapshot '{m.group()}' — counts decay. Query SQL live instead."
            )

    for pat in CREDENTIAL_PATTERNS:
        for m in pat.finditer(content):
            line_no = content[: m.start()].count("\n") + 1
            violations.append(
                f"line {line_no}: credential-shaped string blocked. Keep secrets in .env or code, never in memory."
            )

    return violations


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0  # fail open on malformed input

    tool_name = payload.get("tool_name", "")
    if tool_name not in ("Write", "Edit", "MultiEdit"):
        return 0

    tool_input = payload.get("tool_input", {}) or {}
    file_path = tool_input.get("file_path", "") or ""

    normalized = file_path.replace("\\", "/")
    if not normalized.endswith("/MEMORY.md") and not normalized.endswith("MEMORY.md"):
        return 0

    # Guard only the project memory file under the Claude memory directory.
    # Any MEMORY.md under the memory/ directory for this project qualifies.
    if "memory" not in normalized.lower():
        return 0

    path = Path(file_path)

    if tool_name == "Write":
        resulting = tool_input.get("content", "")
    elif tool_name == "Edit":
        if not path.exists():
            return 0
        try:
            current = path.read_text(encoding="utf-8")
        except Exception:
            return 0
        resulting = apply_edit(
            current,
            tool_input.get("old_string", ""),
            tool_input.get("new_string", ""),
            tool_input.get("replace_all", False),
        )
    elif tool_name == "MultiEdit":
        if not path.exists():
            return 0
        try:
            current = path.read_text(encoding="utf-8")
        except Exception:
            return 0
        resulting = apply_multi_edit(current, tool_input.get("edits", []))
    else:
        return 0

    violations = check_content(resulting)
    if not violations:
        return 0

    sys.stderr.write("MEMORY.md edit blocked by memory-guard:\n")
    for v in violations:
        sys.stderr.write(f"  - {v}\n")
    sys.stderr.write("\n")
    sys.stderr.write("Rule source of truth: .claude/rules/memory.md\n")
    sys.stderr.write(
        "Default action is to update an existing sub-file in memory/ instead of adding to MEMORY.md.\n"
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
