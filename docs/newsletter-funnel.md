# Newsletter & Lead Magnet Funnel (CP5.5)

**Updated:** 2026-07-12

## Path

```
Inline Newsletter / NewsletterPopup
  → POST /api/subscribe (Kit v4)
  → D1 subscriptions + funnel_events
  → client redirect /thank-you?source=&category=&segment=
  → soft CTA to /guides pillars (PDFs not in repo yet)
```

## Code

| Piece | Path |
|-------|------|
| API | `functions/api/subscribe.js` |
| Inline form | `src/components/Newsletter.astro` |
| Popup | `src/components/NewsletterPopup.astro` |
| Thank-you | `src/pages/thank-you.astro` |

## Kit tags (defaults in code)

Category: recipes / nutrition / tips  
Source: footer / popup  
Segments: `recipes-breakfast`, `recipes-main`, `nutrition-foundations`, `nutrition-comparisons`, `tips-storage`, `tips-systems`

### Pillar segments (ready via env — create tags in Kit first)

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
| 7-Day High-Fiber Meal Plan PDF | **Not in repo** — thank-you no longer 404s; links fiber guide |
| $60 Week Meal Plan PDF | **Not in repo** — thank-you links budget playbook |
| Per-pillar HTML guides | Live pillars on `/guides/` |

## Manual Kit checklist

1. Confirm form ID `9202679` (or `KIT_FORM_ID`) still active.
2. Confirm welcome sequence fires on form subscribe.
3. Create pillar tags → set Cloudflare env vars above.
4. When PDFs are ready, place under `public/downloads/` and restore download CTAs on thank-you.

## Measurement

- D1 `subscriptions` by `page` / `source`
- `funnel_events` `signup_completed` / `signup_failed`
- Dashboard subscribers modal
