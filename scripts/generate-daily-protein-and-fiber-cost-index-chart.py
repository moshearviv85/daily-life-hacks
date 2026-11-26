"""Annual cost chart for the daily protein and fiber cost index.

Bar height is 365 times the day total in protein-day-cost-2026.csv and
fiber-day-cost-2026.csv. The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-day-cost-2026.csv"
FIBER = ROOT / "public" / "data" / "fiber-day-cost-2026.csv"
OUT = ROOT / "public" / "images" / "daily-protein-and-fiber-cost-index-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
DARK = "#2F3542"
MUTED = "#697386"
LABELS = {
    "1": "Day 1\ndry goods",
    "2": "Day 2\nno-cook",
    "3": "Day 3\nsplit basket",
    "4": "Day 4\nrestaurant",
    "5": "Day 5\nmixed",
}


def day_costs(path: Path) -> dict[str, Decimal]:
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            number = row["day"].split(":", 1)[0].removeprefix("Day ").strip()
            totals[number] += Decimal(row["cost_usd"])
    if set(totals) != set(LABELS):
        raise SystemExit(f"{path.name} days {sorted(totals)} != {sorted(LABELS)}")
    return totals


def main() -> None:
    keys = ["1", "2", "3", "4", "5"]
    protein = [float(day_costs(PROTEIN)[key] * 365) for key in keys]
    fiber = [float(day_costs(FIBER)[key] * 365) for key in keys]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.10, right=0.97, top=0.76, bottom=0.16)

    positions = list(range(len(keys)))
    width = 0.36
    protein_bars = ax.bar(
        [pos - width / 2 for pos in positions],
        protein,
        width,
        color=ORANGE,
        label="Protein menu x 365",
    )
    fiber_bars = ax.bar(
        [pos + width / 2 for pos in positions],
        fiber,
        width,
        color=SLATE,
        label="Fiber menu x 365",
    )
    ax.set_xticks(positions, [LABELS[key] for key in keys], fontsize=10, color=DARK)
    ax.tick_params(axis="y", colors=MUTED, labelsize=9)
    ax.spines[:].set_visible(False)
    ax.yaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    ceiling = max(protein + fiber) * 1.18
    ax.set_ylim(0, ceiling)
    for bars in (protein_bars, fiber_bars):
        for bar in bars:
            value = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                value + ceiling * 0.012,
                f"${value:,.0f}",
                ha="center",
                va="bottom",
                color=DARK,
                fontsize=8,
                fontweight="bold",
            )
    ax.legend(frameon=False, ncol=2, loc="upper left", fontsize=10)
    fig.text(
        0.05,
        0.95,
        "One Person, 365 Days of Each Daily Menu",
        color=DARK,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.05,
        0.885,
        "Each bar is that day's priced foods times 365. Day 3 isn't the same basket.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.03,
        "Data: protein-day-cost-2026.csv and fiber-day-cost-2026.csv | daily-life-hacks.com",
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
