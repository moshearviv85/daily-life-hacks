# Daily Life Hacks Current System Map

Last updated: 2026-05-19
Task: T05
Status: current operating map for future Codex sessions

## Purpose

This is the single trusted map of the current `daily-life-hacks.com` system. It consolidates the live architecture, source-of-truth boundaries, deployment flow, automation flow, operational commands, and unsafe or deprecated paths.

Use this with:

- `AGENTS.md` for project rules and user preferences.
- `docs/WORKLOG-CODEX.md` for recent handoff history.
- `docs/CODEX-TASKBOARD.md` for task ownership.
- Focused runbooks under `docs/` when doing a specific workflow.

## System Identity

- Site: `https://www.daily-life-hacks.com`
- Stack: Astro 5, Tailwind CSS v4, Cloudflare Pages, Cloudflare Pages Functions, Cloudflare D1.
- Repository: `github.com/moshearviv85/daily-life-hacks`
- Production branch: `main`
- Staging branch: `staging`
- Content language: English for a US audience.
- Assistant/user communication: Hebrew.
- Brand color: `#F29B30`

## Source Of Truth

| Area | Source of truth | Notes |
|---|---|---|
| Live article Markdown | Git: `src/data/articles/*.md` on `main` | D1 article rows are queue/runtime state, not the canonical copy of live content. |
| Live images | Git: `public/images/` on `main` | Hero images use `{slug}-main.jpg`; pin images live under `public/images/pins/`. |
| Article schema | `src/content.config.ts` | Required fields include title, excerpt, category, tags, image, imageAlt, date; author is optional in code but normally expected by project convention. |
| Routing aliases | Git: `pipeline-data/slug-aliases.json` and `pipeline-data/router-mapping.json` | Used by smart routing and pin/alias behavior. |
| Production queues and approvals | Cloudflare D1 binding `DB` | D1 owns article/pin schedule state, pipeline topic backlog, dashboard state, analytics cache, ratings, subscriptions. |
| Topic backlog | D1 table `pipeline_topics` | Local SQLite is not the backlog authority. |
| Generation workbench | `pipeline-data/topic-research.sqlite` | Temporary/job-local cache for pipeline runs and debugging. |
| Task coordination | `docs/CODEX-TASKBOARD.md` | Claim one open task before implementation work. |

## Important Data Stores

Cloudflare D1 binding:

- Binding name: `DB`
- Known database name from prior audit: `dlh-subscriptions`
- Schema file: `schema.sql`

Core D1 tables:

- `subscriptions`: newsletter signups and Kit response data.
- `funnel_events`: server-side page views and funnel attribution.
- `pinterest_hits`: smart-router hit logs.
- `article_ratings`: rating widget state.
- `articles_schedule`: legacy/manual article publishing queue.
- `pins_schedule`: production Pinterest posting queue.
- `pipeline_topics`: discovered topic backlog and approval state.
- `pipeline_articles`: generation lifecycle status.
- `pipeline_pins`: pin brief and image status.
- `pinterest_trends_cache` and `pinterest_analytics_cache`: dashboard caches.

Current status model:

- New article uploads start as `REVIEW`.
- Dashboard approval moves article rows to `APPROVED`.
- Article publishers read `APPROVED` plus legacy `PENDING`.
- New pin uploads start as `REVIEW`.
- Dashboard approval moves pin rows to `PENDING`.
- Pinterest auto-poster reads only `PENDING`.

## Cloudflare Pages And Functions

Cloudflare Pages deploys the built Astro site and a bundled Pages Functions worker.

Build and deploy workflow:

- Workflow: `.github/workflows/deploy-cloudflare-pages.yml`
- Triggers: push to `main`, push to `staging`, daily scheduled rebuild, manual dispatch.
- Build command: `npm run build`
- Functions bundle command: `npx wrangler pages functions build functions ...`
- Worker output copied to `dist/_worker.js`
- Deploy command: `pages deploy dist --project-name=daily-life-hacks --branch=${{ github.ref_name }}`
- Concurrency is branch-specific.

Catch-all function:

- File: `functions/[[path]].js`
- Redirects `daily-life-hacks.com` to `www.daily-life-hacks.com`.
- Lets static assets and `/api/*` pass through.
- Checks `ROUTES_KV` for smart-route entries.
- Supports legacy `-vN` pin route fallback.
- Logs page views to `funnel_events`.
- Logs smart-route hits to `pinterest_hits`.
- Proxies internal pin/alias pages to the base article and sets `X-Robots-Tag: noindex, follow`.
- Canonical article pages should be served normally and indexable.

Critical API groups:

- Article queue: `articles-upload`, `articles-list`, `articles-set-status`, `articles-due`, `articles-publish`, `articles-trigger`, `articles-export`.
- Pin queue: `pins-upload`, `pins-status`, `pins-set-status`, `pins-next`, `pins-mark-posted`, `pins-mark-failed`, `pins-reschedule`, `pins-posted`, `pins-trigger`.
- Pipeline: `pipeline-trigger`, `pipeline-topics`, `pipeline-sync`, `pipeline-status`.
- Dashboard and metrics: `dashboard`, `stats`, `analytics`, `analytics-trigger`, `agent-scan`, `event`, `rating`.
- Pinterest OAuth/demo/analytics: `pinterest-*`.
- Newsletter: `subscribe`.

## Branches And Environments

Production:

- Branch: `main`
- URL: `https://www.daily-life-hacks.com`
- Deploys through Cloudflare Pages production.

Staging:

- Branch: `staging`
- Environment: Cloudflare Pages Preview.
- Current documented preview URL: `https://77f0167e.daily-life-hacks.pages.dev`
- Intended for static site, generated content, image, routing, and build review.

Staging limitation:

- Preview runtime is not D1-isolated yet.
- Pages Functions still use the `DB` binding.
- Dashboard/API actions on staging may mutate production D1.
- Do not use staging dashboard/API buttons for real tests until a separate Preview D1 binding exists.

Promotion:

- Workflow: `.github/workflows/promote-staging.yml`
- Manual only.
- Requires input `PROMOTE`.
- Checks out `origin/staging`.
- Runs `npm ci` and `npm run build:checked`.
- Fast-forwards `main` to `origin/staging`.
- Pushes `main`, which triggers production deployment.

## GitHub Actions Automation

### Deploy Cloudflare Pages

- File: `.github/workflows/deploy-cloudflare-pages.yml`
- Effect: builds and deploys `main` or `staging`.
- State-changing: yes, deploys Cloudflare Pages.
- Approval rule: ask unless the user explicitly approved deploy-related work.

### Promote Staging

- File: `.github/workflows/promote-staging.yml`
- Effect: fast-forwards `main` to `staging` after `PROMOTE` and build checks.
- State-changing: yes, production promotion.
- Approval rule: always get explicit user approval for the turn.

### Pipeline Discover

- File: `.github/workflows/pipeline-discover.yml`
- Schedule: Mondays at 06:00 UTC plus manual dispatch.
- Scripts: `discover_gsc.py`, `discover_autocomplete.py`, `filter_discovered_topics.py`.
- Effect: discovers and filters topics, then writes to production D1 `pipeline_topics`.
- State-changing: yes, D1 mutation.

### Pipeline Produce

- File: `.github/workflows/pipeline-produce.yml`
- Trigger: manual dispatch.
- Inputs: `count`, `category`.
- Target branch: `staging` via `PIPELINE_TARGET_BRANCH=staging`.
- Scripts: `scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py`, then `sync_pipeline_to_d1.py`.
- External services: OpenRouter and Fal.
- Effect: fetches approved D1 topics, generates articles/images/pins, marks topics produced, syncs pipeline status to D1, commits generated files to `staging`.
- State-changing: yes, external API spend, D1 mutation, Git push to `staging`.
- Current safe use: first restart batch should be `count=1`, then review staging before promotion.

### Pipeline Daily

- File: `.github/workflows/pipeline-daily.yml`
- Trigger: manual only.
- Target branch: `staging`.
- Effect: up to 2 approved topics from production D1, same generation path as produce.
- State-changing: yes.
- Status: keep manual-only while stabilization continues.

### Daily Approved Article Publisher

- File: `.github/workflows/publish-articles.yml`
- Schedule: daily at 07:00 UTC, plus historical one-off test cron entries and manual dispatch.
- Script: `scripts/publish-articles.py`
- Effect: reads due `APPROVED` plus legacy `PENDING` rows through `/api/articles-due`, commits Markdown to `main`, marks rows published.
- State-changing: yes, writes to production Git and D1.
- Classification: legacy/manual article queue path. New AI-generated content should use staging and promotion first.

### Pinterest Auto-Poster

- File: `.github/workflows/post-pins.yml`
- Schedule: every 30 minutes plus manual dispatch.
- Script: `scripts/post-pins.py`
- Effect: gets next due `PENDING` pin, posts to Pinterest, marks row `POSTED` or `FAILED`.
- Safety: scheduled run max 2 pins; manual `immediate=true` max 1 pin; stops after Pinterest API failure.
- State-changing: yes, Pinterest and D1.
- Classification: active production automation. Do not change volume aggressively while reach is suppressed.

### Pinterest Analytics Fetcher

- File: `.github/workflows/fetch-analytics.yml`
- Schedule: every 6 hours plus manual dispatch.
- Script: `scripts/fetch-pinterest-analytics.py`
- Effect: fetches Pinterest analytics and saves dashboard cache through protected API.
- State-changing: yes, D1 cache update and possible token refresh secret update.

## Active Pipeline

Official active pipeline directory:

- `scripts/NEW_PIPELINE_2026-05-08/`

Core pipeline scripts:

- `run_pipeline.py`: orchestrates article generation, review, briefs, images, and outputs.
- `write.py`: article writing through OpenRouter.
- `judge_articles.py` and `stage_1_75/`: review and compliance checks.
- `generate_hero_brief.py`: hero prompt and alt brief.
- `generate_pin_briefs.py`: pin title/description/prompt briefs.
- `generate_images.py`: hero image generation through Fal/Recraft.
- `generate_pin_images.py`: pin image generation through Fal/GPT image model path.
- `generate_pinterest_csv.py`: prepares pin CSV rows.
- `sync_pipeline_to_d1.py`: syncs lifecycle status to D1.
- `sync_to_d1.py`: uploads article/pin CSV rows to D1 queue endpoints.
- `sync_router_mapping.py`: updates routing/alias data for generated pins.

Pipeline outputs:

- Articles: `src/data/articles/{slug}.md`
- Hero images: `public/images/{slug}-main.jpg`
- Pin images: `public/images/pins/{slug}_v1.jpg` through `_v4.jpg`
- Router/alias data: `pipeline-data/router-mapping.json`, `pipeline-data/slug-aliases.json`
- Logs/artifacts: `pipeline-data/*.json`, `pipeline-data/*.jsonl`, local SQLite cache.

Important guardrails:

- Do not treat local SQLite as durable production truth.
- Do not run OpenRouter/Fal generation locally without explicit approval.
- Do not run `sync_to_d1.py` without explicit approval because it mutates production queues.
- Review generated files on `staging` before promotion to `main`.
- Do not approve new pins until the target article is live in production.

## Deprecated Or Unsafe Paths

Treat these as non-production unless a task explicitly revives them:

- `scripts/archive/`
- `scripts/_archive/`
- `scripts/openrouter-fal/`
- `scripts/NEW_PIPELINE/`
- `scripts/TEST_SCRIPTS/`
- Root-level deleted legacy scripts currently visible in the dirty worktree.
- Old Publer/n8n archives under archive folders.

Do not delete or clean these during unrelated work. The worktree has many unrelated deletions and untracked files; stage exact files only.

## Operational Commands

Read-only/safe checks:

```bash
git status --short
rg --files
rg "pattern" path
npm run verify:routing
```

Local build verification:

```bash
npm run build
npm run build:checked
```

Local development:

```bash
npm run dev
npm run preview
```

Production-only scripts in `package.json`:

```bash
npm run deploy:prod
npm run release:prod
```

Do not run production deploy/release commands unless the user explicitly approves that turn.

State-changing operations that require explicit approval:

- Any source edit unless the user gave a concrete task for the change.
- `git commit`, `git push`, staging files, branch operations.
- `npm install` or package changes.
- `npx wrangler`, D1 writes, or Cloudflare deploys.
- GitHub workflow dispatches.
- OpenRouter/Fal generation runs.
- Pinterest posting or token changes.
- Email/newsletter sends or Kit mutations.

## Environment Variables And Secrets

Cloudflare runtime variables:

- `DB`: D1 binding.
- `STATS_KEY`: protects stats, queue, pin, article, analytics, and pipeline sync endpoints.
- `DASHBOARD_PASSWORD`: protects dashboard and pipeline topic/trigger endpoints.
- `KIT_API_KEY`: used by `/api/subscribe`.
- `GH_PAT`: used by Cloudflare functions that dispatch workflows or commit via GitHub API.
- `ROUTES_KV`: optional smart-route KV binding.
- `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `PINTEREST_REFRESH_TOKEN`: Pinterest OAuth/posting.
- `PINTEREST_DEMO_COOKIE_SECRET`, `PINTEREST_DEMO_ACCESS_KEY`, `PINTEREST_DEMO_SCOPES`: demo/OAuth utilities.

GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `GH_PAT`
- `STATS_KEY`
- `DASHBOARD_PASSWORD`
- `OPENROUTER_API_KEY`
- `FAL_KEY`
- `GSC_SERVICE_ACCOUNT_JSON`
- `PINTEREST_APP_ID`
- `PINTEREST_APP_SECRET`
- `PINTEREST_REFRESH_TOKEN`

## Restarting Content Safely

Use `docs/content-restart-runbook.md` as the detailed checklist.

Short version:

1. Keep `pipeline-daily.yml` manual-only.
2. Dispatch `pipeline-produce.yml` only with explicit approval.
3. First restart batch: `count=1`.
4. Generated files land on `staging`.
5. Review article, images, routing, and build.
6. Promote with `promote-staging.yml` only after explicit approval.
7. Approve pins only after the production article URL is live.
8. Start with one new pin, then wait at least 48 hours before approving more from that batch.

## Current Known Risks

- Staging is not D1-isolated; dashboard/API actions can affect production state.
- `pipeline-produce.yml` and `pipeline-daily.yml` write generated files to `staging` but can still mutate production D1.
- `publish-articles.yml` is a legacy production publisher that can write directly to `main`.
- `pipeline-trigger.js` dispatches workflows from `main`; this is required for GitHub to find workflows, but the effects differ by action.
- The local worktree contains many unrelated deletions, untracked files, and previous modifications. Do not stage broadly.
- Pinterest reach is suppressed; avoid posting-volume changes unless explicitly requested.

## Related Runbooks

- `docs/pipeline-migration-source-of-truth.md`: detailed source-of-truth decision and migration plan.
- `docs/manual-approval-publishing-flow.md`: article and pin review/approval model.
- `docs/staging-environment.md`: staging and production promotion details.
- `docs/content-restart-runbook.md`: conservative generation restart process.
- `docs/pinterest-auto-poster.md`: Pinterest posting implementation notes.
- `docs/cloudflare-pages-vars.md`: Cloudflare variable setup notes.
- `docs/analytics-events.md`: analytics event documentation.

## New Assistant Startup Checklist

1. Read `AGENTS.md`.
2. Read `docs/WORKLOG-CODEX.md`.
3. Read `docs/CODEX-TASKBOARD.md`.
4. Read this map if the task touches architecture, pipeline, deployment, D1, or automation.
5. Claim the first `open` task unless the user named a specific task.
6. Work on exactly one task.
7. Update the taskboard and worklog when done.
