---
name: Pinterest Auto-Poster — Known Issues & Patterns
description: Lessons learned from debugging the Pinterest poster in production
type: feedback
originSessionId: 4772625a-9786-49c4-8836-e6b4be9c5841
---
## Pins with NULL scheduled_time always jump to front of queue

When `pins_schedule` rows have `scheduled_time = NULL`, the query in `pins-next.js` uses `COALESCE(scheduled_time, '00:00')` which makes them eligible from midnight — always first in the ORDER BY. If Pinterest fails on such a pin, it blocks the entire queue indefinitely (no skip logic existed before 2026-04-15).

**Why:** Pin was uploaded before the `scheduled_time` column was added. Migration applied the column as NULL to existing rows.

**How to apply:** If a pin appears to be "stuck" (same pin failing every run), check its `scheduled_time` in D1. NULL = will always be first. Fix: use the "↺ Reschedule" button in the dashboard to assign proper times to all PENDING pins.

---

## Pinterest error 2786 "Unable to reach URL" is usually transient

This error means Pinterest's servers failed to fetch the image URL at that moment. We confirmed the image was fully accessible (200 OK, valid JPEG). The error was a transient network issue — but without retry/skip logic, it permanently blocked the queue.

**How to apply:** Don't assume the image URL is broken just because error 2786 appears. Check if the URL returns 200 before investigating further. After 3 failures the pin is auto-marked FAILED and skipped.

---

## Scheduling: 2-hour windows, not 3-hour intervals

The original implementation used `INTERVAL_H = 3` (3-hour slots at 6:00, 9:00, 12:00...) with ±30 min jitter. This was predictable and had an overflow bug with 8 pins (last slot = 27:00 UTC → wrapped to 3 AM same day).

Corrected implementation in `pins-upload.js` and `pins-reschedule.js`:
- 2-hour windows starting at 06:00 UTC
- Each pin = fully random minute within its window (0–119 min offset)
- 8 pins max → last window ends at 21:59 UTC (no overflow)

**How to apply:** If scheduling logic needs to be changed again, edit `shuffleAndReschedule()` in `functions/api/pins-upload.js` and the identical copy in `functions/api/pins-reschedule.js`. Both must stay in sync.

---

## D1 mark_posted timeout → duplicate pins on Pinterest (FIXED 2026-04-20)

`post-pins.py` successfully posted to Pinterest, then the follow-up POST to `/api/pins-mark-posted` hit a 10s ReadTimeout. Unhandled exception → exit code 1 → GitHub Actions re-ran the workflow → same pin posted AGAIN (D1 still said PENDING) → two duplicate pins on Pinterest for `lentil-curry-high-fiber-vegan-dinner_v3`.

**Why:** Cold Cloudflare Worker / D1 sometimes takes >10s on the first request; no retry logic existed; exception propagated to exit 1 even though Pinterest post succeeded.

**Fix shipped in commit 143951d:** added `_post_with_retries` helper — 3 attempts, 30s timeout, 5s backoff. Both `mark_posted` and `mark_failed` use it. `RequestException` is caught so a D1 sync failure never forces exit 1 after a successful Pinterest post. Script logs a `CRITICAL` line if D1 stays out of sync.

**How to apply:** If you see `CRITICAL: pin X posted to Pinterest but NOT marked POSTED in D1` in a future run's logs, fix D1 manually BEFORE the next scheduled run — else the workflow will double-post. Use wrangler: `npx wrangler d1 execute dlh-subscriptions --remote --command "UPDATE pins_schedule SET status='POSTED', pin_id='<id>', published_date='<YYYY-MM-DD HH:MM UTC>', updated_at=datetime('now') WHERE row_id='<row_id>'"`.
