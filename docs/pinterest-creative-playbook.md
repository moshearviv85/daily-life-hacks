# Pinterest Creative Playbook (CP5.1)

**Updated:** 2026-07-12  
**Source:** `pipeline-data/reports/pin-performance-2026-07-12.*` (66 own-domain pins with ≥50 impressions)

## Operating rules

1. **Quality > volume.** Keep `MAX_PINS_PER_RUN=1` and cooldown. Do not raise auto-post rate.
2. **Own-domain links only** in performance reviews. Off-site / empty-link pins are noise (128 skipped in the baseline export).
3. **Score by CTR** (outbound clicks ÷ impressions), not impressions alone. High-impression / low-CTR creatives still waste queue slots.
4. **Baseline avg CTR** (eligible set): **~3.3%**. Treat ≥6% as strong; 0% with ≥50 impressions as underperformer to deprioritize.

## Title formulas that win (from top cohort)

Prefer concrete, outcome-led titles:

| Pattern | Examples from top 10 |
|---------|----------------------|
| Number + recipe/time | `Fast Pizza Dough Without Yeast: 30 Minute Recipe` |
| Named dish + method | `Tuscan White Bean and Kale Soup (Simple Stovetop Version)` |
| Challenge / plan | `30 Day High Fiber Challenge Meal Plan` |
| Specific how-to | `How to Season a Cast Iron Skillet Properly`, `How to Cook Dried Beans From Scratch` |
| Question + job-to-be-done | `What's the Best Way to Freeze Bananas for Smoothies` |
| Use-case meal prep | `High Fiber Burrito Bowl Meal Prep for a Better Work Lunch` |

### Brief constraints (feed into pin title generation)

- Lead with **specific food / tool / method**, not category fluff.
- Prefer **one number** when natural (minutes, days, servings) — sample `has_number` avg CTR ~3.6%.
- Keep titles **~40–70 chars** when possible. Sample `short_title` avg CTR ~0.8% (weak).
- Fiber angle works when tied to a **dish or plan**, not “fiber” alone in a vague listicle title.

## Title patterns to avoid / deprioritize

From bottom cohort (0% CTR with ≥50 impressions) and weak pattern averages:

- Vague comparisons: `Whole Wheat Vs White Pasta Nutrition`
- Generic “Best …” lists without a concrete dish
- Broad how-tos with no payoff: `How to Read Food Nutrition Labels`, `How to Meal Prep on a Budget` (weak in this sample)
- Clickbait money hooks without a clear food object: `The $1.50 Gut Health Hack You're Ignoring`
- Ultra-short category titles

**Budget** keyword alone underperformed in this snapshot (`budget` ~0.6% avg CTR). Prefer concrete cost framing inside a dish title later (A/B in CP5.6), not “budget” as the whole hook.

## Creative / queue hygiene

- When approving pins in the dashboard, prefer titles matching **win formulas** above.
- Do not re-queue near-duplicates of bottom-quartile titles for the same article.
- External / non-DLH pin_link rows: ignore for scoring; fix source data if they appear in our posting queue.
- After each analytics refresh, re-run:

```bash
# Export from prod D1 (requires wrangler auth)
npx wrangler d1 execute dlh-subscriptions --remote --env production --json --command "SELECT pin_id, pin_title, pin_url, pin_link, impressions, outbound_clicks, saves, cached_at FROM pinterest_analytics_cache ORDER BY impressions DESC;" > pipeline-data/reports/pinterest-analytics-raw.json

python scripts/NEW_PIPELINE_2026-05-08/score_pin_performance.py ^
  --input pipeline-data/reports/pinterest-analytics-raw.json ^
  --out pipeline-data/reports/pin-performance.json
```

## Dashboard

Pins → **Pinterest Analytics**: default sort is **CTR**. Columns: Impressions, Clicks, CTR%, Saves.

## Non-goals (until CP5.2)

- Idea Pin / video automation
- Raising post frequency
- Soft-duplicate HTML destinations

## Next experiment candidates (CP5.6)

1. “How to …” vs named-dish titles for the same article (new briefs only)
2. Number-in-title vs no-number on recipe pins
3. Board assignment for the same creative
