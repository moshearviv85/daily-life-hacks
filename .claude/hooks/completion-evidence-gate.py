#!/usr/bin/env python3
"""
Stop hook. When Claude tries to end a response, verify that any
completion claim in the last assistant message is backed by
evidence (recent tool calls + git state).

This is a "completion-evidence-gate", not a lie detector. It only
blocks the stop when:
  1. The last assistant message contains a claim of EXECUTED action
     (not a plan, not an intent).
  2. AND the recent tool history + git state do not corroborate.

It uses lexical detection for the claim (fast, cheap) and consults
.claude/state.json (written by post-tool-state.py) for evidence.

Exit 0 = allow Claude to stop.
Exit 2 with stderr = block, Claude must continue with the given reason.
"""

import json
import pathlib
import re
import subprocess
import sys

STATE_PATH = pathlib.Path(".claude/state.json")
TRANSCRIPT_LOOKBACK = 8000  # bytes of recent transcript to inspect

# Verbs that, when used in simple past tense by the assistant, indicate
# a claim of completed action. The actor is "I" / "I've" / "I have" / "just".
COMPLETION_VERBS = (
    r"created|built|wrote|written|added|deleted|removed|committed|pushed|"
    r"published|deployed|posted|fixed|updated|modified|implemented|migrated|"
    r"installed|configured|made|ran|executed|saved|uploaded|downloaded|"
    r"finished|launched|merged|reverted|stashed|tagged|branched|renamed|"
    r"refactored|replaced|generated|produced|shipped|resolved|patched"
)

COMPLETION_PATTERNS = [
    # "I fixed X", "I've created Y", "I have deployed Z", "just committed"
    rf"\bI (?:{COMPLETION_VERBS})\b",
    rf"\bI've (?:{COMPLETION_VERBS})\b",
    rf"\bI have (?:{COMPLETION_VERBS})\b",
    rf"\b(?:just|already) (?:{COMPLETION_VERBS})\b",
    rf"\bsuccessfully (?:{COMPLETION_VERBS})\b",

    # Bare status words
    r"\bdone\b(?!\s+(?:is|yet|by|with|that|so|deal))",
    r"\bcompleted\b",
    r"\ball (?:set|done|ready)\b",

    # Hebrew completion claims
    r"בוצע",
    r"הושלם",
    r"עשיתי",
    r"יצרתי",
    r"כתבתי",
    r"מחקתי",
    r"שיניתי",
    r"הוספתי",
    r"סיימתי",
    r"תיקנתי",
    r"פרסמתי",
]

# Hedged intent — if one of these appears in the SAME sentence as the
# completion pattern, treat as intent and do not flag.
HEDGE_PATTERNS = [
    r"\bI (?:will|plan to|intend to|want to|would|could|should|might|am going to|'m going to)\b",
    r"\bLet me\b",
    r"\bI'd (?:like|prefer)\b",
    r"אנסה|אוכל ל|אני מציע|אני רוצה|אני הולך ל|אתחיל",
]


def read_transcript_tail(transcript_path: str) -> str:
    """Read the tail of the transcript to find the last assistant message."""
    try:
        p = pathlib.Path(transcript_path)
        if not p.exists():
            return ""
        data = p.read_bytes()
        return data[-TRANSCRIPT_LOOKBACK:].decode("utf-8", errors="ignore")
    except OSError:
        return ""


def extract_last_assistant_text(transcript_tail: str) -> str:
    """
    Transcript is JSONL. Walk from end, find last assistant text message.
    Returns concatenated text content.
    """
    lines = transcript_tail.splitlines()
    collected = []
    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        # Find assistant messages with content blocks
        msg_type = obj.get("type")
        if msg_type != "assistant":
            continue
        message = obj.get("message", {})
        content = message.get("content", [])
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                collected.append(block.get("text", ""))
        if collected:
            break
    return "\n".join(collected)


def has_completion_claim(text: str) -> str | None:
    """
    Return matched claim string, or None if no claim.

    Logic: split into sentences. For each sentence, check if it contains
    a completion pattern. If yes, also check if the same sentence contains
    a hedge pattern — if so, skip (it's an intent, not a completion).
    """
    # Split on sentence terminators. Keep Hebrew full stop (U+05C3) too.
    sentences = re.split(r"(?<=[.!?׃])\s+|\n+", text)

    for sentence in sentences:
        if not sentence.strip():
            continue

        # Check if this sentence is a hedge (intent)
        is_hedge = any(
            re.search(p, sentence, re.IGNORECASE) for p in HEDGE_PATTERNS
        )
        if is_hedge:
            continue

        for pattern in COMPLETION_PATTERNS:
            m = re.search(pattern, sentence, re.IGNORECASE)
            if m:
                return m.group(0)

    return None


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def git_has_changes() -> bool:
    try:
        r = subprocess.run(
            ["git", "status", "--short"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return bool(r.stdout.strip())
    except (subprocess.SubprocessError, FileNotFoundError, subprocess.TimeoutExpired):
        return False


def recent_evidence_tools(state: dict, n: int = 5) -> list[dict]:
    """Last N tool calls categorized as 'evidence'."""
    calls = state.get("tool_calls", [])
    recent = calls[-n:]
    return [c for c in recent if c.get("category") == "evidence"]


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    # Prevent Stop hook infinite loop
    if data.get("stop_hook_active"):
        sys.exit(0)

    transcript_path = data.get("transcript_path", "")
    tail = read_transcript_tail(transcript_path)
    last_assistant = extract_last_assistant_text(tail)

    if not last_assistant:
        sys.exit(0)

    claim = has_completion_claim(last_assistant)
    if not claim:
        sys.exit(0)

    # A claim was found. Check evidence.
    state = load_state()
    evidence = recent_evidence_tools(state, n=5)
    git_dirty = git_has_changes()

    # Evidence is sufficient if:
    #   - At least one evidence tool call (Edit/Write/Bash/NotebookEdit) in recent history
    #   - OR git shows changes (something touched the repo)
    # Missing: no evidence tools AND clean git state.
    if evidence:
        sys.exit(0)
    if git_dirty:
        # Something changed; give benefit of the doubt
        sys.exit(0)

    # No evidence and clean git: block.
    reason_lines = [
        f"completion-evidence-gate: found claim of completion ('{claim}') in your response,",
        "but recent tool history shows no executing action (Edit/Write/Bash) and `git status` is clean.",
        "",
        "If you actually completed the action, run a verification tool now (e.g. `git status`,",
        "`ls <file>`, `Read <file>`) so the claim is backed by evidence. Then end your response.",
        "",
        "If you did NOT complete the action, revise your message: use 'I plan to' or 'I will'",
        "instead of 'I did' / 'done' / 'completed'.",
    ]
    print("\n".join(reason_lines), file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
