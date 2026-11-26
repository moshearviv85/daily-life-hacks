"""Two-panel chain comparison for the fast-food protein and fiber index.

Left bars are the unweighted mean of protein_g_per_dollar.
Right bars are the unweighted mean of fiber_g.
Both are read from the CSVs. Do not hardcode bar lengths.
"""

from __future__ import annotations

import csv
import math
from collections import defaultdict
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "fastfood-protein-per-dollar-2026.csv"
FIBER = ROOT / "public" / "data" / "high-fiber-fast-food-2026.csv"
OUT = ROOT / "public" / "images" / "fast-food-protein-and-fiber-index-chart.jpg"
ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def tenths(values: list[float]) -> float:
    mean = sum(values) / len(values)
    return math.floor(mean * 10 + 0.5) / 10


def means(rows: list[dict[str, str]], chain_key: str, value_key: str) -> list[tuple[str, float]]:
    grouped: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        grouped[row[chain_key]].append(float(row[value_key]))
    ranked = [(chain, tenths(values)) for chain, values in grouped.items()]
    ranked.sort(key=lambda item: (-item[1], item[0]))
    return ranked


def draw(ax, ranked: list[tuple[str, float]], title: str) -> None:
    labels = [chain for chain, _value in ranked]
    values = [value for _chain, value in ranked]
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=ORANGE, height=0.68)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=9)
    peak = max(values)
    ax.set_xlim(0, peak * 1.32)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            value + peak * 0.03,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    ax.set_title(title, loc="left", color=SLATE, fontsize=12, fontweight="bold", pad=10)


def main() -> None:
    protein = load(PROTEIN)
    fiber = load(FIBER)
    if len(protein) != 30:
        raise SystemExit(f"expected 30 protein rows, found {len(protein)}")
    if len(fiber) != 29:
        raise SystemExit(f"expected 29 fiber rows, found {len(fiber)}")

    protein_means = means(protein, "chain", "protein_g_per_dollar")
    fiber_means = means(fiber, "chain", "fiber_g")

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(1, 2, figsize=(12, 7.5), facecolor="white")
    fig.subplots_adjust(left=0.16, right=0.97, top=0.78, bottom=0.08, wspace=0.55)
    draw(axes[0], protein_means, "Mean protein grams per dollar")
    draw(axes[1], fiber_means, "Mean fiber grams per order")
    fig.text(
        0.16,
        0.94,
        "Restaurant chains, compared from the published rows",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.16,
        0.885,
        "Unweighted means. A chain with one row gets the same kind of bar as a chain with five.",
        color=MUTED,
        fontsize=10,
        va="center",
    )
    fig.text(
        0.5,
        0.02,
        "Chart from fastfood-protein-per-dollar-2026.csv and high-fiber-fast-food-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
