# Daily Life Hacks: System Stabilization and Cloud Migration Plan

Status: Draft v0.3  
Date: 2026-05-16  
Scope: mapping, stabilization, and migration planning. No cleanup or deletion is implied by this document.

## Purpose

Daily Life Hacks has grown through several working generations: CSV-based publishing, local script experiments, SQLite workbench development, GitHub Actions automation, Cloudflare Pages Functions, D1, Pinterest automation, OpenRouter, and fal.ai image generation.

The goal of this plan is to turn the current system into a clear, stable, cloud-first operating model without breaking the working production flows.

Primary goals:

- Preserve the currently working site and Pinterest auto-publishing.
- Identify the active production flows.
- Mark the official new pipeline.
- Protect critical AI provider code from accidental cleanup.
- Separate active systems from legacy systems.
- Prepare for staging and cloud migration.
- Create a safe basis for future improvements.

## Operating Rules

- Do not delete files during mapping.
- Do not commit or push without explicit approval.
- Do not change production behavior without a checkpoint.
- Treat Git, D1, Cloudflare, GitHub Actions, and SQLite as separate layers with different responsibilities.
- Keep CSV support only as legacy compatibility unless explicitly revived.
- Stabilize before adding new features.

## Current System Generations

### Generation 1: CSV Operations

The first working system used generated CSV files as the handoff format.

Article flow:

1. A script generated article CSV.
2. The CSV was uploaded through the dashboard.
3. Cloudflare/D1 stored rows in `articles_schedule`.
4. A daily publisher released articles over time.

Pinterest flow:

1. A script generated pin CSV.
2. The CSV was uploaded through the dashboard.
3. Cloudflare/D1 stored rows in `pins_schedule`.
4. GitHub Actions posted pins automatically.

Current status: legacy compatibility. Useful as a fallback, not the desired long-term source of truth.

### Generation 2: Transition Layer

As CSV became fragile for AI-generated outputs, the system began moving toward SQLite and structured pipeline data.

This stage produced useful code, but also most of the current ambiguity:

- Multiple script folders.
- Router mapping repair scripts.
- Slug alias repair scripts.
- Pinterest audit scripts.
- Recovery files.
- Local generated artifacts.
- Older pipeline variants.

Current status: mixed. Some files are important; many are historical. Do not delete blindly.

### Generation 3: New Pipeline

The new intended pipeline is centered on:

`scripts/NEW_PIPELINE_2026-05-08`

The local SQLite file:

`pipeline-data/topic-research.sqlite`

acts as the current workbench for the new pipeline.

Current status: official new pipeline, unless later evidence says otherwise.

## Production Core

These areas are considered active and essential.

### Site

- `src/`
- `public/`
- `astro.config.mjs`
- `package.json`
- `src/content.config.ts`
- `src/data/articles/*.md`
- `public/images/*-main.jpg`
- `public/images/pins/*.jpg`

The site is Astro 5 + Tailwind CSS v4 and is deployed through Cloudflare Pages.

### Cloudflare Pages Functions

Critical function areas:

- `functions/[[path]].js`
- `functions/api/subscribe.js`
- `functions/api/rating.js`
- `functions/api/dashboard.js`
- `functions/api/pins-*`
- `functions/api/articles-*`
- `functions/api/pipeline-*`
- `functions/api/event.js`
- `functions/api/stats.js`

### D1

`schema.sql` is the schema reference.

Production runtime state lives in Cloudflare D1.

Important D1 tables include:

- `subscriptions`
- `funnel_events`
- `article_ratings`
- `pins_schedule`
- `articles_schedule`
- `pipeline_topics`
- `pipeline_articles`
- `pipeline_pins`
- `pinterest_hits`
- `pinterest_analytics_cache`
- `pinterest_trends_cache`

### GitHub Actions

Currently important workflows:

- `.github/workflows/deploy-cloudflare-pages.yml`
- `.github/workflows/post-pins.yml`
- `.github/workflows/fetch-analytics.yml`
- `.github/workflows/pipeline-discover.yml`
- `.github/workflows/pipeline-produce.yml`
- `.github/workflows/pipeline-daily.yml`
- `.github/workflows/publish-articles.yml`

## Active Pinterest Publishing Flow

Pinterest auto-publishing is currently active and cloud-run.

Flow:

1. D1 table `pins_schedule` contains scheduled pins.
2. `functions/api/pins-next.js` returns the next due pin.
3. `.github/workflows/post-pins.yml` runs on schedule.
4. The workflow runs `scripts/post-pins.py`.
5. `scripts/post-pins.py` posts to the Pinterest API.
6. Success is recorded through `functions/api/pins-mark-posted.js`.
7. Failures are recorded through `functions/api/pins-mark-failed.js`.

Operational source of truth:

- D1 `pins_schedule`

Current publisher:

- `.github/workflows/post-pins.yml`
- `scripts/post-pins.py`

Legacy input:

- `functions/api/pins-upload.js` accepts CSV uploads.

Important note:

The current Pinterest auto-poster itself does not depend on the local computer for scheduled runs.

## Active Article Publishing Flow

The current article publisher is a GitHub Action that runs a script which wakes/calls Cloudflare.

Flow:

1. D1 table `articles_schedule` contains scheduled articles.
2. `.github/workflows/publish-articles.yml` runs on schedule or manually.
3. The workflow runs `scripts/publish-articles.py`.
4. The script calls the Cloudflare/API layer.
5. Cloudflare/D1 provide runtime state and publishing decisions.
6. The article is committed/published through GitHub.
7. Cloudflare Pages deploys the updated site.

Operational source of truth:

- D1 `articles_schedule`

Orchestrator:

- `.github/workflows/publish-articles.yml`

Publisher script:

- `scripts/publish-articles.py`

Cloudflare API layer:

- `functions/api/articles-*`

Important note:

`functions/api/articles-publish.js` is also used directly by dashboard manual publish controls. The scheduled daily publisher is still the GitHub Actions path, but the dashboard has an active manual bypass that publishes through Cloudflare directly.

Known article publishing paths:

- Scheduled batch path: `.github/workflows/publish-articles.yml` -> `scripts/publish-articles.py` -> `/api/articles-due` and `/api/articles-set-status`.
- Manual dashboard path: `src/pages/dashboard.astro` -> `/api/articles-publish`.

## Official New Pipeline

Official pipeline folder:

`scripts/NEW_PIPELINE_2026-05-08`

This is the main pipeline to stabilize and evolve.

### Expected Stages

Discover topics:

- `discover_gsc.py`
- `discover_autocomplete.py`
- `filter_discovered_topics.py`
- `topic_research/stage1.py`
- `topic_research/stage2.py`

Write article:

- `write.py`
- `write_prompt.py`
- `stage_1_5/*`
- `lib/prompt_builder.py`
- `lib/voice.md`

Review and validation:

- `run_pipeline.py`
- `review_prompt.py`
- `judge_articles.py`
- `validate_article.py`
- `test_validate_article.py`
- `stage_1_75/*`
- `lib/validator.py`
- `lib/content_policy.py`
- `lib/medical_validator.py`

Generate briefs:

- `generate_hero_brief.py`
- `generate_pin_briefs.py`
- `lib/hero_brief.py`
- `lib/pin_brief.py`
- `lib/brief_store.py`

Generate images:

- `generate_images.py`
- `generate_pin_images.py`
- `lib/image_resize.py`

Deploy/sync:

- `bulk_deploy_articles.py`
- `sync_pipeline_to_d1.py`
- `sync_to_d1.py`
- `sync_router_mapping.py`
- `generate_pinterest_csv.py`

## Critical AI Provider Layer

This layer is active and must not be deleted, moved, or archived without a specific replacement plan.

### OpenRouter

OpenRouter is used for article writing, article review, topic filtering, prompt/brief generation, and validation.

Critical files:

- `scripts/NEW_PIPELINE_2026-05-08/stage_1_5/openrouter.py`
- `scripts/NEW_PIPELINE_2026-05-08/stage_1_5/writer.py`
- `scripts/NEW_PIPELINE_2026-05-08/stage_1_5/select.py`
- `scripts/NEW_PIPELINE_2026-05-08/stage_1_5/prompt.py`
- `scripts/NEW_PIPELINE_2026-05-08/write.py`
- `scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py`
- `scripts/NEW_PIPELINE_2026-05-08/generate_hero_brief.py`
- `scripts/NEW_PIPELINE_2026-05-08/generate_pin_briefs.py`
- `scripts/NEW_PIPELINE_2026-05-08/filter_topics.py`
- `scripts/NEW_PIPELINE_2026-05-08/topic_research/stage2.py`
- `scripts/NEW_PIPELINE_2026-05-08/lib/medical_validator.py`

Current known text model:

- `google/gemini-2.5-flash`

Required secret:

- `OPENROUTER_API_KEY`

### fal.ai

fal.ai is used as the hub for image generation models.

Critical files:

- `experiments/pinterest-50/scripts/discovery/fal_client.py`
- `experiments/pinterest-50/scripts/discovery/models.py`
- `scripts/NEW_PIPELINE_2026-05-08/generate_images.py`
- `scripts/NEW_PIPELINE_2026-05-08/generate_pin_images.py`
- `scripts/NEW_PIPELINE_2026-05-08/lib/image_resize.py`

Current known image models:

- Hero images: `recraft-v4-pro`
- Pin images: `gpt-image-2`
- Fallback: `imagen-4-ultra`

Required secret:

- `FAL_KEY` or `FAL_API_KEY`

Important note:

`experiments/pinterest-50/scripts/discovery` is currently a live dependency of the official pipeline image generation. It must not be treated as disposable experiment code until the FAL client and model config are moved into the official pipeline folder or otherwise replaced.

## Data Ownership

### Git

Git should own:

- Source code.
- Astro pages and components.
- Cloudflare Functions.
- GitHub Actions.
- Schema reference.
- Published Markdown articles.
- Approved production images.
- Approved routing/config files.

Git should not own:

- Local secrets.
- Runtime SQLite databases, unless intentionally versioned as fixtures.
- Cache folders.
- Generated local logs.
- Unknown image artifacts.

### D1

D1 should own runtime/production state:

- Newsletter subscriptions.
- Funnel events.
- Ratings.
- Pin queue and statuses.
- Article queue and statuses.
- Pipeline topics/articles/pins.
- Pinterest analytics.
- Router hit analytics.

### SQLite

Current local workbench:

- `pipeline-data/topic-research.sqlite`

Current role:

- Pipeline workbench.
- Stores generated article drafts, reviews, briefs, pin briefs, image generation state, and local pipeline outputs.

Important note:

This file currently contains real working data and must not be deleted during cleanup.

Future question:

Decide whether SQLite remains the local workbench, moves to a cloud-hosted workflow, or is gradually replaced by D1-backed pipeline state.

### JSON and JSONL

Important files requiring individual classification:

- `pipeline-data/slug-aliases.json`
- `pipeline-data/router-mapping.json`
- `pipeline-data/pin-images.jsonl`
- `pipeline-data/pinterest-audit-results.json`

These should not be deleted without knowing whether they are production inputs, audit outputs, or historical artifacts.

## Legacy and Historical Areas

Do not trust these as source of truth without checking, but do not delete during mapping.

- `scripts/archive`
- `scripts/_archive`
- `scripts/NEW_PIPELINE`
- `scripts/openrouter-fal`
- `scripts/TEST_SCRIPTS`
- `archive/2026-04-25-cleanup`
- `publer published`
- n8n/Publer workflows
- root recovery scripts such as `_recover_from_dist.py`

Special note:

`scripts/openrouter-fal` appears to contain related OpenRouter/FAL code. It should be compared against the official pipeline and `experiments/pinterest-50/scripts/discovery` before any archival decision.

## Media Inventory Problem

There are many images under:

- `public/images`
- `public/images/pins`

Not every image is necessarily production-relevant.

Known issue:

Pinterest API does not always return enough image filename information to directly map a live Pinterest pin back to a local image file.

Therefore, image cleanup requires a dedicated media inventory audit.

Possible classification targets:

- Used by live article.
- Used by live Pinterest pin.
- Referenced by D1 queue.
- Generated but never used.
- Unknown.

No image cleanup should happen before this classification exists.

## Known Gaps Found During Mapping

- Git working tree has hundreds of changes and is not currently a reliable signal.
- `package.json` references `scripts/verify-routing.mjs`, but that file was not found in `scripts/`.
- `package.json` references `scripts/audit-recipes.mjs`, but that file was not found.
- `functions/api/pipeline-trigger.js` references `pipeline-publish.yml`, but that workflow was not found.
- `publish-articles.yml` and `functions/api/articles-publish.js` need exact role confirmation, though the current understanding is that GitHub Actions orchestrates publishing.
- `experiments/pinterest-50/scripts/discovery` is a live dependency despite living under `experiments`.
- CSV upload flows still exist as compatibility layers.
- SQLite is still local.
- Some files contain mojibake/encoding issues.
- Images are not fully mapped to live usage.

## Stabilization Order

### Phase 1: Mapping Lock

Confirm this document as the current system map.

Output:

- Approved system map.
- Active/legacy/unknown classification.

### Phase 2: Read-Only Deep Audit

Inspect:

- Git status categories.
- Active workflow references.
- Missing package scripts.
- Cloudflare API endpoints.
- D1 table usage.
- SQLite table usage.
- Router and slug alias flows.
- Image inventory assumptions.

Output:

- List of actual breakages.
- List of safe fixes.
- List of risky areas requiring approval.

### Phase 3: Minimal Stabilization Fixes

Only after approval, fix broken references that are clearly wrong and low-risk.

Examples:

- Missing `verify-routing` script reference.
- Missing `audit-recipes` script reference.
- Incorrect workflow name in `pipeline-trigger.js`.
- Documentation gaps.

Output:

- Build/check commands can be trusted again.

### Phase 4: Git Cleanup Plan

Classify all Git changes into:

- Keep and commit.
- Ignore.
- Archive.
- Restore later.
- Delete only after explicit approval.
- Unknown.

Output:

- A clean, reviewable Git cleanup plan.

### Phase 5: Staging Plan

Implement a staging environment:

- `main` remains production.
- `staging` becomes the live testing branch.
- GitHub Actions deploys both `main` and `staging` through the same Cloudflare Pages project.
- The Cloudflare Pages deploy command passes the active Git branch to Wrangler, so `main` deploys production and `staging` deploys a preview/staging branch.
- Optional staging D1 database is deferred until the runtime data model is mapped; for now, staging is a site/build/router validation environment.
- Manual promotion to production means merging or copying approved changes from `staging` into `main`.

Output:

- Safe live testing path before production.
- Stable staging branch URL from Cloudflare Pages after first `staging` deployment.

### Phase 6: Cloud Migration Plan

Define where each piece should live:

- GitHub Actions.
- Cloudflare Pages Functions.
- Cloudflare D1.
- Cloudflare Workers/Cron, if useful.
- Local machine as management-only.
- SQLite workbench replacement or cloud-hosted equivalent.

Output:

- A plan to stop relying on local scripts for routine production output.

### Phase 7: Improvement Backlog

Only after stabilization:

- Pinterest Safety Layer.
- Media inventory tools.
- Better dashboard approval flow.
- Pipeline quality gates.
- Content QA.
- Internal linking.
- Lead magnet.
- Monetization.
- Staging-to-production release workflow.

## Approval Checkpoints

Before any state-changing work:

1. Present exact proposed change.
2. Explain why it is needed.
3. Explain risk.
4. Ask for approval.
5. Apply only that change.
6. Verify and report.

## Stabilization Log

### 2026-05-16: Routing and Build Verification

Completed:

- Restored `scripts/verify-routing.mjs` and `scripts/audit-recipes.mjs` from archive because they are referenced by active `package.json` commands.
- Fixed `functions/api/pipeline-trigger.js` so the dashboard `publish` trigger points to the active GitHub workflow: `publish-articles.yml`.
- Confirmed recipe audit passes: 140 posts scanned, 57 recipe posts, 0 missing recipe schema fields.
- Confirmed the live Pinterest connection: 345 live pins resolve to live site articles.
- Confirmed the pending Pinterest queue: 53 scheduled pins resolve to live site articles and their images are present.
- Verified all 53 pending pin page URLs and image URLs against the live site over HTTP.
- Identified 78 router variant slugs in `pipeline-data/router-mapping.json` that are not in `pipeline-data/slug-aliases.json`; these are not used by current live or pending pins and are treated as legacy warnings, not build blockers.
- Updated `scripts/verify-routing.mjs` to validate the actual built surface: article files plus slug aliases. Router variants that are not aliases remain visible as warnings.

Verification:

- `npm run build:checked` passed.
- `verify:routing` passed: 328 article/alias slugs verified against `dist/`.
- `verify:routing` warning: 78 router variant slugs are not present in `slug-aliases.json`.
- `pipeline-data/audit/07-live-and-pending-pinterest-to-article-map.json` captures the combined live + pending pin map.

## Current Position

The system is working, but its boundaries are unclear.

The immediate objective is not to rebuild it. The objective is to make the working system understandable enough that future changes stop creating accidental complexity.

Once the map is approved and the deep audit is complete, stabilization can begin safely.
