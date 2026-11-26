"""Cost of 10 grams of fiber, cheapest pantry and produce add-ins first.

fiber_g_per_dollar comes from public/data/fiber-per-dollar-2026.csv.
Pearled barley and rolled oats are cross-checked against
public/data/grains-fiber-per-dollar-ranked-2026.csv. The dollar cost is
10 divided by fiber grams per dollar, rounded half up to the cent.
Bar lengths are that computed cost. Do not hardcode them.
"""

from __future__ import annotations

import csv
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
GRAINS = ROOT / "public" / "data" / "grains-fiber-per-dollar-ranked-2026.csv"
OUT = ROOT / "public" / "images" / "cheapest-ways-to-add-10-grams-of-fiber-to-any-meal-chart.jpg"

ORANGE = "#F29B30"
BERRY = "#334155"
SLATE = "#334155"
MUTED = "#64748B"
CENT = Decimal("0.01")
TENTH = Decimal("0.1")

# Chart order is cheapest 10 g first. Names must match the fiber file.
FOODS = (
    ("Green split peas (dry)", "Green split peas"),
    ("Pearled barley (dry)", "Pearled barley"),
    ("Pinto beans (dry)", "Pinto beans"),
    ("Black beans (dry)", "Black beans"),
    ("Navy beans (dry)", "Navy beans"),
    ("Old-fashioned rolled oats", "Rolled oats"),
    ("Chia seeds", "Chia seeds"),
    ("Whole flaxseed", "Whole flaxseed"),
    ("Frozen green peas", "Frozen green peas"),
    ("Dry roasted peanuts", "Dry roasted peanuts"),
    ("Sunflower seed kernels", "Sunflower seed kernels"),
    ("Peanut butter", "Peanut butter"),
    ("Avocado", "Avocado"),
    ("Raspberries", "Raspberries"),
    ("Blueberries", "Blueberries"),
)
GRAIN_CHECK = ("Pearled barley (dry)", "Old-fashioned rolled oats")
BERRIES = {"Raspberries", "Blueberries"}


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def money(fiber_per_dollar: str) -> Decimal:
    return (Decimal("10") / Decimal(fiber_per_dollar)).quantize(CENT, rounding=ROUND_HALF_UP)


def edible_grams(fiber_per_100g: str) -> Decimal:
    return (Decimal("10") / Decimal(fiber_per_100g) * Decimal("100")).quantize(
        TENTH, rounding=ROUND_HALF_UP
    )


def main() -> None:
    fiber_rows = {row["food"]: row for row in load(FIBER)}
    grain_rows = {row["food"]: row for row in load(GRAINS)}
    for name in GRAIN_CHECK:
        if name not in fiber_rows or name not in grain_rows:
            raise SystemExit(f"missing grain cross-check for {name}")
        if Decimal(fiber_rows[name]["fiber_g_per_dollar"]) != Decimal(grain_rows[name]["value"]):
            raise SystemExit(
                f"{name} fiber per dollar disagrees: "
                f"{fiber_rows[name]['fiber_g_per_dollar']} vs {grain_rows[name]['value']}"
            )

    labels: list[str] = []
    costs: list[float] = []
    colors: list[str] = []
    for name, label in FOODS:
        row = fiber_rows.get(name)
        if row is None:
            raise SystemExit(f"missing fiber row for {name}")
        cost = money(row["fiber_g_per_dollar"])
        grams = edible_grams(row["fiber_g_per_100g"])
        labels.append(label)
        costs.append(float(cost))
        colors.append(BERRY if name in BERRIES else ORANGE)
        print(
            f"{name}\t{row['fiber_g_per_dollar']}\t{cost}\t{grams}\t"
            f"{row['fiber_g_per_100g']}\t{row['package']}\t${row['package_price_usd']}\t"
            f"{row['fdc_id']}\t{row.get('edible_fraction', '')}"
        )

    if len(labels) != 15:
        raise SystemExit(f"expected 15 foods, found {len(labels)}")

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.24, right=0.96, top=0.84, bottom=0.14)
    y = list(range(len(labels)))
    bars = ax.barh(y, costs, color=colors, height=0.72)
    ax.set_yticks(y, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=8)
    ax.grid(False)
    peak = max(costs)
    ax.set_xlim(0, peak * 1.18)
    for bar, cost in zip(bars, costs):
        ax.text(
            cost + peak * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"${cost:.2f}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.text(
        0.24,
        0.93,
        "What 10 grams of fiber costs",
        color=SLATE,
        fontsize=15,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.24,
        0.875,
        "Orange bars stay under $1. Slate bars are the berry pint.",
        color=MUTED,
        fontsize=9,
        va="center",
    )
    fig.text(
        0.5,
        0.03,
        "Cost = 10 / fiber grams per dollar. Data: fiber-per-dollar-2026.csv and grains-fiber-per-dollar-ranked-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=7,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
