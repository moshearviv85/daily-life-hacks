"""Grouped bar chart for the produce and whole-grain fiber index.

Bar heights are the `value` column in the two ranked CSVs. Top 3 foods in
each format. Do not hardcode the bar lengths.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PRODUCE = ROOT / "public" / "data" / "produce-fiber-per-dollar-ranked-2026.csv"
GRAINS = ROOT / "public" / "data" / "grains-fiber-per-dollar-ranked-2026.csv"
OUT = ROOT / "public" / "images" / "produce-and-grain-fiber-index-chart.jpg"

ORANGE = "#F29B30"
MID = "#C47A1A"
SLATE = "#334155"
MUTED = "#64748B"
COLORS = [ORANGE, MID, SLATE]


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def top_three(rows: list[dict[str, str]], category: str) -> list[dict[str, str]]:
    picked = [row for row in rows if row["category"] == category]
    picked.sort(key=lambda row: -float(row["value"]))
    if len(picked) < 3:
        raise SystemExit(f"expected at least 3 {category} rows, found {len(picked)}")
    return picked[:3]


def short_name(row: dict[str, str]) -> str:
    name = row["food"]
    replacements = {
        "Whole wheat flour": "Flour",
        "Pearled barley (dry)": "Barley",
        "Popcorn kernels": "Popcorn",
        "Carrots (whole, bagged)": "Carrots",
        "Green cabbage": "Cabbage",
        "Sweet potatoes": "Sweet potatoes",
        "Frozen green peas": "Peas",
        "Frozen green beans": "Green beans",
        "Frozen broccoli florets": "Broccoli",
        "Bananas": "Bananas",
        "Avocado": "Avocado",
        "Pears": "Pears",
    }
    label = replacements.get(name, name)
    if not row["fdc_id"]:
        label = f"{label}*"
    return label


def main() -> None:
    produce = load(PRODUCE)
    grains = load(GRAINS)
    if len(produce) != 22:
        raise SystemExit(f"expected 22 produce rows, found {len(produce)}")
    if len(grains) != 11:
        raise SystemExit(f"expected 11 grain rows, found {len(grains)}")
    groups = [
        ("Whole grains", top_three(grains, "Whole grains")),
        ("Fresh vegetables", top_three(produce, "Fresh vegetables")),
        ("Frozen vegetables", top_three(produce, "Frozen vegetables")),
        ("Fresh fruit", top_three(produce, "Fresh fruit")),
    ]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.08, right=0.98, top=0.72, bottom=0.28)
    x = np.arange(len(groups))
    width = 0.24
    highest = 0.0
    for rank in range(3):
        values = [float(group[1][rank]["value"]) for group in groups]
        highest = max(highest, max(values))
        offset = (rank - 1) * width
        bars = ax.bar(x + offset, values, width=width, color=COLORS[rank], label=["Highest", "Second", "Third"][rank])
        for bar, group in zip(bars, groups, strict=True):
            row = group[1][rank]
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + highest * 0.012,
                row["value"],
                ha="center",
                va="bottom",
                color=SLATE,
                fontsize=8,
                fontweight="bold",
            )
    tick_labels = []
    for label, foods in groups:
        names = "\n".join(short_name(row) for row in foods)
        tick_labels.append(f"{label}\n{names}")
    ax.set_xticks(x, tick_labels)
    ax.set_ylabel("Fiber grams per dollar", color=SLATE)
    ax.set_ylim(0, highest * 1.18)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.tick_params(axis="y", colors=MUTED)
    ax.tick_params(axis="x", length=0, labelsize=9, colors=SLATE)
    ax.legend(frameon=False, ncol=3, loc="upper right")
    fig.text(
        0.08,
        0.96,
        "Fiber per dollar: top 3 in each format",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.08,
        0.905,
        "33 ranked rows. Shared scale. Dried fruit has no row in these files.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.text(
        0.08,
        0.03,
        "* No USDA record in the file.  produce-fiber-per-dollar-ranked-2026.csv  ·  grains-fiber-per-dollar-ranked-2026.csv  ·  daily-life-hacks.com",
        color=MUTED,
        fontsize=8,
        va="bottom",
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(OUT)


if __name__ == "__main__":
    main()
