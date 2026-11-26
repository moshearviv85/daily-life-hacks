"""Selenium mcg per NIH serving against the 55 mcg adult RDA.

Values are the NIH Office of Dietary Supplements selenium fact sheet
(Health Professional): yellowfin tuna 92 mcg/3 oz, one Brazil nut
68 to 91 mcg, sardines 45, pork chop 37, spaghetti 33 mcg/cup,
chicken 22, 1% cottage cheese 20, one large egg 15, cooked oatmeal 13,
boiled lentils 6. The 1 oz Brazil nut average is 544 mcg, past the
400 mcg adult UL, so it is not a bar on this axis.

The priced grocery names are checked against protein-per-dollar-2026.csv.
This file is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "selenium-daily-intake-and-cost-calculator-chart.jpg"

# (label, bar mcg, end label). The Brazil nut bar is the 68 mcg low end.
BARS = (
    ("Yellowfin tuna, 3 oz", 92, "92"),
    ("1 Brazil nut, low end", 68, "68 to 91"),
    ("Sardines, 3 oz", 45, "45"),
    ("Pork chop, 3 oz", 37, "37"),
    ("Spaghetti, 1 cup", 33, "33"),
    ("Chicken, 3 oz", 22, "22"),
    ("Cottage cheese, 1 cup", 20, "20"),
    ("1 large egg", 15, "15"),
    ("Oatmeal, 1 cup", 13, "13"),
    ("Lentils, 1 cup", 6, "6"),
)
RDA = 55
PRICED_FOODS = (
    "Sardines (canned in oil, drained)",
    "Spaghetti (regular, dry)",
    "Old-fashioned rolled oats",
    "Brown lentils (dry)",
    "Cottage cheese (4%)",
    "Chicken breast (boneless, skinless)",
    "Pork loin chops (boneless)",
    "Brown rice (dry)",
    "Eggs (large)",
)
ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"


def require_priced_foods() -> None:
    with CSV.open(newline="", encoding="utf-8") as handle:
        names = {row["food"] for row in csv.DictReader(handle)}
    missing = [name for name in PRICED_FOODS if name not in names]
    if missing:
        raise SystemExit(f"protein-per-dollar-2026.csv missing: {', '.join(missing)}")


def main() -> None:
    require_priced_foods()
    labels = [label for label, _mcg, _text in BARS]
    values = [mcg for _label, mcg, _text in BARS]
    texts = [text for _label, _mcg, text in BARS]
    colors = [ORANGE if mcg >= RDA else MUTED for mcg in values]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.28, right=0.96, top=0.74, bottom=0.12)
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, values, color=colors, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.axvline(RDA, color=SLATE, linestyle="--", linewidth=1.1)
    ax.text(RDA + 1.2, -0.72, "55 mcg RDA", color=SLATE, fontsize=9, va="bottom")
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=10, colors=SLATE)
    ax.set_xlim(0, 118)
    ax.grid(False)
    for bar, value, text in zip(drawn, values, texts):
        label = f"{text} mcg"
        # Sardines end at 45 mcg, too close to the 55 line for an outside label.
        if RDA - 16 < value < RDA:
            ax.text(
                value - 1.6,
                bar.get_y() + bar.get_height() / 2,
                label,
                va="center",
                ha="right",
                color="white",
                fontsize=10,
                fontweight="bold",
            )
        else:
            ax.text(
                value + 1.4,
                bar.get_y() + bar.get_height() / 2,
                label,
                va="center",
                color=SLATE,
                fontsize=10,
                fontweight="bold",
            )
    fig.text(
        0.035,
        0.94,
        "Selenium per NIH Serving, Against the 55 mcg Adult RDA",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.86,
        "Orange bars clear 55 mcg. 1 oz of Brazil nuts averages 544 mcg, past the 400 mcg adult UL, so it isn't plotted.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.text(
        0.035,
        0.80,
        "Bottom round steak is also 37 mcg per 3 oz, tied with the pork chop.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "NIH Office of Dietary Supplements selenium fact sheet | protein-per-dollar-2026.csv prices the matching rows on the page | Chart, not a photograph",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=100, format="jpeg", facecolor="white", pil_kwargs={"quality": 90})
    plt.close(fig)


if __name__ == "__main__":
    main()
