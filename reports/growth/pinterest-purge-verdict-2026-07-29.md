# Pinterest purge verdict — 2026-07-29

Follow-up to `pinterest-diagnostic-2026-07-26.md`. Measured with the read-only
`pinterest-purge-verdict.yml` workflow (run 30473654533), which pulls account-level
daily analytics and per-pin cohort analytics from the Pinterest v5 API.

## Verdict

**The purge worked. Keep this account. Do not open a new one.**

Against the criterion agreed in advance — *any* impressions on pins posted after
2026-07-26 20:30 means distribution is returning — the answer is yes, with the
volume caveat stated below.

## Cohort comparison

| | pins | impressions | per pin | pins with any | saves | outbound |
|---|---|---|---|---|---|---|
| July pre-purge (Jul 1 → purge) | 51 | **0** | 0.0 | 0 / 51 | 0 | 0 |
| Post-purge (after Jul 26 20:30) | 19 | **5** | 0.3 | 3 / 19 | 0 | 0 |

The 19-pin figure understates the result. 15 of those 19 pins were created on
Jul 28-29, inside Pinterest's reporting lag (see below). Restricted to the 4 pins
old enough to have reported data:

- **3 of 4 post-purge pins earned impressions.** Versus 0 of 51 before the purge.
- That is the first time in July a newly created pin earned anything at all.

## Account level

Jun 20 → Jul 29: 2,314 impressions, 68 pin clicks, 18 outbound, 9 saves.
Baseline Jun 20 – Jul 25: **53.6 impressions/day** (min 25, max 207).

| date | impressions |
|---|---|
| Jul 23 | 42 |
| Jul 24 | 46 |
| Jul 25 | 44 |
| Jul 26 (purge day) | 173 |
| **Jul 27 (first full post-purge day)** | **210** |
| Jul 28 | 0 (not yet reported) |
| Jul 29 | 0 (not yet reported) |

Jul 27 at 210 is the **highest single day in the entire 40-day window** — it edges
out Jul 16 (207), the spike that was previously the only thing this account had
ever done. A 3-4x lift beginning the day of the purge.

## The Jul 28-29 zeros are reporting lag, not a new collapse

Jul 28 and Jul 29 are the **only two zero-impression days in 40 days**, and the
prior minimum was 25. An account with 573 live pins does not go 210 → 0 → 0.
Pinterest's analytics finalise with a 1-3 day delay. Do not read those zeros as
suppression — and note this is the same class of measurement artifact that produced
the wrong "absolute zero" diagnosis on Jul 26.

## Honest limits

- Total post-purge volume is 5 impressions, 0 saves, 0 outbound clicks. Tiny.
- Only ~1.5 days of clean post-purge data exist. The 72-hour test has not actually
  had 72 measurable hours.
- The signal is directionally right and consistent across both metrics, but it is
  thin. **Re-run the workflow Aug 1-2** once Jul 28-30 finalise for a real read.

## Cadence — open risk

`functions/api/_pin-schedule.js` is set to **8 pins/day** (owner decision,
2026-07-27), and the queue is posting at that rate — 19 pins in three days.

Burst posting at 6-9/day was one of the original spam signals behind the
distribution collapse. Recommend dropping to **3/day** until the August
measurement confirms recovery. Nothing was changed.

## Not done

No pins posted, no pins deleted, no account created, no cadence edited.
