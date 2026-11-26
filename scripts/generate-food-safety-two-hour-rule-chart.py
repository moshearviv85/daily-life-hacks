"""Counter-time and danger-zone chart for the 2-hour rule printable.

The clocks are the USDA FSIS and CDC consumer limits: 2 hours when the air
is 40 to 90 F, and 1 hour when the air is above 90 F. The danger zone marked
on the temperature panel is 40 to 140 F. This file is a chart, not a photograph.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images" / "food-safety-two-hour-rule-chart-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
DEEP = "#9A3412"
COLD = "#E2E8F0"


def main() -> None:
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, (hours, temps) = plt.subplots(
        1,
        2,
        figsize=(12, 6.75),
        facecolor="white",
        gridspec_kw={"width_ratios": [1.35, 1]},
    )
    fig.subplots_adjust(left=0.16, right=0.96, top=0.74, bottom=0.16, wspace=0.45)

    labels = ["Air 40 to 90 F", "Air above 90 F"]
    values = [2, 1]
    colors = [ORANGE, DEEP]
    bars = hours.barh(labels, values, color=colors, height=0.55)
    hours.set_xlim(0, 2.8)
    hours.invert_yaxis()
    hours.spines[:].set_visible(False)
    hours.tick_params(axis="x", bottom=False, labelbottom=False)
    hours.tick_params(axis="y", length=0, labelsize=11)
    hours.grid(False)
    for bar, value, word in zip(bars, values, ("2 hours", "1 hour")):
        hours.text(
            value + 0.08,
            bar.get_y() + bar.get_height() / 2,
            word,
            va="center",
            color=SLATE,
            fontsize=12,
            fontweight="bold",
        )
    hours.set_title("How long it can sit out", loc="left", color=SLATE, fontsize=13, fontweight="bold")

    bands = [
        (0, 40, COLD),
        (40, 140, "#FDE7C7"),
        (140, 165, ORANGE),
    ]
    for start, end, color in bands:
        temps.bar(
            0,
            end - start,
            bottom=start,
            width=0.62,
            color=color,
            edgecolor="white",
        )
    temps.text(0, 20, "At or below 40 F\nFridge and cooler", ha="center", va="center", color=SLATE, fontsize=9, fontweight="bold")
    temps.text(0, 112, "Danger zone\n40 to 140 F", ha="center", va="center", color=SLATE, fontsize=9, fontweight="bold")
    temps.text(0, 152, "Hot holding\n140 F or above", ha="center", va="center", color=SLATE, fontsize=8, fontweight="bold")
    temps.axhline(90, color=DEEP, linewidth=1.5, linestyle=(0, (3, 2)))
    temps.annotate(
        "90 F air:\n1-hour clock",
        xy=(0.31, 90),
        xytext=(0.48, 68),
        ha="left",
        va="top",
        color=DEEP,
        fontsize=8,
        fontweight="bold",
        arrowprops={"arrowstyle": "-", "color": DEEP, "lw": 0.8},
    )
    temps.set_xlim(-0.55, 0.95)
    temps.set_ylim(0, 165)
    temps.set_xticks([])
    temps.set_ylabel("Food temperature, F", color=SLATE)
    temps.spines[:].set_visible(False)
    temps.tick_params(axis="y", length=0, labelsize=9, colors=MUTED)
    temps.set_title("Where the zone sits", loc="left", color=SLATE, fontsize=13, fontweight="bold")

    fig.text(
        0.16,
        0.92,
        "The 2-hour rule and the danger zone",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.16,
        0.855,
        "Perishable food. 2 hours at 40 to 90 F air. 1 hour above 90 F. Chart, not a photograph.",
        color=MUTED,
        fontsize=11,
        va="center",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="2-hour clock"),
            Patch(facecolor=DEEP, label="1-hour clock"),
            Patch(facecolor="#FDE7C7", label="40 to 140 F danger zone"),
        ],
        frameon=False,
        loc="lower center",
        bbox_to_anchor=(0.48, 0.02),
        ncol=3,
        fontsize=9,
    )
    fig.text(
        0.5,
        0.075,
        "USDA FSIS leftovers guidance and the CDC 2-hour limit. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
