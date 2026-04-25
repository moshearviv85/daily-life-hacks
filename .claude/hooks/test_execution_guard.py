#!/usr/bin/env python3
"""Test harness for execution-guard.py."""
import json
import os
import subprocess
import tempfile
from pathlib import Path

HOOK = str(Path(__file__).parent / "execution-guard.py")


def make_transcript(messages):
    """Write a JSONL transcript file. messages = [(type, text), ...]."""
    fd, path = tempfile.mkstemp(suffix=".jsonl", text=True)
    os.close(fd)
    with open(path, "w", encoding="utf-8") as f:
        for kind, text in messages:
            obj = {"type": kind, "message": {"content": text}}
            f.write(json.dumps(obj, ensure_ascii=False) + "\n")
    return path


def run(payload):
    r = subprocess.run(
        ["python", HOOK],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return r.returncode, (r.stderr or "").strip()


def main():
    # Setup: a transcript with a clear task verb -> should pass on code edit.
    t1 = make_transcript([("user", "תכתוב לי סקריפט שמייצר תמונות")])
    code, _ = run({
        "tool_name": "Edit",
        "tool_input": {"file_path": "scripts/foo.py", "old_string": "a", "new_string": "b"},
        "transcript_path": t1,
    })
    print(f"TEST 1 (Hebrew task verb on .py, expect pass): exit={code}")
    print()

    # Conversational user message, no approval, no verb -> block.
    t2 = make_transcript([("user", "מה דעתך על הרעיון הזה?")])
    code, err = run({
        "tool_name": "Write",
        "tool_input": {"file_path": "scripts/foo.py", "content": "x"},
        "transcript_path": t2,
    })
    print(f"TEST 2 (question, no approval, .py, expect block): exit={code}")
    if err:
        print("  first stderr:", err.splitlines()[0])
    print()

    # Approval marker.
    t3 = make_transcript([("user", "אישור, תבצע")])
    code, _ = run({
        "tool_name": "Edit",
        "tool_input": {"file_path": "scripts/foo.py", "old_string": "a", "new_string": "b"},
        "transcript_path": t3,
    })
    print(f"TEST 3 (Hebrew approval, expect pass): exit={code}")
    print()

    # Non-code path (memory file) -> always pass.
    t4 = make_transcript([("user", "what?")])
    code, _ = run({
        "tool_name": "Write",
        "tool_input": {"file_path": "memory/foo.md", "content": "x"},
        "transcript_path": t4,
    })
    print(f"TEST 4 (memory path, no approval, expect pass): exit={code}")
    print()

    # English task verb.
    t5 = make_transcript([("user", "Please fix the bug in scripts/post-pin.py")])
    code, _ = run({
        "tool_name": "Edit",
        "tool_input": {"file_path": "scripts/post-pin.py", "old_string": "a", "new_string": "b"},
        "transcript_path": t5,
    })
    print(f"TEST 5 (English fix verb, expect pass): exit={code}")
    print()

    # Article path (exempt).
    t6 = make_transcript([("user", "what?")])
    code, _ = run({
        "tool_name": "Write",
        "tool_input": {"file_path": "src/data/articles/foo.md", "content": "x"},
        "transcript_path": t6,
    })
    print(f"TEST 6 (article path, expect pass): exit={code}")
    print()

    # No transcript path -> fail open.
    code, _ = run({
        "tool_name": "Edit",
        "tool_input": {"file_path": "scripts/foo.py", "old_string": "a", "new_string": "b"},
        "transcript_path": "",
    })
    print(f"TEST 7 (no transcript, expect pass / fail-open): exit={code}")
    print()

    # Cleanup.
    for p in (t1, t2, t3, t4, t5, t6):
        try:
            os.unlink(p)
        except OSError:
            pass


if __name__ == "__main__":
    main()
