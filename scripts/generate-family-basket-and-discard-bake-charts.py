"""Chart heroes for the family grocery basket and the discard flour cost.

Dollars are computed from the CSVs and the whole-wheat package price.
Gram weights are the baskets. Do not hardcode the dollar labels.
"""

import csv
import json
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images"

PROTEIN_CSV = "protein-per-dollar-2026.csv"
FIBER_CSV = "fiber-per-dollar-2026.csv"
PROTEIN_DAY_CSV = "protein-day-cost-2026.csv"
FIBER_DAY_CSV = "fiber-day-cost-2026.csv"

ORANGE = "#F29B30"
SLATE = "#334155"
DARK = "#2F3542"
MUTED = "#697386"

# Edible grams for drumsticks. Every other amount is as purchased.
STAPLE = [
    ("Old-fashioned rolled oats", 140, False),
    ("Eggs (large)", 250, False),
    ("Brown lentils (dry)", 160, False),
    ("Black beans (dry)", 160, False),
    ("Chicken drumsticks (bone-in)", 180, True),
    ("Whole wheat flour", 220, False),
    ("Carrots (whole, bagged)", 350, False),
    ("Green cabbage", 400, False),
    ("Frozen green peas", 280, False),
]
CONVENIENCE = [
    ("Chicken breast (boneless, skinless)", 240, False),
    ("Ground beef (80/20)", 170, False),
    ("Canned black beans", 1070, False),
    ("100% whole wheat bread", 420, False),
    ("Strawberries", 690, False),
]
DISCARD_BATCHES = ((113, 100), (113, 80), (227, 100), (227, 80))


def load(name):
    with (DATA / name).open(newline="") as handle:
        return list(csv.DictReader(handle))


def D(value):
    return Decimal(str(value))


def q(value, places):
    quantum = Decimal("1").scaleb(-places)
    return value.quantize(quantum, rounding=ROUND_HALF_UP)


def money(value):
    return f"{q(value, 2):.2f}"


def tenth(value):
    return f"{q(value, 1):.1f}"


def nutrients(protein, fiber, food, grams, edible_grams):
    prow = protein.get(food)
    frow = fiber.get(food)
    row = prow or frow
    if row is None:
        raise SystemExit(f"missing food: {food}")
    grams = D(grams)
    price = D(row["price_per_100g_usd"])
    edible = D(row["edible_fraction"])
    if edible_grams:
        if prow is None:
            raise SystemExit(f"{food} has no protein row for an edible portion")
        cost = grams * price / edible / D(100)
        protein_g = grams * D(prow["protein_g_per_100g"]) / D(100)
        fiber_g = D(0) if frow is None else grams * D(frow["fiber_g_per_100g"]) / D(100)
        purchased = grams / edible
    elif edible != 1:
        cost = grams * price / D(100)
        factor = grams * edible / D(100)
        protein_g = D(0) if prow is None else factor * D(prow["protein_g_per_100g"])
        fiber_g = D(0) if frow is None else factor * D(frow["fiber_g_per_100g"])
        purchased = grams
    else:
        cost = grams * price / D(100)
        protein_g = D(0) if prow is None else grams * D(prow["protein_g_per_100g"]) / D(100)
        fiber_g = D(0) if frow is None else grams * D(frow["fiber_g_per_100g"]) / D(100)
        purchased = grams
    return {
        "food": food,
        "grams": int(grams),
        "edibleGrams": edible_grams,
        "purchasedGrams": tenth(purchased),
        "protein": protein_g,
        "fiber": fiber_g,
        "cost": cost,
        "proteinPerDollar": None if prow is None else prow["protein_g_per_dollar"],
        "fiberPerDollar": None if frow is None else frow["fiber_g_per_dollar"],
        "fdcId": row["fdc_id"],
        "sourceUrl": row["source_url"],
        "pricedMonth": row.get("priced_month") or "",
    }


def basket(protein, fiber, items):
    rows = [nutrients(protein, fiber, *item) for item in items]
    protein_g = sum((row["protein"] for row in rows), D(0))
    fiber_g = sum((row["fiber"] for row in rows), D(0))
    cost = sum((row["cost"] for row in rows), D(0))
    payload_rows = []
    for row in rows:
        payload_rows.append({
            "food": row["food"],
            "grams": row["grams"],
            "edibleGrams": row["edibleGrams"],
            "purchasedGrams": row["purchasedGrams"],
            "protein": tenth(row["protein"]),
            "fiber": tenth(row["fiber"]),
            "cost": money(row["cost"]),
            "proteinPerDollar": row["proteinPerDollar"],
            "fiberPerDollar": row["fiberPerDollar"],
            "fdcId": row["fdcId"],
            "sourceUrl": row["sourceUrl"],
            "pricedMonth": row["pricedMonth"],
        })
    return {
        "rows": payload_rows,
        "dayProtein": tenth(protein_g),
        "dayFiber": tenth(fiber_g),
        "dayCost": money(cost),
        "weekProtein": tenth(protein_g * 7),
        "weekFiber": tenth(fiber_g * 7),
        "weekCost": money(cost * 7),
        "weekCosts": [float(row["cost"] * 7) for row in rows],
    }


def day_total(name, gram_column, day_prefix):
    grams = D(0)
    cost = D(0)
    for row in load(name):
        if not row["day"].startswith(day_prefix):
            continue
        grams += D(row[gram_column])
        cost += D(row["cost_usd"])
    return {"grams": tenth(grams), "cost": money(cost)}


def discard_rows(flour_row):
    package = D(flour_row["package_price_usd"])
    weight = D(flour_row["package_weight_g"])
    rows = []
    for grams, hydration in DISCARD_BATCHES:
        ratio = D(hydration) / D(100)
        flour = D(grams) / (1 + ratio)
        water = D(grams) - flour
        cost = flour * package / weight
        rows.append({
            "grams": grams,
            "hydration": hydration,
            "flour": tenth(flour),
            "water": tenth(water),
            "cost": money(cost),
            "costValue": float(cost),
        })
    return rows


def payload():
    protein = {row["food"]: row for row in load(PROTEIN_CSV)}
    fiber = {row["food"]: row for row in load(FIBER_CSV)}
    flour = protein["Whole wheat flour"]
    if flour["package_price_usd"] != fiber["Whole wheat flour"]["package_price_usd"]:
        raise SystemExit("whole wheat flour package price disagrees across the two files")
    return {
        "staple": basket(protein, fiber, STAPLE),
        "convenience": basket(protein, fiber, CONVENIENCE),
        "proteinDay1": day_total(PROTEIN_DAY_CSV, "protein_g", "Day 1"),
        "fiberDay1": day_total(FIBER_DAY_CSV, "fiber_g", "Day 1"),
        "discard": discard_rows(flour),
        "flourPackage": flour["package_price_usd"],
        "flourPackageWeight": flour["package_weight_g"],
        "flourProteinPerDollar": flour["protein_g_per_dollar"],
        "flourFiberPerDollar": fiber["Whole wheat flour"]["fiber_g_per_dollar"],
    }


def draw_baskets(data):
    import matplotlib.pyplot as plt

    labels = ["Staple", "Convenience"]
    values = [float(data["staple"]["weekCost"]), float(data["convenience"]["weekCost"])]
    colors = [ORANGE, SLATE]
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.16, right=0.94, top=0.78, bottom=0.16)
    bars = ax.barh(labels[::-1], values[::-1], color=colors[::-1], height=0.55)
    ceiling = max(values) * 1.18
    ax.set_xlim(0, ceiling)
    ax.set_xlabel("7-day cost of the priced foods (USD)", color=DARK, fontsize=12)
    ax.tick_params(colors=MUTED)
    ax.spines[:].set_visible(False)
    ax.xaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    for bar, value in zip(bars, values[::-1]):
        ax.text(
            value + ceiling * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"${value:.2f}",
            va="center",
            color=DARK,
            fontsize=14,
            fontweight="bold",
        )
    fig.text(0.06, 0.94, "7-day family cart: staple vs convenience", color=DARK, fontsize=20, fontweight="bold", va="top")
    fig.text(
        0.06,
        0.875,
        "Both days clear 200.0 g protein and 112.0 g fiber. Week is 7 times the unrounded day.",
        color=MUTED,
        fontsize=12,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "Data: protein-per-dollar-2026.csv and fiber-per-dollar-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    path = OUT / "cheapest-family-grocery-basket-for-protein-and-fiber-chart.jpg"
    fig.savefig(path, format="jpg")
    plt.close(fig)
    return path


def draw_discard(data):
    import matplotlib.pyplot as plt
    import numpy as np

    batches = [113, 227]
    hydrations = [100, 80]
    by_key = {(row["grams"], row["hydration"]): row["costValue"] for row in data["discard"]}
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.12, right=0.96, top=0.78, bottom=0.16)
    positions = np.arange(len(batches))
    width = 0.34
    series = []
    for offset, hydration, color, label in (
        (-width / 2, 100, ORANGE, "100% hydration"),
        (width / 2, 80, SLATE, "80% hydration"),
    ):
        values = [by_key[(grams, hydration)] for grams in batches]
        bars = ax.bar(positions + offset, values, width, color=color, label=label)
        series.append((bars, values))
    ceiling = max(row["costValue"] for row in data["discard"]) * 1.28
    ax.set_ylim(0, ceiling)
    ax.set_xticks(positions, [f"{grams} g discard" for grams in batches], fontsize=12, color=DARK)
    ax.set_ylabel("Flour cost in the scoop (USD)", color=DARK, fontsize=12)
    ax.tick_params(axis="y", colors=MUTED)
    ax.spines[:].set_visible(False)
    ax.yaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    for bars, values in series:
        for bar, value in zip(bars, values):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                value + ceiling * 0.02,
                f"${value:.2f}",
                ha="center",
                va="bottom",
                color=DARK,
                fontsize=12,
                fontweight="bold",
            )
    ax.legend(frameon=False, loc="upper left", fontsize=11)
    fig.text(0.06, 0.94, "Flour already in the discard, per scoop", color=DARK, fontsize=20, fontweight="bold", va="top")
    fig.text(
        0.06,
        0.875,
        "Whole wheat flour, $3.12 for a 5 lb bag. Water in the jar is not priced.",
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
    path = OUT / "sourdough-discard-vs-baking-powder-and-yeast-cost-per-bake-chart.jpg"
    fig.savefig(path, format="jpg")
    plt.close(fig)
    return path


def main():
    data = payload()
    if "--print" in sys.argv:
        printable = json.loads(json.dumps(data))
        for basket_name in ("staple", "convenience"):
            printable[basket_name].pop("weekCosts", None)
        for row in printable["discard"]:
            row.pop("costValue", None)
        json.dump(printable, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return
    draw_baskets(data)
    draw_discard(data)


if __name__ == "__main__":
    main()
