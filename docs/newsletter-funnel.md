# Newsletter & Lead Magnet Funnel (CP5.5)

**Updated:** 2026-07-12

## Path

```
Inline Newsletter / NewsletterPopup
  → POST /api/subscribe (Kit v4)
  → D1 subscriptions + funnel_events
  → client redirect /thank-you?source=&category=&segment=
  → direct 7-Day High-Fiber Meal Plan PDF download
  → optional follow-on CTAs to /guides/ pillars
```

## Code

| Piece | Path |
|-------|------|
| API | `functions/api/subscribe.js` |
| Inline form | `src/components/Newsletter.astro` |
| Popup | `src/components/NewsletterPopup.astro` |
| Thank-you | `src/pages/thank-you.astro` |
| Primary PDF | `public/downloads/7-day-high-fiber-meal-plan.pdf` |

## Kit tags (defaults in code)

Category: recipes / nutrition / tips  
Source: footer / popup  
Segments: `recipes-breakfast`, `recipes-main`, `nutrition-foundations`, `nutrition-comparisons`, `tips-storage`, `tips-systems`

### Pillar segments (ready via env; create tags in Kit first)

Set when tags exist in Kit:

| Segment value | Env var |
|---------------|---------|
| `pillar-fiber` | `KIT_TAG_PILLAR_FIBER` |
| `pillar-budget` | `KIT_TAG_PILLAR_BUDGET` |
| `pillar-protein` | `KIT_TAG_PILLAR_PROTEIN` |

Pass `email_segment` from forms on pillar pages when wiring CTAs.

## Lead magnets

| Magnet | Status |
|--------|--------|
| 7-Day High-Fiber Meal Plan PDF | Live at `/downloads/7-day-high-fiber-meal-plan.pdf` and linked from thank-you |
| $60 Week Meal Plan PDF | Live at `/downloads/60-dollar-week-meal-plan.pdf`; not currently the primary funnel offer |
| Per-pillar HTML guides | Live pillars on `/guides/` |

## Manual Kit checklist

1. Confirm form ID `9202679` (or `KIT_FORM_ID`) still active.
2. Confirm welcome sequence fires on form subscribe.
3. Create pillar tags → set Cloudflare env vars above.
4. Keep the visible signup promise and Kit welcome sequence on the same weekly cadence.
5. Verify the primary PDF URL after each production deploy.

## Measurement

- D1 `subscriptions` by `page` / `source`
- `funnel_events` `signup_completed` / `signup_failed`
- `funnel_events` `lead_magnet_download` from the thank-you page
- Dashboard subscribers modal
