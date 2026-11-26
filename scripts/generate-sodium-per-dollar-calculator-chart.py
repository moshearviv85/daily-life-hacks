"""Bar chart for the sodium-per-dollar calculator hero.

Values are sodium_mg_per_100g from public/data/sodium-per-dollar-2026.csv.
The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "sodium-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "sodium-per-dollar-calculator-chart.jpg"

FOODS = [
    "Almonds",
    "Black beans (dry)",
    "Frozen shelled edamame",
    "Chicken drumsticks (bone-in)",
    "Canned kidney beans",
    "Cheddar cheese",
]
FDA_LINE = 140
ORANGE = "#F29B30"
DEEP = "#B3651B"
SLATE = "#334155"
MUTED = "#64748B"


def load():
    rows = {row["food"]: row for row in csv.DictReader(CSV.open(encoding="utf-8"))}
    chosen = []
    for name in FOODS:
        if name not in rows:
            raise SystemExit(f"missing {name} in sodium-per-dollar-2026.csv")
        sodium = float(rows[name]["sodium_mg_per_100g"])
        chosen.append((name, sodium))
    return chosen


def main():
    chosen = load()
    labels = [name for name, _sodium in chosen]
    values = [sodium for _name, sodium in chosen]
    colors = [ORANGE if sodium <= FDA_LINE else DEEP for sodium in values]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.32, right=0.95, top=0.78, bottom=0.14)
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, values, color=colors, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.axvline(FDA_LINE, color=MUTED, linestyle="--", linewidth=1.2)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11, colors=SLATE)
    ax.set_xlim(0, max(values) * 1.22)
    ax.grid(False)
    for bar, value in zip(drawn, values):
        label = f"{value:g} mg"
        ax.text(
            value + max(values) * 0.015,
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
        "Sodium per 100 Grams in Six Audited Staples",
        color=SLATE,
        fontsize=20,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.875,
        "Orange is at or under the FDA 140 mg low-sodium line. Deep bars are over it.",
        color=MUTED,
        fontsize=12,
        va="top",
    )
    fig.text(
        0.5,
        0.03,
        "Data: sodium-per-dollar-2026.csv | USDA FoodData Central | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=100, format="jpeg", facecolor="white", pil_kwargs={"quality": 90})
    plt.close(fig)


if __name__ == "__main__":
    main()
