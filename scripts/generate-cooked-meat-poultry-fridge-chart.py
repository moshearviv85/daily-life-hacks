"""Fridge and freezer windows plus the cost of 30 g of protein.

Storage windows are the FoodSafety.gov cold-storage chart (reviewed
September 19, 2023): cooked meat or poultry leftovers, raw poultry,
raw ground meat, and raw beef or pork chops and roasts. Freezer months
are quality at 0°F, not a safety cutoff.

The dollar bars are 30 divided by protein grams per dollar in
meat-per-dollar-protein-ranked-2026.csv, rounded half up to the cent.
Do not hardcode those prices.
"""

from __future__ import annotations

import csv
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MEAT = ROOT / "public" / "data" / "meat-per-dollar-protein-ranked-2026.csv"
OUT = (
    ROOT
    / "public"
    / "images"
    / "how-long-do-cooked-meat-and-poultry-last-in-the-fridge-chart.jpg"
)

ORANGE = "#F29B30"
LIGHT = "#F8D3A5"
SLATE = "#334155"
MUTED = "#64748B"
GRID = "#E7E9ED"

# (label, min, max) in days or months, from the cold-storage chart.
FRIDGE = [
    ("Raw poultry, ground", 1, 2),
    ("Cooked meat, poultry", 3, 4),
    ("Raw chops, roasts", 3, 5),
]
FREEZER = [
    ("Cooked leftovers", 2, 6),
    ("Raw ground meat", 3, 4),
    ("Poultry pieces", 9, 9),
    ("Raw chops, roasts", 4, 12),
]
COST_FOODS = [
    "Chicken drumsticks (bone-in)",
    "Chicken thighs (boneless, skinless)",
    "Rotisserie chicken (whole, cooked)",
    "Pork shoulder butt roast (boneless)",
    "Chicken breast (boneless, skinless)",
    "Pork loin chops (boneless)",
    "Ground turkey (93/7)",
    "Ground beef (80/20)",
]
SHORT = {
    "Chicken drumsticks (bone-in)": "Drumsticks",
    "Chicken thighs (boneless, skinless)": "Thighs",
    "Rotisserie chicken (whole, cooked)": "Rotisserie",
    "Pork shoulder butt roast (boneless)": "Pork shoulder",
    "Chicken breast (boneless, skinless)": "Chicken breast",
    "Pork loin chops (boneless)": "Pork chops",
    "Ground turkey (93/7)": "Ground turkey",
    "Ground beef (80/20)": "Ground beef 80/20",
}


def half_up(value: Decimal, places: str) -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def load_costs() -> list[tuple[str, Decimal]]:
    with MEAT.open(encoding="utf-8", newline="") as handle:
        rows = {row["food"]: row for row in csv.DictReader(handle)}
    costs = []
    for food in COST_FOODS:
        grams = Decimal(rows[food]["value"])
        costs.append((SHORT[food], half_up(Decimal("30") / grams, "0.01")))
    return costs


def range_bars(ax, rows: list[tuple[str, int, int]], xlabel: str) -> None:
    labels = [row[0] for row in rows]
    positions = list(range(len(labels)))
    for position, (_label, minimum, maximum) in zip(positions, rows, strict=True):
        ax.barh(position, minimum, color=ORANGE, height=0.55)
        if maximum > minimum:
            ax.barh(
                position,
                maximum - minimum,
                left=minimum,
                color=LIGHT,
                edgecolor=ORANGE,
                linewidth=1.2,
                height=0.55,
            )
        ax.text(
            maximum + 0.15,
            position,
            f"{minimum} to {maximum}" if maximum != minimum else str(minimum),
            va="center",
            fontsize=10,
            fontweight="bold",
            color=SLATE,
        )
    ax.set_yticks(positions, labels=labels, fontsize=10, color=SLATE)
    ax.invert_yaxis()
    ax.set_xlabel(xlabel, fontsize=9, color=MUTED)
    peak = max(row[2] for row in rows)
    ax.set_xlim(0, peak * 1.45)
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", colors=MUTED, labelsize=8)
    ax.tick_params(axis="y", length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)


def main() -> None:
    costs = load_costs()
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(
        1,
        3,
        figsize=(12, 6.75),
        dpi=100,
        gridspec_kw={"width_ratios": [1.15, 1.05, 1.15]},
    )
    fig.patch.set_facecolor("white")
    range_bars(axes[0], FRIDGE, "Refrigerator days at 40°F or below")
    range_bars(axes[1], FREEZER, "Freezer months at 0°F, quality only")

    ax = axes[2]
    ax.set_facecolor("white")
    labels = [name for name, _cost in costs]
    values = [float(cost) for _name, cost in costs]
    positions = list(range(len(labels)))
    ax.barh(positions, values, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels=labels, fontsize=9, color=SLATE)
    ax.invert_yaxis()
    ax.set_xlabel("Dollars per 30 g protein", fontsize=9, color=MUTED)
    peak = max(values)
    ax.set_xlim(0, peak * 1.38)
    for position, cost in enumerate(costs):
        ax.text(
            float(cost[1]) + peak * 0.03,
            position,
            f"${cost[1]:.2f}",
            va="center",
            fontsize=9,
            fontweight="bold",
            color=SLATE,
        )
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", colors=MUTED, labelsize=8)
    ax.tick_params(axis="y", length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)

    fig.text(
        0.02,
        0.97,
        "Cooked Meat and Poultry: Fridge Clock and Cost",
        fontsize=18,
        fontweight="bold",
        color=SLATE,
        va="top",
    )
    fig.text(
        0.02,
        0.925,
        "Cold-storage windows beside what 30 grams of protein costs in the 2026 meat file. Lighter bar is the extra days or months.",
        fontsize=10,
        color=MUTED,
        va="top",
    )
    fig.text(
        0.5,
        0.015,
        "Windows: FoodSafety.gov cold-storage chart. Dollars: meat-per-dollar-protein-ranked-2026.csv, 30 g divided by grams per dollar. Not a photograph.",
        ha="center",
        fontsize=8,
        color=MUTED,
    )
    fig.subplots_adjust(left=0.14, right=0.98, top=0.82, bottom=0.14, wspace=0.62)
    fig.savefig(
        OUT,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)
    print(OUT)
    for name, cost in costs:
        print(f"{name}\t${cost}")


if __name__ == "__main__":
    main()
