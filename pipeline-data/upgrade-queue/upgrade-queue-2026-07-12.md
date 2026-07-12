# Article upgrade queue (2026-07-12)

| # | Slug | Cluster | Issues | Score |
|---|------|---------|--------|------:|
| 1 | `beans-and-rice-complete-protein-meal` | fiber | no_internal_links, thin_body | 85 |
| 2 | `cooking-for-picky-adults-simple-options` | protein | no_internal_links, thin_body | 85 |
| 3 | `cottage-cheese-vs-greek-yogurt-protein-uses` | protein | no_internal_links, thin_body | 85 |
| 4 | `creamy-mushroom-barley-risotto-hands-off` | protein | no_internal_links, thin_body | 85 |
| 5 | `freezer-inventory-simple-system` | budget | no_internal_links, thin_body | 85 |
| 6 | `high-fiber-burrito-bowl-meal-prep` | fiber | no_internal_links, thin_body | 85 |
| 7 | `high-fiber-raspberry-jam-recipe-chia` | fiber | no_internal_links, thin_body | 85 |
| 8 | `how-to-choose-granola-not-dessert` | fiber | no_internal_links, thin_body | 85 |
| 9 | `cutting-board-basics-which-to-use` | - | no_internal_links, thin_body | 65 |
| 10 | `how-to-clean-blender-fast-no-scrub` | - | no_internal_links, thin_body | 65 |
| 11 | `best-way-to-cook-chicken` | protein | few_h2, no_internal_links | 50 |
| 12 | `cheap-crockpot-meals-large-families` | budget | no_internal_links | 50 |
| 13 | `costco-rotisserie-chicken-meal-ideas-dinner` | budget | no_internal_links | 50 |
| 14 | `easy-sourdough-discard-recipes-beginners` | protein | no_internal_links | 50 |
| 15 | `farro-lunch-bowl-roasted-vegetables-lemon-tahini` | protein | no_internal_links | 50 |

## Run next

```bash
py -3 scripts/NEW_PIPELINE_2026-05-08/inject_pillar_links.py --queue pipeline-data/upgrade-queue/upgrade-queue-latest.json --limit 10
```
