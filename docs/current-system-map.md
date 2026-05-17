# Daily Life Hacks: Current System Map

Date: 2026-05-16
Status: Working map, based on local repo inspection and read-only Cloudflare D1 checks.

## Purpose

This document records the current live operating system for Daily Life Hacks.
It separates production flows, staging, D1 state, GitHub Actions, Cloudflare Functions,
and the new AI pipeline so future work can be done deliberately instead of by guesswork.

## Production Surface

Production site:

- Domain: `daily-life-hacks.com`
- Stack: Astro 5 + Tailwind CSS v4
- Hosting: Cloudflare Pages
- Production branch: `main`
- Current production deploy source checked during setup: `76ba00c`

Production deploy workflow:

- File: `.github/workflows/deploy-cloudflare-pages.yml`
- Trigger: push to `main`, scheduled daily rebuild, and manual dispatch
- Build command: `npm run build`
- Deploy command: `pages deploy dist --project-name=daily-life-hacks --branch=${{ github.ref_name }}`

Production promotion workflow:

- File: `.github/workflows/promote-staging.yml`
- Trigger: manual dispatch only.
- Confirmation required: `PROMOTE`.
- Behavior: checks out `staging`, runs `npm ci` and `npm run build:checked`, then fast-forwards `main` to `staging`.
- Safety: fails before production if the staging build/routing check fails, or if `main` cannot be fast-forwarded cleanly to `staging`.

## Staging Surface

Staging branch:

- Branch: `staging`
- Cloudflare environment: Preview
- Current staging URL: `https://77f0167e.daily-life-hacks.pages.dev`
- Current staging purpose: site, build, router, and content validation

Important limitation:

- Staging does not yet have a separate D1 database.
- Dashboard actions and API endpoints still point at production behavior unless explicitly changed.
- Do not use staging dashboard buttons for real pipeline tests until the dashboard/API layer is made staging-aware.

## D1 Database

Cloudflare D1 database:

- Name: `dlh-subscriptions`
- Binding name in Cloudflare Pages: `DB`
- Observed remote database id: `dca15f47-7be7-441f-81ab-f08dfb707226`

Live table state observed on 2026-05-16:

| Table | State | Count |
|---|---:|---:|
| `articles_schedule` | `PUBLISHED` | 48 |
| `articles_schedule` | `PENDING` | 1 |
| `articles_schedule` | `DUPLICATE` | 1 |
| `pins_schedule` | `POSTED` | 291 |
| `pins_schedule` | `PENDING` | 51 |
| `pipeline_topics` | `approved` | 119 |
| `pipeline_topics` | `produced` | 4 |

Key interpretation:

- The live site content should be treated as `src/data/articles/*.md`, not as `articles_schedule`.
- `articles_schedule` is legacy/compatibility publishing state, not the full source of live articles.
- `pins_schedule` is active production state for the Pinterest auto-poster.
- `pipeline_topics` contains a large approved backlog. Producing from this queue can create and push new content.

## Live Articles And Pinterest State

Current verified map from the committed audit:

- Live articles in repo: 140
- Live Pinterest pins mapped from local Pinterest inventory: 345
- Pending scheduled pins in D1 at audit time: 53
- Total tracked pin records at audit time: 398
- Unique pin slugs tracked at audit time: 239
- Pending pins with valid slug and asset at audit time: 53
- Pending pin page HTTP failures at audit time: 0
- Pending pin image HTTP failures at audit time: 0

After the audit, D1 showed 51 pending pins and 291 posted pins, which means the auto-poster continued working.

## Production GitHub Actions

### Deploy Cloudflare Pages

File:

- `.github/workflows/deploy-cloudflare-pages.yml`

Role:

- Builds and deploys the static site to Cloudflare Pages.
- Now supports both `main` and `staging`.

Risk:

- Low. It builds the current repository state and deploys it.

### Pinterest Auto-Poster

File:

- `.github/workflows/post-pins.yml`

Script:

- `scripts/post-pins.py`

Schedule:

- Every 30 minutes.

External systems:

- Pinterest API
- Cloudflare Functions
- Cloudflare D1
- GitHub secrets

Primary API endpoints:

- `GET /api/pins-next`
- `POST /api/pins-mark-posted`
- `POST /api/pins-mark-failed`

Role:

- Pulls the next due `PENDING` pin from `pins_schedule`.
- Posts it to Pinterest.
- Marks the D1 row as `POSTED` or `FAILED`.

Risk:

- High production importance, but currently working.
- Should not be paused or changed casually.
- Needs a future safety layer, but that is a follow-up after mapping.

### Daily Article Publisher

File:

- `.github/workflows/publish-articles.yml`

Script:

- `scripts/publish-articles.py`

Schedule:

- Daily at 07:00 UTC.
- Also manually triggered by the dashboard through `pipeline-trigger`.

Primary API endpoint:

- `GET /api/articles-due`

Role:

- Reads due rows from `articles_schedule`.
- Publishes articles by committing Markdown into `src/data/articles`.
- Marks D1 rows as published.

Risk:

- Medium to high.
- It is production-affecting because it can commit articles to `main`.
- Current D1 state shows only one pending article in `articles_schedule`.

### Pipeline Discover

File:

- `.github/workflows/pipeline-discover.yml`

Scripts:

- `scripts/NEW_PIPELINE_2026-05-08/discover_gsc.py`
- `scripts/NEW_PIPELINE_2026-05-08/discover_autocomplete.py`
- `scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py`

Schedule:

- Every Monday at 06:00 UTC.
- Manual dispatch supported.

Role:

- Discovers topics and pushes filtered topics into D1 `pipeline_topics`.

Risk:

- Medium.
- It changes D1 topic backlog, not the live site directly.

### Pipeline Produce

File:

- `.github/workflows/pipeline-produce.yml`

Script:

- `scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py`

External systems:

- OpenRouter
- fal.ai
- Cloudflare D1
- GitHub

Role:

- Pulls approved topics from D1.
- Produces articles and images.
- Syncs pipeline status to D1.
- Commits generated files to `staging`.
- Fails the workflow if any selected topic fails generation, so failed topics are not marked `produced`.

Risk:

- High.
- It can generate files and update production D1 pipeline status.
- It no longer pushes generated files directly to production.
- A separate manual promotion step from `staging` to `main` is still needed.

### Pipeline Daily

File:

- `.github/workflows/pipeline-daily.yml`

Schedule:

- Manual dispatch only as of 2026-05-17.
- The previous daily schedule at 05:00 UTC was removed during stabilization.

Role:

- Pulls up to 2 approved topics from D1.
- Runs the new pipeline.
- Commits generated files to `staging`.
- Fails the workflow if any selected topic fails generation, so failed topics are not marked `produced`.

Risk:

- Very high.
- This AI production pipeline can still update production D1 pipeline status.
- It is intentionally not scheduled.
- Generated files go to staging first while manual approval and promotion flow are being implemented.

## Cloudflare Functions

Critical production endpoints:

- `functions/api/pins-next.js`
- `functions/api/pins-mark-posted.js`
- `functions/api/pins-mark-failed.js`
- `functions/api/pins-status.js`
- `functions/api/articles-due.js`
- `functions/api/articles-publish.js`
- `functions/api/pipeline-trigger.js`
- `functions/api/pipeline-topics.js`
- `functions/api/pipeline-sync.js`
- `functions/api/pipeline-status.js`

Routing and analytics:

- `functions/[[path]].js` handles smart routing fallback and Pinterest hit logging.

Important observation:

- `functions/api/pipeline-trigger.js` dispatches GitHub Actions with `ref: "main"`.
- That is intentional so GitHub can read the workflow files from the default branch.
- The endpoint now returns each action's `outputBranch` and effect.
- `produce` dispatches from `main`, but generated files are pushed to `staging` by the workflow.
- `publish` is still the legacy production publisher and can write to `main`.
- The dashboard now labels these effects and asks for confirmation before triggering pipeline actions.

## New AI Pipeline

Official active new pipeline directory:

- `scripts/NEW_PIPELINE_2026-05-08/`

Core scripts:

- `run_pipeline.py`
- `write.py`
- `judge_articles.py`
- `generate_hero_brief.py`
- `generate_pin_briefs.py`
- `generate_images.py`
- `generate_pin_images.py`
- `generate_pinterest_csv.py`
- `sync_to_d1.py`
- `sync_pipeline_to_d1.py`
- `sync_router_mapping.py`

Provider integrations:

- OpenRouter:
  - `stage_1_5/openrouter.py`
  - `write.py`
  - `generate_hero_brief.py`
  - `generate_pin_briefs.py`
  - `filter_topics.py`
  - `topic_research/stage2.py`
- fal.ai:
  - `generate_images.py`
  - `generate_pin_images.py`
  - related `fal_client` imports

Important classification:

- Do not delete or archive this directory.
- It is the current intended pipeline, even if parts still need hardening.
- `generate_pinterest_csv.py` writes native `/api/pins-upload` rows with explicit `row_id`, `image_url`, and `link` values based on `pin_slug`, instead of relying on the legacy `{article_slug}_vN` fallback.

## Current Operational Risks

1. `pipeline-daily.yml` can generate content and update production D1 state when manually triggered.
2. `pipeline-produce.yml` can generate content and update production D1 state when manually triggered.
3. `pipeline-trigger.js` always dispatches workflows on `main`, including from any dashboard context.
4. Staging currently validates the site build, but not isolated D1/runtime behavior.
5. There are many dirty/untracked/deleted files in the local working tree that should not be mixed into stabilization commits.
6. `package.json` and `package-lock.json` currently have pre-existing local modifications not related to the staging work.

## Recommended Next Stabilization

Immediate next step:

- Build the generated-content review checklist on `staging`.

Practical options:

1. Keep `pipeline-daily.yml` manual only.
2. Keep AI production workflows pushing generated files to `staging` first.
3. Use `.github/workflows/promote-staging.yml` for manual promotion from `staging` to `main`.
4. Continue separating runtime D1 operations from generated-file promotion.

Recommended order:

1. Keep `pipeline-daily.yml` manual-only.
2. Keep Pinterest auto-poster running because it is working and has valid pending rows.
3. Keep `publish-articles.yml` as-is for now because there is only one pending legacy article and it is part of the older working flow.
4. Build the manual review path for generated articles and pins on `staging`.
5. Only then move D1 staging or split production/staging DB bindings.
