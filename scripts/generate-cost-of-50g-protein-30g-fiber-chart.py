"""Grouped bar chart for the combined protein-and-fiber day page.

Bar lengths are the day totals in public/data/protein-day-cost-2026.csv and
public/data/fiber-day-cost-2026.csv. Do not hardcode them.
"""

import csv
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-day-cost-2026.csv"
FIBER = ROOT / "public" / "data" / "fiber-day-cost-2026.csv"
OUT = ROOT / "public" / "images" / "cost-of-50g-protein-and-30g-fiber-per-day-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
DARK = "#2F3542"
MUTED = "#697386"

# Day 3 is a meat-cook protein menu and a fresh-produce fiber menu.
LABELS = {
    "1": "Rock-bottom\ndry goods",
    "2": "No-cook\nconvenience",
    "3": "Day 3\nmeat / produce",
    "4": "Restaurant\nday",
    "5": "Realistic\nmixed",
}


def day_totals(path, gram_column):
    totals = defaultdict(lambda: Decimal("0"))
    with path.open(newline="") as handle:
        for row in csv.DictReader(handle):
            number = row["day"].split(":", 1)[0].removeprefix("Day ").strip()
            totals[number] += Decimal(row["cost_usd"])
            if not row[gram_column]:
                continue
    if set(totals) != set(LABELS):
        raise SystemExit(f"{path.name} days {sorted(totals)} != {sorted(LABELS)}")
    return totals


def main():
    protein = day_totals(PROTEIN, "protein_g")
    fiber = day_totals(FIBER, "fiber_g")
    keys = ["1", "2", "3", "4", "5"]
    protein_values = [float(protein[key]) for key in keys]
    fiber_values = [float(fiber[key]) for key in keys]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 7.2), dpi=120)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.16, right=0.96, top=0.78, bottom=0.14)

    import numpy as np

    positions = np.arange(len(keys))
    width = 0.36
    protein_bars = ax.bar(
        positions - width / 2,
        protein_values,
        width,
        color=ORANGE,
        label="50 g protein day",
    )
    fiber_bars = ax.bar(
        positions + width / 2,
        fiber_values,
        width,
        color=SLATE,
        label="30 g fiber day",
    )
    ax.set_xticks(positions, [LABELS[key] for key in keys], fontsize=11, color=DARK)
    ax.set_ylabel("Cost of the priced foods (USD)", color=DARK, fontsize=12)
    ax.tick_params(axis="y", colors=MUTED)
    ax.spines[:].set_visible(False)
    ax.yaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    ceiling = max(protein_values + fiber_values) * 1.16
    ax.set_ylim(0, ceiling)
    for bars in (protein_bars, fiber_bars):
        for bar in bars:
            value = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                value + ceiling * 0.012,
                f"${value:.2f}",
                ha="center",
                va="bottom",
                color=DARK,
                fontsize=10,
                fontweight="bold",
            )
    ax.legend(frameon=False, loc="upper left", fontsize=11)
    fig.text(
        0.06,
        0.94,
        "What a 50 g protein day and a 30 g fiber day cost",
        color=DARK,
        fontsize=20,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.885,
        "Separate menus from the two day-cost files. Day 3 is not the same basket.",
        color=MUTED,
        fontsize=12,
        va="top",
    )
    fig.text(
        0.5,
        0.03,
        "Data: protein-day-cost-2026.csv and fiber-day-cost-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    fig.savefig(OUT, format="jpg")
    plt.close(fig)
    print(OUT)


if __name__ == "__main__":
    main()
