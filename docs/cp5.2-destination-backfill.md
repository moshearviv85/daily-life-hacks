# CP5.2 Destination Backfill Note

**Date:** 2026-07-12

## Probe result

- Distinct articles with `pin_briefs` status `ok`: **45**
- Of those with **exactly 4** ok briefs and **&lt;4** `origin=pin` destinations in `pin-destinations.json`: **0**

`sync_pin_destinations.py --only-complete` has nothing to add in this batch.

## What this means

Articles that still have &lt;4 pin destinations but **pin images on disk** are waiting on **brief generation / produce**, not a registry sync. That is content-production work and stays under `docs/content-production-control.md` (no produce during cleanup; batches ≤10 with 301 verification).

## Next backfill when briefs appear

```bash
python scripts/NEW_PIPELINE_2026-05-08/sync_pin_destinations.py --dry-run --only-complete
# then per-slug or full sync after review
python scripts/NEW_PIPELINE_2026-05-08/sync_pin_destinations.py --article-slug <slug>
npm run derive:pin-routing   # if used in repo scripts
npm run build:checked
```

Keep destination backfill batches **≤10** articles; verify sample pin URLs **301 → canonical**.
