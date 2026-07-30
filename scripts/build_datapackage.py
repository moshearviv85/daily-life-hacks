#!/usr/bin/env python3
"""Generate public/data/datapackage.json (Frictionless Data Package v1).

Reads the CSV list from pipeline-data/csv-inventory.json, opens each CSV to
infer column types and measure the file, and emits a single Data Package
descriptor covering every public dataset on daily-life-hacks.com.

The script is idempotent: given unchanged CSVs it produces byte-identical
output and skips the write. Re-run it whenever a CSV is added, removed, or
re-audited.

    python scripts/build_datapackage.py
    python scripts/build_datapackage.py --check   # non-zero exit if stale

Spec: https://specs.frictionlessdata.io/data-package/
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INVENTORY_PATH = ROOT / "pipeline-data" / "csv-inventory.json"
DATA_DIR = ROOT / "public" / "data"
OUTPUT_PATH = DATA_DIR / "datapackage.json"
DIST_OUTPUT_PATH = ROOT / "dist-datasets" / "datapackage.json"

SITE = "https://www.daily-life-hacks.com"

# The package licenses only Daily Life Hacks' original compilation and
# explanatory contribution. The terms page preserves the upstream-rights
# boundary and copy-ready attribution.
TERMS_URL = f"{SITE}/data-reuse/"
LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"

# Fixed so re-runs stay byte-identical. Bump with the package version.
PACKAGE_VERSION = "2026.1"
PACKAGE_CREATED = "2026-07-26T00:00:00Z"


# --------------------------------------------------------------------------
# Per-dataset metadata. Descriptions were written by reading each CSV's
# header and rows; the column semantics match the DATASETS registry in
# src/pages/[slug].astro.
# --------------------------------------------------------------------------

PROTEIN_PER_DOLLAR = (
    "Grams of protein per US dollar spent, after the edible fraction is applied."
)
FIBER_PER_DOLLAR = (
    "Grams of dietary fiber per US dollar spent, after the edible fraction is applied."
)

DATASETS: dict[str, dict] = {
    "animal-protein-per-dollar-ranked-2026.csv": {
        "title": "Animal Protein per Dollar, Ranked (2026)",
        "study": "animal-protein-per-dollar-ranked",
        "description": (
            "21 animal-source foods (meat, poultry, eggs, dairy and seafood) ranked by "
            "grams of protein per US dollar. Prices are US national figures from BLS "
            "Average Price data where the item is tracked and Walmart national listings "
            "otherwise. Bone-in cuts have the USDA refuse percentage removed before ranking."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
    "beans-double-win-fiber-protein-2026.csv": {
        "title": "Beans Ranked by Fiber and Protein per Dollar (2026)",
        "study": "beans-double-win-fiber-protein",
        "description": (
            "10 legumes and legume products scored on both nutrients at once, pairing dry "
            "beans against their canned equivalents. Each row carries protein per dollar, "
            "fiber per dollar, and the two added together. Canned rows are measured drained."
        ),
        "fields": {
            "value": "Combined grams of protein plus fiber per US dollar spent.",
        },
    },
    "breakfast-staples-per-dollar-2026.csv": {
        "title": "Breakfast Staples by Nutrition per Dollar (2026)",
        "study": "breakfast-staples-per-dollar",
        "description": (
            "9 common American breakfast foods (flour, oats, eggs, peanut butter, yogurt, "
            "fruit and similar) scored on protein per dollar and fiber per dollar. The "
            "fiber column is left blank for foods that carry effectively none."
        ),
        "fields": {
            "value": "Combined grams of protein plus fiber per US dollar spent.",
        },
    },
    "canned-vs-dry-beans-cost-2026.csv": {
        "title": "Canned vs Dry Beans, Cost Compared (2026)",
        "study": "canned-vs-dry-beans-cost",
        "description": (
            "10 rows pairing dry beans and lentils against the canned version of the same "
            "legume, ranked by grams of protein per US dollar, to quantify what the "
            "convenience of a can costs. Canned rows are measured drained."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
    "cheapest-complete-protein-pairs-2026.csv": {
        "title": "Cheapest Complete-Protein Pairings (2026)",
        "study": "cheapest-complete-protein-pairs",
        "description": (
            "20 legume-and-grain combinations scored as complete-protein pairings. Each row "
            "is a two-food combo whose score is a 50/50 split of the dollars between two "
            "already-audited single-food rows, so the package and package price columns are "
            "intentionally empty and the component values are named in price_basis."
        ),
        "fields": {
            "food": "The two-food pairing, written as 'Food A + Food B'.",
            "value": (
                "Combined grams of protein per US dollar for the pairing, on a 50/50 split "
                "of the dollars between the two component foods."
            ),
            "category": "Always 'combo'. Every row in this dataset is a pairing, not a single food.",
            "package": "Not applicable to a pairing. Always empty in this dataset.",
            "package_price_usd": (
                "Not applicable to a pairing. Always 0; the component package prices live in "
                "the single-food datasets."
            ),
            "price_basis": (
                "The two audited single-food rows the pairing score was derived from, with "
                "each one's protein per dollar."
            ),
        },
    },
    "dairy-protein-per-dollar-ranked-2026.csv": {
        "title": "Dairy and Egg Protein per Dollar, Ranked (2026)",
        "study": "dairy-protein-per-dollar-ranked",
        "description": (
            "6 dairy-case staples (eggs, milk, cottage cheese, Greek yogurt, mozzarella and "
            "cheddar) ranked by grams of protein per US dollar."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
    "eggs-vs-everything-protein-value-2026.csv": {
        "title": "Eggs vs Every Other Protein Source (2026)",
        "study": "eggs-vs-everything-protein-value",
        "description": (
            "The full 49-food protein ranking used to place eggs against every other source "
            "in the study, plant and animal, ordered by grams of protein per US dollar."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
    "fastfood-protein-per-dollar-2026.csv": {
        "title": "Fast Food Protein per Dollar (2026)",
        "study": "fast-food-protein-per-dollar-ranked",
        "description": (
            "30 menu items from major US fast food chains ranked by grams of protein per US "
            "dollar. Protein figures come from each chain's own published nutrition data and "
            "prices from national averages or dated store menu snapshots. Both are recorded "
            "per row, and items from chains that publish no nutrition data were excluded."
        ),
        "fields": {},
    },
    "fiber-day-cost-2026.csv": {
        "title": "Cost of 30 Grams of Fiber per Day, Five Menus (2026)",
        "study": "what-30-grams-of-fiber-costs-per-day",
        "description": (
            "27 meal components making up 5 complete single-day menus, each built to reach "
            "roughly 30 grams of dietary fiber. Every row records the food, the grams used, "
            "the fiber that portion contributes, and what it cost at the audited price."
        ),
        "fields": {},
    },
    "fiber-per-dollar-2026.csv": {
        "title": "Fiber per Dollar: 53 Foods Ranked (2026)",
        "study": "fiber-per-dollar-cheapest-high-fiber-foods",
        "description": (
            "The flagship fiber dataset. 53 foods ranked by grams of dietary fiber per US "
            "dollar with the whole calculation exposed: recorded fiber per 100g, package size "
            "and price, package weight, edible fraction, derived price per 100 grams, and "
            "row-level nutrition provenance status."
        ),
        "fields": {},
    },
    "grains-fiber-per-dollar-ranked-2026.csv": {
        "title": "Grains Ranked by Fiber per Dollar (2026)",
        "study": "grains-fiber-per-dollar-ranked",
        "description": (
            "11 grains and grain products (whole wheat flour, popcorn, oats, barley, brown "
            "rice, pasta, quinoa and similar) ranked by grams of dietary fiber per US dollar."
        ),
        "fields": {"value": FIBER_PER_DOLLAR},
    },
    "high-fiber-snacks-per-dollar-2026.csv": {
        "title": "High-Fiber Snacks Ranked by Cost (2026)",
        "study": "high-fiber-snacks-per-dollar",
        "description": (
            "10 snackable foods ranked by grams of dietary fiber per US dollar, limited to "
            "items you would eat between meals with little or no preparation."
        ),
        "fields": {"value": FIBER_PER_DOLLAR},
    },
    "meat-per-dollar-protein-ranked-2026.csv": {
        "title": "Meat per Dollar: 11 Cuts Ranked by Protein Value (2026)",
        "study": "meat-per-dollar-protein-ranked",
        "description": (
            "11 cuts of meat and poultry ranked by grams of protein per US dollar. Bone-in "
            "cuts have the USDA refuse percentage for bone and cartilage removed before the "
            "ranking, so they are not credited for weight nobody eats."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
    "no-cook-protein-per-dollar-2026.csv": {
        "title": "Cheapest Protein That Needs No Cooking (2026)",
        "study": "no-cook-protein-per-dollar",
        "description": (
            "15 protein sources that need no cooking at all, ranked by grams of protein per "
            "US dollar. Scoped to foods edible straight from the package or the fridge."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
    "one-dollar-fiber-what-it-buys-2026.csv": {
        "title": "What One Dollar of Fiber Buys (2026)",
        "study": "one-dollar-fiber-what-it-buys",
        "description": (
            "15 foods showing what a single US dollar buys in grams of dietary fiber, ranked "
            "from most to least, spanning whole grains, dried and canned legumes, and produce."
        ),
        "fields": {"value": FIBER_PER_DOLLAR},
    },
    "one-dollar-protein-what-it-buys-2026.csv": {
        "title": "What One Dollar of Protein Buys (2026)",
        "study": "one-dollar-protein-what-it-buys",
        "description": (
            "15 foods showing what a single US dollar buys in grams of protein, ranked from "
            "most to least, spanning legumes, grains, dairy, eggs, meat and nuts."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
    "plant-protein-per-dollar-ranked-2026.csv": {
        "title": "Plant Protein per Dollar: 18 Sources Ranked (2026)",
        "study": "plant-protein-per-dollar-ranked",
        "description": (
            "18 plant protein sources (dried beans and lentils, grains, nuts, seeds and soy "
            "foods) ranked by grams of protein per US dollar."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
    "produce-fiber-per-dollar-ranked-2026.csv": {
        "title": "Fruits and Vegetables Ranked by Fiber per Dollar (2026)",
        "study": "produce-fiber-per-dollar-ranked",
        "description": (
            "22 fresh, frozen and dried fruits and vegetables ranked by grams of dietary "
            "fiber per US dollar. Edible fraction is applied first, so peels, pits and rinds "
            "do not flatter the heavy-waste items."
        ),
        "fields": {"value": FIBER_PER_DOLLAR},
    },
    "protein-day-cost-2026.csv": {
        "title": "Cost of 50 Grams of Protein per Day, Five Menus (2026)",
        "study": "what-50-grams-of-protein-costs-per-day",
        "description": (
            "21 meal components making up 5 complete single-day menus, each built to reach "
            "roughly 50 grams of protein. Every row records the food, the grams used, the "
            "protein that portion contributes, and what it cost at the audited price."
        ),
        "fields": {
            "protein_g": "Grams of protein contributed by this meal component.",
        },
    },
    "protein-per-dollar-2026.csv": {
        "title": "Protein per Dollar: 49 Sources Ranked (2026)",
        "study": "protein-per-dollar-cheapest-protein-sources",
        "description": (
            "The flagship protein dataset. 49 foods ranked by grams of protein per US dollar "
            "with the whole calculation exposed: recorded protein per 100g, package size and "
            "price, package weight, edible fraction, derived price per 100 grams, and "
            "row-level nutrition provenance status."
        ),
        "fields": {},
    },
    "protein-quality-per-dollar-2026.csv": {
        "title": "Protein per Dollar Adjusted for Quality, DIAAS (2026)",
        "study": "protein-per-dollar-adjusted-for-quality",
        "description": (
            "25 protein sources whose raw protein-per-dollar figure is multiplied by a "
            "published DIAAS digestibility score, capped at 1.00, to give usable protein per "
            "dollar. Every DIAAS value names the peer-reviewed measurement it came from."
        ),
        "fields": {},
    },
    "shelf-stable-pantry-per-dollar-2026.csv": {
        "title": "The Shelf-Stable Pantry, Ranked by Protein per Dollar (2026)",
        "study": "shelf-stable-pantry-per-dollar",
        "description": (
            "27 shelf-stable pantry foods ranked by grams of protein per US dollar. Nothing "
            "in this dataset needs refrigeration, so it doubles as a stock-up list."
        ),
        "fields": {"value": PROTEIN_PER_DOLLAR},
    },
}


# --------------------------------------------------------------------------
# Shared column descriptions. Per-dataset overrides above win.
# --------------------------------------------------------------------------

FIELD_DESCRIPTIONS: dict[str, str] = {
    "rank": "Position in the ranking. 1 is the most nutrient per dollar.",
    "food": (
        "Food item as sold at retail, including the form (dry, canned, frozen, bone-in) "
        "where the form changes the math."
    ),
    "category": "Grocery category the food was grouped under for this ranking.",
    "package": "Package size the recorded price refers to, as sold on the shelf.",
    "package_price_usd": "Shelf price in US dollars for that package.",
    "package_weight_g": "Net weight of that package in grams.",
    "edible_fraction": (
        "Share of the purchased weight that is actually eaten, after USDA refuse (peels, "
        "pits, rinds, bone) is removed. 1.0 means no waste."
    ),
    "price_per_100g_usd": "Price in US dollars per 100 grams of edible food.",
    "price_basis": (
        "Source and observation date for the price, plus any USDA refuse percentage applied."
    ),
    "nutrition_source_status": (
        "Row-level nutrition provenance status: exact, proxy, or unresolved."
    ),
    "nutrition_source_type": (
        "Authoritative nutrition source class, or Unresolved when no unique matching record was established."
    ),
    "nutrition_source_id": (
        "USDA FoodData Central identifier for exact and proxy rows; empty for unresolved rows."
    ),
    "nutrition_source_url": (
        "Direct authoritative record URL, or the current manufacturer page for the unresolved TVP label row."
    ),
    "nutrition_source_description": (
        "Food description from the linked authoritative record, preserved verbatim for auditability."
    ),
    "nutrition_source_form": (
        "Preparation or physical form supported by the linked nutrient record; Not resolved when no unique record was established."
    ),
    "nutrition_source_note": (
        "Row-specific disclosure for proxy and unresolved matches, including the exact ambiguity or mismatch."
    ),
    "fiber_g_per_100g": (
        "Recorded dietary fiber in grams per 100 grams; use the nutrition_source fields "
        "in the flagship CSV to inspect its FoodData Central match status."
    ),
    "protein_g_per_100g": (
        "Recorded protein in grams per 100 grams; use the nutrition_source fields in the "
        "flagship CSV to inspect its FoodData Central or manufacturer-label status."
    ),
    "protein_g_per_dollar": PROTEIN_PER_DOLLAR,
    "fiber_g_per_dollar": FIBER_PER_DOLLAR,
    # Fast food
    "chain": "Fast food chain the menu item belongs to.",
    "item": "Menu item name as the chain publishes it.",
    "protein_g": "Protein in grams per menu item as served.",
    "price_usd": "Menu price in US dollars for that item.",
    "source": (
        "Where the nutrition figure came from, including the independent re-verification."
    ),
    # Day-menu datasets
    "day": "Menu day label. Each day is one complete plan built to a single nutrient target.",
    "meal": "Meal slot the component belongs to within that day.",
    "grams_used": "Grams of the food used in that meal component.",
    "fiber_g": "Grams of dietary fiber contributed by this meal component.",
    "cost_usd": "Cost in US dollars of this portion at the audited price.",
    "basis": "The parent dataset row the price and nutrient value were taken from.",
    # Protein quality
    "diaas_score": (
        "DIAAS (Digestible Indispensable Amino Acid Score) for the protein source, as "
        "measured in the cited peer-reviewed study."
    ),
    "diaas_capped_for_multiplication": (
        "The DIAAS value capped at 1.00 before multiplying, so a complete protein is not "
        "credited above 100 percent usable."
    ),
    "diaas_method": "Scoring method used for the quality adjustment.",
    "diaas_source": "Peer-reviewed study the DIAAS value was taken from.",
    "adjusted_g_per_dollar": (
        "Protein grams per dollar multiplied by the capped DIAAS score: usable protein per "
        "US dollar."
    ),
    "notes": "Free-text note on the amino acid profile or the proxy food used for scoring.",
}

# Continuous quantities. Inference alone would call an all-whole-number column
# "integer", which is wrong for money and for nutrient measurements.
FORCE_NUMBER = {
    "package_price_usd",
    "package_weight_g",
    "price_usd",
    "cost_usd",
    "price_per_100g_usd",
    "edible_fraction",
    "value",
    "protein_g",
    "fiber_g",
    "protein_g_per_dollar",
    "fiber_g_per_dollar",
    "protein_g_per_100g",
    "fiber_g_per_100g",
    "adjusted_g_per_dollar",
    "diaas_score",
    "diaas_capped_for_multiplication",
}


def infer_type(values: list[str], column: str) -> str:
    """Infer a Table Schema type from the column's non-empty values."""
    present = [v.strip() for v in values if v is not None and v.strip() != ""]
    if not present:
        return "string"
    is_integer = True
    is_number = True
    for v in present:
        try:
            int(v)
        except ValueError:
            is_integer = False
        try:
            float(v)
        except ValueError:
            is_number = False
            break
    if not is_number:
        return "string"
    if column in FORCE_NUMBER:
        return "number"
    return "integer" if is_integer else "number"


def read_csv(path: Path) -> tuple[list[str], list[list[str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        raise SystemExit(f"{path.name} is empty")
    return rows[0], rows[1:]


def canonical_csv_bytes(path: Path) -> bytes:
    """Return the bytes GitHub Pages serves, independent of checkout OS."""
    return path.read_bytes().replace(b"\r\n", b"\n")


def sha256_of(data: bytes) -> str:
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def build_resource(entry: dict, problems: list[str]) -> dict:
    filename = entry["file"]
    path = DATA_DIR / filename
    if not path.exists():
        raise SystemExit(f"missing CSV: {path}")

    meta = DATASETS.get(filename)
    if meta is None:
        raise SystemExit(
            f"no metadata for {filename}. Add an entry to DATASETS in this script."
        )

    header, rows = read_csv(path)

    inventory_fields = entry.get("fields") or []
    if header != inventory_fields:
        problems.append(
            f"{filename}: header {header} does not match csv-inventory.json {inventory_fields}"
        )
    if entry.get("rows") is not None and len(rows) != entry["rows"]:
        problems.append(
            f"{filename}: {len(rows)} data rows on disk, csv-inventory.json says {entry['rows']}"
        )

    overrides = meta.get("fields", {})
    fields = []
    for index, column in enumerate(header):
        description = overrides.get(column) or FIELD_DESCRIPTIONS.get(column)
        if not description:
            problems.append(f"{filename}: no description for column '{column}'")
            description = f"Column '{column}'."
        column_values = [row[index] if index < len(row) else "" for row in rows]
        fields.append(
            {
                "name": column,
                "type": infer_type(column_values, column),
                "description": description,
            }
        )

    study_url = f"{SITE}/{meta['study']}/"
    csv_bytes = canonical_csv_bytes(path)
    return {
        "name": path.stem,
        "path": filename,
        "profile": "tabular-data-resource",
        "title": meta["title"],
        "description": meta["description"],
        "format": "csv",
        "mediatype": "text/csv",
        "encoding": "utf-8",
        "bytes": len(csv_bytes),
        "hash": sha256_of(csv_bytes),
        "sources": [
            {
                "title": f"Daily Life Hacks study: {meta['title']}",
                "path": study_url,
            }
        ],
        "schema": {
            "fields": fields,
            "missingValues": [""],
        },
        "rowCount": len(rows),
    }


def build_package() -> tuple[dict, list[str]]:
    inventory = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))
    inventory = sorted(inventory, key=lambda e: e["file"])

    problems: list[str] = []
    resources = [build_resource(entry, problems) for entry in inventory]

    unused = set(DATASETS) - {e["file"] for e in inventory}
    if unused:
        problems.append(
            "DATASETS has entries not present in csv-inventory.json: "
            + ", ".join(sorted(unused))
        )

    package = {
        "profile": "tabular-data-package",
        "name": "daily-life-hacks-food-value-data",
        "title": "Daily Life Hacks Food Value Data",
        "description": (
            "Every public dataset behind the Daily Life Hacks grocery cost studies: fiber "
            "per dollar, protein per dollar, protein quality adjusted with DIAAS, daily "
            "menu costing, and category-level rankings across produce, grains, legumes, "
            "dairy, meat, pantry staples and fast food.\n\n"
            "Grocery nutrient values primarily trace to USDA FoodData Central; the flagship "
            "files expose exact, proxy, and unresolved row-level status, and documented "
            "product-label exceptions remain labeled as such. Restaurant values come from "
            "chain-published nutrition. Prices are US national figures: BLS Average Price "
            "data where the item is tracked, Walmart national listings otherwise, observed "
            "July 2026. Every ranking is calculated "
            "as-purchased, with USDA refuse percentages removed so peels, pits and bone are "
            "not counted as food.\n\n"
            "The original Daily Life Hacks selection, arrangement, calculations, field "
            "descriptions, and explanatory material are licensed CC BY 4.0. Upstream "
            "facts and third-party material keep their own status and terms. Credit "
            "\"Daily Life Hacks\" with a link to the study page or to "
            f"{SITE}/data/. Full scope at {TERMS_URL} and full "
            f"methodology at {SITE}/methodology/."
        ),
        "homepage": f"{SITE}/data/",
        "version": PACKAGE_VERSION,
        "created": PACKAGE_CREATED,
        "licenses": [
            {
                "name": "CC-BY-4.0",
                "path": LICENSE_URL,
                "title": "Creative Commons Attribution 4.0 International",
            }
        ],
        "keywords": [
            "food prices",
            "nutrition",
            "protein per dollar",
            "fiber per dollar",
            "grocery costs",
            "food economics",
            "USDA FoodData Central",
            "BLS average prices",
            "budget nutrition",
            "open data",
        ],
        "sources": [
            {
                "title": "USDA FoodData Central",
                "path": "https://fdc.nal.usda.gov/",
            },
            {
                "title": "U.S. Bureau of Labor Statistics, Average Price Data",
                "path": "https://www.bls.gov/cpi/data.htm",
            },
        ],
        "contributors": [
            {
                "title": "Daily Life Hacks",
                "path": SITE,
                "role": "publisher",
                "organization": "Daily Life Hacks",
            },
            {
                "title": "David Miller",
                "path": f"{SITE}/about/",
                "role": "author",
                "organization": "Daily Life Hacks",
            },
        ],
        "resources": resources,
    }
    return package, problems


def render(package: dict) -> str:
    return json.dumps(package, indent=2, ensure_ascii=False) + "\n"


def standalone_package(package: dict) -> dict:
    standalone = json.loads(json.dumps(package))
    for resource in standalone["resources"]:
        resource["path"] = f"data/{resource['path']}"
    return standalone


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="do not write; exit 1 if the file on disk is missing or stale",
    )
    args = parser.parse_args()

    package, problems = build_package()
    rendered = render(package)
    dist_rendered = render(standalone_package(package))

    # Fail loudly rather than shipping a descriptor that lies about the data.
    if problems:
        for problem in problems:
            print(f"ERROR: {problem}", file=sys.stderr)
        return 1

    existing = OUTPUT_PATH.read_text(encoding="utf-8") if OUTPUT_PATH.exists() else None
    dist_existing = (
        DIST_OUTPUT_PATH.read_text(encoding="utf-8")
        if DIST_OUTPUT_PATH.exists()
        else None
    )

    if args.check:
        if existing != rendered or dist_existing != dist_rendered:
            print(
                "A datapackage.json is stale. Run scripts/build_datapackage.py",
                file=sys.stderr,
            )
            return 1
        print(
            f"Both datapackage.json files are up to date "
            f"({len(package['resources'])} resources)"
        )
        return 0

    if existing == rendered and dist_existing == dist_rendered:
        print(
            f"Both datapackage.json files unchanged "
            f"({len(package['resources'])} resources)"
        )
        return 0

    OUTPUT_PATH.write_text(rendered, encoding="utf-8")
    DIST_OUTPUT_PATH.write_text(dist_rendered, encoding="utf-8")
    print(
        f"wrote {OUTPUT_PATH.relative_to(ROOT).as_posix()} and "
        f"{DIST_OUTPUT_PATH.relative_to(ROOT).as_posix()} "
        f"({len(package['resources'])} resources, "
        f"{sum(r['rowCount'] for r in package['resources'])} data rows)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
