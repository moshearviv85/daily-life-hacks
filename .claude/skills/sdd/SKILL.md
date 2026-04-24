---
name: sdd
description: Spec-driven development. Use when the user asks to work in SDD mode, asks for a SPEC before coding, or requests a plan for a non-trivial feature. Forces Problem → Goal → Approach → Plan with file paths + acceptance criteria + verification commands, before any code is written.
---

# SDD (Spec-Driven Development)

Invoke when the user says "sdd", "תשתמש ב-sdd", "let's write a spec", "תבנה לי תוכנית", or for any code change larger than a small tweak.

## Non-Negotiables

1. **No code before the SPEC is approved.** Zero edits to `.py`, `.ts`, `.js`, `.tsx`, `.astro`, or any implementation file until the user says to proceed.
2. **SPEC opens with Problem, not solution.** First three questions are always: what is broken, what are the symptoms, what would "better" look like in business terms. Rubric dimensions and success criteria map 1:1 to the named problems. See `feedback_research_and_spec.md` sections 1-2.
3. **Every task in the plan has a verification command.** A task without a concrete command that proves it passed is not a task.

## The SPEC Structure

Write the SPEC at `docs/specs/YYYY-MM-DD-<slug>.md`. Required sections in this exact order:

```
## 1. Problem
- What is currently broken or missing? Name the pain, not the fix.
- Symptoms: concrete examples, failure modes, costs.
- Evidence: tool output, DB rows, user-reported issues.

## 2. Goal
- What "done" looks like in business terms (not aesthetics or internals).
- Explicit out-of-scope items.

## 3. Research (only if replacing/adding an external tool)
- Follow `feedback_research_and_spec.md` rules 3-4-5: come clean (no pre-seeded names), pyramid order, no user-taste smuggling.
- Output: markdown comparison table + one paragraph per candidate naming its edge.

## 4. Approach
- One or two sentences describing the chosen path.
- Why this and not alternatives (one sentence each).

## 5. Plan
Numbered tasks, each with:
- **File path(s)** touched
- **Acceptance criterion** (what must be true after)
- **Verification command** (shell command that proves it; exit 0 = passed)
- **Dependencies** (task numbers that must finish first)

## 6. Out-of-scope
- Anything tempting but deferred. Documented so it doesn't sneak in.
```

## Worked Example (Plan Task Format)

```markdown
### Task 3: Add `validate_pin_title` to pin generator

- File: `scripts/pin-generator.py`
- Acceptance: function raises `ValueError` on duplicate titles within the same run
- Verification: `python -m pytest tests/test_pin_generator.py::test_duplicate_titles -v`
- Depends on: Task 1, Task 2
```

Not acceptable:
- "Improve pin generator" (no file, no criterion, no verification)
- "Add error handling" (verb-vague, not checkable)
- "Update tests" (what tests, what command)

## Workflow Steps

1. **Problem interview.** Ask the user the Problem-section questions. Do not guess.
2. **Draft the SPEC** in `docs/specs/YYYY-MM-DD-<slug>.md`. Present the whole file. Do not start coding.
3. **User approves or redirects.** Accept redirects; revise the SPEC. Loop until approved.
4. **Execute tasks in order.** For each task:
   - Make the edits / additions
   - Run the verification command
   - Show the exit code and output to the user
   - Only then mark the task done
5. **Close the SPEC** when all tasks pass their verification command. Save the final `docs/specs/` file.

## When Not to Use SDD

- Single-line typo fix
- One-file rename
- Git housekeeping
- Ad-hoc DB inspection

For these, a plain edit + verification is fine. Do not burn a SPEC.

## Why

2026-04-24: user corrected me repeatedly on jumping to solutions before grounding the problem. SPEC writing = 30% problem framing + 70% solution. See `feedback_research_and_spec.md`.

Verification commands are the `.claude/rules/truth.md` principle made concrete: a completion claim needs tool evidence, so every planned task must name the tool call that will become its evidence.
