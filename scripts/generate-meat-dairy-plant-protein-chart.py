"""Grouped bar chart for the meat, dairy, and plant protein index.

Values are the `value` column (protein grams per dollar) from the three
category CSVs. The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / "public" / "data" / "meat-per-dollar-protein-ranked-2026.csv",
    ROOT / "public" / "data" / "dairy-protein-per-dollar-ranked-2026.csv",
    ROOT / "public" / "data" / "plant-protein-per-dollar-ranked-2026.csv",
]
OUT = ROOT / "public" / "images" / "meat-dairy-and-plant-protein-index-chart.jpg"

ORANGE = "#F29B30"
DEEP = "#C47A22"
SLATE = "#334155"
MUTED = "#64748B"
RANKS = ["Best in the category", "Second", "Third"]
COLORS = [ORANGE, DEEP, SLATE]


def load():
    grouped = defaultdict(list)
    for path in FILES:
        for row in csv.DictReader(path.open(encoding="utf-8")):
            grouped[row["category"]].append(row)
    if not grouped:
        raise SystemExit("no protein rows")
    for rows in grouped.values():
        rows.sort(key=lambda row: (-float(row["value"]), row["food"]))
    categories = sorted(grouped, key=lambda name: -float(grouped[name][0]["value"]))
    return categories, grouped


def main():
    categories, grouped = load()
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.28, right=0.96, top=0.74, bottom=0.12)
    positions = list(range(len(categories)))
    offsets = [0.26, 0, -0.26]
    ceiling = 0.0
    for rank, offset, color in zip(range(3), offsets, COLORS):
        values = []
        for name in categories:
            rows = grouped[name]
            values.append(float(rows[rank]["value"]) if rank < len(rows) else 0.0)
        ceiling = max(ceiling, max(values))
        drawn = ax.barh(
            [pos + offset for pos in positions],
            values,
            height=0.24,
            color=color,
            label=RANKS[rank],
        )
        for bar, value in zip(drawn, values):
            if value <= 0:
                continue
            ax.text(
                value + ceiling * 0.012,
                bar.get_y() + bar.get_height() / 2,
                f"{value:g}",
                va="center",
                color=SLATE,
                fontsize=8,
                fontweight="bold",
            )
    ax.set_yticks(positions, categories)
    ax.invert_yaxis()
    ax.set_xlim(0, ceiling * 1.16)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=10, colors=SLATE)
    ax.grid(False)
    ax.legend(
        handles=[Patch(facecolor=color, edgecolor="none", label=label) for color, label in zip(COLORS, RANKS)],
        frameon=False,
        ncol=3,
        loc="lower right",
        fontsize=9,
    )
    fig.text(
        0.035,
        0.95,
        "Protein Grams per Dollar, Top Three in Each Category",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.885,
        "Grouped bars from the meat, dairy, and plant files. Flour is not in these files.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.03,
        "Data: meat, dairy, and plant protein-per-dollar CSVs | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=100, format="jpeg", facecolor="white", pil_kwargs={"quality": 90})
    plt.close(fig)


if __name__ == "__main__":
    main()
