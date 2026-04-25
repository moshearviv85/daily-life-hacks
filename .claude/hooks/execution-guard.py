#!/usr/bin/env python3
"""
PreToolUse execution-guard.

Blocks Edit / Write / MultiEdit on source-code paths unless the LAST user
message in the transcript contains either:
  (a) an explicit approval marker (yes / go / אישור / תבצע ...), or
  (b) a task-assignment verb that names the action ("fix the bug",
      "תכתוב סקריפט"...).

If the last user message is a clarifying question or a casual remark,
unauthorized code changes are blocked.

This is the deterministic backstop for the Autonomy section in CLAUDE.md
and the Execution rule in MEMORY.md.

Pure read of transcript. No state file dependency.
Exit 0 = allow.
Exit 2 with stderr = block, give reason.
Fail-open on any error (no transcript / unparseable / unsupported tool).
"""

import json
import pathlib
import re
import sys

CODE_FILE_EXTENSIONS = (
    ".py", ".ts", ".js", ".tsx", ".jsx",
    ".astro", ".svelte", ".vue",
    ".sql", ".yml", ".yaml", ".toml",
    ".sh", ".bash", ".ps1",
)

# Code directories under project root that are guarded.
CODE_DIRS = ("scripts/", "functions/", "src/components/", "src/layouts/",
             "src/pages/", "src/lib/", "src/utils/", "src/api/",
             "tests/", ".github/workflows/")

# Paths that are EXEMPT (handled by other hooks or always-allowed).
EXEMPT_PREFIXES = (
    ".claude/",
    "docs/",
    "memory/",
    "src/data/articles/",       # content-checker handles these
    "src/content/",
    "pipeline-data/",           # data files, not code
)

# Approval markers in the last user message.
APPROVAL_PATTERNS = [
    # English
    r"\b(?:yes|ok|okay|sure|do it|go ahead|go|proceed|approved|"
    r"continue|ship it|commit it|merge it|deploy it|run it|push it)\b",
    # Hebrew
    r"אישור|אישרתי|תבצע|תמשיך|תשלח|תפרסם|תעשה|תרוץ|תריץ|"
    r"צא לדרך|אוקיי|אוקי|בסדר|תקדם|תקדם הלאה|כן\b",
    # Imperatives that authorize as part of giving a task
    r"\b(?:write|create|build|add|fix|update|refactor|rename|implement|"
    r"deploy|push|generate|make|set up|install|configure|delete|move|"
    r"archive|consolidate|merge|migrate|schedule|run|execute|edit|change)\b",
    # Hebrew task verbs (imperative + infinitive)
    r"תכתוב|תיצור|תבנה|תוסיף|תקן|תעדכן|תריץ|תרוץ|תבדוק|ערוך|תערוך|"
    r"תמחק|תעביר|תאחד|תמזג|תזמן|תעצב|תגדיר|תתקין|תפרסם|תייצר|"
    r"לכתוב|ליצור|לבנות|לתקן|לעדכן|להוסיף|לשנות|לבצע|להתקין|להגדיר|"
    r"להריץ|לבדוק|למחוק|להעביר|לאחד|למזג|לתזמן|לעצב|לפרסם|לייצר|"
    r"צור|בנה|כתוב|רוץ|בצע|תקן|הוסף|עדכן|שנה|מחק|העבר",
]

TRANSCRIPT_LOOKBACK = 12_000  # bytes


def is_code_path(file_path: str) -> bool:
    """Return True if the path is a guarded source-code file."""
    if not file_path:
        return False
    norm = file_path.replace("\\", "/")

    # Strip leading ./ or absolute prefix to a project-relative slug
    rel = norm
    for marker in ("/dlh-fresh/", "/Desktop/dlh-fresh/"):
        idx = rel.find(marker)
        if idx >= 0:
            rel = rel[idx + len(marker):]
            break
    rel = rel.lstrip("./")

    for prefix in EXEMPT_PREFIXES:
        if rel.startswith(prefix):
            return False

    if rel.lower().endswith(CODE_FILE_EXTENSIONS):
        return True
    for d in CODE_DIRS:
        if rel.startswith(d):
            return True
    return False


def read_transcript_tail(transcript_path: str) -> str:
    try:
        p = pathlib.Path(transcript_path)
        if not p.exists():
            return ""
        data = p.read_bytes()
        return data[-TRANSCRIPT_LOOKBACK:].decode("utf-8", errors="ignore")
    except OSError:
        return ""


def extract_last_user_text(transcript_tail: str) -> str:
    """Walk transcript JSONL from end, return last user-message text."""
    lines = transcript_tail.splitlines()
    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if obj.get("type") != "user":
            continue
        message = obj.get("message", {})
        content = message.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    parts.append(block.get("text", ""))
            if parts:
                return "\n".join(parts)
    return ""


def is_authorized(user_text: str) -> bool:
    if not user_text:
        return False
    for pat in APPROVAL_PATTERNS:
        if re.search(pat, user_text, re.IGNORECASE):
            return True
    return False


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0  # fail open

    tool_name = payload.get("tool_name", "")
    if tool_name not in ("Write", "Edit", "MultiEdit"):
        return 0

    tool_input = payload.get("tool_input", {}) or {}
    file_path = tool_input.get("file_path", "") or ""
    if not is_code_path(file_path):
        return 0  # not guarded

    transcript_path = payload.get("transcript_path", "")
    tail = read_transcript_tail(transcript_path)
    if not tail:
        return 0  # cannot verify => fail open (don't punish first turn / fresh sessions)

    last_user = extract_last_user_text(tail)
    if not last_user:
        return 0  # likewise

    if is_authorized(last_user):
        return 0

    # Block.
    short_user = (last_user[:160] + "...") if len(last_user) > 160 else last_user
    sys.stderr.write(
        f"execution-guard: blocking {tool_name} on `{file_path}`\n"
    )
    sys.stderr.write(
        "Reason: the last user message contains no authorization marker and no\n"
        "task-assignment verb. Code edits require explicit approval per\n"
        "CLAUDE.md Autonomy and MEMORY.md Execution rule.\n\n"
    )
    sys.stderr.write(f"Last user message (truncated): {short_user!r}\n\n")
    sys.stderr.write(
        "What to do: stop, summarize what you intend to change and why,\n"
        "and ask the user for explicit approval before retrying.\n"
        "Approval markers: yes / go / proceed / אישור / תבצע / תמשיך / כן.\n"
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
