# Branch Workflow (Always Active)

## Core Rule

Never edit source code directly on `main`. All code changes go on a feature branch.

`main` = production. Every push auto-deploys to Cloudflare Pages.

## Starting a Session

When the user gives a task that requires code changes:

1. Check current branch: `git branch --show-current`
2. If on `main`:
   - Check if a relevant branch already exists: `git branch --list`
   - **Existing branch found** → `git checkout <branch-name>`
   - **No existing branch** → `git checkout -b <type>/<short-name>`
3. If already on a feature branch → stay on it (unless user says otherwise)

For read-only tasks (questions, analysis, checks) → no branch needed, stay wherever you are.

## Branch Naming

Format: `<type>/<short-description>`

| Type | When |
|------|------|
| `feat/` | New feature or content |
| `fix/` | Bug fix |
| `refactor/` | Code cleanup |
| `content/` | Articles, pins, copy |
| `script/` | New or modified scripts |

Examples: `fix/seo-canonical`, `feat/pin-scheduler`, `content/batch-may-12`

## Finishing Work

When the user approves the work:

1. Commit all changes on the branch
2. Ask the user: "ready to merge to main and deploy?"
3. On approval:
   ```
   git checkout main
   git pull origin main
   git merge <branch-name>
   git push origin main
   git branch -d <branch-name>
   ```

## What's Allowed on Main

Only meta/config files that don't affect the live site:
- `.claude/` (hooks, rules, settings, skills)
- `CLAUDE.md`, `CHANGELOG.md`
- `INSTRUCTIONS-*.md`

Everything else → branch first.

## Enforcement

`branch-guard.py` hook blocks Edit/Write/MultiEdit on main for non-exempt paths. This rule provides the workflow guidance; the hook is the safety net.
