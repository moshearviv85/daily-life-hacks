"""Chart heroes for the discard troubleshooting page and the 20-minute pantry plates.

Bar lengths and dollar labels are computed from the public CSVs.
Hydration splits use flour = discard / (1 + h). Do not hardcode the bars.
Neither file is a picture of food.
"""

from __future__ import annotations

import csv
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images"

FIBER_CSV = "fiber-per-dollar-2026.csv"
PROTEIN_CSV = "protein-per-dollar-2026.csv"
SHELF_CSV = "shelf-stable-pantry-per-dollar-2026.csv"

ORANGE = "#F29B30"
SLATE = "#334155"
DARK = "#2F3542"
MUTED = "#697386"
GRID = "#E7E9ED"

# Pizza and gluten-free cards weigh 227 g and 200 g. 50% versus 100% is the stiff-jar miss.
DISCARD_BATCHES = ((200, 100), (200, 50), (227, 100), (227, 50))

# Gram weights are the plate. Rates come from the CSVs.
MEALS = (
    (
        "Chickpea peanut toast",
        (
            ("Canned chickpeas", 150),
            ("Peanut butter", 48),
            ("100% whole wheat bread", 56),
        ),
    ),
    (
        "Peanut toast with peanuts",
        (
            ("Peanut butter", 48),
            ("100% whole wheat bread", 84),
            ("Dry roasted peanuts", 28),
        ),
    ),
    (
        "Kidney beans and peanuts",
        (
            ("Canned kidney beans", 130),
            ("Dry roasted peanuts", 42),
            ("100% whole wheat bread", 56),
        ),
    ),
    (
        "Oats, peanut butter, almonds",
        (
            ("Old-fashioned rolled oats", 80),
            ("Peanut butter", 64),
            ("Almonds", 28),
        ),
    ),
    (
        "Peanut spaghetti",
        (
            ("Whole wheat spaghetti", 85),
            ("Peanut butter", 64),
            ("Almonds", 28),
        ),
    ),
    (
        "Chickpea sunflower toast",
        (
            ("Canned chickpeas", 150),
            ("Sunflower seed kernels", 28),
            ("100% whole wheat bread", 84),
        ),
    ),
    (
        "Black beans and almonds",
        (
            ("Canned black beans", 90),
            ("100% whole wheat bread", 56),
            ("Almonds", 42),
        ),
    ),
    (
        "Quinoa, almonds, and toast",
        (
            ("Quinoa (dry)", 60),
            ("Almonds", 42),
            ("100% whole wheat bread", 84),
        ),
    ),
)


def load(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def D(value: str | int | Decimal) -> Decimal:
    return Decimal(str(value))


def q(value: Decimal, places: int) -> Decimal:
    quantum = Decimal("1").scaleb(-places)
    return value.quantize(quantum, rounding=ROUND_HALF_UP)


def money(value: Decimal) -> str:
    return f"{q(value, 2):.2f}"


def tenth(value: Decimal) -> str:
    return f"{q(value, 1):.1f}"


def by_food(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {row["food"]: row for row in rows}


def discard_rows(flour_fiber: dict[str, str], flour_protein: dict[str, str]) -> list[dict[str, str]]:
    if flour_fiber["fdc_id"] != flour_protein["fdc_id"]:
        raise SystemExit("whole wheat flour FDC disagrees across the fiber and protein files")
    if flour_fiber["package_price_usd"] != flour_protein["package_price_usd"]:
        raise SystemExit("whole wheat flour package price disagrees across the fiber and protein files")
    if flour_fiber["package_weight_g"] != flour_protein["package_weight_g"]:
        raise SystemExit("whole wheat flour package weight disagrees across the fiber and protein files")
    package = D(flour_fiber["package_price_usd"])
    weight = D(flour_fiber["package_weight_g"])
    fiber_per_100 = D(flour_fiber["fiber_g_per_100g"])
    protein_per_100 = D(flour_protein["protein_g_per_100g"])
    rows = []
    for grams, hydration in DISCARD_BATCHES:
        ratio = D(hydration) / D(100)
        flour = D(grams) / (D(1) + ratio)
        water = D(grams) - flour
        cost = flour * package / weight
        rows.append(
            {
                "grams": str(grams),
                "hydration": str(hydration),
                "flour": tenth(flour),
                "water": tenth(water),
                "cost": money(cost),
                "fiber": tenth(flour * fiber_per_100 / D(100)),
                "protein": tenth(flour * protein_per_100 / D(100)),
                "costValue": cost,
                "flourValue": flour,
                "waterValue": water,
                "fdc": flour_fiber["fdc_id"],
            }
        )
    return rows


def meal_rows(
    fiber: dict[str, dict[str, str]],
    protein: dict[str, dict[str, str]],
    shelf: dict[str, dict[str, str]],
) -> list[dict[str, object]]:
    rows = []
    for name, parts in MEALS:
        fiber_g = protein_g = cost = Decimal(0)
        foods = []
        for food, grams in parts:
            frow = fiber[food]
            prow = protein[food]
            srow = shelf[food]
            if frow["fdc_id"] != prow["fdc_id"] or frow["fdc_id"] != srow["fdc_id"]:
                raise SystemExit(f"{food} FDC disagrees across the three files")
            if frow["price_per_100g_usd"] != prow["price_per_100g_usd"]:
                raise SystemExit(f"{food} price per 100 g disagrees across the fiber and protein files")
            if srow["value"] != prow["protein_g_per_dollar"]:
                raise SystemExit(f"{food} shelf-stable value is not the protein grams per dollar")
            grams_d = D(grams)
            fiber_g += D(frow["fiber_g_per_100g"]) * grams_d / D(100)
            protein_g += D(prow["protein_g_per_100g"]) * grams_d / D(100)
            cost += D(frow["price_per_100g_usd"]) * grams_d / D(100)
            foods.append({"food": food, "grams": grams, "fdc": frow["fdc_id"]})
        rows.append(
            {
                "name": name,
                "foods": foods,
                "fiber": tenth(fiber_g),
                "protein": tenth(protein_g),
                "cost": money(cost),
                "fiberValue": fiber_g,
                "costValue": cost,
            }
        )
    return rows


def save(fig: plt.Figure, name: str) -> None:
    path = OUT / name
    fig.savefig(path, format="jpg", dpi=100, facecolor="white")
    plt.close(fig)
    print(path)


def draw_discard(rows: list[dict[str, str]]) -> None:
    labels = [f"{row['grams']} g at {row['hydration']}%" for row in rows]
    flour = [float(row["flourValue"]) for row in rows]
    water = [float(row["waterValue"]) for row in rows]
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.22, right=0.96, top=0.78, bottom=0.16)
    positions = np.arange(len(labels))
    height = 0.36
    flour_bars = ax.barh(positions - height / 2, flour, height, color=ORANGE, label="Flour")
    ax.barh(positions + height / 2, water, height, color=SLATE, label="Water")
    ceiling = max(flour + water) * 1.28
    ax.set_xlim(0, ceiling)
    ax.set_yticks(positions, labels=labels, fontsize=12, color=DARK)
    ax.invert_yaxis()
    ax.set_xlabel("Grams already in the scoop", color=DARK, fontsize=12)
    ax.tick_params(axis="x", colors=MUTED)
    ax.tick_params(axis="y", length=0)
    ax.spines[:].set_visible(False)
    ax.xaxis.grid(True, color=GRID)
    ax.set_axisbelow(True)
    ax.legend(frameon=False, loc="lower right", fontsize=11)
    for bar, row in zip(flour_bars, rows, strict=True):
        ax.text(
            bar.get_width() + ceiling * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{row['flour']} g  ${row['cost']}",
            va="center",
            color=DARK,
            fontsize=11,
            fontweight="bold",
        )
    fig.text(
        0.06,
        0.94,
        "50% discard hides more flour than a 100% jar",
        color=DARK,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.875,
        "Flour cost uses the whole wheat bag. Water is the rest of the scoop.",
        color=MUTED,
        fontsize=12,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "Data: fiber-per-dollar-2026.csv whole wheat flour row | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    save(fig, "sourdough-discard-pizza-and-bread-troubleshooting-chart.jpg")


def draw_meals(rows: list[dict[str, object]]) -> None:
    # Rank on the printed receipt, not the unrounded cent, so a $0.90 tie
    # breaks toward the lower fiber number the same way the article table does.
    ranked = sorted(rows, key=lambda row: (q(row["costValue"], 2), q(row["fiberValue"], 1), row["name"]))
    labels = [str(row["name"]) for row in ranked]
    fiber = [float(row["fiberValue"]) for row in ranked]
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.28, right=0.96, top=0.78, bottom=0.14)
    positions = np.arange(len(labels))
    bars = ax.barh(positions, fiber, color=ORANGE, height=0.62)
    ceiling = max(fiber) * 1.35
    ax.set_xlim(0, ceiling)
    ax.set_yticks(positions, labels=labels, fontsize=11, color=DARK)
    ax.invert_yaxis()
    ax.set_xlabel("Fiber grams in one plate", color=DARK, fontsize=12)
    ax.tick_params(axis="x", colors=MUTED)
    ax.tick_params(axis="y", length=0)
    ax.spines[:].set_visible(False)
    ax.xaxis.grid(True, color=GRID)
    ax.set_axisbelow(True)
    for bar, row in zip(bars, ranked, strict=True):
        ax.text(
            bar.get_width() + ceiling * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{row['fiber']} g   ${row['cost']}",
            va="center",
            color=DARK,
            fontsize=11,
            fontweight="bold",
        )
    fig.text(
        0.06,
        0.94,
        "Eight 20-minute pantry plates, fiber versus cost",
        color=DARK,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.875,
        "Cheapest plate at the top. Bar length is fiber. The label is the receipt.",
        color=MUTED,
        fontsize=12,
        va="top",
    )
    fig.text(
        0.5,
        0.03,
        "Data: fiber-per-dollar-2026.csv, protein-per-dollar-2026.csv, shelf-stable-pantry-per-dollar-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    save(fig, "20-minute-high-fiber-meals-from-pantry-staples-chart.jpg")


def main() -> None:
    fiber = by_food(load(FIBER_CSV))
    protein = by_food(load(PROTEIN_CSV))
    shelf = by_food(load(SHELF_CSV))
    discard = discard_rows(fiber["Whole wheat flour"], protein["Whole wheat flour"])
    meals = meal_rows(fiber, protein, shelf)
    print("DISCARD")
    for row in discard:
        print(
            f"{row['grams']} g {row['hydration']}% flour {row['flour']} water {row['water']} "
            f"cost ${row['cost']} fiber {row['fiber']} protein {row['protein']} fdc {row['fdc']}"
        )
    print("MEALS")
    for row in sorted(meals, key=lambda item: (q(item["costValue"], 2), q(item["fiberValue"], 1), item["name"])):
        foods = ", ".join(f"{part['grams']} g {part['food']} ({part['fdc']})" for part in row["foods"])
        print(f"{row['name']}: {row['fiber']} g fiber, {row['protein']} g protein, ${row['cost']} | {foods}")
    draw_discard(discard)
    draw_meals(meals)


if __name__ == "__main__":
    main()
