# Pinterest Research Cohort Production Release — 2026-07-14

## Release result

- Production commit: `56ce64a975061546290f2c31dbce88ee62351235`
- Cloudflare Pages workflow: <https://github.com/moshearviv85/daily-life-hacks/actions/runs/29340738681>
- Custom-domain deploy proof returned the exact production commit.
- All five upgraded article URLs returned HTTP 200.
- All six approved Pinterest image URLs returned HTTP 200 and matched the local SHA-256 hashes.

## D1 transaction

The reviewed fail-closed SQL artifact was applied to the remote `dlh-subscriptions` database only after the live asset checks passed:

`pipeline-data/approvals/pinterest-research-cohort-2026-07-14-production.sql`

Wrangler reported a successful transaction with bookmark `00005845-00000016-000050a8-5a53316b5756e904e12bbbee7e817686`. Post-write verification returned:

- `PENDING`: 163
- `POSTED`: 446
- `REVIEW`: 6
- Six new cohort rows are `PENDING`, with `fail_count=0` and no Pinterest ID yet.
- Six outgoing rows are preserved as `REVIEW`.
- Every replaced time slot has exactly one active `PENDING` row.

## Active cohort schedule

| Scheduled UTC | Active queue row |
| --- | --- |
| 2026-07-17 15:06 | `exp-20260713-beans-98g-protein-per-dollar` |
| 2026-07-22 19:55 | `exp-20260713-build-day-dry-goods-aisle` |
| 2026-07-26 20:58 | `exp-20260713-stop-paying-protein-it-costs` |
| 2026-08-02 14:40 | `exp-20260713-restaurant-fiber-meal-costs-same` |
| 2026-08-03 14:02 | `exp-20260713-protein-days-priced-dry-goods` |
| 2026-08-05 19:57 | `exp-20260713-only-foods-you-need-high` |

The approval artifact and distribution ledger were advanced to `PENDING` after the remote verification so repository state matches the production queue.
