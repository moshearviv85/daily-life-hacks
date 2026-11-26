"""Grams-per-dollar chart for the no-cook protein and snack explorer.

Bar length is the published value in no-cook-protein-per-dollar-2026.csv
or high-fiber-snacks-per-dollar-2026.csv. The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "no-cook-protein-per-dollar-2026.csv"
FIBER = ROOT / "public" / "data" / "high-fiber-snacks-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "no-cook-protein-and-high-fiber-snacks-index-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
DARK = "#2F3542"
MUTED = "#697386"

# Leaders named in the page. Protein rows come from the no-cook file.
# Fiber rows come from the snack file. Peanuts appear twice on purpose.
POINTS = [
    ("Peanut butter", "protein", "50.7", "Peanut butter, protein"),
    ("Popcorn kernels", "fiber", "51.3", "Popcorn kernels, fiber"),
    ("Dry roasted peanuts", "protein", "39.8", "Dry roasted peanuts, protein"),
    ("Greek yogurt (plain, nonfat)", "protein", "27.5", "Greek yogurt, protein"),
    ("Cottage cheese (4%)", "protein", "26.3", "Cottage cheese, protein"),
    ("Canned tuna (chunk light, in water)", "protein", "22.4", "Canned tuna, protein"),
    ("Carrots (whole, bagged)", "fiber", "16.1", "Carrots, fiber"),
    ("Dry roasted peanuts", "fiber", "13.7", "Dry roasted peanuts, fiber"),
]


def load(path: Path) -> dict[str, str]:
    with path.open(newline="", encoding="utf-8") as handle:
        return {row["food"]: row["value"] for row in csv.DictReader(handle)}


def main() -> None:
    protein = load(PROTEIN)
    fiber = load(FIBER)
    if len(protein) != 15:
        raise SystemExit(f"{PROTEIN.name} has {len(protein)} foods")
    if len(fiber) != 10:
        raise SystemExit(f"{FIBER.name} has {len(fiber)} foods")

    rows = []
    for food, kind, expected, label in POINTS:
        source = protein if kind == "protein" else fiber
        actual = source.get(food)
        if actual != expected:
            raise SystemExit(f"{food} {kind} {actual} != {expected}")
        rows.append((label, kind, float(actual)))
    rows.sort(key=lambda item: item[2])

    labels = [item[0] for item in rows]
    values = [item[2] for item in rows]
    colors = [ORANGE if item[1] == "protein" else SLATE for item in rows]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.28, right=0.96, top=0.76, bottom=0.14)
    positions = list(range(len(rows)))
    bars = ax.barh(positions, values, color=colors, height=0.62)
    ceiling = max(values) * 1.18
    ax.set_xlim(0, ceiling)
    ax.set_yticks(positions, labels, fontsize=11, color=DARK)
    ax.tick_params(axis="x", colors=MUTED, labelsize=9)
    ax.spines[:].set_visible(False)
    ax.xaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    ax.set_xlabel("Grams per dollar", color=MUTED, fontsize=10)
    for bar, value in zip(bars, values):
        ax.text(
            value + ceiling * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}",
            va="center",
            ha="left",
            color=DARK,
            fontsize=10,
            fontweight="bold",
        )
    ax.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Protein g per $1, no-cook file"),
            Patch(facecolor=SLATE, label="Fiber g per $1, snack file"),
        ],
        frameon=False,
        loc="lower right",
        fontsize=10,
    )
    fig.text(
        0.05,
        0.95,
        "No-Cook Protein and Snack Fiber, Grams per Dollar",
        color=DARK,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.05,
        0.885,
        "Orange is the no-cook protein file. Slate is the snack fiber file. Eggs are on neither.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "Data: no-cook-protein-per-dollar-2026.csv and high-fiber-snacks-per-dollar-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, format="jpg")
    plt.close(fig)
    print(OUT)


if __name__ == "__main__":
    main()
