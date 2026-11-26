"""Chain comparison chart for the fast-food protein and fiber finder.

Left panel: best protein grams per dollar in fastfood-protein-per-dollar-2026.csv.
Right panel: highest fiber grams in high-fiber-fast-food-2026.csv.
A missing bar means that file has no row for the chain.
The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "fastfood-protein-per-dollar-2026.csv"
FIBER = ROOT / "public" / "data" / "high-fiber-fast-food-2026.csv"
OUT = ROOT / "public" / "images" / "fast-food-protein-and-fiber-finder-chart.jpg"

CHAINS = [
    "Chipotle",
    "Wendy's",
    "Taco Bell",
    "McDonald's",
    "KFC",
    "Chick-fil-A",
    "Subway",
    "Cava",
    "Panera",
    "Popeyes",
    "El Pollo Loco",
    "Dunkin'",
    "Starbucks",
]
ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"


def best_by_chain(path, field):
    winners = {}
    for row in csv.DictReader(path.open(encoding="utf-8")):
        chain = row["chain"]
        value = float(row[field])
        current = winners.get(chain)
        if current is None or value > float(current[field]):
            winners[chain] = row
    return winners


def draw(ax, chains, winners, field, color, xlabel):
    positions = list(range(len(chains)))
    ceiling = 0.0
    for index, chain in enumerate(chains):
        row = winners.get(chain)
        if row is None:
            ax.text(0.02, index, "no row", va="center", color=MUTED, fontsize=8)
            continue
        value = float(row[field])
        ceiling = max(ceiling, value)
        ax.barh(index, value, color=color, height=0.62)
        ax.text(
            value + 0.15,
            index,
            f"{value:g}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    ax.set_yticks(positions, chains)
    ax.invert_yaxis()
    ax.set_xlim(0, max(ceiling * 1.28, 1))
    ax.set_xlabel(xlabel, color=MUTED, fontsize=9)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=8, colors=SLATE)
    ax.grid(False)
    ax.xaxis.label.set_visible(True)


def main():
    protein = best_by_chain(PROTEIN, "protein_g_per_dollar")
    fiber = best_by_chain(FIBER, "fiber_g")
    unknown = (set(protein) | set(fiber)) - set(CHAINS)
    if unknown:
        raise SystemExit(f"unexpected chains: {sorted(unknown)}")
    chains = [chain for chain in CHAINS if chain in protein or chain in fiber]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(1, 2, figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.14, right=0.98, top=0.74, bottom=0.08, wspace=0.55)
    draw(axes[0], chains, protein, "protein_g_per_dollar", ORANGE, "Best protein grams per dollar")
    draw(axes[1], chains, fiber, "fiber_g", "#B3651B", "Highest fiber grams")
    fig.text(
        0.035,
        0.95,
        "Best Priced Protein and Highest Fiber Order, by Chain",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.885,
        "Left is the priced menu file. Right is the fiber file. No row means that file doesn't have the chain.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.02,
        "Data: fastfood-protein-per-dollar-2026.csv and high-fiber-fast-food-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=100, format="jpeg", facecolor="white", pil_kwargs={"quality": 90})
    plt.close(fig)


if __name__ == "__main__":
    main()
