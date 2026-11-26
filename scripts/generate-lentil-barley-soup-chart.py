"""Fiber and priced-food cost for one bowl of lentil barley soup.

Gram weights are one bowl (the 6-bowl pot divided by 6). Fiber comes from
src/data/fdc-cache.json. Prices come from public/data/fiber-per-dollar-2026.csv.
Olive oil is left off the chart because that record has no fiber and no price row.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "src" / "data" / "fdc-cache.json"
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "brown-lentil-and-pearled-barley-soup-high-fiber-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
BOWLS = 6

# Pot grams. Garlic has an FDC fiber value and no price row.
LINES = [
    ("172420", "Brown lentils", 300, True),
    ("170284", "Pearled barley", 360, True),
    ("170393", "Carrots", 180, True),
    ("170000", "Yellow onion", 150, True),
    ("169230", "Garlic", 6, False),
]


def load_prices(path: Path) -> dict[str, dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = {}
        for row in csv.DictReader(handle):
            fdc_id = (row.get("fdc_id") or "").strip()
            if fdc_id and fdc_id not in rows:
                rows[fdc_id] = row
        return rows


def price_per_gram(row: dict[str, str]) -> float:
    grams = float(row["package_weight_g"]) * float(row["edible_fraction"] or 1)
    return float(row["package_price_usd"]) / grams


def main() -> None:
    cache = json.loads(CACHE.read_text(encoding="utf-8"))["foods"]
    prices = load_prices(FIBER)
    labels: list[str] = []
    fiber_grams: list[float] = []
    priced_cost = 0.0

    for fdc_id, label, pot_grams, priced in LINES:
        food = cache[fdc_id]
        bowl_grams = pot_grams / BOWLS
        grams = bowl_grams * float(food["nutrientsPer100g"]["fiber"] or 0) / 100
        if priced:
            row = prices.get(fdc_id)
            if row is None:
                raise SystemExit(f"{fdc_id} has no fiber price row")
            cost = bowl_grams * price_per_gram(row)
            priced_cost += cost
            labels.append(f"{label}  ${cost:.2f}")
        else:
            labels.append(f"{label}, not priced")
        fiber_grams.append(grams)

    if round(priced_cost, 2) != 0.43:
        raise SystemExit(f"priced bowl {priced_cost:.4f} is not $0.43")

    order = sorted(range(len(fiber_grams)), key=lambda index: fiber_grams[index], reverse=True)
    labels = [labels[index] for index in order]
    fiber_grams = [fiber_grams[index] for index in order]

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.30, right=0.94, top=0.76, bottom=0.16)
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, fiber_grams, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.93,
        "Fiber in One Bowl of Lentil Barley Soup",
        color=SLATE,
        fontsize=22,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.855,
        "16.0 g fiber in the bowl. The four priced foods are $0.43. Garlic is on the chart and not in the price file.",
        color=MUTED,
        fontsize=11.5,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="y", length=0, labelsize=12)
    ax.set_xlabel("Fiber grams in one bowl")
    ax.set_xlim(0, max(fiber_grams) * 1.22)
    for bar, value in zip(drawn, fiber_grams):
        ax.text(
            value + max(fiber_grams) * 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.2f} g",
            va="center",
            color=SLATE,
            fontsize=11,
            fontweight="bold",
        )
    fig.text(
        0.5,
        0.035,
        "Chart rendered from fdc-cache.json and fiber-per-dollar-2026.csv. Not a photograph. daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
