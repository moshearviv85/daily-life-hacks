# Answer-Structure Pass (featured snippet / PAA / AI-citation)

Date: 2026-07-27
Scope: `src/data/articles/` only. No commits. Slugs unchanged.
Standard: `docs/parallel-work/lane-a-derived-batch-spec.md` + `david-miller-voice`.
Evidence: `reports/growth/traffic-sweep/01-search-engines.md` B1/B2/F1-F5,
`04-content-formats.md` §49/§50.

## Baseline measured before any edit

| Measure | Count (of 219 articles) |
|---|---:|
| Tier 1 validator failures (pre-existing, NOT mine) | 28 |
| Articles with zero question-shaped H2 | 138 |
| Articles with `excerpt` over 155 chars | 19 |
| Articles with no digit in the first 45 body words | 144 |

The 28 pre-existing Tier 1 failures are all frontmatter hygiene (tag counts,
faq counts, one author string, one image path). None are in the priority sets
and none were introduced by this pass. Full list at the bottom of this file.

## Key finding that reshaped the plan

The 22 data studies and the 9 comparison articles are **already** built to the
answer-first standard: numbers-first openers, 4-5 question-shaped H2s each,
excerpts under 155 chars carrying the winner number. They were written to the
Lane A batch spec, which already encodes the snippet shape. Rewriting them
would have been churn.

The real gap is (a) the 4 pillars, which use topic-label headings instead of
question headings, and (b) the 185 non-study articles.

## Measurement hold respected

`reports/growth/title-audit-2026-07-27.md` places 4 pages under a 28-day
stability hold (day 2 today) because Bing's last crawl predates the July
rewrites sitting in those files:
`/how-to-measure-sourdough-discard-grams`,
`/how-to-revive-wilted-lettuce-and-greens/`,
`/split-pea-soup-recipe-high-fiber/`,
`/prune-juice-alternatives-for-constipation/`.
The `excerpt` field is the meta description and is part of what that experiment
is measuring, so those 4 files are **excluded from this pass**.

---

## Progress log

### Batch 1 — the 4 pillars (DONE)

| Slug | What changed | Validator |
|---|---|---|
| `plant-based-protein-sources-complete-guide` | Full answer-structure rewrite. Throat-clearing opener replaced with a 45-word answer-first block. 5 label headings to 6 question headings. Added a 12-row protein-per-100g vs protein-per-dollar table. Replaced 7 unsourced per-serving figures with CSV-traceable per-100g values. Excerpt rewritten 158 to 152 chars with the winner number. | PASS |
| `eat-healthy-on-a-budget-complete-playbook` | Opener now leads with 97.9 vs 9.2 g/$. 6 label headings to question headings; 3 in-page anchors updated to match. Answer-first block added under 5 of the 6. Excerpt rewritten with numbers. | PASS |
| `high-protein-on-a-budget-complete-guide` | "The short answer" to "How do you eat high protein on a budget?" with a number-bearing answer block. 8 label headings to question headings; 3 in-page anchors updated. Answer-first blocks added to 7 sections. | PASS |
| `how-to-eat-more-fiber-on-a-budget-complete-guide` | Same treatment: 6 headings to questions, 3 anchors updated, answer-first blocks added to 6 sections. Also corrected a pre-existing wrong rounding (dry chickpeas 33.8 g/$ was written as 33). | PASS |

### Batch 2 — study-level touch-ups (DONE)

| Slug | What changed | Validator |
|---|---|---|
| `fast-food-protein-per-dollar-ranked` | Added a leading question H2 ("What fast food has the most protein per dollar?") with a self-contained 45-word answer. The article previously opened its H2 sequence on a methodology heading, so the answer had no heading above it to be lifted with. | PASS |
| `fiber-per-dollar-cheapest-high-fiber-foods` | Excerpt was 156 chars (over the 155 target) and ended on "the losers may surprise you", a curiosity gap with no payoff. Now 150 chars carrying 71g vs 2.5g. | PASS |
| `protein-per-dollar-cheapest-protein-sources` | Excerpt carried no number ("Beans crushed it. Bacon should apologize"). Now leads with 97.9g vs 9.2g. | PASS |

The other 19 data studies and all 9 comparison articles were audited and left
alone: each already has 4-5 question-shaped H2s, a numbers-first opener, and an
excerpt under 155 chars with the winner number in it. Editing them would have
been churn against an already-correct shape.

### Batch 3 — highest-demand query matches (DONE)

Selected by matching articles against the highest-frequency phrase clusters in
`harvest.json`: "high fiber" (997 occurrences), "high protein" (881), grocery
budget (936), and the specific question strings people actually type.

| Slug | Query matched | What changed | Validator |
|---|---|---|---|
| `how-much-protein-do-you-need-per-day` | "how much protein do you need per day" | 8 label headings to question headings. Answer-first block with the 0.36 g/lb baseline in sentence one. The per-portion list converted to a table. Excerpt rewritten with the number. | PASS |
| `easy-high-fiber-breakfast-ideas-for-gut-health` | "how to get more fiber at breakfast" | Lead heading to "How much fiber should you eat at breakfast?" with the 8-to-10-gram answer moved into the first sentence. | PASS |
| `best-high-fiber-fruits-for-weight-loss-list` | "what are the best high fiber foods" | New lead question H2 ranking fruit by USDA fiber per 100g, with the price inversion (raspberries 4.5 g/$ vs bananas 11.6 g/$). | PASS |
| `high-protein-vs-high-fiber-satiety` | "does protein or fiber keep you full" | New lead question H2 with an honest "neither reliably wins" answer, plus 4 headings converted. | PASS |
| `cottage-cheese-vs-greek-yogurt-protein-uses` | "cottage cheese vs greek yogurt protein" | Comparison table added; lead heading now the actual question, answered in sentence one, with the per-serving and per-dollar answers going opposite ways. | PASS |
| `frozen-vs-fresh-produce-when-to-buy` | "are frozen vegetables as good as fresh" | 5 headings to questions, answer-first block under the lead. | PASS* |

\* `frozen-vs-fresh-produce-when-to-buy` is one of the 28 pre-existing Tier 1
failures (2 tags, needs 4). Not introduced here and not in scope to fix.

### Batch 4 and 5 — answer blocks inserted (DONE)

For these, the highest-leverage change was a single new question-shaped H2 at
the top of the body carrying a self-contained 40-60 word answer, in the format
the content actually warrants. No heading churn beyond that.

| Slug | Format used | Validator |
|---|---|---|
| `how-to-read-nutrition-labels-for-beginners` | numbered list (sequence) | PASS |
| `batch-cooking-for-beginners-weekly-guide` | paragraph (process) | PASS |
| `how-to-reduce-food-waste-at-home-easy-tips` | paragraph (4 habits) | PASS |
| `high-fiber-meals-for-constipation-relief` | paragraph, hedged, NIDDK cite reused | PASS |
| `protein-per-serving-beans-chicken-tofu-compared` | table (comparison) | PASS |
| `how-much-protein-in-bagel-sandwich` | number-first paragraph | PASS |
| `budget-meal-ideas-for-one` | paragraph | PASS |
| `best-breakfast-foods-for-sustained-energy` | definition-shaped paragraph | PASS |
| `how-to-make-grocery-shopping-cheaper` | numbered list (6 moves) | PASS |
| `grocery-shopping-list-for-healthy-eating-on-a-budget` | paragraph (5 blocks) | PASS |
| `how-to-meal-prep-on-a-budget-for-one-person` | paragraph | PASS |
| `best-low-cost-protein-sources-large-families` | number-first paragraph, CSV values | PASS |
| `high-protein-high-fiber-meals-for-weight-loss` | paragraph | PASS |
| `high-fiber-pasta-alternatives` | number-first paragraph | PASS |

### Batch 6 — meta descriptions only (DONE)

All 19 excerpts over 155 characters were rewritten to 137-154 characters, each
carrying the phrase people search and a specific promise instead of a curiosity
gap. 17 were rewritten as standalone meta-description work; 2 were handled
inside the structural batches above.

Slugs: `baked-cod-lemon-capers-green-beans`, `best-way-to-cook-ribs`,
`budget-meal-ideas-philippines`, `camping-meal-hacks-large-families`,
`cauliflower-fried-rice-with-eggs`, `cooking-oils-smoke-points-best-uses`,
`creamy-tomato-orzo-white-beans-one-pot`, `easy-sourdough-discard-recipes-beginners`,
`food-prep-tips-to-save-time`, `gut-health-tea-peppermint-ginger`,
`healthy-alternatives-potato-chips-snacking`,
`healthy-homemade-indian-salad-dressing-recipes`, `high-fiber-burrito-bowl-meal-prep`,
`high-fiber-pasta-alternatives`, `how-to-cook-dried-beans-from-scratch`,
`how-to-use-leftover-rice-creative-ideas`, `make-ahead-breakfast-ideas-without-eggs`,
plus `fiber-per-dollar-cheapest-high-fiber-foods` and
`plant-based-protein-sources-complete-guide` in earlier batches.

Two of these (`cooking-oils-smoke-points-best-uses`,
`make-ahead-breakfast-ideas-without-eggs`) remain Tier 1 failures on tag count.
Pre-existing, listed in the 28.

---

## Result

| Measure | Before | After |
|---|---:|---:|
| Articles with zero question-shaped H2 | 138 | 116 |
| Articles with `excerpt` over 155 chars | 19 | **0** |
| Tier 1 validator failures | 28 | 28 (same 28 slugs) |

- **43 article files changed.**
- **68 question-shaped H2 headings** added or converted from label headings.
- **22 meta descriptions** rewritten.
- **4 markdown tables** added where the answer was a comparison.
- **0 slugs changed. 0 commits.**

## Numbers discipline: the digit trace

Every numeric token on every added line of the diff was extracted and checked
against the audited CSVs in `public/data/`.

- **84 distinct values matched exactly** to a cell in
  `protein-per-dollar-2026.csv`, `fiber-per-dollar-2026.csv`,
  `plant-protein-per-dollar-ranked-2026.csv`,
  `produce-fiber-per-dollar-ranked-2026.csv` or
  `fastfood-protein-per-dollar-2026.csv`.
- **7 values are one-decimal roundings** of a CSV cell, each verified in the
  correct direction: 21.4 from 21.42, 21.6 exact, 23.1 from 23.12, 24.6 from
  24.63, 20.5 from 20.47, 20.3 from 20.29, 21.2 from 21.15, 14.1 from 14.12,
  10.0 from 9.98, 11.2 from 11.22, 6.0 from 6.03, 24.4 from 24.35, 22.2 from
  22.21.
- **The remainder trace to the host article's own existing text** (0.36 g/lb,
  0.5-0.8 g/lb, 54 g, 75-120 g, 150 lb in `how-much-protein-do-you-need-per-day`;
  the 110-calorie / 2.5-serving label example in the nutrition-labels article,
  where 275 is that article's own arithmetic; the 90-minute session in the
  batch-cooking article) or to a source already cited in that article
  (MedlinePlus, NIDDK).

### Three numeric errors found and fixed

1. **My own draft**, caught before it shipped: I wrote that raspberries lead
   common fruits at 6.5 g of fiber per 100 g "followed by avocado at 6.7", which
   is an impossible ordering. Corrected to avocado first at 6.7.
2. **Pre-existing, `how-to-eat-more-fiber-on-a-budget-complete-guide`**: dry
   chickpeas were written as "33 grams per dollar" in two places. The CSV says
   **33.8**, which rounds to 34, not 33. Corrected both.
3. **Pre-existing, `eat-healthy-on-a-budget-complete-playbook`**: the $60-week
   table listed two dozen eggs at **$4.40** and a 5 lb bag of drumsticks at
   **$5.45**. The audited CSV has eggs at $2.19/dozen (so $4.38) and the
   drumstick bag at **$5.46**. Corrected in the table and in the new answer
   block. The ~$25 subtotal is unaffected.

Item 3 matters more than it looks: that table is exactly the kind of block a
featured snippet lifts whole, so a wrong cent would have travelled.

## Note: 8 article files appeared mid-session from another agent

The brief stated `src/data/articles/` was exclusively mine. Eight new untracked
files appeared during this pass and are **not** my work:
`best-high-fiber-foods-ranked-by-fiber-content`,
`grocery-budget-for-one-person-per-month`, `how-much-protein-in-a-can-of-beans`,
`how-much-protein-in-peanut-butter`, `how-much-protein-in-two-eggs`,
`how-much-rice-and-beans-per-person-per-day`,
`how-to-grocery-shop-for-a-month-on-a-budget`,
`how-to-save-money-on-groceries-at-walmart`.
For the record they all pass Tier 1 and all already carry question-shaped H2s.
All counts in this report are computed over the 219 tracked articles only, so
they do not mix with that agent's work.

## Where this stopped, and what is next

Priority order from the brief was worked in full for tiers 1-3 (22 studies,
9 comparisons, 4 pillars) and then through the highest-frequency harvest query
matches. **116 articles still have no question-shaped H2.** They are almost
entirely recipes and kitchen-tips pages, where the demand per page is far lower
than the 35 priority pages. The next pass should take them in this order:

1. The ~20 `tips` articles matching "how to store / how to keep / how long does"
   query clusters. These are the purest PAA shape left on the site.
2. The `recipes` articles, where the honest snippet target is not the recipe
   itself but the one question inside it ("can you freeze X", "why did my X go
   soggy").
3. The 28 pre-existing Tier 1 frontmatter failures, which are a separate,
   mechanical job: 22 tag-count fixes, 3 author strings, 2 faq-count fixes, and
   1 image path.

## Appendix: the 28 pre-existing Tier 1 failures (not mine)

Unchanged before and after this pass. 22 are `S-09` tag counts, 3 are `S-06`
author set to "Daily Life Hacks Team", 3 are `S-07` faq item counts, 1 is an
`S-08` image path.

`add-flavor-without-more-sugar-tricks`, `aldi-shopping-hacks-large-family-meals`,
`baking-sheet-liners-parchment-silicone-when-to-use`,
`balanced-breakfast-that-keeps-you-full`, `cooking-oils-smoke-points-best-uses`,
`fix-oversalted-soup-sauce-rice`, `food-prep-guide-recipes`,
`freezer-organization-tips-large-family-meals`, `frozen-vs-fresh-produce-when-to-buy`,
`healthy-alternatives-white-rice-dinner`, `healthy-blue-collar-lunch-ideas-men`,
`healthy-egg-sandwich-add-ins-toppings`, `healthy-spring-vegetable-soup-recipes`,
`healthy-sweet-tooth-snack-ideas-night`, `hidden-sugars-popular-summer-salad-dressings`,
`high-fiber-smoothies-for-kids-picky-eaters`,
`how-to-double-recipe-seasoning-without-guessing`,
`how-to-make-sourdough-pizza-dough-same-day`, `how-to-pack-cold-pasta-salad-picnics`,
`how-to-pack-lunch-crisp-sandwiches-salads`, `how-to-preheat-skillet-even-browning`,
`how-to-quick-soak-dried-beans-same-day`, `how-to-store-homemade-salad-dressing-safely`,
`how-to-stretch-meals-large-families`, `keep-berries-fresh-longer-when-to-wash`,
`make-ahead-breakfast-ideas-without-eggs`, `natto-japanese-fermented-soybeans-gut-health`,
`prebiotic-foods-beyond-the-buzzwords`.

