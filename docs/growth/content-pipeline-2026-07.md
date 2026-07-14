# Data Content Pipeline — July 2026 (Phase 2 of the Data Machine)

Born 2026-07-13: the Reddit launch post hit 131 points / 89 comments in 30 minutes
before removal. Demand for priced-food data is proven. This file is the production
queue for both workstreams. Every article in both lanes MUST contextually link at
least 3 site recipes plus the relevant pillar (see Linking Rules below).

## Lane A — Original data studies (Claude Code)

Requires CSV construction + dual-source number verification. One per 2-3 days.

| # | Study | Angle | Status |
|---|-------|-------|--------|
| A1 | Fast Food Protein per Dollar | 30 chain items vs grocery baseline | in progress |
| A2 | Protein per Dollar, Adjusted for Digestibility (DIAAS) | answers the #1 critique of study 2; born in the Reddit thread | next |
| A3 | Snacks per Dollar | fiber+protein of 25 popular snacks; popcorn angle proven twice | queued |
| A4 | Breakfast per Dollar | 20 breakfasts priced: oatmeal vs cereal vs eggs vs drive-thru | queued |
| A5 | Frozen vs Fresh vs Canned | nutrient-per-dollar for 15 produce items, 3 forms each | queued |
| A6 | The $20 Dinner Week | 7 dinners hitting protein+fiber targets, priced to the cent | queued |
| A7 | Grains per Dollar | rice, quinoa, barley, bulgur, oats: fiber+protein per dollar | queued |
| A8 | Dairy per Dollar | milk, yogurt, cottage cheese, cheese: protein per dollar | queued |
| A9 | Store Brand vs Name Brand | same 15 foods priced twice, nutrition identical | queued |
| A10 | Seasonal Produce Price Calendar | 12-month price curves for 10 produce staples | queued |

## Lane B — Institutional research explainers (Codex)

Plain-English interpretations of official data. No new measurements needed; source
document + our framing + charts. Economics of food ONLY — never health-outcome
studies, never medical claims. One per 1-2 days once the template settles.

| # | Explainer | Source | Notes |
|---|-----------|--------|-------|
| B1 | What the Government Says a Cheap, Healthy Week Costs | USDA Thrifty Food Plan | flagship; links meal-prep recipes |
| B2 | Where the 28g Fiber and 50g Protein Targets Come From | FDA Daily Values (21 CFR 101.9) | anchors all our studies |
| B3 | Grocery Prices This Month: What Rose, What Fell | BLS CPI food-at-home (monthly) | RECURRING; feeds off existing Price Watch workflow |
| B4 | Why Eggs Swing From $2 to $6 | BLS egg price series (APU0000708111) | evergreen + updatable |
| B5 | What Americans Actually Eat vs What's Recommended | USDA ERS food availability data | strong chart material |
| B6 | Why Ground Beef Keeps Getting More Expensive | BLS beef series | links bean/lentil swap recipes |
| B7 | The USDA's Food Price Forecast, Translated | USDA ERS Food Price Outlook | RECURRING (annual + revisions) |
| B8 | What the Average SNAP Benefit Actually Buys | USDA SNAP data + our per-dollar CSVs | careful, respectful framing |
| B9 | The Real Cost of Household Food Waste | USDA/EPA food waste estimates | links storage/freezer articles |
| B10 | Produce in Season: the Price Data | BLS/USDA seasonal series | pairs with A10 |

## Linking rules (both lanes, enforced by validator)

1. >=3 contextual links to site RECIPES (`category: recipes`), woven into prose
   where the food is mentioned (split pea soup -> the split pea recipe). Never
   "Related:" blocks.
2. 1 link to the relevant pillar (fiber budget / protein budget / eat-healthy playbook / meal prep).
3. 1 link to the most relevant data study or /methodology/ for provenance.
4. All numbers verified against source (CSV or official document) AT WRITING TIME —
   never from memory (see feedback_verify_numbers_in_copy memory).

## Distribution per article (after publish)

- 2-3 programmatic TEXT pins (scripts/NEW_PIPELINE_2026-05-08/generate_text_pins.py)
  + 1 photo pin — all through the owner-approval gallery gate.
- FAQ frontmatter (FAQPage schema) + Dataset schema for lane-A studies (map in src/pages/[slug].astro).
- Reddit: per the post-ban playbook only (no domain links, modmail-first, no crossposts).
