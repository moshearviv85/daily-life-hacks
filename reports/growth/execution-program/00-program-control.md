# Organic Growth Execution Program

Date started: 2026-07-28

## Objective

Turn the 601 catalogued organic-growth records into an accountable execution
program. Research is not completion. A method is complete only when it has one
of the following outcomes:

1. Implemented and verified with the required proof.
2. Queued behind a named prerequisite.
3. Assigned as a manual or external action with a named owner.
4. Rejected with a specific, reviewable reason.

No method may disappear from the inventory.

## Source of truth

- Source inventory: `pipeline-data/traffic-methods.json`
- Search and content triage: `01-search-content-triage.csv`
- Social and community triage: `02-social-communities-triage.csv`
- Distribution, people, and risk triage:
  `03-distribution-people-risk-triage.csv`
- Generated master backlog: `master-execution-backlog.csv`
- Generated validation report: `coverage-report.json`
- Execution status and proof: `execution-ledger.csv`
- Explicit initial evidence: `execution-evidence-seed.json`
- Execution summary: `execution-ledger-summary.md`

The master backlog describes what should be done. The separate execution ledger
records what has actually been proved. Rebuilding the backlog never overwrites
execution state.

## Decision vocabulary

| Decision | Meaning |
|---|---|
| `EXECUTE_NOW` | In scope, safe, prerequisite-free, and suitable for the current execution cohort |
| `QUEUE` | Worth doing, but lower priority than the active cohort |
| `DEPENDENCY` | Cannot start until a named prerequisite is complete |
| `MANUAL_EXTERNAL` | Requires the owner, an authenticated account, outreach, publishing, payment, identity, or another external choice |
| `REJECT` | Will not be used; the row must state the concrete reason |

## Required fields for every method

- Category and exact source title
- Original research flag
- Decision
- Decision reason
- Expected impact
- Effort
- Prerequisites
- Execution owner
- Proof required
- KPI
- Phase

## Execution evidence gate

Run:

```text
python scripts/growth_execution_ledger.py --sync --verify-live --write-report
```

The ledger recognizes `NOT_STARTED`, `IN_PROGRESS`, `IMPLEMENTED`, `RELEASED`,
`MEASURED`, `BLOCKED`, and `REJECTED`. Completion states require a full commit
SHA reachable from `origin/main`. Released and measured rows additionally
require a live HTTPS URL plus timezone-aware release and measurement dates.
`MEASURED` rows must name their measurement evidence in the notes.
Rows classified as `DEPENDENCY` or `MANUAL_EXTERNAL` start as `BLOCKED`, with
their exact prerequisite and execution owner copied from the master backlog.
Only `EXECUTE_NOW` and `QUEUE` rows without proof remain `NOT_STARTED`.

The initial ledger is deliberately conservative. A live feature is not credited
to a broad research method unless the commit, public surface, and method scope
match without inference.

## End-to-end phases

### Phase 0: Measurement and safeguards

- Record current GSC, Bing, Pinterest, Clarity, indexation, crawl, and referral
  baselines.
- Define fixed URL and pin cohorts so cumulative totals are never presented as
  growth.
- Preserve the current dirty worktree and isolate implementation batches.
- Define safety exclusions before external execution.

Exit gate: dated baseline, fixed cohorts, clean execution worktree, and explicit
approval for external side effects.

### Phase 1: Inventory triage

- Classify all 601 source records.
- Give every rejection a specific reason.
- Identify duplicates, dependencies, external actions, risks, and methods that
  are merely prerequisites rather than traffic sources.

Exit gate: `build_growth_execution_backlog.py` reports 601 of 601 covered, zero
duplicates, zero invalid decisions, and zero unexplained rejections.

### Phase 2: Dependency graph and prioritization

- Order executable work by prerequisite, expected impact, effort, risk, and time
  to measurable signal.
- Separate maintenance from traffic acquisition.
- Separate on-site implementation from authenticated/manual distribution.
- Define proof and KPI before implementation begins.

Exit gate: every active task has an owner, proof requirement, KPI, and stop rule.

### Phase 3: On-site foundation

- Fix only verified crawl, routing, structured-data, performance, internal-link,
  content architecture, visible-data, and conversion gaps.
- Do not rewrite pages without query or accuracy evidence.
- Build missing landing surfaces only when a distribution or search task depends
  on them.

Exit gate: scoped tests, `npm run build:checked`, clean diff, Git evidence, live
URL verification after deployment, and baseline annotations.

### Phase 4: Content and reusable assets

- Produce query-backed articles, data views, tables, tools, charts, pins, and
  video only for approved opportunities.
- Apply the David Miller voice skill to all public site copy.
- Maintain article, image, citation, and content-production quality gates.

Exit gate: content validation, asset existence, build, Git, deployment, and live
render proof.

### Phase 5: Distribution preparation

- Prepare platform-specific assets, descriptions, native posts, outreach lists,
  dataset packages, feeds, and submission instructions.
- Do not perform external actions until the owner has approved the exact cohort.

Exit gate: destinations resolve, claims are supported, account prerequisites are
named, tracking parameters are correct, and the release cohort is approved.

### Phase 6: Controlled release

- Release small cohorts by channel.
- Avoid simultaneous changes that make attribution impossible.
- Record every post, submission, outreach action, and destination.

Exit gate: external confirmation plus release log.

### Phase 7: Measurement and decisions

- Compare a fixed cohort against its own prior period.
- Track leading indicators separately from clicks and sessions.
- Mark results as verified, lagging, or unavailable.
- Continue, revise, or stop each method according to its predefined rule.

Exit gate: dated scorecard and a decision for every active experiment.

### Phase 8: Scale or retire

- Scale only methods with a measured positive signal.
- Retire methods with repeated failure after the defined sample or time window.
- Preserve the reason, evidence, and learning in the master backlog.

Exit gate: no indefinite experiments and no repeated work without new evidence.

## Non-negotiable rejection reasons

The following are rejected unless the underlying condition materially changes:

- Paid links, link exchanges intended to manipulate rankings, PBNs, cloaking,
  doorway spam, fake engagement, automated comment spam, review manipulation,
  scraped-content scaling, parasite SEO, or any tactic that violates platform or
  search policies.
- Dead products or surfaces with no current submission or discovery mechanism.
- Methods whose realistic ceiling is zero and that do not unlock a prerequisite,
  citation, measurement, or owned-audience asset.
- Methods requiring credentials, identity, legal claims, medical authority, or
  licensing that the site does not possess.
- Duplicate tactics already represented by a stronger canonical method.

Each rejected row must identify which condition applies. Labels such as "bad",
"low priority", or "not relevant" are insufficient.

## Proof hierarchy

1. Research or planning proof
2. Local implementation and test proof
3. Git and build proof
4. Deployment and live URL proof
5. External publication or submission proof
6. Measured traffic or conversion proof

Passing an earlier level must never be reported as passing a later one.
