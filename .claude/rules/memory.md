# Memory Management Rule (Always Active)

## Core Rule

The memory directory is a library, not a journal. MEMORY.md is an index, not a memory. New information defaults to **updating an existing sub-file**, not creating a new file or adding a pointer to MEMORY.md.

## Priority Order (mandatory)

When you learn something worth saving:

1. **Find the closest existing sub-file.** Scan the memory directory for a file whose topic fits. If one matches, that file is the only thing that changes. MEMORY.md is not touched.

2. **If no perfect match, merge into the closest one.** Imperfect fit is better than a new file. Growing one sub-file is cheaper than accumulating many, because every new sub-file ultimately demands a new line in MEMORY.md.

3. **New sub-file only as last resort.** Allowed only when the topic is genuinely top-level and fits nowhere. Ask the user before creating. If approved and created, add exactly one pointer line to MEMORY.md in the matching section.

## MEMORY.md Rules

- Index only. No content.
- Each line is a pointer: `- [Title](file.md) — one-line hook` (under ~150 chars).
- Hard ceiling: 60 lines. Lines past 200 are truncated by the harness anyway.
- Never in MEMORY.md: numeric snapshots, credentials, full content, duplicated section bodies from sub-files.

## What Never Goes in Any Memory File

- **Numeric snapshots of project state** ("77 articles", "134 images", "59 pins posted"). They decay in days and caused a false-claim incident 2026-04-24. For counts, query SQL live.
- **Credentials** (API keys, passwords, secrets, long hex strings). Use `.env` or reference their location in code.
- **Content already in `.claude/rules/` or `CLAUDE.md`.** Those are the source of truth; duplication drifts.
- **Task status or in-progress work.** Use TaskCreate or plan files, not memory.
- **Debugging fix recipes.** The fix lives in code; the commit message carries the story.

## Decision Tree for "Where Does This Lesson Go"

- Image / video / music generation → `media.md`
- Research or SPEC methodology → `feedback_research_and_spec.md`
- Article writer pipeline → `pipeline_articles.md`
- Pinterest → `pinterest.md`
- How to build scripts → `scripts_principles.md`
- Task status / pending work → `project_pending_tasks.md`
- User profile detail → `user_profile.md`
- SQL count methodology → `feedback_count_from_sql_only.md`
- Opus→Sonnet delegation → `feedback_delegate_to_sonnet.md`
- Skill discovery → `feedback_check_existing_skills.md`
- Git deploy gotchas → `feedback_git_deploy_checklist.md`
- Fits nowhere above → ask the user before creating a new file.

## Enforcement

`.claude/hooks/memory-guard.py` (PreToolUse on Write/Edit/MultiEdit) blocks edits to `MEMORY.md` that exceed 60 lines, have lines over 200 chars, contain numeric snapshot patterns, or contain credential patterns. The hook is a safety net. This rule document is the source of truth.

## Why

2026-04-24: memory had grown to 22+ sub-files with MEMORY.md at 172 lines. The index had become content. Every new session loaded it all into context before any work. Consolidation brought it to 11 active sub-files and a short index. The priority order above prevents regression.
