# Pinterest controlled cohort release

Safe release-and-measurement layer for Pinterest experiment cohorts. It prepares a cohort for human approval, schedules **only** through the existing production poster path, and keeps measurement windows explicitly separated.

## Hard constraints

- `MAX_PINS_PER_RUN` stays **1** (unchanged in `scripts/post-pins.py`).
- Do not increase posting frequency.
- Default commands perform **zero** D1 writes.
- Do not dispatch GitHub Actions or post to Pinterest from these scripts.
- Existing poster and dashboard behavior is preserved.
- Active research cohort uses **`replace_next_30d`** — it does **not** append after the 2026-10-27 queue tail.

## Status gate

```
REVIEW  →  APPROVED  →  PENDING  →  (POSTED by existing auto-poster)
```

For replacements, old queue rows are preserved: **PENDING → REVIEW** (never deleted). Incoming cohort pins take the same UTC slots as PENDING candidates in the approval artifact.

## Schedule modes

| Mode | Use |
|------|-----|
| `replace_next_30d` | **Active.** Swap selected research pins into existing next-30-day PENDING slots; preserve UTC times. |
| `append_after_tail` | Legacy/test only. Append after `append_after_utc`. |

## Active cohort (Claude audit)

`pipeline-data/experiments/pinterest-research-cohort-2026-07-13.json`

Selected (6):

- `beans-98g-protein-per-dollar`
- `build-day-dry-goods-aisle`
- `stop-paying-protein-it-costs`
- `protein-days-priced-dry-goods`
- `restaurant-fiber-meal-costs-same`
- `only-foods-you-need-high`

Rejected (must not enter): includes `get-50g-protein-before-lunch`, `you-re-overspending-protein-month`, and other Claude-rejected assets.

Exact dry-run replacement plan:

| Replacement | Replaces | UTC slot |
|-------------|----------|----------|
| beans-98g-protein-per-dollar | build-protein-meals-without-guesswork | 2026-07-17 15:06 |
| build-day-dry-goods-aisle | cold-breakfast-bowl-energy-without | 2026-07-22 19:55 |
| stop-paying-protein-it-costs | crispy-separated-grains-every-bite | 2026-07-26 20:58 |
| restaurant-fiber-meal-costs-same | finally-get-golden-brown-crust | 2026-08-02 14:40 |
| protein-days-priced-dry-goods | food-doesn-t-need-much | 2026-08-03 14:02 |
| only-foods-you-need-high | fresh-vs-frozen-only-question | 2026-08-05 19:57 |

## Ledger schema

File: `pipeline-data/distribution-release-ledger.jsonl` (one JSON object per line).

Fields: `channel`, `cohort_id`, `experiment_id`, `pin_slug`, `destination_url`, `asset_path`, `variant`, `status`, `queue_row_id`, `pinterest_pin_id`, `scheduled_at_utc`, `published_at_utc`, `measurement_due_24h`, `measurement_due_7d`, `measurement_due_14d`, `impressions`, `outbound_clicks`, `saves`, `ctr`, `decision`.

## Commands

### 1) Dry-run replace plan (default — no D1)

```bash
python scripts/pinterest_release_cohort.py \
  --cohort pipeline-data/experiments/pinterest-research-cohort-2026-07-13.json \
  --queue-snapshot path/to/pins_schedule_export.json \
  --write-ledger
```

Produces:

- `pipeline-data/approvals/{cohort_id}-approval.json`
- `pipeline-data/approvals/{cohort_id}-transaction-preview.json`
- `pipeline-data/approvals/{cohort_id}-replacement-manifest.json`
- `pipeline-data/approvals/{cohort_id}-pending-draft.csv` (not uploaded)

Transaction preview fields: `old_row_id`, `old_title`, `replacement_row_id`, `replacement_title`, `preserved_utc_slot`, `reason`.

### 2) Advance approval gate

```bash
python scripts/pinterest_release_cohort.py \
  --advance-gate APPROVED \
  --approval-file pipeline-data/approvals/pinterest-research-cohort-2026-07-13-approval.json
```

### 3) Production write

The Python CLI remains dry-run only. Exact-slot production replacement uses the reviewed, fail-closed SQL release artifact after the matching image and routes are live. The statement gates on all six outgoing rows still being PENDING at their approved slots and all six incoming IDs still being absent. If either precondition drifts, it writes zero rows.

### 4) Queue health (read-only)

Fixture / export:

```bash
python scripts/pinterest_queue_health.py \
  --queue-snapshot path/to/export.json \
  --workflow-state active
```

Live read-only D1 snapshot (SELECT only via wrangler — no mutations):

```bash
python scripts/pinterest_queue_health.py \
  --fetch-d1-snapshot \
  --save-d1-snapshot pipeline-data/approvals/pins-schedule-readonly-snapshot.json \
  --workflow-state active
```

### 5) Experiment reports (never mixed)

```bash
python scripts/pinterest_experiment_report.py --population cohort --window 24h --metrics path/to/metrics.json
python scripts/pinterest_experiment_report.py --population account_30d --payload path/to/account.json
python scripts/pinterest_experiment_report.py --population eligible_90d --payload path/to/eligible.json
```
