# Fiber Authority Cluster Map

Date: 2026-07-12
Scope: Batch B1, fiber-only inventory and a bounded first edit of the three core pages

The machine-readable inventory is in [`fiber-cluster-map.csv`](./fiber-cluster-map.csv). It covers 46 article URLs whose slug or title explicitly targets fiber, including two cross-cluster protein pages that B1 did not edit.

## Evidence limits

- The live GSC check during the recovery turn showed only 29 impressions across the entire property over the last three months. That is the current performance baseline.
- `pipeline-data/audit/gsc-post-deploy-action-plan-2026-06-29.*` contains older page-level counts, including 333 impressions for the fast-food guide and 134 for bran muffins. Those exports are stale. This map uses them only as historical intent evidence, never as proof of current demand or as justification for a destructive merge.
- The current repository reports 90 keyword-matched pages in the broad fiber cluster, but the matcher includes tangential pages. This map uses the narrower 46-page title/slug inventory for decisions.
- No page was deleted, redirected, or removed from the index in B1.

## Core architecture

| Page | Search job | Decision | Proposed parent |
|---|---|---|---|
| `/how-to-eat-more-fiber-on-a-budget-complete-guide/` | Broad practical system | Keep as primary fiber pillar | Cluster root |
| `/fiber-per-dollar-cheapest-high-fiber-foods/` | Original 53-food value ranking | Keep as data hub | Budget-fiber pillar |
| `/what-30-grams-of-fiber-costs-per-day/` | Five daily cost scenarios | Keep as data spoke | Fiber-per-dollar study |

These pages share vocabulary, but they don't answer the same query. The pillar explains the system, the ranking answers which foods buy the most fiber per dollar, and the daily-cost study turns that ranking into five day-level scenarios. Merging them would erase useful data intent.

## High-confidence consolidation queue

Only one pair has enough semantic overlap to enter a merge queue now:

| Candidate | Exact destination | Confidence | Required retained-content check |
|---|---|---:|---|
| `/vegetarian-high-fiber-dinners-for-natural-relief/` | `/high-fiber-meals-for-constipation-relief/` | High | Preserve any useful vegetarian dinner examples, remove unsupported relief claims, confirm the destination can serve both food-list and meal intents |

This is a recommendation, not an executed redirect. The destination is the clearer canonical winner for symptom-oriented fiber searches, but the old GSC export is too stale to support a destructive action without a fresh URL-level check.

## Medium-confidence boundaries to enforce

- Keep `/high-fiber-meal-prep-ideas-for-busy-weeks-2026/` as the general meal-prep roundup and `/vegan-high-fiber-meal-prep-for-week/` as the vegan weekly plan. Rewrite if the content doesn't prove that distinction.
- Keep `/comparing-fiber-content-different-pizza-crusts/` as the comparison page and `/high-fiber-pizza-crust-cauliflower/` as the recipe.
- Keep `/popcorn-vs-potato-chips-fiber-comparison/` as the comparison and `/high-fiber-popcorn-toppings-healthy/` as the topping-ideas page.
- Keep `/high-fiber-pasta-alternatives/` as the roundup and `/whole-wheat-vs-white-pasta-fiber/` as the direct comparison.
- Keep the adult smoothie roundup separate from the kids smoothie page only if audience, ingredients, and cautions remain explicit.

## Quality and claim queue

The map flags several pages for rewriting rather than merging:

- Weight-loss or relief framing: cabbage soup, fiber-rich fruit, vegetarian dinners, and the protein/fiber diet page.
- Promise mismatch: salad dressings need a per-serving fiber check before claiming to be high fiber.
- Slug/title mismatch: the stir-fry page currently targets a broad vegetable query while its slug promises fiber.
- Generic or absolute titles: gluten-free bread, pear salad, tabbouleh, and the dated meal-prep roundup.
- Health guidance: the gradual-increase, water, and constipation pages need primary federal health sources.

## B1 implementation completed

Edited only the three core pages:

1. Added direct citations to USDA FoodData Central, the FDA Daily Values page, BLS average-price methodology, MedlinePlus, and NIDDK where each source directly supports the nearby claim.
2. Added price-snapshot caveats so July 2026 national estimates aren't presented as a promise about a reader's local receipt.
3. Updated the national intake reference from the stale 15-gram figure to MedlinePlus's current approximately 16-gram figure.
4. Replaced the broad adult recommendation range with cautious wording that separates the FDA's 28-gram label Daily Value from individual needs.
5. Added contextual links in both directions among the pillar, the fiber-per-dollar study, and the 30-gram daily-cost study.
6. Clarified that a bag containing several Daily Values is dataset context, not an instruction to consume it on that schedule.

Primary sources used:

- USDA FoodData Central: <https://fdc.nal.usda.gov/>
- FDA Daily Values: <https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels>
- BLS average-price methodology: <https://www.bls.gov/cpi/factsheets/average-prices.htm>
- MedlinePlus fiber guidance: <https://medlineplus.gov/ency/article/002470.htm>
- NIDDK fiber and liquids guidance: <https://www.niddk.nih.gov/health-information/digestive-diseases/constipation/eating-diet-nutrition>

## Next safe action

After a fresh URL-level GSC comparison, review the one high-confidence merge pair and the medium-confidence boundary pairs. The next content pass should prioritize claim risk and intent clarity, not publication volume.
