<!-- DRAFT. Do not push this file to Hugging Face.
     The owner pastes the card below into
     https://huggingface.co/datasets/moshiko123/daily-life-hacks-grocery-nutrition-per-dollar
     from the account that owns that dataset, after deleting this comment. -->

---
license: cc-by-4.0
pretty_name: Daily Life Hacks Grocery Nutrition per Dollar
configs:
- config_name: fiber
  data_files: fiber-per-dollar-2026.csv
- config_name: protein
  data_files: protein-per-dollar-2026.csv
---

# Daily Life Hacks: Grocery Nutrition per Dollar

This dataset contains two public CSV files ranking grocery foods by nutrition per dollar:

- `fiber-per-dollar-2026.csv`: fiber per dollar. Study write-up: https://www.daily-life-hacks.com/what-30-grams-of-fiber-costs-per-day/
- `protein-per-dollar-2026.csv`: protein per dollar. Study write-up: https://www.daily-life-hacks.com/protein-per-dollar-adjusted-for-quality/

Direct downloads on the site:

- https://www.daily-life-hacks.com/data/fiber-per-dollar-2026.csv
- https://www.daily-life-hacks.com/data/protein-per-dollar-2026.csv

## Methodology and disclosure

Nutrition values come from USDA FoodData Central where a row carries an FDC id. Prices are US prices. The grocery snapshot named most often in `price_basis` is July 2026. This is an independent study published by Daily Life Hacks, the organization, and it is not endorsed by USDA.

- Methodology: https://www.daily-life-hacks.com/methodology/
- Reuse terms (CC BY 4.0, scoped to the Daily Life Hacks selection and calculations): https://www.daily-life-hacks.com/data-reuse/
- Citation file: https://www.daily-life-hacks.com/CITATION.cff

## How to cite

The author is the organization Daily Life Hacks. This card does not include a DOI.

```
Daily Life Hacks. (2026). Daily Life Hacks Food Value Data (Version 2026.3) [Data set]. https://www.daily-life-hacks.com/methodology/
```
