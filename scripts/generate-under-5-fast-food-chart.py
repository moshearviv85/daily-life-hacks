"""Horizontal bars for fast-food items priced at or under $5.00.

Bar lengths are protein_g_per_dollar from
public/data/fastfood-protein-per-dollar-2026.csv. The $5 cutoff is the
price_usd column. Do not hardcode the bar lengths.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "fastfood-protein-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "cheapest-fast-food-protein-under-5-dollars-chart.jpg"
ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
PRICE_CAP = 5.0


def load() -> list[dict[str, str]]:
    with CSV.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def label(row: dict[str, str]) -> str:
    item = row["item"]
    if item.startswith("High Protein Cup"):
        item = "High Protein Cup"
    elif item.startswith("Jr. Bacon"):
        item = "Jr. Bacon Cheeseburger"
    elif item.startswith("Spicy Chicken"):
        item = "Spicy Chicken Sandwich"
    elif item.startswith("Cheesy Bean"):
        item = "Cheesy Bean and Rice Burrito"
    elif item.startswith("Chili"):
        item = "Chili (small)"
    elif item.startswith("Bean Burrito"):
        item = "Bean Burrito"
    elif item.startswith("Beefy"):
        item = "Beefy 5-Layer Burrito"
    elif "Drumstick" in item:
        item = "Original Recipe Drumstick"
    elif item == "McChicken":
        item = "McChicken"
    elif item == "McDouble":
        item = "McDouble"
    return f"{row['chain']}: {item}"


def main() -> None:
    rows = load()
    under = [row for row in rows if float(row["price_usd"]) <= PRICE_CAP]
    under.sort(key=lambda row: -float(row["protein_g_per_dollar"]))
    if len(under) != 10:
        raise SystemExit(f"expected 10 items at or under $5, found {len(under)}")

    labels = [label(row) for row in under]
    values = [float(row["protein_g_per_dollar"]) for row in under]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.36, right=0.96, top=0.80, bottom=0.08)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=ORANGE, height=0.68)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=9)
    ax.grid(False)
    peak = max(values)
    ax.set_xlim(0, peak * 1.18)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            value + peak * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g}",
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    fig.text(
        0.36,
        0.94,
        "Fast-food protein per dollar, items at or under $5",
        color=SLATE,
        fontsize=15,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.36,
        0.885,
        "10 a la carte rows from the 2026 chain price file. Combos stay out.",
        color=MUTED,
        fontsize=10,
        va="center",
    )
    fig.text(
        0.5,
        0.02,
        "Data: fastfood-protein-per-dollar-2026.csv | chain nutrition files | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {len(under)} items)")
    for row in under:
        print(
            f"{row['chain']}\t{row['item']}\t{row['price_usd']}\t{row['protein_g']}\t{row['protein_g_per_dollar']}"
        )


if __name__ == "__main__":
    main()
