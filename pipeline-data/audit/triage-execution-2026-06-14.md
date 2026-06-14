# Triage Execution Report - 2026-06-14

## Scope

Executed the actionable parts of `content-indexing-triage-report.md` for production/main:

- Canonical indexable article cleanup
- Noindex proxy exclusion
- Google-reported URL-level 404 cleanup from the available GSC Performance export
- Off-topic non-food slug removal
- Indexable canonical article count before/after

No D1/KV mutation, no article production, no image/pin generation, and no canonical article deletions were performed.

## Triage Decisions

From `content-indexing-triage-report.summary.json` on `main`:

- Canonical/released articles: 158
- Delete/301 after manual approval: 2
- Merge decisions: 0
- Expand decisions: 0
- Content-depth review: 54
- Noindex/canonical proxy confirmations: 68

The 54 `keep_review_for_content_depth` rows are not empty canonical articles. In the CSV, their article word counts range from 651 to 874 words, average 774.6. The Markdown thin/missing table lists 50 canonical articles with body word counts from 593 to 724; all have complete frontmatter and are primarily missing image assets. They were left untouched for a later content-quality pass.

## Executed Actions

### Regression Correction

Two URLs in the GSC Performance Pages export had meaningful impressions and must not be treated as gone:

| Restored canonical article | GSC signal |
| --- | --- |
| `/prebiotic-foods-beyond-the-buzzwords/` | ~109 impressions, ranking around position 10 |
| `/selenium-containing-foods-easy-ways/` | ~114 impressions |

Both were restored as live indexable canonical articles. New rule: any URL with impressions in the GSC Pages export must be flagged for content improvement instead of being deleted, redirected to a weak match, or returned as `410 Gone`.

### Permanent Redirects

The following legacy food/kitchen URLs had close canonical matches and now return 301 redirects:

| Legacy URL path | Target |
| --- | --- |
| `/protein-per-serving-beans-chicken-tofu-compared/` | `/best-low-cost-protein-sources-large-families/` |
| `/how-to-quick-soak-dried-beans-same-day/` | `/how-to-cook-dried-beans-from-scratch/` |
| `/keep-berries-fresh-longer-when-to-wash/` | `/how-to-store-fruits-and-vegetables-properly/` |
| `/how-to-pack-lunch-crisp-sandwiches-salads/` | `/how-to-keep-sandwiches-from-getting-soggy/` |
| `/plan-week-of-dinners-fewer-grocery-runs/` | `/batch-cooking-for-beginners-weekly-guide/` |

### Gone URLs

The following legacy URLs had no close canonical match, were off-topic, or were obsolete tag/pagination paths. They now return `410 Gone` with `X-Robots-Tag: noindex, follow`:

| Gone path |
| --- |
| `/most-very-important-guidance-skill-set/` |
| `/usual-excuses-made-by-high-conflict-parents/` |
| `/how-to-preheat-skillet-even-browning/` |
| `/savory-chia-seed-recipes-breakfast/` |
| `/how-to-pack-salad-for-work-not-soggy/` |
| `/tag/homeorganization/` |
| `/tag/reducefoodwaste/` |
| `/tag/quickmeals/` |
| `/tag/homecooking/` |
| `/tag/crockpot-meals/` |
| `/tag/stuffedmushrooms/` |
| `/tag/kitchenbasics/` |
| `/tips/1/` |

## Google 404 Handling

The provided Coverage ZIP contains aggregate issue counts only, including 52 `Not found (404)` pages, but it does not include URL-level 404 rows.

The available GSC Performance `Pages.csv` export contained 109 unique URL rows. A production live scan before this code change found:

- 89 final `200`
- 20 final `404`

Those 20 URL-level 404s are covered by the redirect/gone actions above.

## Indexable Count

Indexable canonical article count did not change:

| Metric | Before | After |
| --- | ---: | ---: |
| Released canonical article files | 158 | 160 |

This cleanup removes or redirects legacy URL noise, restores two impression-bearing canonical articles, and does not add new indexable proxy pages.

## Verification

- `node --test tests/canonical-routing.test.mjs`
- `npm run build:checked`

Both passed locally before deployment.
