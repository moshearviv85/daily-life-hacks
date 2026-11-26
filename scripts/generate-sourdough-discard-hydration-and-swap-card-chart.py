"""Grouped bar chart for the sourdough discard hydration card.

Flour grams use flour = discard / (1 + hydration), the same split as
src/lib/sourdough-discard-math.js. Hydration is 100, 80, or 50 percent.
The figure is a chart, not a photograph.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images" / "sourdough-discard-hydration-and-swap-card-chart.jpg"

WEIGHTS = (100, 150, 227)
HYDRATIONS = (100, 80, 50)
COLORS = {100: "#F29B30", 80: "#B3651B", 50: "#64748B"}
SLATE = "#334155"
MUTED = "#64748B"


def flour_grams(discard: float, hydration_percent: float) -> float:
    hydration = hydration_percent / 100
    return discard / (1 + hydration)


def tenth(value: float) -> float:
    return round(value * 10) / 10


def main():
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.10, right=0.98, top=0.74, bottom=0.16)
    x = np.arange(len(WEIGHTS))
    width = 0.24
    offsets = (-width, 0, width)
    for offset, hydration in zip(offsets, HYDRATIONS):
        values = [tenth(flour_grams(weight, hydration)) for weight in WEIGHTS]
        bars = ax.bar(
            x + offset,
            values,
            width=width,
            color=COLORS[hydration],
            label=f"{hydration}% hydration",
        )
        for bar, value in zip(bars, values):
            label = f"{value:g}"
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                value + 2.2,
                label,
                ha="center",
                va="bottom",
                color=SLATE,
                fontsize=9,
                fontweight="bold",
            )
    ax.set_xticks(x, [f"{weight} g discard" for weight in WEIGHTS])
    ax.tick_params(axis="x", length=0, labelsize=11, colors=SLATE)
    ax.tick_params(axis="y", length=0, labelleft=False)
    ax.spines[:].set_visible(False)
    ax.set_ylim(0, 190)
    ax.grid(False)
    legend = ax.legend(frameon=False, loc="upper left", fontsize=10)
    for text in legend.get_texts():
        text.set_color(SLATE)
    fig.text(
        0.035,
        0.94,
        "Flour Already in the Discard",
        color=SLATE,
        fontsize=20,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.875,
        "100% is half flour. 80% divides by 1.8. 50% is two-thirds flour. Water is the rest of the scoop.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "Formula: flour = discard / (1 + hydration) | Chart, not a photograph | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=100, format="jpeg", facecolor="white", pil_kwargs={"quality": 90})
    plt.close(fig)


if __name__ == "__main__":
    main()
