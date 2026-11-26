"""Chart heroes for the dairy protein-cost page and the thawed-vegetable page.

Bar lengths for money come from the public CSVs. Do not hardcode them.
FoodKeeper windows are the current English dataset, version 128
(modified 09-06-2018), not a photograph and not a guessed shelf life.

Product 331, Vegetables, category Food Purchased Frozen:
  Refrigerate 3 to 4 Days. Tip: Recommendation is for storage after cooking.
  Refrigerate after thawing: empty.
  Freezer from purchase: 10 to 18 Months.
  Tip: Keep frozen. For safety, cook as directed.

Product 174, Leftovers without meat, fish, poultry, or egg:
  Refrigerator 3 to 4 Days. Freezer 1 to 2 Months.

Product 641, Edamame, frozen:
  Refrigerator after thawing: 1 Week. Freezer from purchase: 2 Years.
"""

from __future__ import annotations

import csv
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images"

DAIRY_CHART = "cottage-cheese-vs-greek-yogurt-vs-eggs-protein-cost-chart.jpg"
THAW_CHART = "how-long-do-thawed-frozen-vegetables-last-in-the-fridge-chart.jpg"

ORANGE = "#F29B30"
DEEP = "#B3651B"
LIGHT = "#F8D3A5"
SLATE = "#334155"
MUTED = "#64748B"
GRID = "#E7E9ED"

# Order matches dairy-protein-per-dollar-ranked-2026.csv.
DAIRY_FOODS = [
    "Eggs (large)",
    "Mozzarella (low-moisture part-skim)",
    "Whole milk",
    "Greek yogurt (plain, nonfat)",
    "Cottage cheese (4%)",
    "Cheddar cheese",
]
DAIRY_SHORT = {
    "Eggs (large)": "Eggs",
    "Mozzarella (low-moisture part-skim)": "Mozzarella",
    "Whole milk": "Whole milk",
    "Greek yogurt (plain, nonfat)": "Greek yogurt",
    "Cottage cheese (4%)": "Cottage cheese",
    "Cheddar cheese": "Cheddar",
}
DAIRY_FDC = {
    "Eggs (large)": "171287",
    "Mozzarella (low-moisture part-skim)": "171244",
    "Whole milk": "171265",
    "Greek yogurt (plain, nonfat)": "170894",
    "Cottage cheese (4%)": "172179",
    "Cheddar cheese": "173414",
}

# Package prices. Edamame's fiber grams stay unresolved, so this chart
# plots the bag price only.
FROZEN_FOODS = [
    "Frozen green peas",
    "Frozen green beans",
    "Frozen broccoli florets",
    "Frozen chopped spinach",
    "Frozen shelled edamame",
]
FROZEN_SHORT = {
    "Frozen green peas": "Peas",
    "Frozen green beans": "Green beans",
    "Frozen broccoli florets": "Broccoli",
    "Frozen chopped spinach": "Spinach",
    "Frozen shelled edamame": "Edamame",
}

# (label, min, max) from FoodKeeper v128. Days or months, as labeled.
FRIDGE = [
    ("Vegetables, after cooking", 3, 4),
    ("Cooked vegetable leftovers", 3, 4),
    ("Edamame, after thawing", 7, 7),
]
FREEZER = [
    ("Vegetables, from purchase", 10, 18),
    ("Cooked vegetable leftovers", 1, 2),
    ("Edamame, from purchase", 24, 24),
]


def half_up(value: Decimal, places: str) -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def load(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def by_food(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {row["food"]: row for row in rows}


def require(row: dict[str, str] | None, food: str, fdc: str | None = None) -> dict[str, str]:
    if row is None:
        raise SystemExit(f"{food} is missing from the CSV")
    if fdc is not None and row.get("fdc_id") != fdc:
        raise SystemExit(f"{food} fdc_id is {row.get('fdc_id')}, expected {fdc}")
    return row


def dairy_rows() -> list[dict[str, str]]:
    protein = by_food(load("protein-per-dollar-2026.csv"))
    ranked = by_food(load("dairy-protein-per-dollar-ranked-2026.csv"))
    sodium = {row["fdc_id"]: row for row in load("sodium-per-dollar-2026.csv") if row.get("fdc_id")}
    quality = {row["fdc_id"]: row for row in load("protein-quality-per-dollar-2026.csv")}
    built = []
    for food in DAIRY_FOODS:
        protein_row = require(protein.get(food), food, DAIRY_FDC[food])
        ranked_row = require(ranked.get(food), food, DAIRY_FDC[food])
        if protein_row["protein_g_per_dollar"] != ranked_row["value"]:
            raise SystemExit(f"{food} protein grams per dollar disagree")
        grams = Decimal(protein_row["protein_g_per_dollar"])
        sodium_row = sodium.get(protein_row["fdc_id"])
        quality_row = quality.get(protein_row["fdc_id"])
        built.append(
            {
                "food": food,
                "short": DAIRY_SHORT[food],
                "grams": grams,
                "cost30": half_up(Decimal("30") / grams, "0.01"),
                "per_gram": half_up(Decimal("1") / grams, "0.001"),
                "pound": half_up(Decimal("454") / grams, "0.01"),
                "sodium": sodium_row["sodium_mg_per_100g"] if sodium_row else "",
                "diaas": quality_row["diaas_score"] if quality_row else "",
                "capped": quality_row["diaas_capped_for_multiplication"] if quality_row else "",
            }
        )
    return built


def frozen_prices() -> list[tuple[str, Decimal]]:
    fiber = by_food(load("fiber-per-dollar-2026.csv"))
    protein = by_food(load("protein-per-dollar-2026.csv"))
    prices = []
    for food in FROZEN_FOODS:
        fiber_row = require(fiber.get(food), food)
        price = Decimal(fiber_row["package_price_usd"])
        if food == "Frozen shelled edamame":
            protein_row = require(protein.get(food), food, "168410")
            if Decimal(protein_row["package_price_usd"]) != price:
                raise SystemExit("edamame package price disagrees between files")
            if fiber_row.get("nutrition_source_status") != "unresolved":
                raise SystemExit("edamame fiber row is no longer unresolved")
        prices.append((FROZEN_SHORT[food], price))
    return prices


def hide_spines(ax: plt.Axes) -> None:
    ax.tick_params(axis="y", length=0)
    ax.tick_params(axis="x", colors=MUTED, labelsize=8)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.set_facecolor("white")


def range_bars(ax: plt.Axes, rows: list[tuple[str, int, int]], xlabel: str) -> None:
    labels = [row[0] for row in rows]
    positions = list(range(len(labels)))
    for position, (_label, minimum, maximum) in zip(positions, rows, strict=True):
        ax.barh(position, minimum, color=ORANGE, height=0.55)
        if maximum > minimum:
            ax.barh(
                position,
                maximum - minimum,
                left=minimum,
                color=LIGHT,
                edgecolor=ORANGE,
                linewidth=1.2,
                height=0.55,
            )
        text = f"{minimum} to {maximum}" if maximum != minimum else str(minimum)
        ax.text(
            maximum + 0.2,
            position,
            text,
            va="center",
            fontsize=10,
            fontweight="bold",
            color=SLATE,
        )
    ax.set_yticks(positions, labels=labels, fontsize=9, color=SLATE)
    ax.invert_yaxis()
    ax.set_xlabel(xlabel, fontsize=9, color=MUTED)
    peak = max(row[2] for row in rows)
    ax.set_xlim(0, peak * 1.55)
    hide_spines(ax)


def money_bars(ax: plt.Axes, rows: list[tuple[str, Decimal]], xlabel: str, colors: list[str] | None = None) -> None:
    labels = [name for name, _value in rows]
    values = [float(value) for _name, value in rows]
    positions = list(range(len(labels)))
    ax.barh(positions, values, color=colors or ORANGE, height=0.62)
    ax.set_yticks(positions, labels=labels, fontsize=9, color=SLATE)
    ax.invert_yaxis()
    ax.set_xlabel(xlabel, fontsize=9, color=MUTED)
    peak = max(values)
    ax.set_xlim(0, peak * 1.42)
    for position, value in enumerate(values):
        ax.text(
            value + peak * 0.03,
            position,
            f"${value:.2f}",
            va="center",
            fontsize=9,
            fontweight="bold",
            color=SLATE,
        )
    hide_spines(ax)


def dairy_chart(rows: list[dict[str, str]]) -> None:
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(
        1,
        2,
        figsize=(12, 6.75),
        dpi=100,
        gridspec_kw={"width_ratios": [1.15, 1]},
    )
    fig.patch.set_facecolor("white")
    colors = []
    for row in rows:
        if not row["sodium"]:
            colors.append(SLATE)
        elif int(row["sodium"]) <= 140:
            colors.append(ORANGE)
        else:
            colors.append(DEEP)
    money_bars(
        axes[0],
        [(row["short"], row["cost30"]) for row in rows],
        "Dollars for 30 g of protein",
        colors,
    )
    sodium_rows = [(row["short"], Decimal(row["sodium"])) for row in rows if row["sodium"]]
    sodium_rows.sort(key=lambda item: item[1])
    sodium_colors = [ORANGE if int(value) <= 140 else DEEP for _name, value in sodium_rows]
    ax = axes[1]
    labels = [name for name, _value in sodium_rows]
    values = [float(value) for _name, value in sodium_rows]
    positions = list(range(len(labels)))
    ax.barh(positions, values, color=sodium_colors, height=0.62)
    ax.set_yticks(positions, labels=labels, fontsize=9, color=SLATE)
    ax.invert_yaxis()
    ax.set_xlabel("Sodium, mg per 100 g", fontsize=9, color=MUTED)
    peak = max(values)
    ax.set_xlim(0, peak * 1.28)
    for position, value in enumerate(values):
        ax.text(
            value + peak * 0.03,
            position,
            f"{int(value)} mg",
            va="center",
            fontsize=9,
            fontweight="bold",
            color=SLATE,
        )
    hide_spines(ax)
    fig.text(
        0.02,
        0.97,
        "Protein Cost vs Sodium: Eggs, Yogurt, Cottage Cheese",
        fontsize=16,
        fontweight="bold",
        color=SLATE,
        va="top",
    )
    fig.text(
        0.02,
        0.915,
        "Orange is 140 mg of sodium or less per 100 g. Deep orange is over that line. Slate has no sodium row.",
        fontsize=10,
        color=MUTED,
        va="top",
    )
    fig.text(
        0.5,
        0.02,
        "Dollars: 30 divided by grams per dollar in dairy-protein-per-dollar-ranked-2026.csv. Sodium: sodium-per-dollar-2026.csv. Not a photograph.",
        ha="center",
        fontsize=8,
        color=MUTED,
    )
    fig.subplots_adjust(left=0.12, right=0.98, top=0.84, bottom=0.16, wspace=0.38)
    fig.savefig(
        OUT / DAIRY_CHART,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)


def thaw_chart(prices: list[tuple[str, Decimal]]) -> None:
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(
        1,
        3,
        figsize=(12, 6.75),
        dpi=100,
        gridspec_kw={"width_ratios": [1.2, 1.15, 0.9]},
    )
    fig.patch.set_facecolor("white")
    range_bars(axes[0], FRIDGE, "Refrigerator days")
    range_bars(axes[1], FREEZER, "Freezer months")
    money_bars(axes[2], prices, "Package price, USD")
    fig.text(
        0.02,
        0.97,
        "Thawed Frozen Vegetables: Fridge Window and Bag Cost",
        fontsize=16,
        fontweight="bold",
        color=SLATE,
        va="top",
    )
    fig.text(
        0.02,
        0.915,
        "FoodKeeper v128. Edamame's after-thawing bar is 7 days, which is the published 1 week. Lighter bar is the rest of the range.",
        fontsize=10,
        color=MUTED,
        va="top",
    )
    fig.text(
        0.5,
        0.015,
        "Windows: FoodKeeper products 331, 174, and 641. Prices: fiber-per-dollar-2026.csv. Not a photograph.",
        ha="center",
        fontsize=8,
        color=MUTED,
    )
    fig.subplots_adjust(left=0.16, right=0.98, top=0.84, bottom=0.14, wspace=0.72)
    fig.savefig(
        OUT / THAW_CHART,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)


def main() -> None:
    rows = dairy_rows()
    prices = frozen_prices()
    dairy_chart(rows)
    thaw_chart(prices)
    print(OUT / DAIRY_CHART)
    for row in rows:
        sodium = f"{row['sodium']} mg" if row["sodium"] else "not on the sodium sheet"
        diaas = row["diaas"] or "not on the quality sheet"
        print(
            f"{row['food']}\t{row['grams']} g/$\t${row['cost30']}\t${row['per_gram']}/g\t"
            f"${row['pound']}/454g\t{sodium}\tDIAAS {diaas}\tcap {row['capped'] or 'blank'}"
        )
    print(OUT / THAW_CHART)
    for name, price in prices:
        print(f"{name}\t${price}")


if __name__ == "__main__":
    main()
