"""Batch cost versus fridge days for the pantry storage planner.

Costs are 1,400 g of protein (4 people, 50 g, 7 days) divided by the
protein-per-dollar `value` column. Fridge days are the published rows,
not a new estimate. Do not hardcode the bar lengths.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PANTRY = ROOT / "public" / "data" / "shelf-stable-pantry-per-dollar-2026.csv"
MEAT = ROOT / "public" / "data" / "meat-per-dollar-protein-ranked-2026.csv"
OUT = ROOT / "public" / "images" / "pantry-meal-cost-and-storage-planner-chart.jpg"

PROTEIN_G = 4 * 50 * 7
ORANGE = "#F29B30"
SLATE = "#334155"
AMBER = "#C47A1A"
DEEP = "#7C4A12"
MUTED = "#64748B"
DAY_COLOR = {2: SLATE, 4: ORANGE, 5: AMBER, 6: DEEP}

# food, file key, fridge days shown, label
POINTS = [
    ("Chicken drumsticks (bone-in)", "meat", 2, "Raw drumsticks"),
    ("Ground beef (80/20)", "meat", 2, "Raw ground beef"),
    ("Brown lentils (dry)", "pantry", 4, "Cooked lentils"),
    ("Black beans (dry)", "pantry", 4, "Cooked dry black beans"),
    ("Chicken drumsticks (bone-in)", "meat", 4, "Cooked drumsticks"),
    ("Canned black beans", "pantry", 4, "Opened canned black beans"),
    ("Chicken breast (boneless, skinless)", "meat", 4, "Cooked chicken breast"),
    ("Ground beef (80/20)", "meat", 4, "Cooked ground beef"),
    ("Pork shoulder butt roast (boneless)", "meat", 5, "Raw pork shoulder"),
    ("Whole wheat spaghetti", "pantry", 5, "Cooked spaghetti, FoodKeeper upper day"),
    ("Brown rice (dry)", "pantry", 6, "Cooked brown rice, FoodKeeper upper day"),
]


def load(path: Path) -> dict[str, dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return {row["food"]: row for row in csv.DictReader(handle)}


def main() -> None:
    files = {"pantry": load(PANTRY), "meat": load(MEAT)}
    if len(files["pantry"]) != 27:
        raise SystemExit(f"expected 27 pantry rows, found {len(files['pantry'])}")
    if len(files["meat"]) != 11:
        raise SystemExit(f"expected 11 meat rows, found {len(files['meat'])}")

    points = []
    for food, source, days, label in POINTS:
        row = files[source].get(food)
        if row is None:
            raise SystemExit(f"missing {food}")
        per_dollar = float(row["value"])
        if per_dollar <= 0:
            raise SystemExit(f"bad value for {food}")
        points.append((days, PROTEIN_G / per_dollar, label))
    points.sort(key=lambda item: (item[0], item[1]))

    labels = [f"{label}  ·  {days} fridge days" for days, _cost, label in points]
    costs = [cost for _days, cost, _label in points]
    colors = [DAY_COLOR[days] for days, _cost, _label in points]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.42, right=0.96, top=0.76, bottom=0.14)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, costs, color=colors, height=0.68)
    ax.set_yticks(positions, labels, fontsize=8)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, colors=SLATE)
    ax.set_xlim(0, max(costs) * 1.18)
    for bar, cost in zip(bars, costs, strict=True):
        ax.text(
            cost + max(costs) * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"${cost:.2f}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.text(
        0.04,
        0.96,
        "7-day batch cost vs fridge days",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.04,
        0.905,
        "4 people, 50 g protein, 7 days. 1,400 g divided by protein per dollar. Not a photograph.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=SLATE, label="2 fridge days"),
            Patch(facecolor=ORANGE, label="4 fridge days"),
            Patch(facecolor=AMBER, label="5 fridge days"),
            Patch(facecolor=DEEP, label="6 fridge days"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.42, 0.84),
        ncol=4,
        fontsize=8,
    )
    fig.text(
        0.5,
        0.035,
        "Pasta day 5 and rice day 6 are FoodKeeper upper days. The planner still warns at day 4.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.text(
        0.5,
        0.012,
        "shelf-stable-pantry-per-dollar-2026.csv  ·  meat-per-dollar-protein-ranked-2026.csv  ·  daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(OUT)


if __name__ == "__main__":
    main()
