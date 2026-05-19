# Pipeline Migration Map And Source Of Truth

Date: 2026-05-18
Task: T01
Status: planning complete, no code migration performed

## Executive Decision

Daily Life Hacks now has three separate state layers:

1. Git is the source of truth for live site content and assets.
2. Cloudflare D1 is the source of truth for production queues, approvals, dashboard state, and Pinterest posting state.
3. `pipeline-data/topic-research.sqlite` is a temporary workbench and cache for AI generation details, not a durable production source of truth.

The migration should keep generation outputs reviewable in Git before production, while D1 owns operational state. Local SQLite can remain temporarily for dry-runs and debugging, but new production runs should not depend on a developer laptop.

## Current Pipeline Map

### Discovery And Topic Approval

Current cloud path:

- `.github/workflows/pipeline-discover.yml`
- `scripts/NEW_PIPELINE_2026-05-08/discover_gsc.py`
- `scripts/NEW_PIPELINE_2026-05-08/discover_autocomplete.py`
- `scripts/NEW_PIPELINE_2026-05-08/filter_discovered_topics.py`
- `functions/api/pipeline-topics.js`
- D1 table: `pipeline_topics`

External calls:

- Google Search Console in `discover_gsc.py`.
- Google Autocomplete in `discover_autocomplete.py`.
- D1 writes through `/api/pipeline-topics?action=add`.

Current source of truth:

- Approved topic backlog lives in production D1 `pipeline_topics`.
- The local SQLite `filtered_topics` table is now only a workbench table.

Observed local state:

- `pipeline-data/topic-research.sqlite` has only 1 `filtered_topics` row with status `approved`.
- This means local SQLite is not the complete topic backlog.

### Article Writing And Review

Current scripts:

- `scripts/NEW_PIPELINE_2026-05-08/run_pipeline.py`
- `scripts/NEW_PIPELINE_2026-05-08/write.py`
- `scripts/NEW_PIPELINE_2026-05-08/stage_1_5/openrouter.py`
- `scripts/NEW_PIPELINE_2026-05-08/review_prompt.py`
- `scripts/NEW_PIPELINE_2026-05-08/lib/validator.py`
- `scripts/NEW_PIPELINE_2026-05-08/lib/medical_validator.py`

External calls:

- OpenRouter chat completions in `write.py`, `run_pipeline.py` review stage, `generate_hero_brief.py`, `generate_pin_briefs.py`, and the medical validator.
- OpenRouter model catalog in `stage_1_5/openrouter.py`.

Current persistence:

- `write_outputs`
- `review_outputs`
- `write_runs`
- `review_runs`

Observed local state:

- 36 `write_outputs` rows, all status `reviewed`.
- 36 `review_outputs` rows, all status `ok`.

Risk:

- `run_pipeline.py` writes and reviews inside local SQLite before producing files.
- In GitHub Actions this SQLite database is recreated inside the workflow job, which is acceptable as a job-local cache, but not as production truth.

### Hero And Pin Briefs

Current scripts:

- `scripts/NEW_PIPELINE_2026-05-08/generate_hero_brief.py`
- `scripts/NEW_PIPELINE_2026-05-08/generate_pin_briefs.py`
- `scripts/NEW_PIPELINE_2026-05-08/lib/brief_store.py`
- `scripts/NEW_PIPELINE_2026-05-08/lib/article_lookup.py`

External calls:

- OpenRouter chat completions through `stage_1_5/openrouter.py`.

Current persistence:

- `hero_briefs`
- `pin_briefs`

Observed local state:

- 36 hero brief rows, all status `ok`.
- 144 pin brief rows, all status `ok`.

Risk:

- Briefs are generated in SQLite and only become durable after generated files or D1 status are synced.
- The brief text is not yet a first-class review artifact in Git unless preserved through committed `pipeline-data` or D1.

### Image Generation

Current scripts:

- `scripts/NEW_PIPELINE_2026-05-08/generate_images.py`
- `scripts/NEW_PIPELINE_2026-05-08/generate_pin_images.py`
- `experiments/pinterest-50/scripts/discovery/fal_client.py`

External calls:

- fal.ai client in `fal_client.generate`.
- Hero model id: `recraft-v4-pro`.
- Pin model id: `gpt-image-2`.

Current outputs:

- Hero images: `public/images/{slug}-main.jpg`
- Pin images: `public/images/pins/{pin_slug}.jpg`
- Pin image log: `pipeline-data/pin-images.jsonl`

Risk:

- Image generation has real API cost and writes binary assets.
- Current code can run in GitHub Actions, but the generated assets need a review checkpoint before production.

### Deploy To Git

Current scripts and workflows:

- `scripts/NEW_PIPELINE_2026-05-08/bulk_deploy_articles.py`
- `.github/workflows/pipeline-produce.yml`
- `.github/workflows/pipeline-daily.yml`
- `.github/workflows/promote-staging.yml`

Current behavior:

- `pipeline-produce.yml` and `pipeline-daily.yml` fetch approved topics from production D1.
- They run `run_pipeline.py`.
- They sync lifecycle status to D1 through `sync_pipeline_to_d1.py`.
- They commit generated articles and images to `staging`, not `main`.
- `promote-staging.yml` manually fast-forwards `main` to `staging` after build verification and `PROMOTE` confirmation.

Current source of truth:

- Git branch `staging` is the review surface for generated files.
- Git branch `main` is the production content source.

Risk:

- D1 lifecycle state can be updated before content is promoted to production.
- Staging uses production D1 for dashboard/runtime APIs, so it is not a fully isolated staging environment.

### D1 Schedule Sync And Legacy Publishing

Current scripts and endpoints:

- `scripts/NEW_PIPELINE_2026-05-08/sync_to_d1.py`
- `functions/api/articles-upload.js`
- `functions/api/pins-upload.js`
- `functions/api/articles-due.js`
- `functions/api/pins-next.js`
- `scripts/publish-articles.py`
- `.github/workflows/publish-articles.yml`
- `.github/workflows/post-pins.yml`

Current production tables:

- `articles_schedule`
- `pins_schedule`

Current behavior:

- `sync_to_d1.py` can upload generated articles and pins from local SQLite to D1 queues.
- `publish-articles.py` publishes up to 2 due articles per run by committing Markdown to `main`.
- `post-pins.py` posts due pins from `pins_schedule`, then marks rows `POSTED` or `FAILED`.
- `pins-next.js` blocks pins whose target article is not `PUBLISHED` or `DUPLICATE` in `articles_schedule`.

Risk:

- `sync_to_d1.py` is a state-changing bridge and should only run after review approval.
- `publish-articles.yml` is a legacy production publisher that writes directly to `main`.
- New generated content currently uses the staging branch path, while legacy scheduled content still uses `articles_schedule`.

### Router And Canonical Mapping

Current scripts and files:

- `scripts/NEW_PIPELINE_2026-05-08/sync_router_mapping.py`
- `pipeline-data/router-mapping.json`
- `pipeline-data/slug-aliases.json`
- `functions/[[path]].js`
- `src/pages/[slug].astro`

Current behavior:

- New pin slugs can map to variant landing URLs via `router-mapping.json`.
- Smart routing and canonical behavior are handled by Cloudflare Functions and Astro page logic.

Risk:

- Router mapping is Git-backed, but must be updated alongside pin generation before pin scheduling.

## What Can Stay Local Temporarily

Safe to keep local for now:

- One-off audits.
- Dry-runs with `--dry-run`.
- SQLite inspection and debugging.
- Manual test runs that do not call external APIs or mutate D1.
- Legacy/archive scripts when they are clearly not part of the production path.

Can run locally only with explicit approval:

- OpenRouter generation.
- fal.ai image generation.
- `sync_to_d1.py`.
- Wrangler D1 commands.
- Git commits, pushes, and workflow dispatches.
- Pinterest posting or immediate pin publishing.

Should not remain local as production dependency:

- Batch content generation.
- Approval state.
- Article publication state.
- Pin scheduling state.
- Generated batch handoff.

## Target Source Of Truth Design

### Git

Owns:

- Published Markdown under `src/data/articles/`.
- Published image assets under `public/images/`.
- Router and alias data under `pipeline-data/router-mapping.json` and `pipeline-data/slug-aliases.json`.
- Reviewable generated batch branches.

Rule:

- Nothing reaches `main` without a reviewable Git diff and a passing build.

### D1

Owns:

- Topic backlog and approval status: `pipeline_topics`.
- Pipeline lifecycle status: `pipeline_articles`, `pipeline_pins`.
- Production article queue when using legacy publisher: `articles_schedule`.
- Production pin queue and posting state: `pins_schedule`.
- Dashboard state.

Rule:

- D1 can say what is queued, approved, posted, or failed.
- D1 should not be treated as the canonical copy of live article Markdown once content is in Git.

### GitHub Actions

Owns:

- Production-grade content generation runs.
- Isolated job-local SQLite cache.
- Status sync back to D1.
- Commit to review branch or `staging`, never directly to `main` for new AI batches.

Rule:

- AI generation workflows stay manual until the approval flow is implemented and trusted.

### Local SQLite

Owns:

- Temporary job-local state during generation.
- Debug visibility.
- Recovery aid for current generated backlog.

Rule:

- Local SQLite should be replaceable by a fresh GitHub Actions run plus D1 topic state.

## Migration Plan

### Phase 0: Freeze The Rules

Status: do now.

Actions:

- Treat `scripts/NEW_PIPELINE_2026-05-08/` as the official active pipeline.
- Treat `scripts/archive/`, `scripts/_archive/`, `scripts/openrouter-fal/`, `scripts/NEW_PIPELINE/`, and `scripts/TEST_SCRIPTS/` as non-production unless explicitly revived.
- Keep `pipeline-daily.yml` manual only.
- Keep `pipeline-produce.yml` pushing generated files to `staging`.
- Do not run `sync_to_d1.py` for new content until the approval checkpoint exists.

Risk controls:

- Review branch or `staging` before production.
- No automatic D1 queue upload from unreviewed generated content.
- No Pinterest scheduling for unpromoted article URLs.

### Phase 1: Manual Approval Checkpoint

Status: next task candidate.

Actions:

- Define article states: `draft`, `review`, `approved`, `published`, `failed`.
- Define pin states: `draft`, `review`, `approved`, `scheduled`, `posted`, `failed`.
- Add the approval checkpoint between generated `staging` output and any production D1 queue update.
- Make D1 `pipeline_articles.stage` reflect review state, not just generation stage.

Risk controls:

- Generated files remain visible in Git before production.
- Pins cannot enter `pins_schedule` before the article is live or explicitly approved for the same promotion batch.

### Phase 2: Split Production Publishing Paths

Status: after approval checkpoint.

Actions:

- Keep `publish-articles.yml` for legacy `articles_schedule` rows only.
- Create a separate new-pipeline publish path that promotes reviewed generated files from `staging` or a batch branch.
- Make the dashboard label legacy publish and new pipeline publish separately.
- Decide whether `articles_schedule` remains needed for new pipeline content.

Risk controls:

- No direct GitHub API commit to `main` from new AI generation.
- One visible promotion action per generated batch.

### Phase 3: D1 And Staging Isolation

Status: after T03 staging design.

Actions:

- Add a staging D1 database or environment-specific D1 binding.
- Make staging dashboard/API calls target staging state.
- Keep production `pins_schedule` untouched during generated-content QA.

Risk controls:

- No test dashboard action mutates production D1.
- Staging can verify article pages, router behavior, and pin image URLs before promotion.

### Phase 4: Retire Local Production Dependencies

Status: after the cloud path has passed repeated runs.

Actions:

- Move any remaining required local-only logic into GitHub Actions or Cloudflare Functions.
- Archive obsolete duplicate pipeline directories after a dedicated cleanup task.
- Keep local SQLite only as a reproducible cache format, not as a required data store.

Risk controls:

- Archive only after a runbook names the replacement for each script.
- Do not delete historical artifacts while unrelated worktree deletions are present.

## Open Issues For Follow-Up Tasks

- `run_pipeline.py` uses local SQLite even in GitHub Actions; acceptable temporarily, but D1 should own approval state.
- `sync_pipeline_to_d1.py` updates production D1 pipeline status from staging-generation runs.
- `sync_to_d1.py` can upload articles and pins into production queues; it needs an approval guard.
- Staging does not have isolated D1.
- Router mapping must be included in the generated batch review before pins are scheduled.
- Local SQLite currently has 36 reviewed articles and 144 pin briefs; task detail notes mention 35 reviewed articles, so the newer observed count is 36.

## Recommended Next Handoff

The next task should be T02: Manual Approval Publishing Flow.

Start by designing the smallest approval checkpoint that:

- Reviews generated files on `staging`.
- Blocks `sync_to_d1.py` or equivalent queue upload until approval.
- Keeps Pinterest scheduling behind article publication.
- Clearly separates legacy `publish-articles.yml` from the new pipeline promotion path.
