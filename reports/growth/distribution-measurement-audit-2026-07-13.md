# Distribution and Measurement Audit — 2026-07-13

## Scope and evidence standard

Read-only audit of repository files, local reports, Git history, and configured GitHub workflows. No Pinterest/Reddit post was made, no workflow was dispatched, no D1 data was read or changed, and no live analytics API was called.

Status labels used below:

- **Proven:** a local output contains real metrics or a posted URL.
- **Configured:** executable code/workflow exists, but current run health was not verified from local evidence.
- **Prepared:** assets or drafts exist, but release/distribution is not evidenced.
- **Blocked:** an explicit prerequisite is missing.
- **Stale:** the newest evidence is too old for a current operating decision.

## Executive verdict

The site has a credible Pinterest foundation and one real analytics snapshot, but it does not yet have a closed growth loop. Pinterest is **configured and measured**, yet the newest 12-pin package and title-rewrite experiments are only prepared. Reddit is **draft-only and blocked** by missing OAuth credentials/token plus a deliberate karma gate. The weekly scorecard is **configured with one generated file**, but its traffic row is not a valid sessions/pageviews metric and its search rows are blank. Indexing evidence is **stale/manual**: the last executed GSC action log is dated 2026-06-29, while no recurring Bing measurement exists.

The immediate operating priority is measurement correctness and release evidence, not creating more drafts.

## Channel readiness matrix

| Area | Current status | What is genuinely ready | What is not proven / blocked | Local evidence |
|---|---|---|---|---|
| Pinterest auto-posting | Configured | `post-pins.yml` runs every 30 minutes with `MAX_PINS_PER_RUN=1`; posting script has cooldown/error handling | Current workflow health and queue state were not verified; no D1 read was allowed | `.github/workflows/post-pins.yml`, `scripts/post-pins.py` |
| Pinterest analytics ingestion | Configured, with recent downstream proof | Fetcher is scheduled every 6 hours; a 90-day pin-performance snapshot scored 268 inputs and 66 eligible own-domain pins | No run log in repo; raw analytics export used to reproduce the score is absent | `.github/workflows/fetch-analytics.yml`; `pipeline-data/reports/pin-performance-2026-07-12.*` |
| Pinterest account signal | Proven snapshot | Weekly scorecard recorded 1,466 impressions and 21 outbound clicks for its trailing 30-day account query | Only one scorecard exists, so no trend; this 30-day account metric must not be compared directly with the 90-day eligible-pin report | `pipeline-data/scorecards/scorecard-2026-W28.md` |
| Pinterest creative learning | Proven baseline, no experiment result | Baseline: 66 eligible pins, 9,620 impressions, 319 outbound clicks, 3.316% aggregate CTR; top/bottom patterns documented | EXP-001/002/005 are queued or seeded; no cohort post dates, 14-day measurements, or keep/kill decisions | `pipeline-data/reports/pin-performance-2026-07-12.*`; `docs/growth-experiments.md` |
| New Pinterest assets | Prepared | 12 pin images, destination records, aliases, and routing data were committed in `f0f79ed` | No local evidence that these 12 pins entered the production queue or were posted | Git commit `f0f79ed`; `pipeline-data/pin-images.jsonl` |
| Pinterest board descriptions | Configured/prepared | Manual workflow supports creation and description updates | No local artifact proves the new description-update mode was run successfully | `.github/workflows/pinterest-boards.yml`; commit `844dc75` |
| Idea/kinetic Pinterest | Blocked by design | Five manual candidates and a pass criterion are documented | Zero completed 14-day tests; automation is explicitly NO-GO until at least 3/5 pass | `docs/idea-pin-automation-gate.md`; `pipeline-data/upgrade-queue/pinterest-idea-pin-manual-5.json` |
| Reddit drafts | Prepared | Ten full drafts plus three data-study launch posts and a manual cadence exist | `reddit-log.csv` has 10 draft rows with empty URLs/metrics; comments log has 10 “drafted, not posted” entries | `pipeline-data/reddit-drafts/`; `pipeline-data/reddit-log.csv`; `pipeline-data/reddit-comments-log.md` |
| Reddit posting/auth | Blocked | Official OAuth poster code exists | Local config still contains placeholders; `.reddit-token.json` is absent. Playbook also says posting must remain manual | `scripts/reddit_poster.py`; safe config/token existence check; `docs/reddit-scaling.md` |
| Reddit launch gate | Blocked/inconsistent | Launch posts contain useful, sourced data and clear moderation notes | Launch file says wait for ~50 karma and cites 32 on 2026-07-11; scorecard target file uses a baseline of ~5; scorecard fetch returned N/A/403. There is no single trusted current value | `pipeline-data/reddit-launch-posts.md`; `pipeline-data/growth-targets.md`; W28 scorecard |
| Weekly scorecard | Configured, first output proven | Monday workflow exists and W28 file contains real Pinterest/subscriber/funnel values | Only one file, no trend; GSC/Bing blank; Reddit N/A; direct commit to `main` triggers an unnecessary production deploy | `.github/workflows/weekly-scorecard.yml`; `pipeline-data/scorecards/scorecard-2026-W28.md` |
| Site traffic metric | Mislabelled / unreliable | `/api/analytics` provides a local count source | `pageviews_7d` sums **all event types** in `by_day`, not only `page_view`, and is not sessions. Inclusive date cutoff can cover eight calendar dates. The value 15,734 must not be presented as sessions or clean pageviews | `scripts/weekly-scorecard.py:237-259`; `functions/api/analytics.js:30-41` |
| GSC discovery | Configured for topic discovery | Read-only Search Console query code exists and the discover workflow can use a service-account secret | It outputs opportunity queries, not indexing coverage or scorecard metrics; workflow silently skips GSC when the secret is absent | `discover_gsc.py`; `.github/workflows/pipeline-discover.yml` |
| GSC indexing monitoring | Stale/manual | Sitemap resubmission and nine indexing requests were documented | Latest executed-action artifact is 2026-06-29; follow-up validation was blocked then. W28 GSC fields are still blank | `pipeline-data/audit/gsc-actions-executed-2026-06-29.md`; W28 scorecard |
| Bing/indexing notification | Script only | `notify-indexnow.py` can submit canonical article URLs to IndexNow | It is not wired into deploy or package scripts; no recurring Bing Webmaster/AI citation workflow exists; local Bing evidence is from older exports | `scripts/notify-indexnow.py`; repo-wide workflow/package search; `docs/organic-search-follow-up.md` |

## Measurement defects that can cause false confidence

### 1. The scorecard's 15,734 “pageviews” is not a traffic KPI

`fetch_pageviews_7d()` consumes `/api/analytics.by_day`. That endpoint groups every row in `funnel_events` without filtering `event_type`. The scorecard then sums those rows and labels the result “Site funnel pageviews (7d).” It mixes page views with sign-up starts, subscriptions, downloads, and any other funnel events. It also does not deduplicate users or sessions.

**Decision:** mark the existing value as an event-volume diagnostic only. Before the next scorecard, use a source that returns sessions, or add an explicit `page_view`-only series and label it page views.

### 2. Pinterest reports use different windows and populations

- W28 scorecard: trailing **30-day account** totals: 1,466 impressions / 21 outbound clicks.
- Pin performance report: **90-day top-pin cache**, filtered to own-domain pins with at least 50 impressions: 9,620 impressions / 319 outbound clicks across 66 pins.

Both can be valid, but they answer different questions. Treating them as one funnel would create a false trend.

**Decision:** every Pinterest KPI must store `window_start`, `window_end`, population/filter, fetch time, and source endpoint.

### 3. Baselines are partly estimates, not captured observations

`growth-targets.md` lists Pinterest baseline as ~0 on the same date that the first scorecard recorded 1,466 trailing-30-day impressions. Reddit baseline is ~5 while the launch document says 32. These may be planning placeholders, but the scorecard renders them as historical baselines.

**Decision:** rename estimated baselines or replace them with dated observed snapshots. Do not calculate progress from a placeholder.

### 4. A generated asset is being counted as distribution

The new pin images, rewrite queue, Idea candidates, and Reddit posts are concrete deliverables. They are not traffic actions until a post/queue record has an external ID or URL and a publish timestamp.

**Decision:** require a release ledger row for every distributed item: channel, asset ID, destination, published_at, experiment ID, and first measurement due date.

## Prioritized backlog

The machine-readable version is `reports/growth/distribution-measurement-backlog-2026-07-13.csv`.

| Priority | Work item | Impact | Effort | Completion evidence |
|---|---|---:|---:|---|
| P0 | Replace/mend the scorecard traffic row: sessions from Cloudflare/Clarity if available, otherwise filter `event_type='page_view'`, use an exact UTC interval, and label it page views | Very high | M | Fixture/test proves non-page events are excluded; W29 records source/window; old 15,734 value is annotated |
| P0 | Establish one metric contract for Pinterest 30d account health vs 90d creative analysis | Very high | S | Scorecard/report headers include endpoint, population, UTC window, fetch time; no cross-window progress comparison |
| P0 | Create a distribution release ledger and backfill the 12 new pins as `prepared`, not posted | Very high | S | Each asset has status, external/queue ID when released, publish timestamp, experiment, measurement due date |
| P0 | Capture current GSC/Bing baseline using the same 28-day window and fill the weekly scorecard | Very high | M/manual | Dated export or read-only API artifact; clicks/impressions/indexed/crawled-not-indexed and Bing citations populated |
| P1 | Decide and execute the release gate for the 12 new Pinterest pins without increasing `MAX_PINS_PER_RUN=1` | High | S + approval | Queue/post IDs and destination checks exist; first 14-day cohort dates logged |
| P1 | Turn EXP-001 into one real controlled cohort; keep EXP-002/005 queued until it concludes | High | M | Pin IDs, matched cohort, publish dates, 14-day CTR/saves, keep/kill decision |
| P1 | Fix Reddit's source of truth before posting: reconcile karma, preserve manual-only policy, and choose 2 helpful comments before launch posts | High | S/manual | Current karma evidence, two posted comment URLs, 24h/7d fields populated; launch gate explicitly met or deferred |
| P1 | Make scorecard publication non-disruptive and auditable | Medium-high | M | Workflow uploads artifact or opens a PR/metrics branch; no data-only commit triggers production deploy; failure state is visible |
| P1 | Preserve reproducible Pinterest analytics inputs or a redacted snapshot manifest | Medium-high | S | Performance report links to immutable input hash/source query/window; rerun yields same cohort totals |
| P2 | Wire post-deploy IndexNow notification for only new/modified canonical articles, with dry-run and logged response | Medium | M | Deploy artifact lists submitted canonical URLs and status; no aliases/redirect variants submitted |
| P2 | Add recurring indexing health snapshot distinct from topic discovery | Medium | M | Weekly artifact tracks sitemap URLs, indexed/discovered/crawled-not-indexed, and validation state; 28-day comparisons |
| P2 | Run the five manual Idea/kinetic tests only after static cohort measurement is stable | Medium | L/manual | Five external URLs and 14-day metrics; at least 3/5 pass before any automation work |
| P3 | Update growth docs so “done” means released + measured, not code/draft created | Medium | S | CP5 and experiment statuses link to release IDs and measured results |

## Recommended parallel ownership boundaries

- **Measurement lane:** scorecard metric correctness, metric contracts, immutable snapshots, indexing baseline.
- **Pinterest release lane:** release ledger, 12-pin controlled cohort, destination proof, experiment timestamps. No rate increase.
- **Reddit lane:** manual authentication/karma decision with the user, helpful comments, posted-URL logging. No automated posting.
- **Documentation/QA lane:** reconcile status claims, ensure every “running” experiment has an external release ID and measurement date.

These lanes can run in parallel as long as only one owner edits each file family and external posting remains separately approved.

## Commands and checks used

- `rg --files reports scripts .github` with growth/distribution terms.
- `git status --short`, branch/log inspection, and path-scoped `git log`/`git show`.
- Direct reads of workflows, scripts, scorecards, growth docs, Reddit logs/drafts, and indexing audit artifacts.
- Safe Reddit readiness check that reported placeholder config values and absence of `.reddit-token.json` without displaying secrets.
- SHA-256 hashes captured for the five primary evidence artifacts during the audit.

## Evidence hashes

| Artifact | SHA-256 |
|---|---|
| `pipeline-data/reports/pin-performance-2026-07-12.json` | `9EEBB7C5D95C4CCD2128678D2D9A9FE88F9E9E379681178EB5713A6368B0BFB5` |
| `pipeline-data/scorecards/scorecard-2026-W28.md` | `269FE7BE9D52C31CBAFF6B4640EB5D3C530564888ADDB4E16F4E4E8F5B28AECF` |
| `pipeline-data/reddit-log.csv` | `707AAF459A709D14F43423E1722EC9953BE5FA130B7A487BF83AFEB14E735F81` |
| `pipeline-data/reddit-launch-posts.md` | `B16A7B475E55D924777AD195656F511E04B5F6C4B8E7840EAF54BA72FB5821C5` |
| `pipeline-data/audit/gsc-actions-executed-2026-06-29.md` | `2484FC564D17D49F9958265A37DA27AC6AE8EF815CD15BD556D60A0F10910694` |

