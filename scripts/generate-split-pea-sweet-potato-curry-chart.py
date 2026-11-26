"""Fiber per serving for the green split pea and sweet potato curry.

Gram weights are one serving (the 4-serving batch divided by 4). Fiber comes
from src/data/fdc-cache.json. Prices come from fiber-per-dollar-2026.csv.
Oil, garlic, ginger, curry powder, turmeric, and spinach are not priced rows,
so they are not on the chart.
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
OUT = ROOT / "public" / "images" / "budget-green-split-pea-and-sweet-potato-curry-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
BATCH = 4

LINES = [
    ("172428", "Green split peas", 240),
    ("169703", "Brown rice", 250),
    ("168482", "Sweet potatoes", 130),
    ("170000", "Yellow onion", 60),
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


def cents(value: float) -> str:
    return f"{int(value * 100 + 0.5) / 100:.2f}"


def main() -> None:
    cache = json.loads(CACHE.read_text(encoding="utf-8"))["foods"]
    prices = load_prices(FIBER)
    labels: list[str] = []
    fiber: list[float] = []
    costs: list[float] = []

    for fdc_id, label, batch_grams in LINES:
        food = cache[fdc_id]
        per = food["nutrientsPer100g"]
        serving_grams = batch_grams / BATCH
        row = prices.get(fdc_id)
        if row is None:
            raise SystemExit(f"{fdc_id} has no fiber price row")
        cost = serving_grams * price_per_gram(row)
        labels.append(f"{label}  ${cents(cost)}")
        fiber.append(serving_grams * float(per["fiber"]) / 100)
        costs.append(cost)

    bowl = sum(costs)
    if cents(bowl) != "0.42":
        raise SystemExit(f"priced bowl {bowl:.4f} is not $0.42")

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.32, right=0.96, top=0.76, bottom=0.16)
    positions = list(range(len(labels)))
    ax.barh(positions, fiber, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.93,
        "Fiber in the Priced Curry Bowl",
        color=SLATE,
        fontsize=24,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.855,
        "Grams of fiber in one serving. Labels are each cost rounded to the cent. Unrounded sum is $0.42.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="y", length=0, labelsize=12)
    ax.set_xlabel("Fiber, grams per serving")
    ax.set_xlim(0, max(fiber) * 1.18)
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
