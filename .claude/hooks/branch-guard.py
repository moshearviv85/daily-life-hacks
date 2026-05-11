#!/usr/bin/env python3
"""
PreToolUse hook. Blocks Edit/Write/MultiEdit on the main branch.

Forces branch-based workflow: all code changes must happen on a feature
branch, then merge to main after testing. This prevents accidental
direct-to-production edits since main auto-deploys via Cloudflare Pages.

Allowed on main: .claude/ config, CLAUDE.md, CHANGELOG.md, MEMORY.md
(tooling meta-files that don't affect the live site).

Exit code 2 with stderr = block.
Exit 0 = allow.
Fail-open on any error.
"""

import json
import subprocess
import sys

ALLOWED_ON_MAIN = (
    ".claude/",
    "CLAUDE.md",
    "CHANGELOG.md",
    "MEMORY.md",
    "INSTRUCTIONS-",
)


def get_current_branch() -> str:
    try:
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def is_allowed_path(file_path: str) -> bool:
    norm = file_path.replace("\\", "/")
    for marker in ("/dlh-fresh/", "/Desktop/dlh-fresh/"):
        idx = norm.find(marker)
        if idx >= 0:
            norm = norm[idx + len(marker) :]
            break
    if norm.startswith("./"):
        norm = norm[2:]

    for allowed in ALLOWED_ON_MAIN:
        if norm.startswith(allowed):
            return True
    return False


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    if tool_name not in ("Edit", "Write", "MultiEdit"):
        sys.exit(0)

    tool_input = data.get("tool_input", {}) or {}
    file_path = tool_input.get("file_path", "") or ""

    if is_allowed_path(file_path):
        sys.exit(0)

    branch = get_current_branch()
    if not branch:
        sys.exit(0)

    if branch in ("main", "master"):
        print(
            f"BLOCKED by branch-guard: cannot edit '{file_path}' on '{branch}'.\n"
            f"\n"
            f"All code changes must happen on a feature branch.\n"
            f"Create one first:\n"
            f"  git checkout -b feat/your-task-name\n"
            f"\n"
            f"Then retry. When done, merge to main for deploy.",
            file=sys.stderr,
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
