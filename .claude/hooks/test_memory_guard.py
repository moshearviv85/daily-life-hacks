#!/usr/bin/env python3
"""Test harness for memory-guard.py — runs 5 cases."""
import json
import subprocess
from pathlib import Path

MEM_PATH = str(
    Path(
        r"C:/Users/offic/.claude/projects/C--Users-offic-Desktop-dlh-fresh/memory/MEMORY.md"
    )
)
HOOK = str(Path(__file__).parent / "memory-guard.py")


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
    with open(MEM_PATH, "r", encoding="utf-8") as f:
        current = f.read()

    # 1: current MEMORY.md -> expect pass
    code, err = run(
        {"tool_name": "Write", "tool_input": {"file_path": MEM_PATH, "content": current}}
    )
    print(f"TEST 1 (current MEMORY.md, expect pass): exit={code}")
    if err:
        print("  stderr:", err[:200])
    print()

    # 2: oversized -> expect block
    bad = current + "\n" + "\n".join([f"- extra line {i}" for i in range(70)])
    code, err = run(
        {"tool_name": "Write", "tool_input": {"file_path": MEM_PATH, "content": bad}}
    )
    print(f"TEST 2 (oversized, expect block): exit={code}")
    print("  first stderr line:", err.splitlines()[0] if err else "(empty)")
    print()

    # 3: numeric snapshot -> expect block
    bad = current + "\n- Site has 77 articles and 134 images\n"
    code, err = run(
        {"tool_name": "Write", "tool_input": {"file_path": MEM_PATH, "content": bad}}
    )
    print(f"TEST 3 (numeric snapshot, expect block): exit={code}")
    for line in err.splitlines()[:4]:
        print("  ", line)
    print()

    # 4: credential -> expect block
    bad = current + "\n- App Secret: f952dfd1d47d141bc6b170af57a54f212b5b524c\n"
    code, err = run(
        {"tool_name": "Write", "tool_input": {"file_path": MEM_PATH, "content": bad}}
    )
    print(f"TEST 4 (credential, expect block): exit={code}")
    for line in err.splitlines()[:4]:
        print("  ", line)
    print()

    # 5: non-MEMORY.md file -> expect pass
    code, err = run(
        {
            "tool_name": "Write",
            "tool_input": {"file_path": "some_other_file.md", "content": "anything"},
        }
    )
    print(f"TEST 5 (non-MEMORY.md, expect pass): exit={code}")
    print("  stderr:", err[:200] or "(empty)")


if __name__ == "__main__":
    main()
