"""Dry versus canned protein grams per dollar.

Black beans and chickpeas are the varieties with both a dry row and a can
in canned-vs-dry-beans-cost-2026.csv. Kidney beans have a can and no dry row,
so they stay out of the bars. The figure is a chart.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "canned-vs-dry-beans-cost-2026.csv"
OUT = ROOT / "public" / "images" / "canned-vs-dry-beans-and-pantry-cost-index-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
PAIRS = (
    ("Black beans", "Black beans (dry)", "Canned black beans"),
    ("Chickpeas", "Chickpeas (dry)", "Canned chickpeas"),
)


def main():
    with DATA.open(encoding="utf-8", newline="") as handle:
        rows = {row["food"]: float(row["value"]) for row in csv.DictReader(handle)}
    labels = []
    dry = []
    canned = []
    for label, dry_name, can_name in PAIRS:
        if dry_name not in rows or can_name not in rows:
            raise SystemExit(f"missing {label}")
        labels.append(label)
        dry.append(rows[dry_name])
        canned.append(rows[can_name])

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.16, right=0.96, top=0.76, bottom=0.14)
    positions = list(range(len(labels)))
    dry_bars = ax.barh([pos + 0.18 for pos in positions], dry, height=0.32, color=ORANGE, label="Dry")
    can_bars = ax.barh([pos - 0.18 for pos in positions], canned, height=0.32, color=SLATE, label="Canned")
    ceiling = max(dry + canned)
    for bars in (dry_bars, can_bars):
        for bar in bars:
            ax.text(
                bar.get_width() + ceiling * 0.015,
                bar.get_y() + bar.get_height() / 2,
                f"{bar.get_width():g}",
                va="center",
                color=SLATE,
                fontsize=11,
                fontweight="bold",
            )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.set_xlim(0, ceiling * 1.22)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=12, colors=SLATE)
    ax.grid(False)
    ax.legend(
        handles=[
            Patch(facecolor=ORANGE, edgecolor="none", label="Dry, protein g per $"),
            Patch(facecolor=SLATE, edgecolor="none", label="Canned, protein g per $"),
        ],
        frameon=False,
        loc="lower right",
        fontsize=10,
    )
    fig.text(
        0.035,
        0.94,
        "Dry vs Canned Beans: Protein Grams per Dollar",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.875,
        "Black beans and chickpeas are the pairs with both a bag and a can. Kidney has a can only.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.04,
        "Data: canned-vs-dry-beans-cost-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, format="jpeg", pil_kwargs={"quality": 90, "optimize": True})
    plt.close(fig)


if __name__ == "__main__":
    main()
