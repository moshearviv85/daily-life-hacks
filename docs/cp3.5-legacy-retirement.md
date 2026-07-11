# Legacy articles_schedule retirement (CP3.5)

**Date:** 2026-07-11

## D1 production check (`dlh-subscriptions`)

Before retirement:

| status | count |
|--------|------:|
| PUBLISHED | 48 |
| DUPLICATE | 1 |
| PENDING | 1 |

Staging `articles_schedule`: empty.

## Action taken

Cancelled the stale leftover (not published via new pipeline; no file in `src/data/articles`):

- slug: `vegetable-fried-rice-frozen-veg`
- set `status = 'CANCELLED'` (was PENDING since 2026-04-16)

After:

| status | count |
|--------|------:|
| PUBLISHED | 48 |
| CANCELLED | 1 |
| DUPLICATE | 1 |
| PENDING | 0 |

## Code retirement

- Archived `publish-articles.yml` → `archive/github-workflows/publish-articles.yml`
- Removed Legacy Publish UI from dashboard
- `pipeline-trigger` action `publish` returns 410 Gone
- Preferred path remains: Pipeline Produce → staging review → Promote
