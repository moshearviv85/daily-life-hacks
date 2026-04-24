#!/usr/bin/env python3
"""
PostToolUse hook. Writes tool-call history to .claude/state.json.

This gives the Stop hook (completion-evidence-gate) a record of what
actually happened during the session, so it can verify completion
claims against real evidence.

The state file is written by THIS HOOK, not by Claude. Claude cannot
fake it.

No blocking. Pure logging.
"""

import json
import pathlib
import subprocess
import sys
from datetime import datetime, timezone

STATE_PATH = pathlib.Path(".claude/state.json")
MAX_HISTORY = 30  # keep last 30 tool calls

# Tools that count as "evidence of action"
EVIDENCE_TOOLS = {"Edit", "Write", "Bash", "NotebookEdit"}
# Tools that count as "verification" (Claude looked at something)
VERIFICATION_TOOLS = {"Read", "Grep", "Glob"}


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {"tool_calls": [], "session_start": datetime.now(timezone.utc).isoformat()}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"tool_calls": [], "session_start": datetime.now(timezone.utc).isoformat()}


def git_status_short() -> str:
    """Snapshot of git status (first 20 lines)."""
    try:
        result = subprocess.run(
            ["git", "status", "--short"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        lines = result.stdout.splitlines()[:20]
        return "\n".join(lines)
    except (subprocess.SubprocessError, FileNotFoundError, subprocess.TimeoutExpired):
        return ""


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get("tool_name", "unknown")
    tool_input = data.get("tool_input", {})

    state = load_state()

    entry = {
        "time": datetime.now(timezone.utc).isoformat(),
        "tool": tool_name,
        "category": (
            "evidence" if tool_name in EVIDENCE_TOOLS
            else "verification" if tool_name in VERIFICATION_TOOLS
            else "other"
        ),
    }

    # Capture tool-specific context (small, not full content)
    if tool_name in ("Edit", "Write"):
        entry["file_path"] = tool_input.get("file_path", "")
    elif tool_name == "Bash":
        cmd = tool_input.get("command", "")
        entry["command"] = cmd[:200]  # truncate
    elif tool_name == "Read":
        entry["file_path"] = tool_input.get("file_path", "")
    elif tool_name in ("Grep", "Glob"):
        entry["pattern"] = tool_input.get("pattern", "")[:100]

    state.setdefault("tool_calls", []).append(entry)
    state["tool_calls"] = state["tool_calls"][-MAX_HISTORY:]

    # Snapshot git status after this action
    state["git_status_after_last_tool"] = git_status_short()
    state["last_updated"] = datetime.now(timezone.utc).isoformat()

    # Aggregate counters (useful for the Stop hook)
    state["counters"] = {
        "total_tool_calls": len(state["tool_calls"]),
        "evidence_calls": sum(1 for c in state["tool_calls"] if c["category"] == "evidence"),
        "verification_calls": sum(1 for c in state["tool_calls"] if c["category"] == "verification"),
    }

    try:
        STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except OSError:
        pass  # state write failure should not block Claude

    sys.exit(0)


if __name__ == "__main__":
    main()
