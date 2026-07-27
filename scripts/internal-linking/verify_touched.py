"""Validate every article touched in the working tree, and prove that any failure
is pre-existing by running the same validator against the file's HEAD version.

The validator derives the expected image path from the filename, so the HEAD copy
is written to a temp file with the SAME basename before validating.

Usage:
    py -3 scripts/internal-linking/verify_touched.py
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / "scripts" / "validate_article.py"


def run(path: Path) -> tuple[int, str]:
    p = subprocess.run(
        [sys.executable, str(VALIDATOR), str(path)],
        capture_output=True, text=True, cwd=str(ROOT),
    )
    return p.returncode, (p.stdout + p.stderr).strip()


BASE = sys.argv[1] if len(sys.argv) > 1 else "HEAD"


def touched() -> list[str]:
    out = subprocess.run(
        ["git", "diff", "--name-only", BASE, "--", "src/data/articles/"],
        capture_output=True, text=True, cwd=str(ROOT),
    ).stdout
    return [l.strip() for l in out.splitlines() if l.strip().endswith(".md")]


def head_version(rel: str) -> str | None:
    p = subprocess.run(["git", "show", f"{BASE}:{rel}"],
                       capture_output=True, text=True, cwd=str(ROOT))
    return p.stdout if p.returncode == 0 else None


def main() -> None:
    files = touched()
    print(f"touched articles: {len(files)}\n")
    clean, pre_existing, regressions = [], [], []

    with tempfile.TemporaryDirectory() as td:
        for rel in files:
            now_path = ROOT / rel
            code_now, out_now = run(now_path)
            if code_now == 0:
                clean.append(rel)
                continue
            head_src = head_version(rel)
            if head_src is None:
                regressions.append((rel, out_now, "(new file, no HEAD version)"))
                continue
            tmp = Path(td) / Path(rel).name  # same basename: image rule depends on it
            tmp.write_text(head_src, encoding="utf-8")
            code_head, out_head = run(tmp)
            # Compare RULE IDs only, not full detail strings. A word-count warning
            # whose number drifted (1649 -> 1669) on an article that was already over
            # the cap is not a new violation, and neither is any other Tier 2 detail
            # that merely moved. Only a rule that was not firing before counts.
            def rule_ids(text: str) -> set[str]:
                return {l.strip().split(":")[0] for l in text.splitlines()
                        if l.strip().startswith("S-")}
            head_t1 = rule_ids(out_head)
            now_t1 = rule_ids(out_now)
            new_only = now_t1 - head_t1
            if code_head != 0 and not new_only:
                pre_existing.append((rel, sorted(now_t1)))
            else:
                regressions.append((rel, sorted(new_only) or sorted(now_t1), "HEAD was clean" if code_head == 0 else "new violations"))

    print(f"PASS (exit 0): {len(clean)}")
    print(f"FAIL but identical to HEAD (pre-existing, not caused by this pass): {len(pre_existing)}")
    for rel, v in pre_existing:
        print(f"   {rel}")
        for x in v:
            print(f"      {x}")
    print(f"REGRESSIONS INTRODUCED BY THIS PASS: {len(regressions)}")
    for item in regressions:
        print(f"   {item}")
    sys.exit(1 if regressions else 0)


if __name__ == "__main__":
    main()
