#!/usr/bin/env python3
"""Refresh derived per-dollar CSVs from the two flagship ranking files.

The flagship files are the source of truth for package price, price_basis, and
grams-per-dollar. Derived study CSVs are slices or joins of those rows. This
script never touches USDA nutrition IDs or nutrient-per-100g columns.

Usage:
  python scripts/sync_derived_per_dollar_from_flagship.py
"""

from __future__ import annotations

import csv
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public" / "data"
MCP = ROOT / "mcp-server" / "data"
DIST = ROOT / "dist-datasets" / "data"

MIRROR_DIRS = [MCP, DIST]

SIMPLE_SLICES = [
    "animal-protein-per-dollar-ranked-2026.csv",
    "canned-vs-dry-beans-cost-2026.csv",
    "dairy-protein-per-dollar-ranked-2026.csv",
    "eggs-vs-everything-protein-value-2026.csv",
    "grains-fiber-per-dollar-ranked-2026.csv",
    "high-fiber-snacks-per-dollar-2026.csv",
    "meat-per-dollar-protein-ranked-2026.csv",
    "no-cook-protein-per-dollar-2026.csv",
    "one-dollar-fiber-what-it-buys-2026.csv",
    "one-dollar-protein-what-it-buys-2026.csv",
    "plant-protein-per-dollar-ranked-2026.csv",
    "produce-fiber-per-dollar-ranked-2026.csv",
    "shelf-stable-pantry-per-dollar-2026.csv",
]

FIBER_SLICES = {
    "grains-fiber-per-dollar-ranked-2026.csv",
    "high-fiber-snacks-per-dollar-2026.csv",
    "one-dollar-fiber-what-it-buys-2026.csv",
    "produce-fiber-per-dollar-ranked-2026.csv",
}


def load_flagship(name: str, metric: str) -> dict[str, dict]:
    path = PUBLIC / name
    by_food: dict[str, dict] = {}
    with path.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            by_food[row["food"]] = {
                "food": row["food"],
                "category": row["category"],
                "value": row[metric],
                "package": row["package"],
                "package_price_usd": row["package_price_usd"],
                "price_basis": row["price_basis"],
                "metric": metric,
                "raw": row,
            }
    return by_food


def merge_basis(flagship_basis: str, existing_basis: str) -> str:
    """Keep derivative-only suffixes such as '; label value (...)'."""
    if ";" not in existing_basis:
        return flagship_basis
    suffix = existing_basis[existing_basis.index(";"):]
    if suffix in flagship_basis:
        return flagship_basis
    return f"{flagship_basis}{suffix}"


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def sync_simple(path: Path, protein: dict, fiber: dict) -> None:
    with path.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        fieldnames = list(reader.fieldnames or [])
        rows = [dict(r) for r in reader]

    catalog = fiber if path.name in FIBER_SLICES else protein

    for row in rows:
        src = catalog.get(row["food"]) or protein.get(row["food"]) or fiber.get(row["food"])
        if not src:
            continue
        row["value"] = src["value"]
        row["package"] = src["package"]
        row["package_price_usd"] = src["package_price_usd"]
        row["price_basis"] = merge_basis(src["price_basis"], row.get("price_basis", ""))
        if "category" in row:
            row["category"] = src["category"]

    rows.sort(key=lambda r: (-float(r["value"]), r["food"]))
    write_csv(path, fieldnames, rows)


def sync_dual(path: Path, protein: dict, fiber: dict) -> None:
    with path.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        fieldnames = list(reader.fieldnames or [])
        rows = [dict(r) for r in reader]

    for row in rows:
        p = protein.get(row["food"])
        f = fiber.get(row["food"])
        if p:
            row["protein_g_per_dollar"] = p["value"]
            row["package"] = p["package"]
            row["package_price_usd"] = p["package_price_usd"]
            row["price_basis"] = merge_basis(p["price_basis"], row.get("price_basis", ""))
        if f and "fiber_g_per_dollar" in row:
            row["fiber_g_per_dollar"] = f["value"]
            if not p:
                row["package"] = f["package"]
                row["package_price_usd"] = f["package_price_usd"]
                row["price_basis"] = merge_basis(f["price_basis"], row.get("price_basis", ""))
        if "value" in row:
            p_val = float(row.get("protein_g_per_dollar") or 0)
            f_val = float(row.get("fiber_g_per_dollar") or 0)
            # beans-double-win and breakfast use combined grams when both exist.
            if path.name.startswith("beans-double-win") and not row.get("fiber_g_per_dollar"):
                row["value"] = f"{p_val:.1f}"
            else:
                row["value"] = f"{round(p_val + f_val, 1)}"
    rows.sort(key=lambda r: (-float(r["value"]), r["food"]))
    write_csv(path, fieldnames, rows)


def sync_quality(path: Path, protein: dict) -> None:
    with path.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        fieldnames = list(reader.fieldnames or [])
        rows = [dict(r) for r in reader]

    for row in rows:
        src = protein.get(row["food"])
        if not src:
            continue
        row["protein_g_per_dollar"] = src["value"]
        capped = float(row["diaas_capped_for_multiplication"])
        row["adjusted_g_per_dollar"] = f"{round(float(src['value']) * capped, 1)}"
    rows.sort(key=lambda r: (-float(r["adjusted_g_per_dollar"]), r["food"]))
    write_csv(path, fieldnames, rows)


def sync_pairs(path: Path, protein: dict) -> None:
    with path.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        fieldnames = list(reader.fieldnames or [])
        rows = [dict(r) for r in reader]

    for row in rows:
        foods = [part.strip() for part in row["food"].split("+")]
        values = []
        missing = False
        for name in foods:
            src = protein.get(name)
            if not src:
                missing = True
                break
            values.append((name, float(src["value"])))
        if missing or len(values) != 2:
            continue
        combo = round((values[0][1] + values[1][1]) / 2, 1)
        row["value"] = f"{combo}"
        row["price_basis"] = (
            f"50/50 dollar split of audited rows: {values[0][0]} {values[0][1]}, "
            f"{values[1][0]} {values[1][1]}"
        )
    rows.sort(key=lambda r: (-float(r["value"]), r["food"]))
    write_csv(path, fieldnames, rows)


def mirror(rel_name: str) -> None:
    src = PUBLIC / rel_name
    for dest_dir in MIRROR_DIRS:
        dest = dest_dir / rel_name
        if dest.exists():
            shutil.copyfile(src, dest)


def main() -> int:
    protein = load_flagship("protein-per-dollar-2026.csv", "protein_g_per_dollar")
    fiber = load_flagship("fiber-per-dollar-2026.csv", "fiber_g_per_dollar")

    for name in SIMPLE_SLICES:
        path = PUBLIC / name
        if path.exists():
            sync_simple(path, protein, fiber)
            print(f"synced {name}")

    for name in (
        "beans-double-win-fiber-protein-2026.csv",
        "breakfast-staples-per-dollar-2026.csv",
    ):
        path = PUBLIC / name
        if path.exists():
            sync_dual(path, protein, fiber)
            print(f"synced {name}")

    quality = PUBLIC / "protein-quality-per-dollar-2026.csv"
    if quality.exists():
        sync_quality(quality, protein)
        print("synced protein-quality-per-dollar-2026.csv")

    pairs = PUBLIC / "cheapest-complete-protein-pairs-2026.csv"
    if pairs.exists():
        sync_pairs(pairs, protein)
        print("synced cheapest-complete-protein-pairs-2026.csv")

    # Mirror every public CSV the foundation checks, including flagships.
    for csv_path in sorted(PUBLIC.glob("*.csv")):
        mirror(csv_path.name)

    print("mirrored public/data CSVs to mcp-server/data and dist-datasets/data")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
