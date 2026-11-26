"""Ranked bars for the 20 audited legume-grain protein pairs.

Bar length is the value column of cheapest-complete-protein-pairs-2026.csv.
Do not hardcode the grams.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "cheapest-complete-protein-pairs-2026.csv"
OUT = ROOT / "public" / "images" / "complete-protein-pair-builder-chart.jpg"
ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"


def load() -> list[dict[str, str]]:
    with CSV.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def label(food: str) -> str:
    return food.replace(" (dry)", "").replace("Old-fashioned rolled oats", "Rolled oats")


def main() -> None:
    rows = load()
    if len(rows) != 20:
        raise SystemExit(f"expected 20 pairs, found {len(rows)}")
    rows.sort(key=lambda row: -float(row["value"]))
    labels = [label(row["food"]) for row in rows]
    values = [float(row["value"]) for row in rows]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 10), facecolor="white")
    fig.subplots_adjust(left=0.38, right=0.96, top=0.86, bottom=0.06)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=ORANGE, height=0.68)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=9)
    peak = max(values)
    ax.set_xlim(0, peak * 1.16)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            value + peak * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.text(
        0.38,
        0.95,
        "Protein grams per dollar, 50/50 legume and grain splits",
        color=SLATE,
        fontsize=15,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.38,
        0.91,
        "20 audited pairs. The bar is the cost split, not a DIAAS score for the mixture.",
        color=MUTED,
        fontsize=10,
        va="center",
    )
    fig.text(
        0.5,
        0.015,
        "Chart from cheapest-complete-protein-pairs-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {len(rows)} pairs)")


if __name__ == "__main__":
    main()
