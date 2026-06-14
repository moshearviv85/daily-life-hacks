# Content Quality Backlog - 2026-06-14

## Scope

This backlog covers the 54 canonical articles from `content-indexing-triage-report.csv` with:

- `recommended_action = keep_review_for_content_depth`
- live canonical article files
- GSC impressions in the 2026-06-14 Pages export
- no technical routing action required

These are not delete, merge, redirect, or `410` candidates. They are content-improvement candidates.

## Prioritization Method

Priority score weights GSC impressions by current average position:

`score = impressions / sqrt(max(position, 1))`

Buckets:

- `A`: average position 1-10, protect and improve near-page-top rankings.
- `B`: average position 11-20, push page-two candidates toward page one.
- `C`: average position 21-40, likely needs stronger search-intent match.
- `D`: average position above 40, lower priority or possible SERP mismatch.

## Batch 1 Recommendation

Start with a small, high-signal batch. Do not rewrite all 54 at once.

| Order | Slug | Reason | Action |
| ---: | --- | --- | --- |
| 1 | `high-fiber-fast-food-options-guide` | Highest opportunity score, 333 impressions, position 15.01 | Expand practical examples, improve intent match, add FAQ depth |
| 2 | `how-to-double-recipe-seasoning-without-guessing` | Already near page top, position 6.91 | Defend ranking with clearer method, examples, mistakes |
| 3 | `how-to-store-homemade-salad-dressing-safely` | Strong impressions, page-two push | Add storage timing, containers, spoilage signs, FAQ |
| 4 | `comparing-fiber-content-different-pizza-crusts` | Position 7.05 with real impressions | Strengthen comparison table and practical buying/cooking advice |
| 5 | `good-source-of-fiber-label-meaning` | Position 7.39, informational intent | Make label interpretation more concrete and scannable |
| 6 | `best-low-cost-protein-sources-large-families` | Position 7.66, commercial/practical value | Add price-per-serving context and meal-use examples |
| 7 | `gut-health-tea-peppermint-ginger` | Position 9.57, protected GSC URL | Improve food-first framing and avoid medical overreach |

## Batch 1 Execution Status

Completed on branch `codex/content-quality-batch-1`.

Updated articles:

- `high-fiber-fast-food-options-guide`
- `how-to-double-recipe-seasoning-without-guessing`
- `how-to-store-homemade-salad-dressing-safely`
- `comparing-fiber-content-different-pizza-crusts`
- `good-source-of-fiber-label-meaning`
- `best-low-cost-protein-sources-large-families`
- `gut-health-tea-peppermint-ginger`

Verification:

- Body word counts are now 894-1,216 words across the batch.
- Voice safety scan found no banned AI phrases, no `cure/heal/prevent/detox/cleanse` language, no em dashes, and no smart quotes.
- `npm run build:checked` passed.
- A follow-up clean `npm run build` passed without duplicate content-id warnings.
- `npm run verify:routing` passed for 510 built article/alias slugs.
- `npm run verify:pin-destinations` passed for 225 pin destination URLs.

## Full Ranked Backlog

| # | slug | words | GSC impressions | avg position | bucket | score |
| ---: | --- | ---: | ---: | ---: | --- | ---: |
| 1 | `high-fiber-fast-food-options-guide` | 802 | 333 | 15.01 | B | 85.95 |
| 2 | `how-to-double-recipe-seasoning-without-guessing` | 727 | 148 | 6.91 | A | 56.30 |
| 3 | `how-to-store-homemade-salad-dressing-safely` | 830 | 173 | 12.13 | B | 49.67 |
| 4 | `comparing-fiber-content-different-pizza-crusts` | 818 | 87 | 7.05 | A | 32.77 |
| 5 | `good-source-of-fiber-label-meaning` | 804 | 79 | 7.39 | A | 29.06 |
| 6 | `best-low-cost-protein-sources-large-families` | 874 | 56 | 7.66 | A | 20.23 |
| 7 | `cooking-oils-smoke-points-best-uses` | 695 | 167 | 75.20 | D | 19.26 |
| 8 | `gut-health-tea-peppermint-ginger` | 838 | 54 | 9.57 | A | 17.46 |
| 9 | `high-fiber-bran-muffins-that-taste-good` | 699 | 134 | 66.22 | D | 16.47 |
| 10 | `popcorn-vs-potato-chips-fiber-comparison` | 815 | 40 | 8.57 | A | 13.66 |
| 11 | `prune-juice-alternatives-for-constipation` | 803 | 20 | 4.30 | A | 9.64 |
| 12 | `healthy-alternatives-potato-chips-snacking` | 862 | 70 | 60.87 | D | 8.97 |
| 13 | `sheet-pan-salmon-and-vegetables-30-minutes` | 706 | 17 | 6.88 | A | 6.48 |
| 14 | `how-to-keep-sandwiches-from-getting-soggy` | 869 | 27 | 20.07 | C | 6.03 |
| 15 | `high-fiber-pizza-crust-cauliflower` | 813 | 16 | 7.50 | A | 5.84 |
| 16 | `high-fiber-yogurt-parfait-for-breakfast` | 822 | 25 | 37.00 | C | 4.11 |
| 17 | `baking-sheet-liners-parchment-silicone-when-to-use` | 767 | 15 | 17.73 | B | 3.56 |
| 18 | `big-flavor-less-salt-citrus-herbs-umami-swaps` | 712 | 10 | 8.80 | A | 3.37 |
| 19 | `oatmeal-vs-grits-fiber-content` | 782 | 15 | 24.33 | C | 3.04 |
| 20 | `chia-pudding-variations-for-breakfast` | 830 | 10 | 11.00 | B | 3.02 |
| 21 | `freezer-inventory-simple-system` | 751 | 5 | 3.00 | A | 2.89 |
| 22 | `high-fiber-pasta-alternatives` | 839 | 6 | 7.00 | A | 2.27 |
| 23 | `how-much-protein-in-bagel-sandwich` | 834 | 7 | 9.57 | A | 2.26 |
| 24 | `fiber-rich-soup-for-weight-loss-cabbage` | 726 | 5 | 6.60 | A | 1.95 |
| 25 | `best-breakfast-foods-for-sustained-energy` | 698 | 15 | 71.40 | D | 1.78 |
| 26 | `how-to-stretch-meals-large-families` | 807 | 3 | 4.00 | A | 1.50 |
| 27 | `hidden-sugars-popular-summer-salad-dressings` | 826 | 6 | 17.33 | B | 1.44 |
| 28 | `gluten-free-sourdough-discard-pizza-dough` | 714 | 4 | 10.00 | A | 1.26 |
| 29 | `add-flavor-without-more-sugar-tricks` | 794 | 3 | 5.67 | A | 1.26 |
| 30 | `whole-wheat-vs-white-pasta-fiber` | 800 | 8 | 42.12 | D | 1.23 |
| 31 | `high-fiber-smoothies-for-kids-picky-eaters` | 826 | 3 | 6.67 | A | 1.16 |
| 32 | `aldi-shopping-hacks-large-family-meals` | 846 | 6 | 38.00 | C | 0.97 |
| 33 | `costco-rotisserie-chicken-meal-ideas-dinner` | 728 | 3 | 10.00 | A | 0.95 |
| 34 | `healthy-egg-sandwich-add-ins-toppings` | 736 | 4 | 19.25 | B | 0.91 |
| 35 | `high-protein-vs-high-fiber-satiety` | 872 | 2 | 5.50 | A | 0.85 |
| 36 | `gut-friendly-high-fiber-smoothies-for-daily-wellness` | 803 | 5 | 41.80 | D | 0.77 |
| 37 | `vegan-high-fiber-meal-prep-for-week` | 823 | 2 | 7.00 | A | 0.76 |
| 38 | `how-to-revive-wilted-lettuce-and-greens` | 705 | 4 | 28.25 | C | 0.75 |
| 39 | `high-fiber-salad-dressings-homemade` | 745 | 1 | 2.00 | A | 0.71 |
| 40 | `cheap-crockpot-meals-large-families` | 783 | 5 | 59.00 | D | 0.65 |
| 41 | `healthy-homemade-dumpling-wrapper-recipe` | 710 | 4 | 56.75 | D | 0.53 |
| 42 | `freezer-organization-tips-large-family-meals` | 839 | 1 | 4.00 | A | 0.50 |
| 43 | `high-fiber-gluten-free-bread-recipe` | 798 | 1 | 4.00 | A | 0.50 |
| 44 | `black-bean-brownies-hidden-fiber-dessert` | 695 | 3 | 67.00 | D | 0.37 |
| 45 | `no-bake-high-fiber-energy-balls-recipe` | 787 | 3 | 84.33 | D | 0.33 |
| 46 | `cutting-board-basics-which-to-use` | 739 | 2 | 37.50 | C | 0.33 |
| 47 | `easy-one-pot-chicken-and-rice-dinner` | 706 | 3 | 90.67 | D | 0.32 |
| 48 | `high-fiber-raspberry-jam-recipe-chia` | 711 | 1 | 10.00 | A | 0.32 |
| 49 | `high-fiber-hummus-recipe-homemade` | 794 | 1 | 10.00 | A | 0.32 |
| 50 | `lentil-curry-high-fiber-vegan-dinner` | 841 | 2 | 62.00 | D | 0.25 |
| 51 | `air-fryer-salmon-bites-garlic-honey-glaze` | 651 | 2 | 77.00 | D | 0.23 |
| 52 | `grab-and-go-fridge-snack-drawer` | 707 | 1 | 44.00 | D | 0.15 |
| 53 | `easy-cold-summer-pasta-salad-potlucks` | 655 | 1 | 88.00 | D | 0.11 |
| 54 | `cucumber-edamame-salad-sesame` | 670 | 1 | 91.00 | D | 0.10 |

## Batch 1 Done Criteria

For each edited article:

- Preserve the same slug and canonical URL.
- Preserve topic intent unless the current article has clear mismatch.
- Expand with specific, useful information, not filler.
- Add or improve FAQ only when it helps the search intent.
- Avoid supplements, detox/cleanse language, absolute health claims, and medical advice.
- Keep David Miller voice in the middle sections, not only the intro.
- Run hard-ban scans and a build before deployment.
