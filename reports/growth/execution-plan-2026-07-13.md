# Daily Life Hacks Growth Execution Plan — 2026-07-13

## Outcome

Turn the existing 187-article library into a measured authority and distribution system. The plan favors verified search opportunities, bounded content batches, visual completeness, strong internal-link paths, and repeatable distribution over raw publishing volume.

## Parallel ownership

| Workstream | Owner | Scope | Deliverable | Mutation boundary |
|---|---|---|---|---|
| Visual completeness gate | Codex agent A | Inventory and strict-on-explicit-files validation | Script, tests, baseline report | No article edits |
| Indexability and link graph | Codex agent B | Canonical/noindex/sitemap/internal-link evidence | Ranked report and CSV | Read-only |
| Distribution and measurement | Codex agent C | Pinterest, Reddit, scorecard, indexing workflow | Evidence-backed backlog | No posting or workflow runs |
| Content authority batch | Claude Code | Search-intent audit and up to five article rewrites | Audit, CSV, bounded commit | Content files and reports only |
| Article reading experience | Cursor | Long-form image/table/typography presentation | UI commit, screenshots, QA report | Presentation layer only |
| Integration and production proof | Codex root | Review, prioritize, merge, build, deploy, live checks | Published batch with evidence | No D1 or external posting without explicit scope |

## Execution sequence

### Gate 1 — evidence baseline

All audits must distinguish a repository defect from a signal that still needs GSC URL Inspection. Stale GSC/Bing exports are useful for prioritization but are not proof of current index state.

### Gate 2 — unified priority score

Score each candidate with:

- search evidence and current impressions;
- query-to-page intent fit;
- authority/cluster role;
- internal-link deficit;
- content and visual debt;
- cannibalization risk;
- implementation effort;
- confidence in the evidence.

The first batch is limited to five to eight URLs sharing a clear topical purpose.

### Gate 3 — implementation acceptance

Every changed article must pass:

- article validator and hard-ban scan;
- explicit cluster/parent validation when in a controlled cluster;
- no broken local image references;
- visual gate for long-form content;
- internal-link verification;
- `git diff --check`;
- `npm run build:checked`.

UI changes also require desktop/mobile screenshots and horizontal-overflow checks.

### Gate 4 — production proof

A batch is `published` only after:

- exact scoped commit is on `main`;
- Cloudflare deployment succeeds;
- deploy proof matches the main SHA;
- changed URLs and assets return the expected live status;
- the rendered HTML contains the intended content and image paths.

### Gate 5 — distribution and measurement

Distribution assets are not counted as launched until the destination URL, post/pin identifier, and timestamp are recorded. Weekly measurement must compare:

- organic impressions and clicks;
- indexed and inspected URLs;
- landing pages receiving first impressions;
- Pinterest outbound clicks and saves;
- newsletter conversion events where available;
- changes versus the prior comparable period.

## Safety boundaries

- No D1 mutation in this program without explicit approval.
- No automated Pinterest posting merely to validate content work.
- No produce/promote/images/pins pipeline run during cleanup.
- No deploy claim without Git, workflow, and live URL evidence.
- Preserve unrelated dirty files in the main checkout.

