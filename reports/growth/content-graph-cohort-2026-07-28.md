# Content graph cohort, 2026-07-28

## Outcome

Seven search-visible pages that had only two contextual inlinks now have three. The eighth page in the fixed cohort was deliberately left unchanged because no additional source article offered a strong, non-forced context.

This is a crawl-path and topical-context improvement. It is not evidence of traffic growth, and the cohort should stay fixed while later GSC exports show whether impressions, positions, or clicks move.

## Evidence and selection rules

- Source graph: `scripts/internal-linking/map_links.py`, run against all 227 current articles before any edit.
- GSC export: `daily-life-hacks.com-Performance-on-Search-2026-07-28.zip`, page data covering 2026-04-29 through 2026-07-26.
- Bing export: `daily-life-hacks.com_SiteExplorerUrls_7_26_2026.csv`.
- GSC rows were canonicalized by URL path before aggregation, so slash and no-slash rows weren't counted as separate pages.
- A page qualified when it had real GSC or Bing visibility, only two contextual inlinks, no broken target, and a genuinely relevant source page.
- Four authority pillars were used for shortest-depth checks: budget fiber, budget protein, weekly budget shopping, and meal prep/food storage.

## Fixed cohort

| Target | GSC clicks / impressions / weighted position | Bing impressions / clicks | Inlinks before -> after | Pillar depth before -> after | Controlled cluster | Alias audit | Decision |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `how-to-store-homemade-salad-dressing-safely` | 1 / 193 / 17.09 | 1 / 0 | 2 -> 3 | 4 -> 4 | Outside controlled set | 8 canonical aliases; 4 are current pin-router variants | Linked from the hidden-sugars dressing article |
| `how-to-double-recipe-seasoning-without-guessing` | 0 / 175 / 7.16 | 0 / 0 | 2 -> 3 | 2 -> 2 | Outside controlled set | 4 canonical aliases; all 4 are pin-router variants | Linked from the less-salt seasoning article |
| `selenium-containing-foods-easy-ways` | 0 / 119 / 55.96 | 0 / 0 | 2 -> 3 | 4 -> 4 | Outside controlled set | 4 canonical aliases; all 4 are pin-router variants | Linked from the sheet-pan salmon recipe |
| `healthy-alternatives-potato-chips-snacking` | 0 / 106 / 71.22 | 0 / 0 | 2 -> 3 | 2 -> 2 | Outside controlled set | 8 canonical aliases; 4 are current pin-router variants | Linked from the roasted chickpea snack |
| `comparing-fiber-content-different-pizza-crusts` | 0 / 87 / 7.05 | 4 / 0 | 2 -> 3 | 2 -> 2 | Outside controlled set | 4 canonical aliases; all 4 are pin-router variants | Linked from the same-day pizza dough recipe |
| `best-low-cost-protein-sources-large-families` | 1 / 85 / 12.53 | 0 / 0 | 2 -> 3 | 1 -> 1 | `budget-protein`; parent `high-protein-on-a-budget-complete-guide` | 4 canonical aliases; all 4 are pin-router variants | Linked from the large-family crockpot article |
| `gut-health-tea-peppermint-ginger` | 0 / 74 / 12.89 | 3 / 0 | 2 -> 2 | 3 -> 3 | Outside controlled set | 3 canonical aliases; no current router entry | Skipped: its two existing sources were the only strong contexts found |
| `baking-sheet-liners-parchment-silicone-when-to-use` | 0 / 35 / 23.06 | 10 / 1 | 2 -> 3 | 2 -> 2 | Outside controlled set | No alias or router entry | Linked from the sheet-pan breakfast hash |

## Exact contextual links added

| Source | Target | Context |
| --- | --- | --- |
| `hidden-sugars-popular-summer-salad-dressings` | `how-to-store-homemade-salad-dressing-safely` | Homemade dressing fridge-life claim |
| `big-flavor-less-salt-citrus-herbs-umami-swaps` | `how-to-double-recipe-seasoning-without-guessing` | Scaling salt and strong spices for a crowd |
| `sheet-pan-salmon-and-vegetables-30-minutes` | `selenium-containing-foods-easy-ways` | Salmon as an ordinary selenium-containing grocery |
| `crispy-roasted-chickpeas-high-fiber-snack` | `healthy-alternatives-potato-chips-snacking` | Other salty, crunchy snack options |
| `how-to-make-sourdough-pizza-dough-same-day` | `comparing-fiber-content-different-pizza-crusts` | Flour and crust-fiber choice |
| `cheap-crockpot-meals-large-families` | `best-low-cost-protein-sources-large-families` | Budget protein choices for a crowd |
| `sheet-pan-breakfast-hash-with-eggs-and-sweet-potatoes` | `baking-sheet-liners-parchment-silicone-when-to-use` | Parchment, foil, silicone, and bare-pan choice |

## Whole-graph before and after

| Metric | Before | After |
| --- | ---: | ---: |
| Articles | 227 | 227 |
| Contextual article links | 1,304 | 1,311 |
| Orphans | 0 | 0 |
| Pages under 2 inlinks | 0 | 0 |
| Pages under 3 outbound links | 0 | 0 |
| Median inlinks | 3 | 3 |
| Mean inlinks | 5.61 | 5.64 |
| Median outbound links | 4 | 4 |
| Broken links | 0 | 0 |

The shortest pillar depth didn't change because each new source was at the same or greater depth than the target's existing shortest route. The improvement is an additional relevant path and anchor, not an invented depth win.

## Cannibalization and canonical conclusion

The GSC export contains aggregate `Pages.csv` and aggregate `Queries.csv`, but no page-query matrix. Bing's keyword export has the same limitation. That means genuine cannibalization can't be proven from this evidence.

Slash/no-slash GSC rows and the entries in `pipeline-data/slug-aliases.json` and `pipeline-data/router-mapping.json` describe URL shapes that point to one canonical article. They aren't evidence that multiple indexable articles compete for a query. No URLs were merged, redirected, canonicalized, or consolidated.

## Explicit skips

- `gut-health-tea-peppermint-ginger`: held at two inlinks rather than inserting an unrelated tea link.
- `prune-juice-alternatives-for-constipation`: excluded because a structural-only pass shouldn't expand a medically adjacent page without a separate evidence and credential review.
- `low-cost-protein-meal-hacks-families` as a source: skipped because its intent overlaps the large-family target and the available exports can't prove whether the pair supports or competes.
- High-impression pages with at least three or four contextual inlinks, including the fast-food fiber guide, bran muffins, cooking-oils guide, prebiotic foods, and the good-source-of-fiber explainer: not structurally under-supported.
- Cluster metadata: left unchanged. Seven targets don't belong to the four controlled authority clusters with enough certainty to justify assigning frontmatter by keyword alone.
- Titles, article rewrites, aliases, canonical rules, D1, pins, images, and new content: outside this cohort.

## Validation

- Focused Node test: 2 tests passed. It checks all seven exact source-target pairs, target-file existence, one link per pair, and the deliberate tea skip.
- `validate_article.py`: exit 0 for all seven changed articles. Four carry pre-existing advisory warnings for length, heading count, or a broad health-claim regex; none has a Tier 1 failure.
- Two source files had seven redundant tags before this pass. `hidden-sugars-popular-summer-salad-dressings` was reduced to five non-duplicate tags and `how-to-make-sourdough-pizza-dough-same-day` to six so both meet the current 4-6 tag schema.
- Added-copy hard-ban scan: clean for em dash, emoji, banned AI phrases, `your ... will thank you`, and uncontracted forms.
- `npm run build:checked`: green. Astro built 277 pages; routing verified 227 canonical articles; 9,786 internal anchors passed; 225 pin destinations passed; recipe audit passed.
- `git diff --check`: clean.
