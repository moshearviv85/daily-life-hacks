"""Lunch-portion protein versus cost chart.

Portion grams are the builder's lunch amounts. Protein grams and cost come
from protein-per-dollar-2026.csv. The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "work-lunch-protein-and-fiber-builder-chart.jpg"

ORANGE = "#F29B30"
DARK = "#2F3542"
MUTED = "#697386"

# Same lunch portions as the builder page. Eggs and mozzarella are not on
# the no-cook file; the parent protein file still prices them.
PORTIONS = [
    ("Eggs (large)", 100, "Eggs, 100 g"),
    ("Canned tuna (chunk light, in water)", 113, "Tuna, 113 g"),
    ("Greek yogurt (plain, nonfat)", 170, "Yogurt, 170 g"),
    ("Cottage cheese (4%)", 113, "Cottage cheese, 113 g"),
    ("Peanut butter", 32, "Peanut butter, 32 g"),
    ("Dry roasted peanuts", 28, "Peanuts, 28 g"),
    ("Sunflower seed kernels", 28, "Sunflower seeds, 28 g"),
    ("Mozzarella (low-moisture part-skim)", 28, "Mozzarella, 28 g"),
]


def money(amount: Decimal) -> str:
    return f"${amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):.2f}"


def grams_label(amount: Decimal) -> str:
    return f"{amount.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP):.1f}"


def load() -> list[tuple[str, float, str, str]]:
    rows = {row["food"]: row for row in csv.DictReader(PROTEIN.open(encoding="utf-8"))}
    points = []
    for food, grams, label in PORTIONS:
        row = rows.get(food)
        if row is None:
            raise SystemExit(f"missing {food}")
        portion = Decimal(grams) / Decimal(100)
        protein = Decimal(row["protein_g_per_100g"]) * portion
        cost = Decimal(row["price_per_100g_usd"]) * portion
        points.append((label, float(protein), grams_label(protein), money(cost)))
    points.sort(key=lambda item: item[1])
    return points


def main() -> None:
    points = load()
    labels = [item[0] for item in points]
    protein = [item[1] for item in points]
    captions = [f"{item[2]} g  {item[3]}" for item in points]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.24, right=0.96, top=0.76, bottom=0.12)
    positions = list(range(len(points)))
    bars = ax.barh(positions, protein, color=ORANGE, height=0.62)
    ceiling = max(protein) * 1.28
    ax.set_xlim(0, ceiling)
    ax.set_yticks(positions, labels, fontsize=11, color=DARK)
    ax.tick_params(axis="x", colors=MUTED, labelsize=9)
    ax.spines[:].set_visible(False)
    ax.xaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    for bar, caption in zip(bars, captions):
        ax.text(
            bar.get_width() + ceiling * 0.012,
            bar.get_y() + bar.get_height() / 2,
            caption,
            va="center",
            color=DARK,
            fontsize=10,
            fontweight="bold",
        )
    fig.text(
        0.05,
        0.95,
        "Work Lunch Protein versus the Cost of That Portion",
        color=DARK,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.05,
        0.885,
        "Bar length is protein grams. The label is that portion's grocery cost.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.03,
        "Data: protein-per-dollar-2026.csv lunch portions | daily-life-hacks.com",
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
