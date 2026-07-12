# Article upgrade queue (2026-07-12)

| # | Slug | Cluster | Issues | Score |
|---|------|---------|--------|------:|
| 1 | `how-to-keep-bread-fresh-longer-without-mold` | - | missing_image_alt, short_excerpt, no_internal_links, thin_body | 65 |
| 2 | `best-way-to-cook-chicken` | protein | missing_image_alt, short_excerpt, few_h2, no_internal_links | 50 |
| 3 | `cheap-crockpot-meals-large-families` | budget | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 4 | `costco-rotisserie-chicken-meal-ideas-dinner` | budget | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 5 | `easy-sourdough-discard-recipes-beginners` | protein | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 6 | `food-prep-guide-blog-recipes` | fiber | missing_image_alt, short_excerpt, few_h2, no_internal_links | 50 |
| 7 | `high-fiber-hummus-recipe-homemade` | fiber | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 8 | `high-fiber-meal-prep-ideas-for-busy-weeks-2026` | fiber | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 9 | `high-fiber-pasta-alternatives` | fiber | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 10 | `high-fiber-stir-fry-vegetables` | fiber | missing_image_alt, short_excerpt, few_h2, no_internal_links | 50 |
| 11 | `high-fiber-yogurt-parfait-for-breakfast` | fiber | missing_image_alt, short_excerpt, few_h2, no_internal_links | 50 |
| 12 | `high-protein-bagel-sandwich-ideas-lunch` | protein | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 13 | `high-protein-vegetarian-breakfast-burritos-you-can-freeze` | protein | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 14 | `how-much-protein-in-bagel-sandwich` | protein | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 15 | `how-to-increase-fiber-intake-without-gas` | fiber | missing_image_alt, short_excerpt, no_internal_links | 50 |
| 16 | `how-to-make-sourdough-pizza-dough-same-day` | protein | missing_image_alt, short_excerpt, few_h2, thin_body | 50 |
| 17 | `best-breakfast-foods-for-sustained-energy` | fiber | missing_image_alt, short_excerpt, thin_body | 45 |
| 18 | `best-way-to-store-avocados-to-stop-browning` | budget | missing_image_alt, short_excerpt, thin_body | 45 |
| 19 | `crispy-roasted-chickpeas-high-fiber-snack` | fiber | missing_image_alt, short_excerpt, thin_body | 45 |
| 20 | `easy-black-bean-tacos-weeknight-dinner` | fiber | missing_image_alt, short_excerpt, thin_body | 45 |

## Run next

```bash
py -3 scripts/NEW_PIPELINE_2026-05-08/inject_pillar_links.py --queue pipeline-data/upgrade-queue/upgrade-queue-latest.json --limit 10
```
