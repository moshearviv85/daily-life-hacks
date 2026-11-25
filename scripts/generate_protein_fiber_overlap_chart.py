"""Chart for the protein-and-fiber overlap table.

Protein grams per dollar and fiber grams per dollar are read from the July 2026
CSVs at render time. The bar is their sum. Do not hardcode the gram values.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images"
ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# CSV food name, short chart label. Order in the article table matches this list.
FOODS = [
    ("Green split peas (dry)", "Green split peas"),
    ("Brown lentils (dry)", "Brown lentils"),
    ("Black beans (dry)", "Black beans"),
    ("Pinto beans (dry)", "Pinto beans"),
    ("Chickpeas (dry)", "Chickpeas"),
    ("Old-fashioned rolled oats", "Rolled oats"),
    ("Peanut butter", "Peanut butter"),
    ("Almonds", "Almonds"),
]


def setup() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.titlesize": 23,
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )


def load(name: str) -> dict[str, dict[str, str]]:
    rows = list(csv.DictReader((DATA / name).open(encoding="utf-8")))
    return {row["food"]: row for row in rows}


def combined_rows() -> list[tuple[str, float]]:
    protein = load("protein-per-dollar-2026.csv")
    fiber = load("fiber-per-dollar-2026.csv")
    ranked = []
    for food, label in FOODS:
        if food not in protein or food not in fiber:
            raise SystemExit(f"missing {food} in one of the July 2026 CSVs")
        if protein[food]["fdc_id"] != fiber[food]["fdc_id"]:
            raise SystemExit(f"{food} FDC ids disagree")
        total = float(protein[food]["protein_g_per_dollar"]) + float(
            fiber[food]["fiber_g_per_dollar"]
        )
        ranked.append((label, total))
    ranked.sort(key=lambda item: item[1], reverse=True)
    return ranked


def main() -> None:
    setup()
    OUT.mkdir(parents=True, exist_ok=True)
    ranked = combined_rows()
    labels = [label for label, _value in ranked]
    values = [value for _label, value in ranked]

    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.24, right=0.94, top=0.78, bottom=0.12)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.93,
        "Protein Plus Fiber per Dollar",
        color=SLATE,
        fontsize=25,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.855,
        "Eight dry foods on both July 2026 lists. Protein grams plus fiber grams per dollar.",
        color=MUTED,
        fontsize=12,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=12)
    ax.grid(False)
    ax.set_xlim(0, max(values) * 1.22)
    for bar, value in zip(bars, values):
        ax.text(
            value + max(values) * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f} g",
            va="center",
            color=SLATE,
            fontsize=12,
            fontweight="bold",
        )
    fig.text(
        0.5,
        0.03,
        "Data: USDA FoodData Central and the July 2026 price basket | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    name = "high-protein-high-fiber-meals-for-weight-loss-chart.jpg"
    fig.savefig(OUT / name, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote public/images/{name}")
    for label, value in ranked:
        print(f"  {value:.1f}  {label}")


if __name__ == "__main__":
    main()
