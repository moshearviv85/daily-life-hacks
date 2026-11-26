"""Protein and fiber for eight cooler-free breakfast and lunch boxes.

Prices come from the grocery CSVs. Popcorn's eaten weight is air-popped
FDC 167959. Its cost scales the unpriced-id kernel row by 14.5/12.9, the
same two fiber figures the fiber file uses to derive the kernel rate.
Do not hardcode the bar lengths.
"""

from __future__ import annotations

import csv
import json
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
NOCOOK = ROOT / "public" / "data" / "no-cook-protein-per-dollar-2026.csv"
SHELF = ROOT / "public" / "data" / "shelf-stable-pantry-per-dollar-2026.csv"
SNACKS = ROOT / "public" / "data" / "high-fiber-snacks-per-dollar-2026.csv"
FIXTURE = ROOT / "tests" / "fixtures" / "usda-fdc-ranked-food-records-2026.json"
CACHE = ROOT / "src" / "data" / "fdc-cache.json"
OUT = (
    ROOT
    / "public"
    / "images"
    / "non-refrigerated-high-protein-breakfast-and-lunch-ideas-chart.jpg"
)

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# name, fdc, csv food, grams eaten
BOXES: list[tuple[str, list[tuple[str, str, str, str]]]] = [
    (
        "PB banana sandwich",
        [
            ("Peanut butter", "174266", "Peanut butter", "64"),
            ("Whole wheat bread", "172688", "100% whole wheat bread", "52"),
            ("Banana", "173944", "Bananas", "118"),
        ],
    ),
    (
        "PB, popcorn, prunes, bread",
        [
            ("Peanut butter", "174266", "Peanut butter", "48"),
            ("Air-popped popcorn", "167959", "Popcorn kernels", "25"),
            ("Prunes", "168162", "Prunes (dried plums)", "40"),
            ("Whole wheat bread", "172688", "100% whole wheat bread", "52"),
        ],
    ),
    (
        "Peanuts, prunes, bread",
        [
            ("Dry roasted peanuts", "174262", "Dry roasted peanuts", "70"),
            ("Prunes", "168162", "Prunes (dried plums)", "30"),
            ("Whole wheat bread", "172688", "100% whole wheat bread", "52"),
        ],
    ),
    (
        "Sunflower, banana, bread",
        [
            ("Sunflower kernels", "170562", "Sunflower seed kernels", "70"),
            ("Banana", "173944", "Bananas", "118"),
            ("Whole wheat bread", "172688", "100% whole wheat bread", "52"),
        ],
    ),
    (
        "Sunflower, bread, prunes",
        [
            ("Sunflower kernels", "170562", "Sunflower seed kernels", "70"),
            ("Whole wheat bread", "172688", "100% whole wheat bread", "52"),
            ("Prunes", "168162", "Prunes (dried plums)", "40"),
        ],
    ),
    (
        "Peanuts, bread, apple",
        [
            ("Dry roasted peanuts", "174262", "Dry roasted peanuts", "60"),
            ("Whole wheat bread", "172688", "100% whole wheat bread", "52"),
            ("Gala apple", "168204", "Apples (gala)", "180"),
        ],
    ),
    (
        "Sardines, popcorn, bread",
        [
            ("Sardines", "175139", "Sardines (canned in oil, drained)", "92"),
            ("Air-popped popcorn", "167959", "Popcorn kernels", "40"),
            ("Whole wheat bread", "172688", "100% whole wheat bread", "52"),
        ],
    ),
    (
        "Tuna, popcorn, banana, prunes",
        [
            ("Tuna", "173709", "Canned tuna (chunk light, in water)", "113"),
            ("Air-popped popcorn", "167959", "Popcorn kernels", "30"),
            ("Banana", "173944", "Bananas", "118"),
            ("Prunes", "168162", "Prunes (dried plums)", "20"),
        ],
    ),
]


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def by_food(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {row["food"]: row for row in rows}


def half_up(value: Decimal, places: str) -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def money(value: Decimal) -> str:
    return f"${half_up(value, '0.01'):.2f}"


def main() -> None:
    fiber = by_food(load_csv(FIBER))
    protein = by_food(load_csv(PROTEIN))
    nocook = by_food(load_csv(NOCOOK))
    shelf = by_food(load_csv(SHELF))
    snacks = by_food(load_csv(SNACKS))
    fixture = {
        str(row["fdc_id"]): row
        for row in json.loads(FIXTURE.read_text(encoding="utf-8"))["records"]
    }
    cache = json.loads(CACHE.read_text(encoding="utf-8"))["foods"]
    kernels = fiber["Popcorn kernels"]
    if kernels["fdc_id"]:
        raise SystemExit("popcorn kernels unexpectedly gained an FDC id")
    if kernels["fiber_g_per_100g"] != "12.9" or kernels["fiber_g_per_dollar"] != "51.3":
        raise SystemExit("popcorn kernel fiber row drifted")
    popped = fixture["167959"]
    if Decimal(str(popped["fiber_g_per_100g"])) != Decimal("14.5"):
        raise SystemExit("air-popped fiber is not 14.5 g")
    if Decimal(str(popped["protein_g_per_100g"])) != Decimal("12.94"):
        raise SystemExit("air-popped protein is not 12.94 g")
    ratio = Decimal("14.5") / Decimal(kernels["fiber_g_per_100g"])
    popped_price = Decimal(kernels["price_per_100g_usd"]) * ratio

    peanut = nocook["Peanut butter"]
    if peanut["value"] != "50.7":
        raise SystemExit("peanut butter protein per dollar drifted")
    if snacks["Peanut butter"]["value"] != fiber["Peanut butter"]["fiber_g_per_dollar"]:
        raise SystemExit("peanut butter snack fiber drifted")
    for food in (
        "Peanut butter",
        "Dry roasted peanuts",
        "Sunflower seed kernels",
        "100% whole wheat bread",
    ):
        if shelf[food]["value"] != protein[food]["protein_g_per_dollar"]:
            raise SystemExit(f"{food} shelf file drifted from the protein file")

    scored = []
    for title, parts in BOXES:
        protein_total = Decimal("0")
        fiber_total = Decimal("0")
        cost_total = Decimal("0")
        lines = []
        for label, fdc_id, food, grams_text in parts:
            grams = Decimal(grams_text)
            recorded = fixture[fdc_id]
            if fdc_id == "167959":
                protein_100 = Decimal(str(recorded["protein_g_per_100g"]))
                fiber_100 = Decimal(str(recorded["fiber_g_per_100g"]))
                price = popped_price
                edible = Decimal("1")
            else:
                protein_100 = Decimal(str(recorded["protein_g_per_100g"]))
                fiber_100 = Decimal(str(recorded["fiber_g_per_100g"]))
                priced = protein.get(food) or fiber[food]
                if priced["fdc_id"] != fdc_id:
                    raise SystemExit(f"{food} fdc {priced['fdc_id']} != {fdc_id}")
                if food in protein and Decimal(protein[food]["protein_g_per_100g"]) != protein_100:
                    raise SystemExit(f"{food} protein file != fixture")
                if food in fiber and Decimal(fiber[food]["fiber_g_per_100g"]) != fiber_100:
                    raise SystemExit(f"{food} fiber file != fixture")
                cached = cache.get(fdc_id)
                if cached is not None:
                    if Decimal(str(cached["nutrientsPer100g"]["protein"])) != protein_100:
                        raise SystemExit(f"{food} cache protein drifted")
                    if Decimal(str(cached["nutrientsPer100g"]["fiber"])) != fiber_100:
                        raise SystemExit(f"{food} cache fiber drifted")
                price = Decimal(priced["price_per_100g_usd"])
                edible = Decimal(priced["edible_fraction"])
            protein_g = protein_100 * grams / Decimal("100")
            fiber_g = fiber_100 * grams / Decimal("100")
            cost = price * (grams / edible) / Decimal("100")
            protein_total += protein_g
            fiber_total += fiber_g
            cost_total += cost
            lines.append(
                {
                    "label": label,
                    "grams": grams,
                    "protein": half_up(protein_g, "0.1"),
                    "fiber": half_up(fiber_g, "0.1"),
                    "cost": half_up(cost, "0.01"),
                }
            )
        protein_rounded = half_up(protein_total, "0.1")
        fiber_rounded = half_up(fiber_total, "0.1")
        cost_rounded = half_up(cost_total, "0.01")
        if protein_rounded < Decimal("20") or fiber_rounded < Decimal("8"):
            raise SystemExit(f"{title} missed 20 g protein or 8 g fiber")
        if cost_rounded < Decimal("0.75") or cost_rounded > Decimal("1.95"):
            raise SystemExit(f"{title} cost {cost_rounded} left the $0.75 to $1.95 band")
        scored.append(
            {
                "title": title,
                "protein": protein_rounded,
                "fiber": fiber_rounded,
                "cost": cost_rounded,
                "lines": lines,
            }
        )

    scored.sort(key=lambda box: (box["cost"], box["title"]))
    labels = [f"{box['title']} ({money(box['cost'])})" for box in scored]
    protein_bars = [float(box["protein"]) for box in scored]
    fiber_bars = [float(box["fiber"]) for box in scored]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 7.6), facecolor="white")
    fig.subplots_adjust(left=0.38, right=0.96, top=0.82, bottom=0.08)
    positions = list(range(len(labels)))
    height = 0.36
    protein_drawn = ax.barh(
        [position + height / 2 for position in positions],
        protein_bars,
        height=height,
        color=ORANGE,
    )
    fiber_drawn = ax.barh(
        [position - height / 2 for position in positions],
        fiber_bars,
        height=height,
        color=SLATE,
    )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=10)
    ax.grid(False)
    peak = max(protein_bars + fiber_bars)
    ax.set_xlim(0, peak * 1.22)
    for bar, value in list(zip(protein_drawn, protein_bars)) + list(zip(fiber_drawn, fiber_bars)):
        ax.text(
            value + peak * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f} g",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.text(
        0.06,
        0.96,
        "Cooler-free meals: protein, fiber, and cost",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.90,
        "Eight boxes. Cost is on the label. Every box clears 20 g protein and 8 g fiber.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Protein"),
            Patch(facecolor=SLATE, label="Fiber"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.38, 0.84),
        ncol=2,
        fontsize=8,
    )
    fig.text(
        0.5,
        0.015,
        "Data: grocery price files and USDA FoodData Central | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)

    print(OUT)
    print(f"popped price per 100 g {half_up(popped_price, '0.0001')} ratio {half_up(ratio, '0.0001')}")
    for box in scored:
        print(
            f"{box['title']}\tP {box['protein']}\tF {box['fiber']}\t{money(box['cost'])}"
        )
        for line in box["lines"]:
            print(
                f"  {line['label']}\t{line['grams']} g\t"
                f"P {line['protein']}\tF {line['fiber']}\t{money(line['cost'])}"
            )


if __name__ == "__main__":
    main()
