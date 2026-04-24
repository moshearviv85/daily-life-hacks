---
name: tdd
description: Test-driven development. Use when the user asks to work in TDD mode, or when building a non-trivial function/module in scripts/ or functions/. Enforces RED-GREEN-REFACTOR with visible tool evidence for each step before claiming any task is done.
---

# TDD (Test-Driven Development)

Invoke when the user says "tdd", "תשתמש ב-tdd", "write a failing test first", or when building any non-trivial script/module.

## The Cycle (RED-GREEN-REFACTOR)

For each behavior:

### 1. RED — write a failing test
- Write the test in `tests/<module>/test_<thing>.py` (pytest) or the project convention.
- The test must fail **for the right reason** (missing function or wrong output), not for setup errors.
- **Verification:** `python -m pytest tests/<module>/test_<thing>.py::test_<behavior> -v` — exit 1, failure line visible. Save the failure output; it is the evidence that RED happened.

### 2. GREEN — write the minimum code to pass
- Implement in the smallest file / smallest patch that makes the test pass.
- Do not add behavior the test does not demand.
- **Verification:** same pytest command — exit 0, test passes. Evidence of GREEN.

### 3. REFACTOR — clean up (optional, only if needed)
- If GREEN code is messy, refactor now while the test protects you.
- **Verification:** pytest still exit 0 after every refactor step.

Move to the next behavior. Do not batch tests up front; one RED-GREEN at a time keeps evidence per step.

## Non-Negotiables

1. **No production code without a failing test first.** If you find yourself writing implementation before a test, stop and write the test.
2. **Every step produces tool evidence.** The sequence in `.claude/state.json` must show: `Write(test)` → `Bash(pytest)` red → `Write(code)` → `Bash(pytest)` green. Without this trace, no task is "done".
3. **No mocking database or external services** when the integration is the thing being tested. Context: `.claude/rules/` and past memory say real DB tests catch issues mocks hide.
4. **"All tests pass" is a specific claim** that requires the full suite command (`python -m pytest` or project equivalent) to show exit 0, not just one test. Partial runs do not support a total claim.

## When to Apply Strict TDD vs. Relaxed

**Strict (full RED-GREEN-REFACTOR per behavior):**
- Scripts that will run in production (`scripts/post-pins.py`, `scripts/write.py`, etc.)
- Functions in `functions/api/` (Cloudflare Pages Functions)
- SQLite helpers, parsers, validators

**Relaxed (write test alongside code, run once):**
- One-off data exploration scripts
- Glue code that's called once and discarded
- Shell-level operations

The user can override with "do TDD" for anything, including relaxed cases.

## Checklist Before Claiming Done

- [ ] Test file committed or at least Written
- [ ] Ran pytest, saw red for the new test
- [ ] Wrote the code
- [ ] Ran pytest, saw green for the new test
- [ ] Ran the full suite, still green
- [ ] Shown the user the final pytest output with exit code

If the user asks for the state later, point at `.claude/state.json` for the trace.

## Why

`.claude/rules/truth.md` requires completion claims to be backed by tool evidence. TDD makes that evidence-gathering the default, not an afterthought. A task done TDD-style leaves a self-documenting trace of red → green → full-suite green that anyone (including future-me in a new session) can verify without re-running anything.

"Integration tests hit a real database, not mocks" — context: prior incident where mocked tests passed but the prod migration failed.
