#!/usr/bin/env python3
"""
InstructionsLoaded hook. Logs every rule / CLAUDE.md load to
.claude/logs/instructions.log. Read-only, never blocks.

One line per load, compact JSON. Use for debugging:
  - "Did .claude/rules/pinterest.md actually load when I opened a pin file?"
  - "What rules were active when that session started?"
"""

import json
import pathlib
import sys
from datetime import datetime, timezone

LOG_PATH = pathlib.Path(".claude/logs/instructions.log")


def main():
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    entry = {
        "time": datetime.now(timezone.utc).isoformat(),
        "file": data.get("file_path", ""),
        "type": data.get("memory_type", ""),
        "reason": data.get("load_reason", ""),
    }

    trigger = data.get("trigger_file_path")
    if trigger:
        entry["trigger"] = trigger

    parent = data.get("parent_file_path")
    if parent:
        entry["parent"] = parent

    globs = data.get("globs")
    if globs:
        entry["globs"] = globs

    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError:
        pass

    sys.exit(0)


if __name__ == "__main__":
    main()
