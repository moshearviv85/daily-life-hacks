# Codex Taskboard

Last updated: 2026-05-18

This file coordinates multiple Codex chats working on the project.
Each chat must claim exactly one task before doing implementation work.

## Status Values

- `open`: ready for a new chat to claim.
- `in_progress`: one chat is currently working on it. Do not claim.
- `blocked`: waiting for user input, credentials, external service, or a prerequisite.
- `done`: completed and verified.

## Claim Protocol

1. Read `AGENTS.md`.
2. Read `docs/WORKLOG-CODEX.md`.
3. Read this file.
4. Pick the first task with status `open`.
5. Change only that task's status to `in_progress`.
6. Add a `Claimed` line with date, chat label if known, and short scope.
7. Work only on the claimed task.
8. When finished, update the task to `done` or `blocked`.
9. Add verification notes, changed files, commits, and next handoff.

## Coordination Rules

- Do not claim a task already marked `in_progress`.
- Do not start a second task in the same chat without explicit user approval.
- Do not edit task detail files under `docs/tasks/` unless the task explicitly requires it.
- Stage exact files only. The worktree contains unrelated changes.
- If live credentials or external mutation are needed, pause and ask the user.

## Tasks

### T01 - Pipeline Migration Map And Source Of Truth

Status: `open`

Goal: Map what still runs locally and design the cloud/Git/D1 source-of-truth flow.

Scope:
- Identify scripts that call OpenRouter, Fal, Recraft, GPT image generation, SQLite, D1, article publishing, and Pinterest scheduling.
- Identify which parts are safe to keep local temporarily and which must move to GitHub Actions, Cloudflare, or D1.
- Produce a concrete migration plan with phases and risk controls.

Deliverable:
- Update `docs/WORKLOG-CODEX.md` with findings.
- Create or update a focused plan file under `docs/`, unless a suitable existing plan should be amended.
- Do not move code yet unless the user explicitly asks.

### T02 - Manual Approval Publishing Flow

Status: `open`

Goal: Define and implement the minimum safe approval checkpoint before new articles or pins go live.

Scope:
- Determine current article and pin publish flow.
- Add a clear `draft/review/approved/published` or equivalent checkpoint.
- Keep the first implementation conservative.

Deliverable:
- A working approval path or a precise implementation plan if code changes require user approval.

### T03 - Staging Environment

Status: `open`

Goal: Create a staging path for testing changes before production.

Scope:
- Map current Cloudflare Pages and GitHub deploy behavior.
- Decide whether staging should be a branch deploy, Cloudflare preview, separate project, or route.
- Document how the user tests staging and promotes to production.

Deliverable:
- Staging design plus implementation if approved.

### T04 - Content Restart Runbook

Status: `open`

Goal: Restart content creation safely after stabilization.

Scope:
- Define generation batch size, review gates, image checks, pin scheduling, live URL verification, and rollback.
- Avoid aggressive Pinterest volume changes while account reach is suppressed.

Deliverable:
- A step-by-step runbook and first safe batch recommendation.

### T05 - System Documentation

Status: `open`

Goal: Produce one current system map that a new assistant can trust.

Scope:
- Consolidate live architecture, data sources, deploy flow, automation flow, and operational commands.
- Mark deprecated/local/unsafe paths clearly.

Deliverable:
- Update existing system docs or create a concise replacement.

### T06 - Organic Search Follow-Up

Status: `open`

Goal: Investigate Google/Bing traffic after the router and canonical fixes have settled.

Scope:
- Use Search Console/Bing data if the user provides exports or access.
- Do not repeat the completed router audit unless new failures appear.

Deliverable:
- Findings and prioritized fixes.

