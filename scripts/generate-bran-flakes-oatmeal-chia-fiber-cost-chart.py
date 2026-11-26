"""Grouped bars: fiber in one serving vs. fiber per dollar.

Serving grams and the dollar rates come from fiber-per-dollar-2026.csv,
protein-per-dollar-2026.csv, the USDA cache, and the ranked-food fixture.
Wheat bran has a USDA cup and no price row, so its dollar bar is absent.
Bran flakes stay a close proxy. Do not hardcode the bar lengths.
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
DAY = ROOT / "public" / "data" / "fiber-day-cost-2026.csv"
CACHE = ROOT / "src" / "data" / "fdc-cache.json"
FIXTURE = ROOT / "tests" / "fixtures" / "usda-fdc-ranked-food-records-2026.json"
OUT = ROOT / "public" / "images" / "bran-flakes-vs-oatmeal-vs-chia-seeds-fiber-cost-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# Portion weights are USDA household measures from the cache, except bran
# flakes. That 45 g row is the day-menu portion already published in
# fiber-day-cost-2026.csv ("about 1.5 cups"). USDA publishes no cup weight
# for FDC 173888 in the cache.
PORTIONS = [
    ("169722", "Wheat bran, 1 cup", Decimal("58"), "cache-cup"),
    ("170554", "Chia seeds, 1 oz", Decimal("28.35"), "cache-oz"),
    ("173888", "Bran flakes, 45 g", Decimal("45"), "day-menu"),
    ("173904", "Rolled oats, 1/2 cup", Decimal("40.5"), "half-cup"),
    ("173944", "Banana, medium", Decimal("118"), "cache-medium"),
    ("170016", "Frozen peas, 1/2 cup", Decimal("67"), "half-cup"),
]


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def half_up(value: Decimal, places: str) -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def money(value: Decimal) -> str:
    return f"${half_up(value, '0.01'):.2f}"


def main() -> None:
    fiber = {row["fdc_id"]: row for row in load_csv(FIBER) if row["fdc_id"]}
    protein = {row["fdc_id"]: row for row in load_csv(PROTEIN) if row["fdc_id"]}
    cache = json.loads(CACHE.read_text(encoding="utf-8"))["foods"]
    fixture = {
        str(row["fdc_id"]): row
        for row in json.loads(FIXTURE.read_text(encoding="utf-8"))["records"]
    }
    day_bran = next(
        row
        for row in load_csv(DAY)
        if row["fdc_id"] == "173888" and row["grams_used"] == "45"
    )

    rows = []
    for fdc_id, label, grams, portion_kind in PORTIONS:
        cached = cache.get(fdc_id)
        priced = fiber.get(fdc_id)
        protein_row = protein.get(fdc_id)
        recorded = fixture.get(fdc_id)

        if fdc_id == "169722":
            if priced is not None or protein_row is not None:
                raise SystemExit("wheat bran unexpectedly gained a price row")
            if cached is None:
                raise SystemExit("wheat bran missing from the USDA cache")
            cup = next(
                portion
                for portion in cached["portions"]
                if portion["modifier"] == "cup" and portion["amount"] == 1
            )
            if Decimal(str(cup["grams"])) != grams:
                raise SystemExit(f"wheat bran cup is {cup['grams']}, not {grams}")
            fiber_100 = Decimal(str(cached["nutrientsPer100g"]["fiber"]))
            protein_100 = Decimal(str(cached["nutrientsPer100g"]["protein"]))
            if fiber_100 != Decimal("42.8") or protein_100 != Decimal("15.55"):
                raise SystemExit("wheat bran nutrients drifted from the cache check")
            dollar = None
            cost = None
        else:
            if priced is None:
                raise SystemExit(f"{fdc_id} missing from the fiber file")
            fiber_100 = Decimal(priced["fiber_g_per_100g"])
            dollar = Decimal(priced["fiber_g_per_dollar"])
            if cached is not None:
                cache_fiber = Decimal(str(cached["nutrientsPer100g"]["fiber"]))
                if cache_fiber != fiber_100:
                    raise SystemExit(f"{fdc_id} cache fiber {cache_fiber} != {fiber_100}")
            if recorded is not None and Decimal(str(recorded["fiber_g_per_100g"])) != fiber_100:
                raise SystemExit(f"{fdc_id} fixture fiber drifted")

            if fdc_id == "173888":
                if protein_row is not None:
                    raise SystemExit("bran flakes unexpectedly gained a protein-file row")
                if recorded is None or Decimal(str(recorded["protein_g_per_100g"])) != Decimal("9.9"):
                    raise SystemExit("bran flakes protein is not the 9.9 g fixture value")
                protein_100 = Decimal("9.9")
                if priced["nutrition_source_status"] != "proxy":
                    raise SystemExit("bran flakes lost the proxy flag")
                if day_bran["fiber_g"] != "8.2" or day_bran["cost_usd"] != "0.27":
                    raise SystemExit("45 g bran flakes day-menu row drifted")
            elif protein_row is not None:
                protein_100 = Decimal(protein_row["protein_g_per_100g"])
                if cached is not None:
                    cache_protein = Decimal(str(cached["nutrientsPer100g"]["protein"]))
                    if cache_protein != protein_100:
                        raise SystemExit(f"{fdc_id} cache protein {cache_protein} != {protein_100}")
            elif cached is not None:
                protein_100 = Decimal(str(cached["nutrientsPer100g"]["protein"]))
            else:
                raise SystemExit(f"{fdc_id} has no protein source")

            if fdc_id == "170554" and protein_row is not None:
                raise SystemExit("chia unexpectedly appeared in the protein file")
            if fdc_id == "173904":
                cup = next(
                    portion
                    for portion in cached["portions"]
                    if portion["modifier"] == "cup" and portion["amount"] == 1
                )
                if grams * 2 != Decimal(str(cup["grams"])):
                    raise SystemExit("oat portion is not half of the USDA cup")
            if fdc_id == "170016":
                cup = next(
                    portion
                    for portion in cached["portions"]
                    if portion["modifier"] == "cup" and portion["amount"] == 1
                )
                if grams * 2 != Decimal(str(cup["grams"])):
                    raise SystemExit("pea portion is not half of the USDA cup")
            if fdc_id == "173944":
                medium = next(
                    portion
                    for portion in cached["portions"]
                    if portion["modifier"].startswith("medium")
                )
                if Decimal(str(medium["grams"])) != grams:
                    raise SystemExit("banana portion is not the USDA medium")
                edible = Decimal(priced["edible_fraction"])
                if edible != Decimal("0.64"):
                    raise SystemExit("banana edible fraction drifted")
            if fdc_id == "170554":
                ounce = next(
                    portion
                    for portion in cached["portions"]
                    if portion["modifier"] == "oz" and portion["amount"] == 1
                )
                if Decimal(str(ounce["grams"])) != grams:
                    raise SystemExit("chia portion is not the USDA ounce")

            if fdc_id == "173944":
                purchased = grams / Decimal(priced["edible_fraction"])
                cost = Decimal(priced["price_per_100g_usd"]) * purchased / Decimal("100")
            else:
                cost = Decimal(priced["price_per_100g_usd"]) * grams / Decimal("100")

        fiber_serving = fiber_100 * grams / Decimal("100")
        protein_serving = protein_100 * grams / Decimal("100")
        rows.append(
            {
                "fdc_id": fdc_id,
                "label": label,
                "grams": grams,
                "portion_kind": portion_kind,
                "fiber_100": fiber_100,
                "protein_100": protein_100,
                "fiber_serving": half_up(fiber_serving, "0.1"),
                "protein_serving": half_up(protein_serving, "0.1"),
                "dollar": dollar,
                "cost": None if cost is None else half_up(cost, "0.01"),
            }
        )

    rows.sort(key=lambda row: -row["fiber_serving"])
    labels = [row["label"] for row in rows]
    serving = [float(row["fiber_serving"]) for row in rows]
    dollar_bars = [0.0 if row["dollar"] is None else float(row["dollar"]) for row in rows]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 7.2), facecolor="white")
    fig.subplots_adjust(left=0.30, right=0.96, top=0.82, bottom=0.08)
    positions = list(range(len(labels)))
    height = 0.36
    serving_bars = ax.barh(
        [position + height / 2 for position in positions],
        serving,
        height=height,
        color=ORANGE,
    )
    dollar_drawn = ax.barh(
        [position - height / 2 for position in positions],
        dollar_bars,
        height=height,
        color=SLATE,
    )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.grid(False)
    peak = max(serving + dollar_bars)
    ax.set_xlim(0, peak * 1.28)
    for bar, row in zip(serving_bars, rows, strict=True):
        ax.text(
            float(row["fiber_serving"]) + peak * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{row['fiber_serving']} g",
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    for bar, row in zip(dollar_drawn, rows, strict=True):
        text = "not priced" if row["dollar"] is None else f"{row['dollar']} g"
        x = 0.4 if row["dollar"] is None else float(row["dollar"]) + peak * 0.015
        ax.text(
            x,
            bar.get_y() + bar.get_height() / 2,
            text,
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    fig.text(
        0.06,
        0.96,
        "Fiber in one serving vs. fiber per dollar",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.90,
        "Orange is the portion. Slate is grams per $1. Wheat bran has no price row.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Fiber in the serving"),
            Patch(facecolor=SLATE, label="Fiber per dollar"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.30, 0.84),
        ncol=2,
        fontsize=8,
    )
    fig.text(
        0.5,
        0.015,
        "Data: fiber-per-dollar-2026.csv and USDA FoodData Central | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)

    print(OUT)
    for row in rows:
        cost = "none" if row["cost"] is None else money(row["cost"])
        dollar = "none" if row["dollar"] is None else f"{row['dollar']} g/$"
        print(
            f"{row['label']}\t{row['grams']} g\t"
            f"fiber/100 {row['fiber_100']}\tprotein/100 {row['protein_100']}\t"
            f"serving fiber {row['fiber_serving']}\tprotein {row['protein_serving']}\t"
            f"{dollar}\tcost {cost}\t{row['portion_kind']}"
        )


if __name__ == "__main__":
    main()
