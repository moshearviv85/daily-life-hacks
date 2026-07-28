# Master Organic Growth Execution Plan

Date: 2026-07-28

## Verified inventory

The source inventory contains 601 unique records. The coverage validator reports:

| Decision | Count |
|---|---:|
| `EXECUTE_NOW` | 99 |
| `DEPENDENCY` | 96 |
| `MANUAL_EXTERNAL` | 111 |
| `QUEUE` | 71 |
| `REJECT` | 224 |
| **Total** | **601** |

This plan does not claim that 99 methods can or should run simultaneously.
`EXECUTE_NOW` means they survived the first gate. They still enter bounded
cohorts so results remain attributable.

## Stage 0: Establish control and baseline

### Work

1. Validate that all 601 records have one decision and one reason.
2. Freeze fixed URL, pin, dataset, and tool cohorts.
3. Record current GSC, Bing, Pinterest, Clarity, referral, indexing, dataset,
   tool, and subscriber baselines.
4. Mark every unavailable or stale source instead of estimating it.
5. Define UTM naming and release-log fields.
6. Isolate implementation branches from the dirty main checkout.

### Exit proof

- `coverage-report.json` passes.
- Daily scorecard can run from available exports.
- Cohorts and comparison windows are fixed.
- Every execution task has a proof requirement and KPI.

## Stage 1: Close foundational technical and data dependencies

### Technical SEO

- Verify live indexability, canonical consistency, redirects, 404 behavior,
  robots directives, sitemap output, last-modified values, image discovery, and
  structured data.
- Fix only issues reproduced against current production and current
  `origin/main`.
- Do not rewrite articles as a substitute for technical evidence.

### Data authority

- Verify `/data/`, `/methodology/`, Dataset schema, CSV packages, data
  dictionaries, stable download URLs, license claims, public API references,
  visible statistics, and download measurement.
- Build missing owned foundations before external dataset distribution.
- Do not make a legal license choice by implication.

### Exit proof

- Focused tests and `npm run build:checked`.
- Git commit on an isolated branch.
- After approved deployment: live HTTP, canonical, rendered markup, structured
  data, download, and analytics-event proof.

## Stage 2: Strengthen the crawlable site graph

### Work

1. Map pillars, clusters, studies, recipes, tools, and dataset pages.
2. Fix genuine orphans and shallow-support pages.
3. Consolidate only proven cannibalization using page-query evidence.
4. Identify low-value indexable URLs using a quality rubric, not traffic alone.
5. Add contextual links from relevant established pages.
6. Make important CSV findings visible in HTML where that helps users and
   citation systems.

### Why this stage follows Stage 1

Internal links and visible tables cannot compensate for broken canonicals,
missing live sitemap output, unstable data URLs, or unmeasured downloads.

### Exit proof

- Exact changed URL cohort.
- Before/after graph metrics.
- Build and live URL proof.
- 28-day and 56-day search comparison.

## Stage 3: Build search-demand assets

### Work

- Comparison pages only where query demand and data support a distinct answer.
- Statistics pages and always-updated rankings.
- Long-tail pages for questions that currently lack a satisfactory answer.
- Practical calculators with a defined user job and completion event.
- Seasonal content 60 to 90 days before demand.
- Image assets that are useful in-page and eligible for image discovery.
- Recipe enhancement only when the recipe and instruction media actually exist.

### Content rules

- Public copy uses the David Miller voice.
- Every numeric claim is traceable.
- No medical outcome claims.
- No article is commissioned solely to increase page count.
- No content rewrite occurs without query, accuracy, usability, or conversion
  evidence.

### Exit proof

- Query and intent brief.
- Article/tool/asset validation.
- Build, Git, deployment, and live-render proof.
- Fixed-cohort measurement at 7, 28, and 56 days.

## Stage 4: Create reusable distribution packages

### Work

1. Convert one validated study into:
   - an article or statistics page;
   - a visible table or chart;
   - a static pin;
   - a video pin or short;
   - a native community post;
   - a dataset description;
   - a newsletter or outreach pitch.
2. Verify every destination, number, image, alt text, UTM, and platform-specific
   claim.
3. Prepare profile and link destinations that match the promoted asset.
4. Apply cadence, freeze, and N-contributions-before-linking rules.

### Exit proof

- Approved release manifest.
- Asset and destination validation.
- Channel-specific copy and tracking.
- No external action before the manual-action gate.

## Stage 5: Release controlled external cohorts

### First manual cohorts

1. Pinterest recovery and board architecture.
2. Three clean pins per day, measured by outbound clicks rather than likes or
   saves alone.
3. Existing vertical assets on YouTube Shorts and TikTok, uploaded natively.
4. Reddit original-data posts only after rule, account, domain, and ban-risk
   gates pass; full value must appear natively.
5. Kaggle and Zenodo dataset submissions after the data package is complete.
6. Flipboard feed/magazine test.
7. Data Is Plural submission.

### External-action rule

Account creation, posting, commenting, outreach, submission, payment, or identity
use stays `MANUAL_EXTERNAL`. Agents may prepare and validate the cohort. The
owner performs or explicitly approves the external action.

### Exit proof

- Live external URL or platform confirmation.
- Destination and tracking verification.
- Release log.
- Policy/removal status.

## Stage 6: Earned distribution and partnerships

### Work

- Relevant newsletter pitches.
- Journalist and data-story opportunities.
- Podcast guesting only with a credible spokesperson and repeatable angle.
- Institution and educator resource pitches around the dataset, not generic
  recipe promotion.
- Creator collaborations only where the creator's audience matches the exact
  asset.

### Exit proof

- Qualified target list.
- Approved message.
- Contact and follow-up log.
- Earned placement, citation, referral session, or explicit rejection.

## Stage 7: Measure, decide, and stop

### Checkpoints

- Immediate: operational proof.
- Day 7: early distribution and crawl signal.
- Day 30: traffic, citations, links, downloads, subscribers, and conversions.
- Day 60: search/indexing lag and repeatability.

### Decision rules

- `SCALE`: repeatable qualified traffic or a valuable citation/link signal.
- `REVISE`: measurable reach but weak clicks or destination completion.
- `WAIT`: known indexing or platform lag with correct operational proof.
- `STOP`: repeated zero qualified outcome after the predefined sample/window,
  policy risk, or cost above the expected value.

No method remains active indefinitely without a dated decision.

## Stage 8: Scale winners and retire the rest

- Increase production only for channels and formats with measured signal.
- Reuse winning assets before commissioning unrelated ones.
- Record retired methods and their evidence so they are not rediscovered and
  retried without a material change.
- Re-run the full inventory quarterly because platforms, eligibility, and
  product status change.

## Why 224 methods are rejected

The row-level reason is preserved in `master-execution-backlog.csv`. The major
rejection classes are:

1. Search or platform manipulation: paid links, PBNs, cloaking, doorway spam,
   fake engagement, vote rings, bots, spun content, hacked links, and ban
   evasion.
2. Dead surfaces: discontinued services, obsolete directories, and discovery
   mechanisms with no active audience.
3. Unsupported folklore: keyword density, LSI keywords, fixed word-count
   formulas, generic posting-time rules, meta keywords, and similar myths.
4. Wrong audience or eligibility: regional-language mismatch, credential-heavy
   medical communities, government catalogs that do not accept this publisher,
   and follower-only channels with no acquisition path.
5. Negative expected value: a method costs more time, risk, or money than its
   realistic qualified-traffic ceiling.
6. Duplicate or index entries: research headings or cross-references that are
   not independent executable methods.

Rejection is reversible only if the underlying product, eligibility, audience,
policy, or evidence materially changes.

## Active execution cohort 1

| Lane | Scope | State |
|---|---|---|
| Technical foundation | Live and local technical SEO verification plus confirmed fixes | Assigned |
| Owned data foundation | Statistics, datasets, methodology, schema, tracking, and distribution readiness | Assigned |
| Measurement and release governance | Fixed cohorts, daily scorecard, UTM/release log, and stop/scale rules | Assigned |

The next cohort begins only after these three lanes return their proof and
dependency findings. This prevents content, links, and distribution from being
built on a broken or unmeasurable foundation.
