"""Chart heroes for the no-cook emergency list and the dairy-vs-soy page.

Bar lengths are read from the public CSVs. Do not hardcode them.
Neither file is a photograph.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images"

ORANGE = "#F29B30"
DEEP = "#B3651B"
SLATE = "#334155"
MUTED = "#64748B"

NOCOOK_CHART = "no-cook-emergency-protein-and-fiber-grocery-list-chart.jpg"
DAIRY_CHART = "cheapest-dairy-and-soy-protein-per-dollar-chart.jpg"

# Names match the CSV `food` column. Order is the table order on each page.
NOCOOK_FOODS = [
    ("Peanut butter", "Peanut butter"),
    ("Dry roasted peanuts", "Dry roasted peanuts"),
    ("Sunflower seed kernels", "Sunflower kernels"),
    ("Canned black beans", "Canned black beans"),
    ("Whole milk", "Whole milk"),
    ("Greek yogurt (plain, nonfat)", "Greek yogurt"),
    ("Rotisserie chicken (whole, cooked)", "Rotisserie chicken"),
    ("Cottage cheese (4%)", "Cottage cheese"),
    ("Canned tuna (chunk light, in water)", "Canned tuna"),
    ("Carrots (whole, bagged)", "Whole carrots"),
    ("Prunes (dried plums)", "Prunes"),
    ("Apples (gala)", "Gala apples"),
]
NOCOOK_FDC = {
    "Peanut butter": "174266",
    "Dry roasted peanuts": "174262",
    "Sunflower seed kernels": "170562",
    "Canned black beans": "175188",
    "Whole milk": "171265",
    "Greek yogurt (plain, nonfat)": "170894",
    "Rotisserie chicken (whole, cooked)": "171054",
    "Cottage cheese (4%)": "172179",
    "Canned tuna (chunk light, in water)": "173709",
    "Carrots (whole, bagged)": "170393",
    "Prunes (dried plums)": "168162",
    "Apples (gala)": "168204",
}

DAIRY_FOODS = [
    ("Eggs (large)", "Eggs"),
    ("Mozzarella (low-moisture part-skim)", "Mozzarella"),
    ("Whole milk", "Whole milk"),
    ("Greek yogurt (plain, nonfat)", "Greek yogurt"),
    ("Cottage cheese (4%)", "Cottage cheese"),
    ("Cheddar cheese", "Cheddar"),
    ("Frozen shelled edamame", "Edamame"),
    ("Tofu (extra firm)", "Extra-firm tofu"),
    ("Tempeh", "Tempeh"),
]
DAIRY_FDC = {
    "Eggs (large)": "171287",
    "Mozzarella (low-moisture part-skim)": "171244",
    "Whole milk": "171265",
    "Greek yogurt (plain, nonfat)": "170894",
    "Cottage cheese (4%)": "172179",
    "Cheddar cheese": "173414",
    "Frozen shelled edamame": "168410",
    "Tofu (extra firm)": "174290",
    "Tempeh": "174272",
}


def setup() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.titlesize": 18,
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )


def load(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def by_food(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {row["food"]: row for row in rows}


def save(fig: plt.Figure, name: str, source: str) -> None:
    fig.text(
        0.5,
        0.012,
        f"Data: {source} | USDA FoodData Central | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT / name, dpi=100, facecolor="white")
    plt.close(fig)


def heading(fig: plt.Figure, title: str, subtitle: str) -> None:
    fig.text(0.06, 0.975, title, color=SLATE, fontsize=16, fontweight="bold", va="top")
    fig.text(0.06, 0.930, subtitle, color=MUTED, fontsize=10, va="top")


def require_fdc(row: dict[str, str], food: str, expected: str) -> None:
    if row.get("fdc_id") != expected:
        raise SystemExit(f"{food} fdc_id is {row.get('fdc_id')}, expected {expected}")


def nocook_chart() -> None:
    protein_rows = by_food(load("no-cook-protein-per-dollar-2026.csv"))
    fiber_rows = by_food(load("fiber-per-dollar-2026.csv"))
    snack_rows = by_food(load("high-fiber-snacks-per-dollar-2026.csv"))

    labels = []
    protein = []
    fiber = []
    for food, label in NOCOOK_FOODS:
        labels.append(label)
        protein_row = protein_rows.get(food)
        fiber_row = fiber_rows.get(food)
        snack_row = snack_rows.get(food)
        if protein_row is None and fiber_row is None:
            raise SystemExit(f"{food} is missing from both the no-cook and fiber files")
        if protein_row is not None:
            require_fdc(protein_row, food, NOCOOK_FDC[food])
            protein.append(float(protein_row["value"]))
        else:
            protein.append(np.nan)
        if fiber_row is not None:
            require_fdc(fiber_row, food, NOCOOK_FDC[food])
            fiber_value = float(fiber_row["fiber_g_per_dollar"])
            if snack_row is not None and snack_row.get("fdc_id") == fiber_row["fdc_id"]:
                if float(snack_row["value"]) != fiber_value:
                    raise SystemExit(f"{food} fiber files disagree")
            fiber.append(fiber_value)
        else:
            fiber.append(np.nan)
        if protein_row is None and fiber_row is None:
            raise SystemExit(food)

    protein_values = np.array(protein, dtype=float)
    fiber_values = np.array(fiber, dtype=float)
    y = np.arange(len(labels))

    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.24, right=0.96, top=0.78, bottom=0.08)
    ax.barh(y - 0.18, protein_values, height=0.32, color=ORANGE, label="Protein per dollar")
    ax.barh(y + 0.18, fiber_values, height=0.32, color=SLATE, label="Fiber per dollar")
    ax.set_yticks(y, labels)
    ax.invert_yaxis()
    heading(
        fig,
        "No-cook protein and fiber per dollar",
        "12 foods. A missing bar means that file has no row, not a measured zero.",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=9)
    ax.grid(False)
    finite = np.concatenate([protein_values[np.isfinite(protein_values)], fiber_values[np.isfinite(fiber_values)]])
    max_value = float(finite.max())
    ax.set_xlim(0, max_value * 1.22)
    pad = max_value * 0.012
    for index, value in enumerate(protein_values):
        fiber_value = fiber_values[index]
        if np.isfinite(value):
            # When the fiber bar is longer, the protein label has to clear it.
            label_at = value
            if np.isfinite(fiber_value) and fiber_value > value:
                label_at = fiber_value
            ax.text(label_at + pad, index - 0.18, f"{value:.1f} g", va="center", color=SLATE, fontsize=8, fontweight="bold")
        if np.isfinite(fiber_value):
            ax.text(fiber_value + pad, index + 0.18, f"{fiber_value:.1f} g", va="center", color=SLATE, fontsize=8, fontweight="bold")
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Protein, grams per dollar"),
            Patch(facecolor=SLATE, label="Fiber, grams per dollar"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.24, 0.855),
        ncol=2,
        fontsize=8,
    )
    save(
        fig,
        NOCOOK_CHART,
        "no-cook-protein-per-dollar-2026.csv, fiber-per-dollar-2026.csv, high-fiber-snacks-per-dollar-2026.csv",
    )


def dairy_chart() -> None:
    dairy_rows = by_food(load("dairy-protein-per-dollar-ranked-2026.csv"))
    protein_rows = by_food(load("protein-per-dollar-2026.csv"))
    sodium_rows = {row["fdc_id"]: row for row in load("sodium-per-dollar-2026.csv") if row.get("fdc_id")}

    if len(dairy_rows) != 6:
        raise SystemExit(f"expected 6 dairy rows, found {len(dairy_rows)}")

    labels = []
    values = []
    colors = []
    for food, label in DAIRY_FOODS:
        source = dairy_rows.get(food) or protein_rows.get(food)
        if source is None:
            raise SystemExit(f"{food} is missing from the dairy and protein files")
        require_fdc(source, food, DAIRY_FDC[food])
        protein_row = protein_rows.get(food)
        if protein_row is not None and float(protein_row["protein_g_per_dollar"]) != float(source["value"] if "value" in source else source["protein_g_per_dollar"]):
            # Dairy file stores the rank in `value`. Protein file uses protein_g_per_dollar.
            dairy_value = float(source["value"]) if "value" in source and source["food"] in dairy_rows else float(source["protein_g_per_dollar"])
            if abs(dairy_value - float(protein_row["protein_g_per_dollar"])) > 0.05:
                raise SystemExit(f"{food} dairy and protein files disagree")
        gram_value = float(source["value"]) if food in dairy_rows else float(source["protein_g_per_dollar"])
        sodium = sodium_rows.get(DAIRY_FDC[food])
        if sodium is None:
            color = SLATE
        elif float(sodium["sodium_mg_per_100g"]) <= 140:
            color = ORANGE
        else:
            color = DEEP
        labels.append(label)
        values.append(gram_value)
        colors.append(color)

    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.22, right=0.96, top=0.78, bottom=0.08)
    positions = np.arange(len(labels))
    bars = ax.barh(positions, values, color=colors, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    heading(
        fig,
        "Dairy and soy protein per dollar",
        "Nine foods. Orange clears 140 mg sodium per 100 g. Slate has no sodium row in the file.",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=10)
    ax.grid(False)
    max_value = max(values)
    ax.set_xlim(0, max_value * 1.18)
    for bar, value in zip(bars, values):
        ax.text(
            value + max_value * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f} g",
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="140 mg sodium or less per 100 g"),
            Patch(facecolor=DEEP, label="Over 140 mg sodium per 100 g"),
            Patch(facecolor=SLATE, label="No sodium row in the file"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.22, 0.855),
        ncol=2,
        fontsize=8,
    )
    save(
        fig,
        DAIRY_CHART,
        "dairy-protein-per-dollar-ranked-2026.csv, protein-per-dollar-2026.csv, sodium-per-dollar-2026.csv, protein-quality-per-dollar-2026.csv",
    )


def main() -> None:
    setup()
    nocook_chart()
    dairy_chart()
    print(f"wrote {NOCOOK_CHART} and {DAIRY_CHART}")


if __name__ == "__main__":
    main()
