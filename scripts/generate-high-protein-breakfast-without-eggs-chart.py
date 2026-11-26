"""Cost-of-30 g chart for the egg-free breakfast page.

Every bar is 30 divided by protein grams per dollar in
public/data/protein-per-dollar-2026.csv. Foods that also appear in
public/data/breakfast-staples-per-dollar-2026.csv must carry the same rate.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
BREAKFAST = ROOT / "public" / "data" / "breakfast-staples-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "high-protein-breakfast-without-eggs-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# Chart order is cheapest 30 g first. Names are the protein CSV's food field.
FOODS = [
    ("Peanut butter", "Peanut butter"),
    ("Old-fashioned rolled oats", "Rolled oats"),
    ("Whole milk", "Whole milk"),
    ("Greek yogurt (plain, nonfat)", "Greek yogurt"),
    ("Cottage cheese (4%)", "Cottage cheese"),
    ("100% whole wheat bread", "Whole wheat bread"),
    ("Almonds", "Almonds"),
    ("Tofu (extra firm)", "Extra-firm tofu"),
]


def load(path: Path) -> dict[str, dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return {row["food"]: row for row in csv.DictReader(handle)}


def cost_for_30(grams_per_dollar: str) -> float:
    return 30 / float(grams_per_dollar)


def main() -> None:
    protein = load(PROTEIN)
    breakfast = load(BREAKFAST)
    labels: list[str] = []
    costs: list[float] = []
    for food, label in FOODS:
        row = protein[food]
        rate = row["protein_g_per_dollar"]
        if food in breakfast:
            other = breakfast[food]["protein_g_per_dollar"]
            if other != rate:
                raise SystemExit(f"{food} rate {rate} != breakfast staples {other}")
        labels.append(label)
        costs.append(cost_for_30(rate))

    order = sorted(range(len(costs)), key=lambda index: costs[index])
    labels = [labels[index] for index in order]
    costs = [costs[index] for index in order]

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.24, right=0.94, top=0.78, bottom=0.14)
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, costs, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.915,
        "30 Grams of Protein, Without an Egg",
        color=SLATE,
        fontsize=25,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.845,
        "Cost of 30 g at the published protein-per-dollar rate. Egg-free breakfast staples.",
        color=MUTED,
        fontsize=12.5,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=12)
    ax.grid(False)
    ax.set_xlim(0, max(costs) * 1.28)
    for bar, value in zip(drawn, costs):
        ax.text(
            value + max(costs) * 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"${value:.2f}",
            va="center",
            color=SLATE,
            fontsize=12,
            fontweight="bold",
        )
    fig.text(
        0.5,
        0.035,
        "Chart rendered from protein-per-dollar-2026.csv and breakfast-staples-per-dollar-2026.csv. Not a photograph. daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
