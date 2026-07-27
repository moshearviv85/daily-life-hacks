# Title Audit vs. Harvested Search Demand

Date: 2026-07-27
Scope: every article in `src/data/articles/` scored against the 12,106 verified
autocomplete queries in `pipeline-data/keyword-research/harvest.json`.

## Headline result

- **219 articles audited** (not 220 — the corpus is 219 `.md` files).
- **0 titles exceed 60 characters.** Max is exactly 60, mean 46. The truncation
  criterion in the brief is already satisfied site-wide and produced zero rewrites.
- **25 pages carry a top-demand phrase in the slug but dropped it from the title.**
  This is the "retitling pass stripped the keywords" pattern, confirmed.
- **14 of those 25 dropped the single highest-demand phrase on the site's topic:
  "high fiber"** (999 occurrences across the harvest, the #1 phrase).
- **14 rewritten.** The rest are documented as deliberate no-ops with reasons.

## Two constraints that materially changed this audit

### 1. The only pages with proven impressions are under an active measurement hold

`reports/growth/bing-query-opportunity-2026-07-26.md` (dated yesterday) is the
only source of real impression data on this site. It shows exactly four pages
with impressions and zero clicks:

| Page | Impressions | Clicks | Avg position |
|---|---:|---:|---:|
| `/how-to-measure-sourdough-discard-grams` | 38 | 0 | 7.32 |
| `/how-to-revive-wilted-lettuce-and-greens/` | 31 | 0 | 7.90 |
| `/split-pea-soup-recipe-high-fiber/` | 9 | 0 | 6.44 |
| `/prune-juice-alternatives-for-constipation/` | 8 | 0 | 6.75 |

The brief ranks "proven impressions, no clicks" as the highest-value rewrite tier.
Those four pages are **excluded from rewriting**, because that same report
establishes a deliberate 28-day stability hold beginning 2026-07-26 (day 2 today),
for a documented reason: Bing's last crawls (March 1, June 5, April 5, June 22)
all **predate the July rewrites already sitting in those files**. The zero-click
numbers describe titles that are no longer live. Rewriting now would overwrite an
unread experiment and make the result impossible to attribute.

One of the four, `split-pea-soup-recipe-high-fiber`, also appears in the
keyword-drop list below. It is still excluded, and the evidence argues actively
against touching it: it holds **average position 1.50** on
`how much fiber in a bowl pf split pea soupfiber`, and its current title
"How Much Fiber in a Cup of Split Pea Soup" already matches that query almost
verbatim. There is no keyword problem here to fix.

### 2. There is no search-volume data in this dataset

The brief asks to rank by "high-volume query". That is not answerable from this
data. `winnable_score` is a hand-rolled heuristic in
`scripts/harvest_search_queries.py:76`:

```
winnable = (2 if is_question else 0) + (2 if specific else 0)
         + (1 if len(engines) >= 2 else 0) + (1 if has_reddit else 0)
         + (1 if commercial else 0)
```

It encodes question-form, length, engine count and a cheap/best/vs flag. No
volume, no difficulty, no impressions. Autocomplete presence proves a query is
*typed*, never how often. Ranking by `winnable_score` alone pulls broad head
terms ("how to budget for groceries") to the top and would have retitled specific
recipe pages into generic budget pages.

**Substitute used:** phrase frequency across the 12,106 harvested queries, which
is a genuine demand signal from this corpus, combined with whether a *literal*
harvested query exists for the page. Cluster sizes are reported throughout so the
reasoning is inspectable.

## The honest ceiling on this work

`reports/growth/traffic-sweep/01-search-engines.md:63` states it plainly:

> Title rewrites move CTR on pages that *already* rank; with no rankings there is
> no CTR to move.

Search Console as of 2026-07-10: **132 indexed, 486 not indexed.** The dominant
constraint on this site's organic clicks is indexation, not title copy. These
rewrites remove a real defect and are worth making, but they are a prerequisite,
not a traffic lever on their own. Nobody should read this report and expect a
click curve to move next week.

## Method

For each article: tokenised slug, title and tags; matched against an IDF-weighted
index of all 12,106 queries; required a match to share a genuinely distinctive
token rather than a stopword-ish one. Scored each title on the brief's four
criteria — contains the typed phrase, phrase near the front, under 60 characters,
promises something specific. Every rewrite was checked against the article body
before editing, so no title promises something the page does not deliver.

## Top demand phrases in the harvest (ground truth)

| Phrase | Queries | Phrase | Queries |
|---|---:|---|---:|
| high fiber | 999 | high protein | 883 |
| food storage | 559 | high fiber foods | 576 |
| rice and beans | 550 | frozen vegetables | 509 |
| high protein breakfast | 491 | dried beans | 473 |
| canned beans | 466 | gut health | 380 |
| peanut butter protein | 367 | constipation | 387 |
| cheapest protein | 223 | meal prep | 231 |

## Ranked opportunity

The brief's intended top tier — proven impressions, no clicks — resolves to zero
actionable rewrites, for the reasons in constraint 1. Tiers below are therefore
ranked by demand-cluster size behind the missing phrase.

| Tier | Definition | Count | Action |
|---|---|---:|---|
| 0 | Proven impressions, zero clicks | 4 | **Held.** Crawl predates current copy; 28-day hold |
| 1 | Slug carries a top-demand phrase, title dropped it, body supports it | 11 | Rewritten |
| 2 | Title built on a phrase with zero harvested demand | 3 | Rewritten |
| 3 | Slug/title mismatch where the title is the accurate one | 4 | **No-op, deliberate** |
| 4 | Slug drop where the body does not support the phrase | 3 | **No-op, deliberate** |
| 5 | Title already carries its demand phrase | 194 | No change needed |

## The 14 rewrites

| # | Before | After | Evidence |
|---:|---|---|---|
| 1 | What Are Good Sources of Fiber for Constipation | **High Fiber Foods for Constipation: Start Here** | `constipation` = 387 queries; literal query `what are high fiber foods for constipation` |
| 2 | Dinner on the Table in 30 Minutes Flat | **Quick Dinner Ideas for the Family, Ready in 30 Minutes** | `dinner ideas` = 249; `30 minute` and `weeknight` = **0 queries each** |
| 3 | What the Government Says a Cheap, Healthy Week Costs | **Grocery Budget for a Family of 4: What USDA Says** | `grocery budget for family of 4` pattern = 45 queries; `thrifty food plan` = **0** |
| 4 | Quick 20 Minute Bean & Rice Meals for Busy Days | **20-Minute High Fiber Rice and Beans Meals** | `rice and beans` = 550, and the title had the word order reversed plus an `&` |
| 5 | Gut-Friendly Smoothie Blends for Daily Wellness | **High Fiber Smoothies for Gut Health** | `gut health` = 380, `high fiber` = 999; `daily wellness` = **0** |
| 6 | Pasta Alternatives That Still Feel Like Dinner | **High Fiber Pasta Alternatives That Still Feel Like Dinner** | `high fiber` = 999; slug carries it, body is explicitly about fiber |
| 7 | Fiber-Rich Fruits for Feeling Full | **The Best High Fiber Fruits for Feeling Full** | literal query `what are the best high fiber fruits` |
| 8 | Creamy Homemade Hummus With Extra Chickpeas | **Creamy High Fiber Hummus, Made at Home** | literal query `high fiber foods hummus` |
| 9 | Meal Prep Bowls for Busy Weeks (2026) | **High Fiber Meal Prep Bowls for Busy Weeks** | `meal prep` = 231; body opens "High fiber meal prep"; dropped the dating "(2026)" |
| 10 | The Only Chicken Recipe You Need for Easy Weeknight Dinners | **How to Cook Chicken Breast in a Skillet** | `weeknight` = 0; article is breast cutlets in a skillet, and has that exact H2 |
| 11 | Quinoa Lunch Salad That Stays Fresh | **High Fiber Quinoa Salad for Lunch Prep** | slug drop; body: "If your goal is fiber, you want more than lettuce and hope" |
| 12 | No-Bake Oat & Flax Energy Balls | **No-Bake High Fiber Energy Balls With Oats and Flax** | slug drop; body: "Ground flaxseed adds fiber"; `&` removed |
| 13 | Avocado Toast Variations With Beans & Seeds | **High Fiber Avocado Toast With Beans and Seeds** | slug drop; body is about fiber levers; `&` removed |
| 14 | Crispy Roasted Chickpeas for Crunchy Snacking | **Crispy Roasted Chickpeas: A High Fiber Snack** | body: "If you want a high fiber snack..."; dish name kept in front as the searched entity |

Excerpts were updated where the title change was material: #3 (now says "family
of four" and "grocery budget"), #4 ("rice and beans" word order), #6 (carries the
phrase, contractions fixed), #9 (contractions fixed, now leads with "High fiber
meal prep"). The others already read as natural continuations of the new title.

## Deliberate no-ops, with reasons

These were flagged by the mechanical pass and rejected after reading the body.
Two of them would have been outright over-claims.

- **`gut-health-tea-peppermint-ginger`** — "Peppermint Ginger Tea: A Better
  10-Minute Brew". Slug says gut-health; `gut health` = 380 queries. **Rejected.**
  The article deliberately de-claims: its excerpt says "treat digestive relief as
  a possibility, not a promise" and it carries a section titled "What this tea
  won't do". Retitling it "for Gut Health" would contradict the page's own
  hedging and edge into the medical-claim territory the voice guide bans. The
  earlier retitle was correct here.
- **`vegetarian-high-fiber-dinners-for-natural-relief`** — "Chickpea Cauliflower
  Curry for an Easy Vegetarian Dinner". **Rejected.** The body states "Nothing
  here promises a digestive miracle." The slug's "natural relief" is legacy; the
  title is the honest one. Chasing the slug would re-introduce a health claim.
- **`high-fiber-popcorn-toppings-healthy`** — "7 Popcorn Toppings That Don't
  Taste Like Diet Food". A literal query `high fiber foods popcorn` exists.
  **Rejected.** The article is about *toppings* (Parmesan, cocoa, chili-lime),
  and the toppings contribute no fiber. "High Fiber Popcorn Toppings" would
  attach the claim to the wrong noun.
- **`artichoke-recipes-for-gut-health`** — "How to Steam Artichokes With
  Lemon-Garlic Dip". **Rejected.** `artichoke` = **0 harvested queries**. No
  demand evidence exists either way, and the title accurately describes a
  steaming how-to.
- **`high-fiber-stir-fry-vegetables`** — "Best Vegetables for Stir-Fry and How to
  Keep Them Crisp". **Rejected.** The live demand is `best frozen vegetables for
  stir fry`; the current title already matches "best vegetables for stir fry".
  Prefixing "High Fiber" would push the matching phrase off the front and trade a
  real partial match for a worse one.
- **`tabbouleh-salad-high-fiber-bulgur`** — `tabbouleh` = **0 queries**, and the
  body's angle is herbs, not fiber ("tastes like herbs, not grain filler").
- **`vegan-high-fiber-meal-prep-for-week`** — the title already leads with
  "Five-Day Vegan Meal Prep"; `meal prep` is present and the page is specific.
  Fiber appears only in cross-links, so adding the phrase would out-run the body.
- **The 6 per-dollar study pages** (`animal-`, `dairy-`, `plant-protein-per-dollar-ranked`,
  `protein-per-dollar-adjusted-for-quality`, `grains-`/`produce-fiber-per-dollar-ranked`)
  were flagged for dropping "protein per dollar" / "fiber per dollar" from the
  title. **Rejected.** They all already lead with "The Cheapest [X] Protein" or
  "Cheapest High-Fiber", and `cheapest protein` (223) is a bigger cluster than
  `protein per` (182). These titles were done well; changing them would be churn.

## Validator results

`scripts/validate_article.py`, Tier 1, run across all 219 files before and after.

- Baseline (before any edit): **28 files with pre-existing Tier 1 violations.**
- After 14 rewrites: **28 files.** Identical set.
- **Newly broken by this pass: 0.**
- All 14 edited files: **PASS**, and none was in the pre-existing failure set.
- All 14 titles are <= 60 characters (longest: 57).
- `git status` shows 14 `M` entries and zero renames: **no slug or filename changed.**

The 28 pre-existing failures are unrelated to titles and were **not** touched:
24 are `S-09` (tags outside the 4-6 range), 3 are `S-06` (author is
"Daily Life Hacks Team" rather than "David Miller"), 3 are `S-07` (faq item count),
1 is `S-08` (image filename mismatch on `food-prep-guide-recipes`). Several files
carry more than one violation. These are a separate cleanup.

## Top 20 content gaps

From `gaps.json`, filtered to queries our audited datasets in `public/data/`
(22 CSVs, 165 distinct foods, Walmart Great Value price basis) can genuinely
answer, then de-duplicated into article-level briefs. "Data held" states honestly
whether we already own the numbers or would need a new source.

| # | Article to write | Demand cluster | Data held? |
|---:|---|---:|---|
| 1 | Dried-to-canned bean conversion: how much dry equals a 15 oz can | 473 (`dried beans`), 7 near-identical queries | **Partial** - we hold package weights and cost; the dry:cooked ratio needs a cited source |
| 2 | Which canned beans have the most protein | 466 (`canned beans`) | **Yes** - protein-per-dollar + bean rows |
| 3 | Can you live off rice and beans? What the numbers say | 550 (`rice and beans`) | **Yes** - `cheapest-complete-protein-pairs`, `protein-day-cost` |
| 4 | How much rice and beans per person, per day | 550 | **Yes** - day-cost CSVs give per-person grams and dollars |
| 5 | How to save money on groceries at Walmart | 141 (`save money on groceries`) | **Yes** - every price we publish is a Walmart GV basis. Strongest data-to-query fit on this list |
| 6 | How to make a grocery budget (and calculate yours) | 183 (`grocery budget`) | **Yes** - USDA plan + all per-dollar data |
| 7 | Is rice and beans actually good for you | 550 | **Yes** - complete-protein pairs, fiber and protein per serving |
| 8 | The best high fiber foods, plain-ranked (not per dollar) | 576 (`high fiber foods`) | **Yes** - `fiber-per-dollar-2026.csv` carries fiber per 100 g |
| 9 | Grocery budget for a family of 5 | 45 (`grocery budget for family of N`) | **Yes** - USDA plan scales by household |
| 10 | How long do dried beans last uncooked | 473 | No - storage and safety, needs USDA source |
| 11 | Why won't my dried beans get soft | 473 | No - technique; strong demand, no data needed |
| 12 | How to make canned beans taste homemade | 466 | No - technique |
| 13 | How long are canned beans good after the best-by date | 466, `winnable_score` 6 | No - needs USDA or FDA source |
| 14 | How many calories in rice and beans | 550 | **Yes** - calorie columns in the day-cost CSVs |
| 15 | Cheapest whole-food alternatives to protein powder | 883 (`high protein`) | **Yes** - protein-per-dollar. Note the voice guide bans supplements, so this must be angled as whole-food alternatives |
| 16 | How to eat healthy on a budget with picky eaters | 408 (`on a budget`) | Partial - pricing yes, the picky-eater angle is editorial |
| 17 | How to grocery shop for a month on a budget | 408 | **Yes** - the shelf-stable pantry CSV is exactly this |
| 18 | Do you have to cook canned beans | 466 | No - technique and safety |
| 19 | How much dried beans equals 1 cup cooked | 473 | Partial - same sourcing need as #1 |
| 20 | Which dried bean is highest in iron | 480 (`dried bean`) | **No - we hold no iron data.** Listed because the demand is real, but writing it needs new sourcing |

Two honest caveats. First, `gaps.json` flagged some queries as uncovered that we
arguably already serve (`what are the best fiber foods` maps loosely to
`fiber-per-dollar-cheapest-high-fiber-foods`), so its coverage detection is
approximate; #8 is framed as the non-cost version to avoid cannibalising the
existing study. Second, several of the highest-demand gaps (#10-#13, #18, #20)
are ones our data **cannot** answer. They are real demand and worth writing, but
they need external sourcing, not our CSVs.

Note on the brief's framing: it described `gaps.json` as "the 707 high-value
queries with no matching page". The file actually reports `high_value: 848` and
ships a truncated `uncovered` list of 300. This audit worked from those 300.

## What to do next, in order

1. Leave the four Tier 0 pages alone until 2026-08-23 and let the hold read out.
2. Treat indexation as the actual bottleneck: 486 of 618 URLs are not indexed.
   No amount of title work competes with that.
3. Write gap #5 (Walmart) and #1 (bean conversion) first. Both sit on large
   clusters, and #5 is the only topic where our price basis *is* the answer.
