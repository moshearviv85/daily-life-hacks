"""Horizontal bar chart for the cookable whole-grain fiber page.

Bar lengths are the `value` column in
public/data/grains-fiber-per-dollar-ranked-2026.csv. Popcorn is left off:
that row has no USDA record. Do not hardcode the bar lengths.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "grains-fiber-per-dollar-ranked-2026.csv"
OUT = ROOT / "public" / "images" / "cheapest-whole-grains-for-fiber-per-dollar-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
PROXY = "173888"


def load() -> list[dict[str, str]]:
    with CSV.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    rows = load()
    if len(rows) != 11:
        raise SystemExit(f"expected 11 grain rows, found {len(rows)}")
    popcorn = next(row for row in rows if row["food"] == "Popcorn kernels")
    if popcorn["fdc_id"]:
        raise SystemExit("popcorn unexpectedly gained an FDC id")
    verified = [row for row in rows if row["fdc_id"]]
    if len(verified) != 10:
        raise SystemExit(f"expected 10 FDC grain rows, found {len(verified)}")
    verified.sort(key=lambda row: -float(row["value"]))

    labels = [
        f"{row['food']} (proxy)" if row["fdc_id"] == PROXY else row["food"]
        for row in verified
    ]
    values = [float(row["value"]) for row in verified]
    colors = [SLATE if row["fdc_id"] == PROXY else ORANGE for row in verified]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.32, right=0.96, top=0.78, bottom=0.08)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=colors, height=0.68)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=9)
    ax.grid(False)
    ax.set_xlim(0, max(values) * 1.18)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            value + max(values) * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} g",
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    fig.text(
        0.06,
        0.975,
        "Fiber per dollar: cookable grains, flour, and bread",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.925,
        f"10 USDA rows. Popcorn at {popcorn['value']} g per dollar is excluded.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Exact USDA match"),
            Patch(facecolor=SLATE, label="Close proxy (bran flakes)"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.32, 0.86),
        ncol=2,
        fontsize=8,
    )
    fig.text(
        0.5,
        0.012,
        "Data: grains-fiber-per-dollar-ranked-2026.csv | USDA FoodData Central | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(OUT)


if __name__ == "__main__":
    main()
