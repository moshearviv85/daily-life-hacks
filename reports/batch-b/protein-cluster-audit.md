# Protein Cluster Audit - Batch B2

**Date:** 2026-07-12  
**Scope:** Protein per Dollar study, What 50 Grams of Protein Costs per Day, the budget-protein guide, and the large-family spoke.  
**Batch state:** Local bounded edit. Not deployed or published.

## Series roles

| Page | Search job | Authority role |
|---|---|---|
| `/protein-per-dollar-cheapest-protein-sources/` | cheapest protein sources; protein per dollar | Canonical dataset study and source table |
| `/what-50-grams-of-protein-costs-per-day/` | cost of 50 grams of protein per day | Scenario analysis derived from the parent CSV |
| `/high-protein-on-a-budget-complete-guide/` | high protein on a budget | Parent shopping and meal system |
| `/best-low-cost-protein-sources-large-families/` | low-cost protein for large families | Audience-specific spoke |

Architecture decision from integration: edited protein pages use cluster `budget-protein`. The parent is `high-protein-on-a-budget-complete-guide`; the parent page itself must not receive a self-referential `parentPillar`. Metadata is being applied by the integration owner, not this workstream.

## Source-by-source verification

### USDA FoodData Central

The parent CSV contains 49 rows. Recalculation of `protein_g_per_dollar` from protein, package weight, edible fraction, and package price produced a maximum rounding delta of **0.050 g/$** and zero rank mismatches.

Material USDA SR Legacy spot checks:

| Food | CSV protein/100g | USDA result | FDC ID | Result |
|---|---:|---:|---:|---|
| Pinto beans, dry | 21.42 | 21.4 | 175199 | Match after rounding |
| Whole wheat flour | 13.21 | 13.2 | 168893 | Match after rounding |
| Chicken drumstick, meat and skin, raw | 18.08 | 18.1 | 172373 | Match after rounding |
| Egg, whole, raw | 12.56 | 12.6 | 171287 | Match after rounding |
| Chicken breast, boneless/skinless, raw | 22.50 | 22.5 | 171077 | Match |
| Ground beef, 80/20, raw | 17.17 | 17.2 | 174036 | Match after rounding |
| Tofu, extra firm, prepared with nigari | 9.98 | 9.98 | 174290 | Match |

Primary source: [USDA FoodData Central](https://fdc.nal.usda.gov/) and its [API guide](https://fdc.nal.usda.gov/api-guide/).

**Blocker P1:** `protein-per-dollar-2026.csv` does not store FDC IDs, although the public methodology says exact IDs are recorded. The seven material checks passed, but all 49 nutrient lookups are not reproducible from the public CSV alone. Do not claim a complete row-by-row source audit until IDs are added through a separately approved dataset change.

### Bureau of Labor Statistics

The BLS public API was queried for May 2026. All nine BLS-backed CSV prices matched after normal display rounding:

| Series | Item | BLS May 2026 | CSV |
|---|---|---:|---:|
| APU0000708111 | Eggs, dozen | $2.191 | $2.19 |
| APU0000709112 | Whole milk, gallon | $4.217 | $4.22 |
| APU0000706111 | Whole chicken, lb | $2.036 | $2.04 |
| APU0000FF1101 | Boneless chicken breast, lb | $4.171 | $4.17 |
| APU0000FD3101 | Boneless pork chops, lb | $4.389 | $4.39 |
| APU0000710212 | Cheddar cheese, lb | $5.685 | $5.69 |
| APU0000703112 | Ground beef 80/20, lb | $6.745 | $6.75 |
| APU0000703113 | Ground beef 93/7, lb | $8.624 | $8.62 |
| APU0000704111 | Bacon, lb | $6.712 | $6.71 |

Primary source: [BLS Average Price Data methodology](https://www.bls.gov/cpi/factsheets/average-prices.htm). BLS average prices use narrower item definitions and sampling than a retailer listing, so the revised copy labels the row basis instead of calling BLS a Walmart cross-check or assuming one is always higher.

### FDA labeling benchmark

The FDA Daily Value for protein is **50 g** for a 2,000-calorie diet. This is a label reference, not an individualized intake prescription. The study and guide now say that explicitly and link the [FDA Daily Value page](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels).

### McDonald's restaurant scenario

Official product pages were added for the [Egg McMuffin](https://www.mcdonalds.com/us/en-us/product/egg-mcmuffin.html), [McDouble](https://www.mcdonalds.com/us/en-us/product/mcdouble.html), and [McChicken](https://www.mcdonalds.com/us/en-us/product/mcchicken.html). McDonald's also publicly confirms 17 g for the Egg McMuffin and warns that prices and participation vary.

**Blocker P1:** The child CSV records $3.79, $3.19, and $2.99 but gives no restaurant, ZIP code, capture URL, or capture date beyond “July 2026.” McDonald's does not publish one national menu price, and its current US site advertises McDouble and McChicken participation on an under-$3 menu. The $9.97 total remains valid as the recorded scenario, not as a reproducible national average. The article now states that limitation and the unsupported Chipotle comparison was removed.

### Child-day arithmetic

The five reported scenario totals are calculated from unrounded parent values. The public child CSV stores rounded row protein and cost values. As a result, Day 3's displayed rows add to 52.3 g and $2.78 while the unrounded calculation reports 52.2 g and $2.77; the annual chart likewise uses unrounded inputs.

**Blocker P2:** The child CSV needs unrounded numeric columns or an explicit precision field before an outside reader can reproduce every headline total from that file alone. The article now discloses the rounding rule; source data was not silently changed.

## Internal-link graph after the bounded pass

| From | Links to study | Links to daily-cost analysis | Links to parent guide | Links to family spoke |
|---|---:|---:|---:|---:|
| Protein per Dollar study | self | yes | yes | yes |
| 50-gram daily-cost analysis | yes | self | yes | no |
| High-protein budget guide | yes | yes | self | yes |
| Large-family spoke | yes | yes | yes | self |

The graph is intentionally asymmetric where the user journey differs. No circular filler paragraph was added, and all destinations are canonical article paths.

## Cannibalization risks

1. **Medium:** `protein-per-dollar-cheapest-protein-sources` and `high-protein-on-a-budget-complete-guide` both mention “cheapest protein.” Keep distinct: the study owns the ranked dataset; the guide owns the shopping system.
2. **Medium-high:** `best-low-cost-protein-sources-large-families` overlaps heavily with `low-cost-protein-meal-hacks-families`. One targets source selection and the other meal stretching, but the current headings and FAQs still overlap. Do not merge without current URL/query evidence.
3. **Low-medium:** `what-50-grams-of-protein-costs-per-day` and `how-much-protein-do-you-need-per-day` both contain “50 grams,” but intent differs: price scenario versus intake guidance.
4. **Low:** `protein-per-serving-beans-chicken-tofu-compared` uses a serving metric, while the parent study uses dollars. Keep the metric explicit in titles and anchors.

The older GSC export is historical query/intent evidence only. The current recovery check showed 29 impressions total over three months, so this audit makes **no destructive merge or redirect recommendation** from stale counts.

## Bounded implementation

Edited only:

- `src/data/articles/protein-per-dollar-cheapest-protein-sources.md`
- `src/data/articles/what-50-grams-of-protein-costs-per-day.md`
- `src/data/articles/high-protein-on-a-budget-complete-guide.md`
- `src/data/articles/best-low-cost-protein-sources-large-families.md`
- `reports/batch-b/protein-cluster-audit.md`

No optional supporting page was edited. The first batch already closes the core four-page graph; expanding to more spokes before integration would add review surface without resolving either source-data blocker.

## Integration follow-up

The large-family spoke initially failed the production validator at 907 body
words. Integration expanded it with a protein-role matrix, a two-cook family
prep system, and a price-recheck method instead of adding filler. The final
article passes the nutrition minimum, uses six tags, and passes the bounded
cluster gate with `budget-protein` and the high-protein budget guide as parent.

All seven edited Fiber and Protein articles received `dateModified: 2026-07-12`.

## Targeted validation

- `validate_article.py`: all four edited articles have zero Tier 1 failures.
- The parent study, daily-cost study, and parent guide retain Tier 2 length warnings because they are intentionally long-form authority pages; the guide also retains an 11-H2 structure warning. The large-family spoke passes without warnings.
- Hard-ban scan across the four articles: zero matches.
- Parent CSV: 49 rows, zero rank mismatches, maximum formula-versus-published rounding delta 0.049903 g/$.
- Core graph: every edited page links to the study and/or parent appropriate to its role; the study, guide, and family spoke link to the new daily-cost analysis.
- `git diff --check` on the four articles and this report: pass. Line-ending conversion notices are workspace configuration warnings, not whitespace failures.
