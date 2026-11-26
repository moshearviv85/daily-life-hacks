"""Grouped regional bar chart for October 2026 BLS protein per dollar.

Bars are protein grams per dollar from
public/data/bls-nutrition-per-dollar-latest.csv. A region is drawn only when
that staple's row is October 2026. Older regional prints stay off the chart.
The image is a chart, not a photo.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "bls-nutrition-per-dollar-latest.csv"
OUT = ROOT / "public" / "images" / "us-regional-grocery-protein-prices-october-2026-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
GREEN = "#1F7A4D"
BROWN = "#8C5A2B"
MUTED = "#64748B"

REGIONS = ["Northeast", "Midwest", "South", "West"]
COLORS = {
    "Northeast": SLATE,
    "Midwest": ORANGE,
    "South": GREEN,
    "West": BROWN,
}

# Item code, short label. Order is the chart's left-to-right order.
STAPLES = [
    ("FF1101", "Chicken breast"),
    ("706111", "Whole chicken"),
    ("704212", "Pork chops"),
    ("703112", "Ground beef"),
    ("703613", "Sirloin"),
    ("710212", "Cheddar"),
    ("709112", "Whole milk"),
]


def load() -> list[dict[str, str]]:
    with CSV.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    rows = load()
    values: dict[str, dict[str, float]] = {code: {} for code, _label in STAPLES}
    for row in rows:
        code = row["bls_item_code"]
        if code not in values or row["area_name"] not in COLORS:
            continue
        if row["priced_month"] != "2026-10":
            continue
        values[code][row["area_name"]] = float(row["protein_g_per_dollar"])

    plotted = [code for code, _label in STAPLES if values[code]]
    if len(plotted) != len(STAPLES):
        missing = [code for code, _label in STAPLES if not values[code]]
        raise SystemExit(f"no October 2026 rows for {missing}")

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": SLATE,
            "ytick.color": MUTED,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.07, right=0.98, top=0.76, bottom=0.16)
    width = 0.18
    centers = list(range(len(STAPLES)))
    peak = 0.0
    for index, region in enumerate(REGIONS):
        offset = (index - 1.5) * width
        heights = []
        positions = []
        for staple_index, (code, _label) in enumerate(STAPLES):
            height = values[code].get(region)
            if height is None:
                continue
            heights.append(height)
            positions.append(staple_index + offset)
            peak = max(peak, height)
        ax.bar(positions, heights, width=width * 0.92, color=COLORS[region], label=region)

    ax.set_xticks(centers, [label for _code, label in STAPLES])
    fig.text(
        0.035,
        0.955,
        "Protein grams per dollar by US region, October 2026",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.895,
        "BLS average prices. A bar is drawn only when that region's row is October 2026.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", length=0, labelsize=10)
    ax.tick_params(axis="y", length=0, labelsize=9)
    ax.grid(False)
    ax.set_ylim(0, peak * 1.18)
    fig.legend(
        handles=[Patch(facecolor=COLORS[region], label=region) for region in REGIONS],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.07, 0.84),
        ncol=4,
        fontsize=10,
    )
    fig.text(
        0.5,
        0.025,
        "Chart from bls-nutrition-per-dollar-latest.csv. Older regional prints are omitted. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT.name}")


if __name__ == "__main__":
    main()
