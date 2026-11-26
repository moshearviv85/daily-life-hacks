"""Stacked cost chart for five ~100 g protein grocery days.

Gram portions are the menu template. Every dollar segment is that portion's
protein divided by the published grams-per-dollar rate in
public/data/protein-per-dollar-2026.csv. Dairy and meat ranking files must
carry the same rate when they list the food.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images" / "how-much-100-grams-of-protein-costs-per-day-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
STONE = "#94A3B8"
BROWN = "#9A3412"
MUTED = "#64748B"
COLORS = [ORANGE, SLATE, STONE, BROWN]

# Spec order. The chart sorts by total cost after the rates are applied.
MENUS = [
    (
        "Lentils, PB, oats",
        [
            ("Brown lentils (dry)", 260),
            ("Peanut butter", 80),
            ("Old-fashioned rolled oats", 140),
        ],
    ),
    (
        "Eggs, yogurt, milk, oats",
        [
            ("Eggs (large)", 200),
            ("Greek yogurt (plain, nonfat)", 450),
            ("Whole milk", 488),
            ("Old-fashioned rolled oats", 100),
        ],
    ),
    (
        "Drumsticks, eggs, cottage",
        [
            ("Chicken drumsticks (bone-in)", 250),
            ("Eggs (large)", 150),
            ("Cottage cheese (4%)", 325),
        ],
    ),
    (
        "Breast, tuna, mozzarella",
        [
            ("Chicken breast (boneless, skinless)", 200),
            ("Canned tuna (chunk light, in water)", 113),
            ("Mozzarella (low-moisture part-skim)", 140),
        ],
    ),
    (
        "Beef, cheddar, bacon",
        [
            ("Ground beef (80/20)", 300),
            ("Cheddar cheese", 120),
            ("Bacon", 155),
        ],
    ),
]


def load(name: str) -> dict[str, dict[str, str]]:
    with (DATA / name).open(encoding="utf-8", newline="") as handle:
        return {row["food"]: row for row in csv.DictReader(handle)}


def main() -> None:
    protein = load("protein-per-dollar-2026.csv")
    dairy = load("dairy-protein-per-dollar-ranked-2026.csv")
    meat = load("meat-per-dollar-protein-ranked-2026.csv")

    labels: list[str] = []
    stacks: list[list[float]] = []
    totals: list[float] = []
    for label, parts in MENUS:
        costs: list[float] = []
        for food, grams in parts:
            row = protein[food]
            rate = row["protein_g_per_dollar"]
            if food in dairy and dairy[food]["value"] != rate:
                raise SystemExit(f"{food} dairy rate {dairy[food]['value']} != {rate}")
            if food in meat and meat[food]["value"] != rate:
                raise SystemExit(f"{food} meat rate {meat[food]['value']} != {rate}")
            protein_g = float(row["protein_g_per_100g"]) * grams / 100
            costs.append(protein_g / float(rate))
        labels.append(label)
        stacks.append(costs)
        totals.append(sum(costs))

    order = sorted(range(len(totals)), key=lambda index: (totals[index], labels[index]))
    labels = [labels[index] for index in order]
    stacks = [stacks[index] for index in order]
    totals = [totals[index] for index in order]

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.6), facecolor="white")
    fig.subplots_adjust(left=0.28, right=0.94, top=0.76, bottom=0.12)
    positions = list(range(len(labels)))
    left = [0.0] * len(labels)
    width = max(len(parts) for parts in stacks)
    for segment in range(width):
        amounts = [parts[segment] if segment < len(parts) else 0.0 for parts in stacks]
        ax.barh(
            positions,
            amounts,
            left=left,
            color=COLORS[segment],
            height=0.62,
        )
        left = [base + amount for base, amount in zip(left, amounts)]
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.94,
        "What 100 Grams of Protein Costs",
        color=SLATE,
        fontsize=24,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.855,
        "Five grocery templates near 100 g. Each segment is one food, cheapest day on top.",
        color=MUTED,
        fontsize=12.5,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=12)
    ax.grid(False)
    ax.set_xlim(0, max(totals) * 1.18)
    for position, total in zip(positions, totals):
        ax.text(
            total + max(totals) * 0.015,
            position,
            f"${total:.2f}",
            va="center",
            color=SLATE,
            fontsize=12,
            fontweight="bold",
        )
    fig.text(
        0.5,
        0.03,
        "Chart rendered from protein-per-dollar-2026.csv, checked against the dairy and meat ranking files. Not a photograph. daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8.5,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
