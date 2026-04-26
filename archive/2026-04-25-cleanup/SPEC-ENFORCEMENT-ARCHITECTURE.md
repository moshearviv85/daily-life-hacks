# SPEC V4: Daily Life Hacks - Claude Code Enforcement Architecture

**Status:** IMPLEMENTED 2026-04-23
**Version:** V4 (was specs V1-V3 during planning)
**Commit checkpoint for rollback:** `git tag v3-v4-refactor-checkpoint-2026-04-22`

---

## 1. What This Document Is

This is the as-built architecture. V3 was the plan; V4 is what exists on disk now. Differences from V3:
- Added state layer (PostToolUse hook + `.claude/state.json`) — V3 had not committed to this.
- Completion-evidence-gate built as deterministic Python (not `type: "prompt"`), because prompt-type hooks require Haiku calls that cost money and add latency. The Python version does claim detection via regex and evidence verification via state.json + `git status`.
- All hooks tested with 14+ cases before committing.

---

## 2. The Five Layers (as implemented)

### Layer 1: CLAUDE.md (always-on, 88 lines)
Location: `CLAUDE.md`
Loaded: every session (user message after system prompt)
Contains: identity, stack, build commands, workflow, pointers to rules and skills.
Does NOT contain: content rules, completed history, per-domain specifics. Those moved out.

### Layer 2: Rules (`.claude/rules/`)
Loaded automatically via Claude Code's native `settingSources: ["project"]`.

Always-on (no `paths:` frontmatter):
- `truth.md` — single canonical truth protocol (replaces 9 repetitions that were in MEMORY.md)
- `content.md` — content style rules (no em-dash, no medical claims, etc.)

Path-scoped (load only when matching files are read):
- `articles.md` — paths: `src/data/articles/**`, `pipeline-data/articles/**`
- `pinterest.md` — paths: `scripts/*pin*`, `scripts/post-*`, `pipeline-data/pins*`, `functions/api/pinterest*`, `public/images/pins/**`
- `video.md` — paths: `scripts/*kinetic*`, `scripts/*video*`, `scripts/*elevenlabs*`, `elevenlabs/**`, skill directories

Context cost: rules with `paths:` are **zero cost** until their paths are actually touched.

### Layer 3: Skills (`.claude/skills/`)
Migrated from `.cursor/skills/` with proper frontmatter:
- `write-article` — description triggers + paths for auto-activation
- `david-miller-voice` — broad activation (writing tasks)
- `kinetic-video` — description triggers + paths
- `post-pin` — **`disable-model-invocation: true`** (side-effect skill, manual-only via `/post-pin`)

### Layer 4: Hooks (`.claude/hooks/`)
The enforcement layer. Registered in `.claude/settings.json`.

| Hook | Event | What it does | Block? |
|------|-------|--------------|--------|
| `content-checker.py` | PreToolUse (Edit|Write) | Blocks writes to `src/data/articles/**` containing em-dash, medical claims, supplements, banned AI words, banned sign-offs, detox language | YES (exit 2) |
| `post-tool-state.py` | PostToolUse | Writes tool-call history + git snapshot to `.claude/state.json` | No (logging) |
| `completion-evidence-gate.py` | Stop | Detects completion claims in last assistant message; blocks stop if no recent evidence tool call AND git is clean | YES (exit 2) |
| `instructions-logger.py` | InstructionsLoaded | Logs each rule/CLAUDE.md load to `.claude/logs/instructions.log` | No (logging) |

### Layer 5: Permissions (`.claude/settings.json`)
Deny rules (cannot be overridden):
- `Bash(git push --force *)` and `Bash(git push -f *)`
- `Bash(git reset --hard *)`
- `Bash(rm -rf /)`, `Bash(rm -rf ~/*)`
- `Edit(.git/**)`, `Write(.git/**)`
- `Read(./.env)`, `Read(./.env.*)`, `Read(./secrets/**)`

---

## 3. How Enforcement Actually Works

### Writing a bad article
1. Claude calls `Edit` on `src/data/articles/test.md` with em-dash in content.
2. PreToolUse `content-checker.py` runs BEFORE the edit is applied.
3. Hook detects em-dash, writes error to stderr, exits 2.
4. Claude Code blocks the edit. Claude receives stderr as feedback. Must revise.

### False completion claim
1. Claude says "I fixed the bug" at the end of a response.
2. Stop hook `completion-evidence-gate.py` runs.
3. Hook reads transcript tail, finds "I fixed" pattern.
4. Hook loads `.claude/state.json`, sees no recent evidence tool (Edit/Write/Bash).
5. Hook runs `git status --short`, sees no changes.
6. Hook blocks with reason: "no evidence for the claim". Claude cannot stop.
7. Claude must either: produce actual evidence (run a tool) OR revise the message.

### Mixed message (plan + plan-only phrasing)
1. Claude says "I will fix the bug tomorrow".
2. Hook sees "I will" hedge pattern in the same sentence.
3. No completion claim detected. Stop allowed.

### Domain switch (writing articles)
1. User asks to write an article.
2. Claude opens a file in `src/data/articles/`.
3. InstructionsLoaded event fires for `.claude/rules/articles.md` (triggered by `path_glob_match`).
4. `instructions-logger.py` records the load.
5. The rules are now in context for this operation.

---

## 4. Test Results (2026-04-22)

Content checker:
- em-dash via UTF-8 JSON → blocked (exit 2) ✅
- medical claim "cures" → blocked ✅
- clean content → allowed ✅
- non-article path → allowed ✅

Post-tool-state:
- Single Edit call → state.json created correctly ✅
- Accumulates 3+ calls, categorizes as evidence/verification ✅
- Git status captured in snapshot ✅

Completion-evidence-gate (14/14 claim detection tests passed):
- "I fixed the bug" → claim detected ✅
- "I will fix the bug later" → no claim (intent) ✅
- "I have deployed the changes" → detected ✅
- "Here is an analysis" → no claim ✅
- "I have successfully deployed" → detected ✅
- "Let me check the code" → no claim ✅
- "Done. The feature is working" → detected ✅
- "I plan to write the tests next" → no claim ✅
- "I wrote the article and reviewed it" → detected ✅
- "I am going to commit these changes" → no claim ✅
- Hebrew "סיימתי את המשימה" → detected ✅
- Hebrew "אני אנסה לסיים" → no claim ✅
- Hebrew "בוצע בהצלחה" → detected ✅
- Hebrew "אני רוצה להתחיל" → no claim ✅

Instructions logger:
- 3 sample payloads → 3 valid JSON lines in log ✅

---

## 5. Known Limitations

1. **Claims about non-git state** — DB updates, API calls, published content aren't caught. The gate only checks tool history + git. Solution for future: per-domain evidence hooks (e.g., check D1 after post-pin).
2. **Clever rephrasing** — if Claude says "the bug is now resolved" (passive) the current patterns may not match. Patterns are comprehensive but not exhaustive.
3. **Allowed-tools in skills is guidance, not enforcement** — Claude Code's `allowed-tools` field only pre-approves, doesn't restrict. Real restriction requires `permissions.deny`.
4. **Stop hook sees only last assistant text** — multi-message runs where claim was in an earlier message are not scanned.

---

## 6. Files Created / Modified

### Created
- `.claude/rules/truth.md` (25 lines)
- `.claude/rules/content.md` (51 lines)
- `.claude/rules/articles.md` (51 lines, path-scoped)
- `.claude/rules/pinterest.md` (56 lines, path-scoped)
- `.claude/rules/video.md` (47 lines, path-scoped)
- `.claude/hooks/content-checker.py` (173 lines)
- `.claude/hooks/post-tool-state.py` (110 lines)
- `.claude/hooks/completion-evidence-gate.py` (228 lines)
- `.claude/hooks/instructions-logger.py` (55 lines)
- `.claude/skills/write-article/SKILL.md` (copied + frontmatter updated)
- `.claude/skills/david-miller-voice/SKILL.md` (copied)
- `.claude/skills/kinetic-video/SKILL.md` + 2 supporting files (copied + frontmatter updated)
- `.claude/skills/post-pin/SKILL.md` (new, disable-model-invocation)
- `.claude/settings.json` (new project-shared settings with hooks + deny rules)
- `CHANGELOG.md` (new, 98 lines, holds completed tasks 1-33 + decision record)

### Modified
- `CLAUDE.md` (223 → 88 lines, content rules moved to rules/, history moved to CHANGELOG.md)
- `.gitignore` (added runtime state exclusions)

### Untouched (preserved)
- `.claude/settings.local.json` (user permission allowlist, unchanged)
- `.cursor/` directory (Cursor still uses these; Claude Code copies now live in `.claude/skills/`)
- `~/.claude/projects/.../memory/` directory (auto-memory, not modified)

### Backups (for rollback)
- `CLAUDE.md.backup-2026-04-22`
- `memory-backup-2026-04-22/` (full copy of auto-memory)
- `.claude/settings.local.json.backup-2026-04-22`
- Git tag: `v3-v4-refactor-checkpoint-2026-04-22` on commit `12187b6f`

---

## 7. Rollback

```bash
# Reset all refactor changes
git reset --hard v3-v4-refactor-checkpoint-2026-04-22

# Restore CLAUDE.md (if not covered by git reset)
cp CLAUDE.md.backup-2026-04-22 CLAUDE.md

# Restore memory if touched (not touched in this refactor, but backup exists)
# rm -rf "C:/Users/offic/.claude/projects/C--Users-offic-Desktop-dlh-fresh/memory"
# cp -r memory-backup-2026-04-22 "C:/Users/offic/.claude/projects/C--Users-offic-Desktop-dlh-fresh/memory"

# Remove the new directories
rm -rf .claude/rules .claude/hooks .claude/skills .claude/logs .claude/state.json
rm -f .claude/settings.json CHANGELOG.md

# Restore settings.local.json from backup if needed
# cp .claude/settings.local.json.backup-2026-04-22 .claude/settings.local.json
```

---

## 8. Next Session: What to Verify

When starting a new Claude Code session in this project:

1. Run `/hooks` — you should see 4 events: PreToolUse, PostToolUse, Stop, InstructionsLoaded.
2. Run `/context` — CLAUDE.md should show as loaded, plus truth.md and content.md from rules.
3. Try a test article edit with em-dash — should be blocked by content-checker.
4. Check `.claude/logs/instructions.log` after any session activity — should have entries.
5. After a few actions, check `.claude/state.json` — should show tool-call history.

---

## 9. Sources

All mechanisms verified from:
- https://code.claude.com/docs/en/hooks.md
- https://code.claude.com/docs/en/hooks-guide.md
- https://code.claude.com/docs/en/memory.md
- https://code.claude.com/docs/en/skills.md
- https://code.claude.com/docs/en/settings.md
- https://code.claude.com/docs/en/permissions.md
- https://code.claude.com/docs/en/permission-modes.md
- https://code.claude.com/docs/en/context-window.md
- https://code.claude.com/docs/en/features-overview.md
- https://code.claude.com/docs/en/how-claude-code-works.md
- https://code.claude.com/docs/en/sub-agents.md
- https://code.claude.com/docs/en/routines.md (marked out of scope)
- https://code.claude.com/docs/en/output-styles.md (marked out of scope for V4)

**End of V4 spec.**
