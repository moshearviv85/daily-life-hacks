# Changelog

All notable changes to the Daily Life Hacks Food Value Data collection are recorded here.

Versions are dated snapshots, not semantic versions. The format is `YYYY.N`: the year,
plus which re-audit of that year it is. Prices get a full re-audit quarterly and the BLS
staples get checked monthly, so expect roughly four versions a year. Nutrient values
change far less often than prices do.

Corrections are never applied silently. If a number changes after publication, it gets
an entry here and a dated correction note in the study itself.

## [2026.1] - 2026-07-26

First packaged release of the collection. The individual CSVs have been published
alongside their studies for a while; this is the first time they ship as one versioned
set with a descriptor and a citation file.

### Added

- 22 datasets, 474 data rows, covering fiber per dollar, protein per dollar, DIAAS
  quality-adjusted protein, daily menu costing, and category rankings across produce,
  grains, legumes, dairy, meat, pantry staples and fast food.
- `datapackage.json` - Frictionless `tabular-data-package` descriptor with per-field
  types, descriptions, byte counts, row counts and SHA-256 checksums for all 22 files.
- 22 matplotlib charts in `charts/`, one per dataset.
- `CITATION.cff` (Citation File Format 1.2.0).
- `examples/` - one Python and one JavaScript script, both standard-library only, with
  their real output committed.

### Data notes for this snapshot

- Prices observed July 2026. BLS Average Price data where the item is tracked, Walmart
  national listings otherwise. Every row states which, in `price_basis`.
- Nutrient values from USDA FoodData Central, each re-verified against two independent
  pulls in separate sessions.
- USDA refuse percentages applied before ranking, so peels, pits, rinds and bone are not
  counted as food.
- Carries forward the 2026-07-04 correction to the fiber study: an adversarial audit
  caught six values, they were fixed and the affected foods re-ranked before this
  snapshot was cut. The corrected values are what ship here.

### Known limitations

- The public exports do not include the FoodData Central ID column. Nutrient values trace
  to FDC, but the row-level ID is not in the export yet.
- Prices are US national. Regional variation, especially on produce and dairy, is not
  modeled.
- Walmart-sourced rows reflect a single retailer's national listings.

[2026.1]: https://www.daily-life-hacks.com/data/
