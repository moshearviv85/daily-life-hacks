"""Daily-target versus cost chart for the meal calculator.

Each bar is the published cost of four portions from protein-day-cost-2026.csv
and fiber-day-cost-2026.csv. The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-day-cost-2026.csv"
FIBER = ROOT / "public" / "data" / "fiber-day-cost-2026.csv"
OUT = ROOT / "public" / "images" / "daily-fiber-and-protein-target-calculator-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
DARK = "#2F3542"
MUTED = "#697386"


def rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def money(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def grab(path: Path, needle: str, grams: str, column: str, expected: str) -> Decimal:
    hits = [
        row
        for row in rows(path)
        if needle in row["food"] and row["grams_used"] == grams
    ]
    if not hits:
        raise SystemExit(f"missing {needle} {grams} g in {path.name}")
    values = {row[column] for row in hits}
    costs = {row["cost_usd"] for row in hits}
    if len(values) != 1 or len(costs) != 1:
        raise SystemExit(f"drift {needle} {grams} g in {path.name}")
    actual = values.pop()
    if actual != expected:
        raise SystemExit(f"{needle} {column} {actual} != {expected}")
    return Decimal(actual)


def absent(path: Path, needle: str, grams: str) -> None:
    hits = [
        row
        for row in rows(path)
        if needle in row["food"] and row["grams_used"] == grams
    ]
    if hits:
        raise SystemExit(f"{needle} {grams} g unexpectedly in {path.name}")


def main() -> None:
    oats_p = grab(PROTEIN, "Rolled oats", "60", "protein_g", "7.9")
    oats_f = grab(FIBER, "Rolled oats", "60", "fiber_g", "6.1")
    oats_cost = grab(PROTEIN, "Rolled oats", "60", "cost_usd", "0.17")
    if grab(FIBER, "Rolled oats", "60", "cost_usd", "0.17") != oats_cost:
        raise SystemExit("oats cost drift")

    tuna_p = grab(PROTEIN, "Canned tuna", "113", "protein_g", "22.0")
    tuna_cost = grab(PROTEIN, "Canned tuna", "113", "cost_usd", "0.98")
    absent(FIBER, "Canned tuna", "113")

    beans_p = grab(PROTEIN, "Canned black beans", "220", "protein_g", "13.3")
    beans_f = grab(FIBER, "Canned black beans", "220", "fiber_g", "15.2")
    beans_cost = grab(PROTEIN, "Canned black beans", "220", "cost_usd", "0.44")
    if grab(FIBER, "Canned black beans", "220", "cost_usd", "0.44") != beans_cost:
        raise SystemExit("beans cost drift")

    pb_p = grab(PROTEIN, "Peanut butter", "32", "protein_g", "7.1")
    pb_f = grab(FIBER, "Peanut butter", "32", "fiber_g", "1.6")
    pb_cost = grab(PROTEIN, "Peanut butter", "32", "cost_usd", "0.14")

    peas_f = grab(FIBER, "split peas", "50", "fiber_g", "11.1")
    peas_cost = grab(FIBER, "split peas", "50", "cost_usd", "0.16")
    absent(PROTEIN, "split peas", "50")

    frozen_f = grab(FIBER, "Frozen green peas", "120", "fiber_g", "5.4")
    frozen_cost = grab(FIBER, "Frozen green peas", "120", "cost_usd", "0.31")
    absent(PROTEIN, "Frozen green peas", "120")

    yogurt_p = grab(PROTEIN, "Greek yogurt", "170", "protein_g", "17.3")
    yogurt_cost = grab(PROTEIN, "Greek yogurt", "170", "cost_usd", "0.63")
    absent(FIBER, "Greek yogurt", "170")

    chicken_p = grab(PROTEIN, "Chicken breast", "100", "protein_g", "22.5")
    chicken_cost = grab(PROTEIN, "Chicken breast", "100", "cost_usd", "0.92")
    absent(FIBER, "Chicken breast", "100")

    pinto_p = grab(PROTEIN, "Pinto beans", "90", "protein_g", "19.3")
    pinto_cost = grab(PROTEIN, "Pinto beans", "90", "cost_usd", "0.20")
    absent(FIBER, "Pinto beans", "90")

    fifty_cost = money(oats_cost + tuna_cost + beans_cost + pb_cost)
    fifty_protein = oats_p + tuna_p + beans_p + pb_p
    fiber_day_cost = money(oats_cost + peas_cost + beans_cost + frozen_cost)
    fiber_day_grams = oats_f + peas_f + beans_f + frozen_f
    seventy_cost = money(yogurt_cost + chicken_cost + tuna_cost + pinto_cost)
    seventy_protein = yogurt_p + chicken_p + tuna_p + pinto_p
    hundred_cost = money(chicken_cost * 4)
    hundred_protein = chicken_p * 4

    if fifty_cost != Decimal("1.73") or fifty_protein != Decimal("50.3"):
        raise SystemExit(f"50 g day {fifty_protein} g {fifty_cost}")
    if fiber_day_cost != Decimal("1.08") or fiber_day_grams != Decimal("37.8"):
        raise SystemExit(f"fiber day {fiber_day_grams} g {fiber_day_cost}")
    if seventy_cost != Decimal("2.73") or seventy_protein != Decimal("81.1"):
        raise SystemExit(f"75 g day {seventy_protein} g {seventy_cost}")
    if hundred_cost != Decimal("3.68") or hundred_protein != Decimal("90.0"):
        raise SystemExit(f"100 g attempt {hundred_protein} g {hundred_cost}")
    if oats_f + beans_f + pb_f != Decimal("22.9"):
        raise SystemExit("50 g day fiber drift")

    labels = [
        "30 g fiber day\n37.8 g fiber",
        "50 g protein day\n50.3 g protein",
        "75 g protein day\n81.1 g protein",
        "100 g attempt\n90.0 g protein",
    ]
    costs = [float(fiber_day_cost), float(fifty_cost), float(seventy_cost), float(hundred_cost)]
    colors = [SLATE, ORANGE, ORANGE, ORANGE]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.10, right=0.97, top=0.76, bottom=0.18)
    positions = list(range(len(labels)))
    bars = ax.bar(positions, costs, color=colors, width=0.62)
    ceiling = max(costs) * 1.22
    ax.set_ylim(0, ceiling)
    ax.set_xticks(positions, labels, fontsize=11, color=DARK)
    ax.tick_params(axis="y", colors=MUTED, labelsize=9)
    ax.spines[:].set_visible(False)
    ax.yaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    ax.set_ylabel("Daily grocery cost", color=MUTED, fontsize=10)
    for bar, cost in zip(bars, costs):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            cost + ceiling * 0.02,
            f"${cost:.2f}",
            ha="center",
            va="bottom",
            color=DARK,
            fontsize=12,
            fontweight="bold",
        )
    fig.text(
        0.05,
        0.95,
        "Daily Target Versus the Grocery Receipt",
        color=DARK,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.05,
        0.885,
        "Four published portions each. The last bar is four chicken portions, and it still misses 100 g.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "Data: protein-day-cost-2026.csv and fiber-day-cost-2026.csv | daily-life-hacks.com",
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
