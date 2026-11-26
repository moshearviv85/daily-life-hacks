"""Per-jar protein, fiber, and cost for the overnight oats recipe.

Gram weights are one jar (the 4-jar batch divided by 4). Nutrients come from
src/data/fdc-cache.json. Prices come from the first matching row in
public/data/fiber-per-dollar-2026.csv, then protein-per-dollar-2026.csv,
the same order as src/lib/recipe-cost.mjs.
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
OUT = ROOT / "public" / "images" / "high-protein-overnight-oats-chia-greek-yogurt-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
BATCH = 4

# Batch grams, then divided by BATCH so the bars are one jar.
LINES = [
    ("170894", "Greek yogurt", 680),
    ("173904", "Rolled oats", 200),
    ("170554", "Chia seeds", 60),
    ("174266", "Peanut butter", 80),
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


def main() -> None:
    cache = json.loads(CACHE.read_text(encoding="utf-8"))["foods"]
    fiber_prices = load_prices(FIBER)
    protein_prices = load_prices(PROTEIN)
    labels: list[str] = []
    protein: list[float] = []
    fiber: list[float] = []
    costs: list[float] = []

    for fdc_id, label, batch_grams in LINES:
        food = cache[fdc_id]
        per = food["nutrientsPer100g"]
        jar_grams = batch_grams / BATCH
        row = fiber_prices.get(fdc_id) or protein_prices.get(fdc_id)
        if row is None:
            raise SystemExit(f"{fdc_id} has no price row")
        cost = jar_grams * price_per_gram(row)
        labels.append(f"{label}  ${cost:.2f}")
        protein.append(jar_grams * float(per["protein"]) / 100)
        fiber.append(jar_grams * float(per["fiber"] or 0) / 100)
        costs.append(cost)

    jar_cost = sum(costs)
    if round(jar_cost, 2) != 1.01:
        raise SystemExit(f"jar cost {jar_cost:.4f} is not $1.01")

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.28, right=0.96, top=0.76, bottom=0.16)
    positions = list(range(len(labels)))
    height = 0.36
    ax.barh(
        [pos + height / 2 for pos in positions],
        protein,
        height=height,
        color=ORANGE,
        label="Protein, grams",
    )
    ax.barh(
        [pos - height / 2 for pos in positions],
        fiber,
        height=height,
        color=SLATE,
        label="Fiber, grams",
    )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.legend(frameon=False, loc="lower right")
    fig.text(
        0.035,
        0.93,
        "One Jar of Overnight Oats",
        color=SLATE,
        fontsize=24,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.855,
        "30.8 g protein, 11.2 g fiber, $1.01. Costs on the labels are rounded to the cent.",
        color=MUTED,
        fontsize=12,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="y", length=0, labelsize=12)
    ax.set_xlabel("Grams in one jar")
    widest = max(protein + fiber)
    ax.set_xlim(0, widest * 1.18)
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
