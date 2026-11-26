"""Bar chart for the FDA fiber and protein label checker.

Fiber grams per 100 g come from public/data/fiber-per-dollar-2026.csv.
The vertical lines are the 21 CFR 101.54 gram gates on the 28 g fiber DRV
in 21 CFR 101.9(c)(9): 10 percent is 2.8 g, 19 percent is 5.32 g, and
20 percent is 5.6 g. Those lines are per reference amount, not per 100 g.
The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "fda-fiber-and-protein-label-checker-chart.jpg"

FOODS = [
    "Strawberries",
    "Bananas",
    "Carrots (whole, bagged)",
    "Brown rice (dry)",
    "Blackberries",
    "100% whole wheat bread",
]
GOOD_MIN = 2.8
GOOD_MAX = 5.32
HIGH_MIN = 5.6
ORANGE = "#F29B30"
DEEP = "#B3651B"
SLATE = "#334155"
MUTED = "#64748B"
GAP = "#7C5E3C"


def load():
    rows = {row["food"]: row for row in csv.DictReader(CSV.open(encoding="utf-8"))}
    chosen = []
    for name in FOODS:
        if name not in rows:
            raise SystemExit(f"missing {name} in fiber-per-dollar-2026.csv")
        if rows[name]["nutrition_source_status"] != "exact":
            raise SystemExit(f"{name} is not an exact USDA row")
        fiber = float(rows[name]["fiber_g_per_100g"])
        chosen.append((name, fiber))
    return chosen


def color_for(fiber: float) -> str:
    if fiber >= HIGH_MIN:
        return DEEP
    if GOOD_MIN <= fiber <= GOOD_MAX:
        return ORANGE
    if GOOD_MAX < fiber < HIGH_MIN:
        return GAP
    return MUTED


def main():
    chosen = load()
    labels = [name for name, _fiber in chosen]
    values = [fiber for _name, fiber in chosen]
    colors = [color_for(fiber) for fiber in values]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.30, right=0.96, top=0.72, bottom=0.14)
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, values, color=colors, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    for line in (GOOD_MIN, GOOD_MAX, HIGH_MIN):
        ax.axvline(line, color=SLATE, linestyle="--", linewidth=1.0)
    # 5.32 g and 5.6 g sit close together, so their captions stay on opposite sides.
    ax.text(GOOD_MIN, -0.78, "10%\n2.8 g", ha="center", va="bottom", color=SLATE, fontsize=8)
    ax.text(GOOD_MAX - 0.06, -0.78, "19%\n5.32 g", ha="right", va="bottom", color=SLATE, fontsize=8)
    ax.text(HIGH_MIN + 0.06, -0.78, "20%\n5.6 g", ha="left", va="bottom", color=SLATE, fontsize=8)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11, colors=SLATE)
    ax.set_xlim(0, 8.2)
    ax.grid(False)
    for bar, value in zip(drawn, values):
        label = f"{value:g} g"
        if value >= 5.2:
            ax.text(
                value - 0.15,
                bar.get_y() + bar.get_height() / 2,
                label,
                va="center",
                ha="right",
                color="white",
                fontsize=11,
                fontweight="bold",
            )
        else:
            ax.text(
                value + 0.12,
                bar.get_y() + bar.get_height() / 2,
                label,
                va="center",
                color=SLATE,
                fontsize=11,
                fontweight="bold",
            )
    fig.text(
        0.035,
        0.94,
        "Fiber per 100 Grams Next to the FDA Claim Lines",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.875,
        "Dashed lines are the 21 CFR 101.54 gates on the 28 g fiber Daily Value. Bars are grams per 100 g.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "Data: fiber-per-dollar-2026.csv | USDA FoodData Central | Chart, not a photograph | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=100, format="jpeg", facecolor="white", pil_kwargs={"quality": 90})
    plt.close(fig)


if __name__ == "__main__":
    main()
