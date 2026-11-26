"""Protein per serving for the sheet-pan chicken and chickpeas recipe.

Gram weights are one serving (the 4-serving batch divided by 4). Nutrients
come from src/data/fdc-cache.json. Chicken, sweet potato, and broccoli prices
come from the first matching row in fiber-per-dollar-2026.csv, then
protein-per-dollar-2026.csv, the same order as src/lib/recipe-cost.mjs.

The drained chickpea record (FDC 173801) is not a priced row. The can price
is the whole $0.98 can on the undrained canned-chickpeas row (FDC 175206).
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "src" / "data" / "fdc-cache.json"
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "sheet-pan-chicken-thighs-and-chickpeas-high-protein-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
BATCH = 4

# Nutrient FDC, label, batch grams, price FDC. CAN means one undrained can.
LINES = [
    ("173627", "Chicken thighs", 570, "173627"),
    ("173801", "Chickpeas, drained", 254, "CAN"),
    ("168482", "Sweet potatoes", 400, "168482"),
    ("170379", "Broccoli", 300, "170379"),
]


def load_prices(path: Path) -> dict[str, dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = {}
        for row in csv.DictReader(handle):
            fdc_id = (row.get("fdc_id") or "").strip()
            if fdc_id and fdc_id not in rows:
                rows[fdc_id] = row
        return rows


def price_per_gram(row: dict[str, str]) -> float:
    grams = float(row["package_weight_g"]) * float(row["edible_fraction"] or 1)
    return float(row["package_price_usd"]) / grams


def cents(value: float) -> str:
    # Match JS Number#toFixed half-up for positive amounts.
    return f"{int(value * 100 + 0.5) / 100:.2f}"


def main() -> None:
    cache = json.loads(CACHE.read_text(encoding="utf-8"))["foods"]
    fiber_prices = load_prices(FIBER)
    protein_prices = load_prices(PROTEIN)
    can = protein_prices["175206"]
    if can["food"] != "Canned chickpeas":
        raise SystemExit(f"unexpected chickpea price row: {can['food']}")
    if float(can["package_price_usd"]) != 0.98:
        raise SystemExit(f"can price moved: {can['package_price_usd']}")

    labels: list[str] = []
    protein: list[float] = []
    costs: list[float] = []

    for fdc_id, label, batch_grams, price_id in LINES:
        food = cache[fdc_id]
        per = food["nutrientsPer100g"]
        serving_grams = batch_grams / BATCH
        if price_id == "CAN":
            cost = float(can["package_price_usd"]) / BATCH
        else:
            row = fiber_prices.get(price_id) or protein_prices.get(price_id)
            if row is None:
                raise SystemExit(f"{price_id} has no price row")
            cost = serving_grams * price_per_gram(row)
        labels.append(f"{label}  ${cents(cost)}")
        protein.append(serving_grams * float(per["protein"]) / 100)
        costs.append(cost)

    plate = sum(costs)
    if cents(plate) != "1.79":
        raise SystemExit(f"priced plate {plate:.4f} is not $1.79")

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.32, right=0.96, top=0.76, bottom=0.16)
    positions = list(range(len(labels)))
    ax.barh(positions, protein, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.93,
        "Protein on the Sheet Pan",
        color=SLATE,
        fontsize=24,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.855,
        "Grams of protein in one serving. Labels are each cost rounded to the cent. Unrounded sum is $1.79.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="y", length=0, labelsize=12)
    ax.set_xlabel("Protein, grams per serving")
    ax.set_xlim(0, max(protein) * 1.18)
    fig.text(
        0.5,
        0.035,
        "Chart rendered from fdc-cache.json, fiber-per-dollar-2026.csv, and protein-per-dollar-2026.csv. Not a photograph. daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
