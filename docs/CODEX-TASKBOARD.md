# Codex Taskboard

Last updated: 2026-05-28

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

Status: `done`

Claimed: 2026-05-18, Codex, map local pipeline scripts and source-of-truth migration plan.
Completed: 2026-05-18, Codex, created `docs/pipeline-migration-source-of-truth.md` and updated `docs/WORKLOG-CODEX.md`.

Verification:
- Read `AGENTS.md`, `docs/WORKLOG-CODEX.md`, and this taskboard.
- Inspected active new pipeline scripts, GitHub Actions, Cloudflare Functions, D1 schema, and local SQLite table counts.
- No production code, D1 state, Git commits, pushes, deploys, installs, or external publishing actions were performed.

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

Status: `done`

Claimed: 2026-05-18, Codex, map and design minimum manual approval checkpoint for articles and pins.

Completed: 2026-05-18, Codex.

Goal: Define and implement the minimum safe approval checkpoint before new articles or pins go live.

Scope:
- Determine current article and pin publish flow.
- Add a clear `draft/review/approved/published` or equivalent checkpoint.
- Keep the first implementation conservative.

Deliverable:
- A working approval path or a precise implementation plan if code changes require user approval.

Changed files:
- `functions/api/articles-upload.js`
- `functions/api/articles-due.js`
- `functions/api/articles-publish.js`
- `functions/api/articles-list.js`
- `functions/api/articles-set-status.js`
- `functions/api/pins-upload.js`
- `functions/api/pins-status.js`
- `functions/api/pins-set-status.js`
- `src/pages/dashboard.astro`
- `scripts/publish-articles.py`
- `.github/workflows/publish-articles.yml`
- `schema.sql`
- `docs/WORKLOG-CODEX.md`
- `docs/manual-approval-publishing-flow.md`

Verification:
- `npm run build` passed on 2026-05-18.
- New article uploads start as `REVIEW`; dashboard approval moves to `APPROVED`; publishers read `APPROVED` plus legacy `PENDING`.
- New pin uploads start as `REVIEW`; dashboard approval moves to `PENDING`; `/api/pins-next` still only posts `PENDING`.
- Upload paths no longer auto-publish articles or auto-dispatch the Pinterest posting workflow.

### T03 - Staging Environment

Status: `done`

Claimed: 2026-05-18, Codex, map current deploy behavior and design staging path.

Goal: Create a staging path for testing changes before production.

Scope:
- Map current Cloudflare Pages and GitHub deploy behavior.
- Decide whether staging should be a branch deploy, Cloudflare preview, separate project, or route.
- Document how the user tests staging and promotes to production.

Deliverable:
- Staging design plus implementation if approved.

Handoff:
- Decision: use the `staging` branch as the Cloudflare Pages Preview environment.
- Documented the runbook in `docs/staging-environment.md`.
- Updated deploy workflow concurrency to be branch-specific.
- Verified with `npm run build:checked`.
- Remaining risk: staging is not D1-isolated; avoid state-changing dashboard/API tests on staging until a separate Preview `DB` binding exists.

### T04 - Content Restart Runbook

Status: `done`

Claimed: 2026-05-18, Codex, define safe content restart runbook and first batch recommendation.

Completed: 2026-05-18, Codex.

Goal: Restart content creation safely after stabilization.

Scope:
- Define generation batch size, review gates, image checks, pin scheduling, live URL verification, and rollback.
- Avoid aggressive Pinterest volume changes while account reach is suppressed.

Deliverable:
- A step-by-step runbook and first safe batch recommendation.

Handoff:
- Created `docs/content-restart-runbook.md`.
- First safe batch recommendation: manual `pipeline-produce.yml` with `count=1`, generated files reviewed on `staging`, then production promotion only after review gates pass.
- Keep `pipeline-daily.yml` manual-only.
- Do not approve new pins in the same pass as the first restarted article; wait until the production article is live, then approve only one new pin first.
- No workflow dispatch, D1 mutation, package install, commit, push, deploy, or Pinterest action was performed.

### T05 - System Documentation

Status: `done`

Claimed: 2026-05-19, Codex, consolidate current system architecture, data sources, deploy flow, automation flow, and operational commands.

Completed: 2026-05-19, Codex.

Goal: Produce one current system map that a new assistant can trust.

Scope:
- Consolidate live architecture, data sources, deploy flow, automation flow, and operational commands.
- Mark deprecated/local/unsafe paths clearly.

Deliverable:
- Update existing system docs or create a concise replacement.

Handoff:
- Updated `docs/current-system-map.md` as the current trusted system map.
- Consolidated source-of-truth boundaries, D1 tables/statuses, Cloudflare Functions, GitHub Actions automation, active pipeline paths, deprecated/unsafe paths, operational commands, env vars, restart guardrails, and current risks.
- Updated `docs/WORKLOG-CODEX.md` with T05 completion notes.
- No build was run because this was documentation-only.
- No GitHub workflow dispatch, D1 mutation, package install, commit, push, deploy, or Pinterest action was performed.

### T06 - Organic Search Follow-Up

Status: `done`

Claimed: 2026-05-19, Codex, investigate organic search follow-up after router and canonical fixes without repeating completed router audit.

Blocked: 2026-05-19, Codex, no Google Search Console or Bing Webmaster Tools exports/access were available for traffic analysis.

Completed: 2026-05-19, Codex, analyzed user-provided Google Search Console CSV export.

Goal: Investigate Google/Bing traffic after the router and canonical fixes have settled.

Scope:
- Use Search Console/Bing data if the user provides exports or access.
- Do not repeat the completed router audit unless new failures appear.

Deliverable:
- Findings and prioritized fixes.

Handoff:
- Created and updated `docs/organic-search-follow-up.md` with baseline public crawlability checks, Google Search Console findings, and prioritized next steps.
- Live spot checks found `robots.txt` and sitemap available, 145 URLs in `sitemap-0.xml`, all 140 local article Markdown files present in the sitemap, sampled canonical article URLs indexable, category pages indexable, and tag pages `noindex, follow`.
- User-provided GSC export covered 2026-04-29 through 2026-05-16: 4 clicks, 1,980 impressions, 0.20% CTR, and 23.0 impression-weighted average position.
- User-provided Bing Search Performance export covered 2026-05-03 through 2026-05-16: 2 clicks, 37 impressions, and 5.41% CTR.
- User-provided Bing AI Performance export covered 2026-05-04 through 2026-05-16: 18 citations and 9 total daily cited-page counts.
- User-provided Bing AI Page Stats report attributed all 18 citations to 8 URLs; `/prune-juice-alternatives-for-constipation/` led with 8 citations.
- Highest-priority issue: impression-bearing 404 URLs, led by `/prebiotic-foods-beyond-the-buzzwords/` with 106 impressions at position 10.77 and `/selenium-containing-foods-easy-ways/` with 91 impressions.
- Next implementation task should recover or redirect active 404s, then consider trailing-slash normalization, then optimize CTR on close-ranking pages.
- Do not repeat the completed router audit unless a new failing URL, GSC indexing error, or Bing crawl issue is provided.

## Phase 2 Tasks

### T07 - Recover Or Redirect Impression-Bearing 404 URLs

Status: `done`

Claimed: 2026-05-19, Codex, recover or redirect Google impression-bearing 404 URLs from organic search follow-up.

Completed: 2026-05-19, Codex.

Goal: Fix Google impression-bearing URLs that currently resolve as 404 or are missing from the live article set.

Scope:
- Start from `docs/organic-search-follow-up.md`.
- Prioritize `/prebiotic-foods-beyond-the-buzzwords/` and `/selenium-containing-foods-easy-ways/`.
- Determine whether each URL should be restored as an article, redirected to an existing close match, or intentionally left 404.
- Prefer the lowest-risk solution that preserves user intent and search signal.
- Do not repeat the completed full router audit unless a specific URL fails.

Deliverable:
- Implement redirects or restoration if the user has approved code changes for the turn.
- Update `docs/organic-search-follow-up.md`, `docs/WORKLOG-CODEX.md`, and this task status.
- Verify live or local behavior with exact URLs.

Handoff:
- Restored seven existing tracked drafts into `src/data/articles/`:
  - `prebiotic-foods-beyond-the-buzzwords`
  - `selenium-containing-foods-easy-ways`
  - `protein-per-serving-beans-chicken-tofu-compared`
  - `how-to-quick-soak-dried-beans-same-day`
  - `how-to-preheat-skillet-even-browning`
  - `keep-berries-fresh-longer-when-to-wash`
  - `how-to-pack-lunch-crisp-sandwiches-salads`
- Added `savory-chia-seed-recipes-breakfast` to `pipeline-data/slug-aliases.json`, pointing at `chia-pudding-variations-for-breakfast`.
- Updated `docs/organic-search-follow-up.md` and `docs/WORKLOG-CODEX.md`.
- `npm run build` passed.
- `npm run verify:routing` passed.
- Local `dist` verification confirms the seven restored URLs are indexable, self-canonical, and in the sitemap.
- Local `dist` verification confirms the chia alias is generated with canonical `/chia-pudding-variations-for-breakfast/`, `noindex, follow`, and no sitemap entry.
- No GitHub workflow dispatch, D1 mutation, package install, commit, push, deploy, or Pinterest action was performed.

### T08 - Trailing Slash Canonical Normalization

Status: `done`

Claimed: 2026-05-19, Codex, investigate and normalize trailing-slash behavior for article and routed URLs.

Completed: 2026-05-19, Codex.

Goal: Decide and, if approved, implement a consistent canonical URL shape for article paths.

Scope:
- Investigate URLs where both slash and no-slash variants return 200.
- Confirm Astro, Cloudflare Pages, sitemap, canonical tags, and router behavior.
- Prefer 301 normalization only if it does not break Pinterest or existing aliases.

Deliverable:
- Decision note and implementation if approved.
- Verification for representative article, category, tag, alias, and pin-variant URLs.

Handoff:
- Decision: trailing-slash URLs are the canonical public shape, matching `trailingSlash: 'always'`, sitemap output, article canonical tags, and JSON-LD URLs.
- Implemented 301 normalization in `functions/[[path]].js` for valid static page requests that arrive without a trailing slash.
- Preserved query strings.
- Left API/static asset guard behavior unchanged.
- Unknown no-slash paths still return 404 instead of being blindly redirected.
- Smart router paths that do not exist as static pages continue through the existing router/proxy behavior.
- Added `docs/trailing-slash-canonical-normalization.md`.
- `npm run build` passed.
- `npm run verify:routing` passed.
- Mocked Function verification covered representative article, category, tag, alias/pin keyword, slash URL, and unknown no-slash URL behavior.
- No D1 mutation, workflow dispatch, deployment, commit, push, package install, or external publishing action was performed.

### T09 - First Safe Content Restart Batch

Status: `done`

Claimed: 2026-05-19, Codex, run first conservative content restart batch per restart runbook and pause before external mutations if needed.

Blocked: 2026-05-19, Codex, preflight completed; waiting for explicit approval to dispatch `pipeline-produce.yml` with `count=1` because it mutates production D1 pipeline topic state and pushes generated files to `staging`.

Resumed: 2026-05-19, Codex, user approved workflow dispatch for first safe content restart batch.

Blocked: 2026-05-19, Codex, `pipeline-produce.yml` run `26074405672` failed in `Produce articles` before marking topics produced or pushing to `staging`; the GitHub checkout is missing runtime files under `scripts/NEW_PIPELINE_2026-05-08`, first failing on `ModuleNotFoundError: No module named 'stage_1_5'`.

Blocked: 2026-05-19, Codex, first restarted article batch is generated, QA-polished, and deployed on staging; waiting for explicit approval before production promotion.

Completed: 2026-05-19, Codex, promoted reviewed staging batch to production and verified the live article.

Goal: Run the first conservative content restart batch according to `docs/content-restart-runbook.md`.

Scope:
- Use manual `pipeline-produce.yml` with `count=1` only after user approval.
- Review generated article, image, metadata, and route on `staging`.
- Promote to production only after the review gates pass.
- Do not approve new pins in the same pass.

Deliverable:
- One approved article promoted safely, or a blocked report with exact failure reason.
- Update runbook/worklog with what happened.

Handoff:
- Read `AGENTS.md`, `docs/WORKLOG-CODEX.md`, `docs/CODEX-TASKBOARD.md`, `docs/content-restart-runbook.md`, `docs/staging-environment.md`, `.github/workflows/pipeline-produce.yml`, and `.github/workflows/promote-staging.yml`.
- Confirmed GitHub CLI is authenticated with `workflow` scope.
- Latest listed production `Deploy Cloudflare Pages` run on `main` is green.
- `npm run build:checked` passed locally.
- User approved dispatching `pipeline-produce.yml` with `count=1`.
- GitHub Actions run `26074405672` selected topic `how to store garlic` and failed during the write stage because `scripts/NEW_PIPELINE_2026-05-08/write.py` imports `stage_1_5`, but that package is not present in the GitHub checkout under the new pipeline directory.
- Pipeline hardening commits on `main` added the missing restart runtime files, tolerated missing seeded-topic tables, initialized review/brief SQLite schemas, moved D1 marking after staging push, fetched full staging history, installed Pillow, made image failures hard failures, merged `main` into the staging workspace before generation, and configured Git identity before staging merge.
- Early failed runs exposed two D1/state risks: `how to store garlic` and `best way to cook corn on the cob` were marked produced during pre-hardening attempts but did not remain deployed on staging after cleanup.
- Reverted the incomplete corn staging commit from `staging`.
- Successful generation run `26075080660` produced `best-way-to-cook-chicken`, generated the hero image and four pin images, pushed staging commit `aace8d0`, marked the topic produced, and synced D1.
- QA polish commit `e506b2f` on `staging` shortened the image alt text, removed duplicate `onion powder`, and replaced a stale phrase in the article body.
- Staging deploy run `26075535665` passed and published `https://staging.daily-life-hacks.pages.dev`.
- Verified live staging: article URL returns 200, homepage includes the new article, hero image returns 200, and all four generated pin images return 200.
- Promotion run `26075981052` passed, including `npm run build:checked`, and fast-forwarded `main` to reviewed `staging`.
- Production deploy run `26076036864` passed.
- Verified live production: `https://daily-life-hacks.com/best-way-to-cook-chicken/` returns 200, homepage includes the new article, and the hero image returns 200.
- No Pinterest action was performed.

### T10 - Staging D1 Isolation

Status: `done`

Claimed: 2026-05-28, Codex, verify current staging queue behavior while preparing the full D1 isolation work.

Completed: 2026-05-28, Codex.

Goal: Prevent staging dashboard/API tests from mutating production D1 state.

Scope:
- Design the Preview `DB` binding strategy.
- Identify required Cloudflare Pages settings and Wrangler/D1 steps.
- Implement only after explicit user approval because this touches Cloudflare state.

Deliverable:
- Either a precise setup checklist or implemented isolation with verification.

Completed:
- Created `dlh-subscriptions-staging` D1 database.
- Applied schema and added `staging_pins_schedule` to `schema.sql`.
- Seeded staging with pipeline topics/articles/pins and staging pending pins only.
- Added `wrangler.toml` so Preview binds `DB`/`D8` to `dlh-subscriptions-staging`; Production keeps `DB`/`D8` on `dlh-subscriptions`.
- No production subscribers, analytics events, or Pinterest OAuth/token data were copied.

Verification:
- `npm run build` passed.
- `npx wrangler pages functions build ...` passed.
- D1 count checks show staging has pipeline data and zero `funnel_events`, while production keeps the existing analytics events.
- Live Preview isolation check passed: POST to `https://staging.daily-life-hacks.pages.dev/api/event` wrote `codex_staging_d1_isolation` to `dlh-subscriptions-staging` (`cnt=1`) and production `dlh-subscriptions` stayed unchanged (`cnt=0`).
- Staging article and pin image smoke checks returned 200 after deployment.

### T11 - Conservative New Pin Reintroduction

Status: `open`

Goal: Reintroduce new pins carefully after the first restarted article is live.

Scope:
- Approve only one new pin for the restarted article.
- Verify destination URL, canonical behavior, image URL, and D1 status.
- Wait for at least 48 hours before expanding volume.

Deliverable:
- One-push pin reintroduction report, or a blocked note if Pinterest/account conditions are still unsafe.
