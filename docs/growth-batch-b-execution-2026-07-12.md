# Growth Batch B Execution Plan — 2026-07-12

## Objective

Turn the existing article inventory into two controlled authority clusters and
make the original grocery datasets easier to rank, cite, and earn links to.
This batch does not resume generic article production and does not mutate D1.

## Starting state

- Production recovery is live and verified.
- The repository contains 186+ released articles and 361 generated tag pages.
- Original Fiber per Dollar and Protein per Dollar studies already exist.
- `main` also contains the new study: What 50 Grams of Protein Costs per Day.
- The working tree contains unrelated Reddit/video review files. They are out of
  scope and must not be staged or modified by this batch.

## Parallel workstreams

### B1 — Fiber authority cluster

- Inventory pages that target fiber cost, high-fiber budgets, daily fiber, and
  closely overlapping queries.
- Select one parent pillar and one canonical winner for every high-confidence
  overlap.
- Strengthen contextual spoke-to-parent links.
- Add primary-source citations where nutrition or population claims need them.
- Produce a merge/redirect queue; do not delete or redirect a page without an
  exact destination and retained-content check.

### B2 — Protein authority cluster

- Audit the Protein per Dollar study and the new 50-gram daily-cost study as a
  connected data series.
- Verify claims against USDA, FDA, BLS, retailer, and restaurant primary
  sources as applicable.
- Strengthen internal links among the study, daily-cost analysis, budget guide,
  and relevant meal pages without creating circular filler.
- Record any numerical discrepancy as a blocker instead of silently rewriting
  the dataset.

### B3 — Explicit cluster architecture

- Add controlled `cluster` and `parentPillar` metadata support.
- Define a small registry beginning with Healthy Eating on a Budget and Meal
  Prep & Food Storage.
- Add an audit that reports missing, unknown, and self-referential assignments.
- Keep the initial gate report-only until the current inventory is mapped; do
  not break unrelated production solely because legacy pages are not assigned.

## Integration order

1. Review agent file lists and evidence.
2. Resolve contradictory parent/canonical decisions.
3. Run hard-ban, schema, cluster, internal-link, recipe, routing, and build
   checks.
4. Inspect generated HTML for the edited parents and spokes.
5. Commit only Batch B files. Preserve unrelated working-tree changes.
6. Push the Batch B branch, update `main`, wait for the production deployment,
   and verify the exact commit on the custom domain.

## Exit gates

- Every edited article has one explicit cluster and one valid parent.
- No edited article links through a redirect.
- Primary-source citations support material nutrition and price-method claims.
- No new banned language, medical overclaim, filler block, or generic ending.
- `npm run build:checked` and targeted tests pass.
- Live URLs for the two parent studies and their key spokes return the expected
  content after deployment.

## Batch C handoff

After Batch B is live, prepare but do not send:

- a reviewed list of relevant journalists, dietitian publications, university
  extension programs, and budgeting newsletters;
- one pitch per dataset with one finding, one chart, and one CSV;
- a correction-log and methodology link suitable for citations;
- a weekly GSC scorecard using 28-day comparisons.
