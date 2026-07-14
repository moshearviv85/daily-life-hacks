# Cursor Pinterest release system — 2026-07-13 (revised)

Branch: `cursor/pinterest-experiment-release-system-2026-07-13`  
Revision: Claude-audited cohort + `replace_next_30d` scheduling.

## Changes vs append-after-tail draft

- No scheduling after the 2026-10-27 queue tail.
- Active mode: `replace_next_30d` with preserved UTC slots.
- Six Claude-approved pins only; rejected candidates blocked.
- Replacement manifest preserves old rows (`PENDING` → `REVIEW`, never delete).
- Transaction preview emitted on every dry-run.
- Health supports live read-only D1 snapshot via `--fetch-d1-snapshot`.

## Exact replacement plan

| Old row_id | Replacement | UTC |
|------------|-------------|-----|
| build-protein-meals-without-guesswork | beans-98g-protein-per-dollar | 2026-07-17T15:06:00Z |
| cold-breakfast-bowl-energy-without | build-day-dry-goods-aisle | 2026-07-22T19:55:00Z |
| crispy-separated-grains-every-bite | stop-paying-protein-it-costs | 2026-07-26T20:58:00Z |
| finally-get-golden-brown-crust | restaurant-fiber-meal-costs-same | 2026-08-02T14:40:00Z |
| food-doesn-t-need-much | protein-days-priced-dry-goods | 2026-08-03T14:02:00Z |
| fresh-vs-frozen-only-question | only-foods-you-need-high | 2026-08-05T19:57:00Z |

## Safety

- Dry-run: zero D1 writes.
- No commit/push/publish/Actions in this task.
- `MAX_PINS_PER_RUN` unchanged at 1.
