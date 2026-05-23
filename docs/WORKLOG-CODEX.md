# Codex Worklog

Last updated: 2026-05-18

This file is the shared memory for Codex sessions on `daily-life-hacks.com`.
Every new Codex chat should read this file and `AGENTS.md` before choosing work.

## Operating Rules

- User communication is in Hebrew.
- Site content is English for a US audience.
- Do not rely on chat memory alone. Verify against files, Git, D1, GitHub Actions, and the live site when relevant.
- Do not reopen completed stabilization work unless there is a new symptom or failing check.
- Do not post to Pinterest, mutate D1, deploy manually, commit, push, install packages, or run Wrangler state-changing commands unless the user explicitly approves that turn or the action is part of an approved plan.
- The worktree is dirty with many unrelated deletions and untracked files. Stage exact files only.
- Task coordination happens in `docs/CODEX-TASKBOARD.md`.

## Current System State

- Stack: Astro 5 + Tailwind CSS v4 on Cloudflare Pages.
- Domain: `https://www.daily-life-hacks.com`.
- Cloudflare Pages deploy is green after the Pages Functions bundle fix.
- D1 database binding: `DB`.
- Live content source: `src/data/articles/*.md`.
- Router alias source: `pipeline-data/slug-aliases.json`.
- Pinterest schedule source: D1 table `pins_schedule`.
- Pinterest publisher: GitHub Action `.github/workflows/post-pins.yml` running `scripts/post-pins.py`.
- Pipeline scripts are mainly under `scripts/NEW_PIPELINE_2026-05-08/`.
- Pipeline local DB: `pipeline-data/topic-research.sqlite`.

## Stabilization Work Already Done

- Router, slug alias, canonical, noindex, and redirect behavior were audited and fixed.
- Non-www HTTPS root now redirects to canonical www.
- Canonical article pages should not receive `X-Robots-Tag: noindex`.
- Routed proxy or pin variant pages should avoid competing with canonical pages.
- Live audit across known Pinterest and pending URLs reported:
  - 0 live 404 issues.
  - 0 canonical mismatch issues.
  - 0 redirect issues.
  - 0 wrong noindex issues.
- Google Search Console issues shown by the user were diagnosed:
  - `Alternative page with proper canonical tag`: largely expected for pin variants/aliases.
  - `Page with redirect`: includes expected HTTP/non-www/no-slash/tag redirects plus stale examples.
  - `Not found (404)`: stale garbage URLs such as `/cdn-cgi/l/email-protection` and `/*`.
- Cloudflare deployment failure was fixed by building Pages Functions to `worker-out` and copying `worker-out/index.js` to `dist/_worker.js`.
- Pinterest pending queue was checked:
  - D1 had 43 `PENDING` and 299 `POSTED` at last check.
  - Pending queue did not show exact duplicate links, images, or titles.
- GitHub scheduled workflow was found to run irregularly.
- Pinterest auto-poster now has catch-up protection:
  - Scheduled run can publish up to 2 due pins.
  - Manual `immediate=true` run is limited to 1 pin.
  - 90 second pause between catch-up posts.
  - Stops after a Pinterest API failure.

## Important Recent Commits

- `05ecd40` Add Pinterest cron catch-up limit
- `1576633` avoid noindex on canonical kv routes
- `ba85365` fix canonical handling for routed pin pages
- `591acaa` fix pages functions deployment bundle
- `bcc6a31` add pinterest posting safety checks
- `ce4d5d6` backfill router slug aliases

## Do Not Re-Do Without New Evidence

- Do not repeat the full router/canonical/pin URL mapping audit as a fresh project.
- Do not re-litigate whether 140 live articles and Pinterest slugs are connected unless a new mismatch appears.
- Do not assume SQLite article rows represent live site truth. Live site truth is the markdown article set and deployed router behavior.
- Do not change Pinterest posting volume aggressively while the account is suppressed.

## Known Concerns Still Open

- T01 pipeline migration map completed on 2026-05-18. See `docs/pipeline-migration-source-of-truth.md`.
- Source-of-truth decision: Git owns live content/assets/router data, D1 owns approvals/queues/dashboard/runtime state, and `pipeline-data/topic-research.sqlite` is only a temporary workbench/cache.
- Local SQLite observed on 2026-05-18: 36 reviewed `write_outputs`, 36 ok `review_outputs`, 36 ok `hero_briefs`, 144 ok `pin_briefs`, and only 1 approved `filtered_topics` row. This confirms D1 `pipeline_topics` is the real topic backlog, not local SQLite.
- T02 manual approval checkpoint completed on 2026-05-18. See `docs/manual-approval-publishing-flow.md`.
- New article CSV uploads insert `articles_schedule.status = REVIEW`; dashboard approval moves rows to `APPROVED`; article publishers read `APPROVED` plus legacy `PENDING`.
- New pin CSV uploads insert `pins_schedule.status = REVIEW`; dashboard approval moves rows to `PENDING`; Pinterest auto-poster reads only `PENDING`.
- Article upload no longer auto-publishes the first article, and pin upload no longer dispatches `post-pins.yml`.
- Existing legacy `PENDING` rows are preserved so the already-approved queue is not unexpectedly paused.
- Staging exists as a `staging` branch Cloudflare Pages Preview deploy, but D1/runtime actions are not isolated yet.
- Need a clear source-of-truth design for:
  - article generation
  - article review
  - image generation through Fal/Recraft/GPT image model
  - OpenRouter model calls
  - D1 sync
  - Pinterest scheduling
  - deployment and rollback
- Need to resume content generation carefully after stabilization.
- Need later organic traffic investigation for Google/Bing once core pipeline is stable.

## Next Recommended Work Area

Follow `docs/CODEX-TASKBOARD.md` and choose the first task that is not `done` and not `in_progress`.

## 2026-05-18 - T03 Staging Environment

Status: completed.

Findings:

- `.github/workflows/deploy-cloudflare-pages.yml` deploys both `main` and `staging` to Cloudflare Pages with `pages deploy dist --project-name=daily-life-hacks --branch=${{ github.ref_name }}`.
- `.github/workflows/promote-staging.yml` is the manual production promotion gate. It requires `PROMOTE`, runs `npm run build:checked` against `origin/staging`, then fast-forwards `main`.
- `pipeline-produce.yml` and `pipeline-daily.yml` already push generated files to `staging` through `PIPELINE_TARGET_BRANCH=staging`.
- `origin/staging` exists.
- Staging should remain a Cloudflare Pages branch Preview, not a separate project, until D1 isolation is needed.
- Current staging limitation: Pages Functions still use the shared `DB` binding, so dashboard/API mutations may affect production D1 state.

Changed files:

- `.github/workflows/deploy-cloudflare-pages.yml`: deploy concurrency is now branch-specific so staging deploys do not cancel production deploys.
- `docs/staging-environment.md`: added staging decision, testing checklist, promotion flow, boundaries, and future D1 isolation plan.
- `docs/CODEX-TASKBOARD.md`: T03 claimed and completed.

Verification:

- Reviewed deploy, promotion, pipeline produce, pipeline daily, publisher, and pipeline trigger workflows.
- Verified `origin/staging` exists locally.
- Ran `npm run build:checked` successfully after the staging documentation and workflow update.

## 2026-05-18 - T04 Content Restart Runbook

Status: completed.

Created `docs/content-restart-runbook.md` to restart content creation conservatively after stabilization.

Key decisions:

- First restart batch should be 1 article through manual `pipeline-produce.yml`.
- Generated files should land on `staging` and be reviewed through the Cloudflare Pages Preview before production promotion.
- `pipeline-daily.yml` should remain manual-only until several clean batches and staging/D1 handoff are proven.
- New pins should not be approved in the same pass as the first restarted article. Start with one new pin only after the production article URL is live, then wait at least 48 hours before approving more from that batch.
- Staging is safe for file, routing, image, and content review, but dashboard/API actions remain production D1 mutations until Preview D1 isolation exists.

Verification:

- Read `AGENTS.md`, `docs/WORKLOG-CODEX.md`, `docs/CODEX-TASKBOARD.md`, `docs/pipeline-migration-source-of-truth.md`, `docs/manual-approval-publishing-flow.md`, `docs/staging-environment.md`, `pipeline-produce.yml`, `pipeline-daily.yml`, and `promote-staging.yml`.
- No GitHub workflow dispatch, D1 mutation, package install, commit, push, deploy, or Pinterest action was performed.

## 2026-05-19 - T05 System Documentation

Status: completed.

Updated `docs/current-system-map.md` as the single trusted current system map for future assistants.

Covered:

- Current stack, production/staging branches, and Cloudflare Pages deployment.
- Source-of-truth boundaries for Git, D1, router data, topic backlog, and local SQLite.
- Core D1 tables and current article/pin approval statuses.
- Cloudflare Functions groups and catch-all smart router behavior.
- GitHub Actions automation, including deploy, staging promotion, pipeline discovery/produce/daily, article publishing, Pinterest posting, and analytics fetching.
- Active pipeline directory and generated output paths.
- Deprecated or unsafe script paths.
- Operational commands, environment variables, restart guardrails, and current risks.

Verification:

- Read `AGENTS.md`, `docs/WORKLOG-CODEX.md`, `docs/CODEX-TASKBOARD.md`, existing runbooks, `package.json`, `schema.sql`, `src/content.config.ts`, GitHub workflows, key Cloudflare Functions, and active pipeline file list.
- Verified the updated map contains the required sections for source of truth, automation, unsafe paths, and startup checklist.
- No build was run because this was documentation-only.
- No GitHub workflow dispatch, D1 mutation, package install, commit, push, deploy, or Pinterest action was performed.

## 2026-05-19 - T06 Organic Search Follow-Up

Status: completed.

Created and updated `docs/organic-search-follow-up.md` as the handoff for organic search investigation after the router and canonical stabilization.

Findings:

- No Search Console or Bing export data was present in `seo/data/`.
- `seo/fetch_gsc.py` exists for manual 90-day GSC exports, while `scripts/NEW_PIPELINE_2026-05-08/discover_gsc.py` is for topic discovery through `GSC_SERVICE_ACCOUNT_JSON`.
- No Bing Webmaster Tools integration or export format was found in the repo.
- Live `robots.txt` is available and points to `https://www.daily-life-hacks.com/sitemap-index.xml`.
- Live `sitemap-0.xml` contains 145 URLs.
- All 140 local article Markdown files are present in the live sitemap.
- Sampled canonical article URLs returned HTTP 200, self-canonical links, and indexable meta robots.
- Category pages are indexable; tag pages are `noindex, follow`.
- User provided a Google Search Console export from `C:\Users\offic\Downloads\daily-life-hacks.com-Performance-on-Search-2026-05-19\`.
- Export filter says "Last 3 months", but `Chart.csv` contains 2026-04-29 through 2026-05-16.
- Export totals: 4 clicks, 1,980 impressions, 0.20% CTR, and 23.0 impression-weighted average position.
- User also provided Bing exports:
  - Search Performance, 2026-05-03 through 2026-05-16: 2 clicks, 37 impressions, 5.41% CTR.
  - AI Performance, 2026-05-04 through 2026-05-16: 18 citations and 9 total daily cited-page counts.
  - AI Page Stats: all 18 citations attributed to 8 URLs; `/prune-juice-alternatives-for-constipation/` led with 8 citations.
- Priority technical issue: impression-bearing 404 URLs, especially `/prebiotic-foods-beyond-the-buzzwords/` with 106 impressions at position 10.77 and `/selenium-containing-foods-easy-ways/` with 91 impressions.
- Priority CTR opportunities include `/high-fiber-fast-food-options-guide/`, `/how-to-double-recipe-seasoning-without-guessing/`, `/good-source-of-fiber-label-meaning/`, `/comparing-fiber-content-different-pizza-crusts/`, and `/gut-health-tea-peppermint-ginger/`.
- GSC shows both slash and no-slash URLs for `high-fiber-fast-food-options-guide`; both return 200, with the no-slash version canonicalizing to the slash URL.

Handoff:

- Next implementation task should recover or intentionally redirect impression-bearing 404 URLs.
- After that, consider adding a 301 from no-slash article paths to trailing-slash paths.
- Then optimize titles/excerpts and first-screen copy for close-ranking pages.
- First useful post-fix review window is at least 7 days after the 2026-05-18 stabilization; a stronger read is 14-28 days after.
- Do not repeat the completed router audit unless there is a new failing URL, GSC indexing error, or Bing crawl issue.

Verification:

- Public checks only; no external state was changed.
- No GitHub workflow dispatch, D1 mutation, package install, commit, push, deploy, or Pinterest action was performed.

## 2026-05-19 - T07 Recover Or Redirect Impression-Bearing 404 URLs

Status: completed locally.

Recovered seven Google impression-bearing 404 URLs by restoring existing tracked drafts into the live article collection:

- `/prebiotic-foods-beyond-the-buzzwords/`
- `/selenium-containing-foods-easy-ways/`
- `/protein-per-serving-beans-chicken-tofu-compared/`
- `/how-to-quick-soak-dried-beans-same-day/`
- `/how-to-preheat-skillet-even-browning/`
- `/keep-berries-fresh-longer-when-to-wash/`
- `/how-to-pack-lunch-crisp-sandwiches-salads/`

Handled `/savory-chia-seed-recipes-breakfast/` as a canonical alias to `/chia-pudding-variations-for-breakfast/`, matching the existing related alias `quick-breakfast-upgrade-savory-chia`.

Changed files:

- `src/data/articles/prebiotic-foods-beyond-the-buzzwords.md`
- `src/data/articles/selenium-containing-foods-easy-ways.md`
- `src/data/articles/protein-per-serving-beans-chicken-tofu-compared.md`
- `src/data/articles/how-to-quick-soak-dried-beans-same-day.md`
- `src/data/articles/how-to-preheat-skillet-even-browning.md`
- `src/data/articles/keep-berries-fresh-longer-when-to-wash.md`
- `src/data/articles/how-to-pack-lunch-crisp-sandwiches-salads.md`
- `pipeline-data/slug-aliases.json`
- `docs/organic-search-follow-up.md`
- `docs/CODEX-TASKBOARD.md`

Verification:

- `npm run build` passed.
- `npm run verify:routing` passed.
- Verified local `dist` contains all eight exact URLs.
- Verified seven restored article URLs are self-canonical, indexable, and present in `dist/sitemap-0.xml`.
- Verified `/savory-chia-seed-recipes-breakfast/` is generated as an alias with canonical `/chia-pudding-variations-for-breakfast/`, `noindex, follow`, and no sitemap entry.
- No GitHub workflow dispatch, D1 mutation, package install, commit, push, deploy, or Pinterest action was performed.

## 2026-05-19 - T08 Trailing Slash Canonical Normalization

Status: completed locally.

Decision:

- Trailing-slash URLs are the canonical public URL shape for static pages.
- This matches `astro.config.mjs` (`trailingSlash: 'always'`), generated `dist/{slug}/index.html` pages, sitemap output, article canonical tags, and article JSON-LD URLs.

Changed files:

- `functions/[[path]].js`
- `docs/trailing-slash-canonical-normalization.md`
- `docs/CODEX-TASKBOARD.md`
- `docs/WORKLOG-CODEX.md`

Implementation:

- Added 301 normalization in the Cloudflare Pages catch-all Function for valid static page requests that arrive without a trailing slash.
- Preserved query strings on the redirect.
- Kept API routes and static assets excluded through the existing guard.
- Unknown no-slash paths still return 404 instead of being blindly redirected.
- Smart router paths that do not exist as static pages continue through the existing router/proxy behavior.

Verification:

- `npm run build` passed.
- `npm run verify:routing` passed.
- Mocked Function checks confirmed:
  - article no-slash -> 301 to slash.
  - article slash -> 200.
  - category no-slash -> 301 to slash.
  - tag no-slash -> 301 to slash.
  - alias/pin keyword no-slash -> 301 to slash.
  - unknown no-slash -> 404.
- No GitHub workflow dispatch, D1 mutation, package install, commit, push, deploy, or Pinterest action was performed.

## 2026-05-19 - T09 First Safe Content Restart Batch

Status: blocked pending approval to commit/push missing pipeline runtime files and rerun the generation workflow.

Preflight completed:

- Claimed T09 from `docs/CODEX-TASKBOARD.md`.
- Read `docs/content-restart-runbook.md`, `docs/staging-environment.md`, `.github/workflows/pipeline-produce.yml`, and `.github/workflows/promote-staging.yml`.
- Confirmed GitHub CLI is authenticated with `workflow` scope.
- Latest listed production `Deploy Cloudflare Pages` run on `main` is green.
- No recent successful `staging` deploy was visible in the latest deploy workflow list; the next produce run should replace staging and then verify it.
- `npm run build:checked` passed locally.

Blocked reason:

- User approved dispatching `.github/workflows/pipeline-produce.yml` with `count=1`.
- GitHub Actions run `26074405672` selected topic `how to store garlic`.
- The run failed in `Produce articles` during the write stage:
  - `scripts/NEW_PIPELINE_2026-05-08/write.py` raised `ModuleNotFoundError: No module named 'stage_1_5'`.
  - The GitHub checkout has `scripts/stage_1_5/` tracked, but the active new pipeline expects `scripts/NEW_PIPELINE_2026-05-08/stage_1_5/`.
  - Local inspection shows the missing new-pipeline runtime files exist untracked locally.
- The failure happened before `Mark topics as produced`, `Sync pipeline status to D1`, and `Commit and push generated files`, so no generated commit landed on `staging`.
- Next step needs explicit approval to commit and push the required pipeline runtime files to GitHub, then rerun `pipeline-produce.yml` with `count=1`.

No production promotion, Pinterest action, package install, or manual D1 mutation was performed.

## 2026-05-19 - T09 First Safe Content Restart Batch Update

Status: staging-ready, blocked pending explicit production promotion approval.

Pipeline hardening completed:

- Committed missing new-pipeline runtime files needed by GitHub Actions.
- Updated `write.py` to support seeded approved topics when `stage2_output` is absent.
- Updated `run_pipeline.py` to initialize restart review/brief SQLite tables.
- Updated `pipeline-produce.yml` so generated files are pushed to `staging` before topics are marked produced and synced to D1.
- Updated `pipeline-produce.yml` to fetch full history, prepare the staging workspace from `origin/staging` merged with `origin/main`, install Pillow, fail hard when hero or pin image generation fails, and configure Git identity before staging merges.

Generation history:

- Run `26074405672` failed before D1 mark or staging push because `stage_1_5` was missing from the GitHub checkout.
- Run `26074591862` failed on missing `stage2_output`.
- Run `26074652774` failed on missing review SQLite tables.
- Run `26074732454` generated `how to store garlic`, then failed to push to `staging`; this run did mark/sync the topic as produced before the push-order fix.
- Run `26074904419` generated `best way to cook corn on the cob` but image generation failed before the hard-fail guard; the incomplete staging commit was reverted from `staging`.
- Run `26075080660` succeeded and produced `best-way-to-cook-chicken`.

Staging output:

- Article: `src/data/articles/best-way-to-cook-chicken.md`
- Hero image: `public/images/best-way-to-cook-chicken-main.jpg`
- Pin images:
  - `public/images/pins/juicy-chicken-every-time-only.jpg`
  - `public/images/pins/minute-chicken-only-recipe-you.jpg`
  - `public/images/pins/skip-guesswork-only-chicken-recipe.jpg`
  - `public/images/pins/stop-dry-chicken-only-recipe.jpg`
- Staging generation commit: `aace8d0`
- QA polish commit: `e506b2f`

Verification:

- Staging deploy run `26075535665` passed.
- Live staging URL: `https://staging.daily-life-hacks.pages.dev`.
- Verified `/best-way-to-cook-chicken/` returns 200 and contains the expected title, hero image reference, and image alt text.
- Verified the homepage returns 200 and includes the new article.
- Verified the hero image and all four pin image URLs return 200.

Known follow-up:

- Production promotion has not been run. Next step requires explicit approval to dispatch `promote-staging.yml`.
- Do not approve/post new pins in the same pass.
- Two pre-hardening topics may need manual D1/topic-state cleanup later because failed attempts marked them produced without leaving a reviewed live article: `how to store garlic` and `best way to cook corn on the cob`.

## 2026-05-19 - T09 Production Promotion

Status: completed.

- User asked to view the restarted article in production.
- Confirmed `origin/main` was an ancestor of `origin/staging`, so promotion was fast-forward safe.
- Ran `promote-staging.yml` with `confirm=PROMOTE`; run `26075981052` passed, including `npm run build:checked`, and fast-forwarded `main` to `staging`.
- The promotion push did not trigger the deploy workflow automatically, so `Deploy Cloudflare Pages` was dispatched manually for `main`.
- Production deploy run `26076036864` passed.
- Verified `https://daily-life-hacks.com/best-way-to-cook-chicken/` returns 200 and contains the expected title and hero image reference.
- Verified `https://daily-life-hacks.com/images/best-way-to-cook-chicken-main.jpg` returns 200.
- Verified the production homepage returns 200 and includes the new article title.
- No Pinterest action was performed.

## 2026-05-23 - Staging Pipeline Autodeploy And Pin Safety

Status: staging pipeline verified.

- Added a generated-artifact verification gate to the pipeline before topic marking/D1 sync. The gate checks that the reviewed article markdown, hero image, OK review/hero brief, exactly four OK pin briefs, and all four pin images exist.
- Updated `pipeline-produce.yml` and `pipeline-daily.yml` so successful generation commits to `staging`, builds the site, builds Pages Functions, and deploys the staging branch to Cloudflare Pages before marking topics as produced and syncing pipeline status to D1.
- Verified `pipeline-produce.yml` run `26330077191` completed end-to-end without a separate manual deploy.
- Generated staging article `budget-meal-ideas-philippines` with hero image and four pin images:
  - `public/images/budget-meal-ideas-philippines-main.jpg`
  - `public/images/pins/smart-budget-meal-ideas-filipino.jpg`
  - `public/images/pins/smart-budget-meal-ideas-filipino-2.jpg`
  - `public/images/pins/smart-budget-meal-ideas-filipino-3.jpg`
  - `public/images/pins/smart-budget-meal-ideas-filipino-4.jpg`
- Verified the staging article, hero image, and all four pin image URLs return 200.
- Confirmed the new pipeline sync writes lifecycle data to `pipeline_articles`/`pipeline_pins`; it does not put newly generated pins into `pins_schedule`.
- Fixed `/api/pins-upload` so CSV/manual pin uploads without an explicit status now default to `REVIEW`, not `PENDING`, and do not dispatch `post-pins.yml`. Only rows explicitly uploaded as `PENDING` can trigger the auto-poster.
- Added `tests/pins-upload.test.mjs` to lock the `REVIEW` default and explicit-`PENDING` trigger behavior.
- Updated `/api/pipeline-status` and the dashboard pipeline table so each article row carries its `pipeline_pins` records and shows clickable staging image links for the generated pin slugs.
- Added `tests/pipeline-status.test.mjs` to lock pin rows being attached to their article.

Verification:

- `node --test tests/pins-upload.test.mjs tests/pipeline-status.test.mjs tests/dashboard-auth.test.mjs`
- `python -m pytest tests/cli/test_sync_to_d1.py tests/lib/test_d1_csv.py tests/lib/test_sync_pipeline_to_d1.py`
- `python -m unittest tests.pipeline_artifacts_test`
- `npm run build`

No production promotion or Pinterest posting was performed.
