"""Build the sodium-per-dollar dataset from the audited price basket.

The study adds one nutrient to foods that were already priced and audited for the
fiber-per-dollar and protein-per-dollar studies. No new grocery prices are collected,
so every cost figure inherits the parent studies' audit.

Sodium comes from the same USDA FoodData Central record the parent CSV already cites,
which is why only rows with nutrition_source_status == "exact" are eligible: a proxy
or unresolved match is acceptable for a fiber estimate but not for attributing a
sodium value to a named USDA record.

Inputs:
  public/data/fiber-per-dollar-2026.csv
  public/data/protein-per-dollar-2026.csv
  pipeline-data/usda-sodium-pull-2026-08-02.json   (raw FDC pull, cached)

Output:
  public/data/sodium-per-dollar-2026.csv

Re-pull the cache with --refresh (needs an FDC api key; DEMO_KEY is rate limited).
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "pipeline-data" / "usda-sodium-pull-2026-08-02.json"
OUT = ROOT / "public" / "data" / "sodium-per-dollar-2026.csv"

PARENTS = (
    ("fiber-per-dollar-2026.csv", "fiber_g_per_100g"),
    ("protein-per-dollar-2026.csv", "protein_g_per_100g"),
)

FIELDS = [
    "rank_lowest_sodium_first",
    "food",
    "category",
    "sodium_mg_per_100g",
    "sodium_mg_per_dollar",
    "fiber_g_per_100g",
    "protein_g_per_100g",
    "package",
    "package_price_usd",
    "package_weight_g",
    "edible_fraction",
    "price_per_100g_usd",
    "price_basis",
    "nutrition_source_status",
    "nutrition_source_type",
    "nutrition_source_id",
    "nutrition_source_url",
    "nutrition_source_description",
]


def fdc_id(row: dict) -> str | None:
    match = re.search(r"(\d{5,7})", row.get("nutrition_source_id") or "")
    return match.group(1) if match else None


def read_parents() -> dict:
    """Union the two parent studies, keyed by food name."""
    foods: dict[str, dict] = {}
    for filename, nutrient_col in PARENTS:
        path = ROOT / "public" / "data" / filename
        for row in csv.DictReader(path.open(encoding="utf-8")):
            identifier = fdc_id(row)
            if not identifier or row.get("nutrition_source_status") != "exact":
                continue
            entry = foods.setdefault(
                row["food"],
                {
                    "food": row["food"],
                    "category": row["category"],
                    "package": row["package"],
                    "package_price_usd": row["package_price_usd"],
                    "package_weight_g": row["package_weight_g"],
                    "edible_fraction": row["edible_fraction"],
                    "price_per_100g_usd": row["price_per_100g_usd"],
                    "price_basis": row["price_basis"],
                    "nutrition_source_status": row["nutrition_source_status"],
                    "nutrition_source_type": row["nutrition_source_type"],
                    "nutrition_source_id": row["nutrition_source_id"],
                    "nutrition_source_url": row["nutrition_source_url"],
                    "nutrition_source_description": row["nutrition_source_description"],
                    "_fdc": identifier,
                    "fiber_g_per_100g": "",
                    "protein_g_per_100g": "",
                },
            )
            entry[nutrient_col] = row[nutrient_col]
    return foods


def pull(ids: list[str], api_key: str) -> dict:
    """POST /v1/foods in batches of 20."""
    out: dict[str, dict] = {}
    for start in range(0, len(ids), 20):
        chunk = [int(i) for i in ids[start:start + 20]]
        body = json.dumps({"fdcIds": chunk, "format": "full"}).encode()
        request = urllib.request.Request(
            f"https://api.nal.usda.gov/fdc/v1/foods?api_key={api_key}",
            data=body,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=60) as handle:
            for food in json.load(handle):
                nutrients = {}
                for item in food.get("foodNutrients", []):
                    nutrient = item.get("nutrient") or {}
                    if nutrient.get("name") == "Sodium, Na" and item.get("amount") is not None:
                        nutrients["sodium_mg"] = item["amount"]
                out[str(food["fdcId"])] = {
                    "description": food.get("description"),
                    "dataType": food.get("dataType"),
                    **nutrients,
                }
        time.sleep(2)
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", metavar="API_KEY", help="re-pull FDC and rewrite the cache")
    args = parser.parse_args()

    foods = read_parents()
    ids = sorted({entry["_fdc"] for entry in foods.values()})

    if args.refresh:
        sodium = pull(ids, args.refresh)
        CACHE.write_text(json.dumps(sodium, indent=1), encoding="utf-8")
    else:
        sodium = json.loads(CACHE.read_text(encoding="utf-8"))

    missing = [i for i in ids if i not in sodium or "sodium_mg" not in sodium[i]]
    if missing:
        print(f"ERROR: no sodium value for {len(missing)} records: {missing}", file=sys.stderr)
        return 1

    rows = []
    for entry in foods.values():
        milligrams = sodium[entry["_fdc"]]["sodium_mg"]
        price_per_100g = float(entry["price_per_100g_usd"])
        entry["sodium_mg_per_100g"] = f"{milligrams:g}"
        entry["sodium_mg_per_dollar"] = f"{milligrams / price_per_100g:.1f}"
        rows.append(entry)

    # Rank 1 is the lowest-sodium food, which inverts the other studies in the
    # series. The column name says so out loud so nothing extracts it backwards.
    rows.sort(key=lambda r: (float(r["sodium_mg_per_100g"]), r["food"]))
    for position, row in enumerate(rows, start=1):
        row["rank_lowest_sodium_first"] = position

    with OUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    print(f"wrote {OUT.relative_to(ROOT)} with {len(rows)} foods")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
