"""Grouped protein and fiber per dollar: Walmart bulk bags vs BLS averages.

Protein grams per dollar come from protein-per-dollar-2026.csv.
Fiber grams per dollar come from fiber-per-dollar-2026.csv when that
file prices the food. Greek yogurt and bone-in drumsticks are not in
the fiber file. Their fiber bars are 0 because FDC 170894 and FDC
172373 list 0 g fiber per 100 g. Eggs, milk, chicken breast, and
ground beef are also missing from the fiber file. Their fiber bars
are 0 because bls-nutrition-per-dollar-latest.csv records 0.00 g
fiber per 100 g on the matching FDC id. Do not hardcode the other bars.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
BLS = ROOT / "public" / "data" / "bls-nutrition-per-dollar-latest.csv"
OUT = (
    ROOT
    / "public"
    / "images"
    / "how-much-fiber-and-protein-per-dollar-at-walmart-vs-bls-chart.jpg"
)

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
WALMART = "#9A5B12"
BLS_COLOR = "#1F4E79"

# (food name in the protein file, short axis label, price basis)
FOODS = [
    ("Whole wheat flour", "WW flour", "Walmart"),
    ("Brown lentils (dry)", "Brown lentils", "Walmart"),
    ("Green split peas (dry)", "Split peas", "Walmart"),
    ("Chickpeas (dry)", "Chickpeas", "Walmart"),
    ("Chicken drumsticks (bone-in)", "Drumsticks", "Walmart"),
    ("Greek yogurt (plain, nonfat)", "Greek yogurt", "Walmart"),
    ("Navy beans (dry)", "Navy beans", "BLS"),
    ("Black beans (dry)", "Black beans", "BLS"),
    ("Pinto beans (dry)", "Pinto beans", "BLS"),
    ("Eggs (large)", "Eggs", "BLS"),
    ("Whole milk", "Whole milk", "BLS"),
    ("Chicken breast (boneless, skinless)", "Chicken breast", "BLS"),
    ("100% whole wheat bread", "WW bread", "BLS"),
    ("Ground beef (80/20)", "Ground beef 80/20", "BLS"),
]

# Fiber file has no row. Zero is the USDA or BLS-latest record, not a guess.
ZERO_FIBER_FDC = {
    "Chicken drumsticks (bone-in)": "172373",
    "Greek yogurt (plain, nonfat)": "170894",
    "Eggs (large)": "171287",
    "Whole milk": "171265",
    "Chicken breast (boneless, skinless)": "171077",
    "Ground beef (80/20)": "174036",
}


def load(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    protein = {row["food"]: row for row in load(PROTEIN)}
    fiber = {row["food"]: row for row in load(FIBER)}
    bls_zero = set()
    for row in load(BLS):
        if row["area_name"] != "U.S. city average":
            continue
        if float(row["fiber_g_per_100g"]) == 0:
            bls_zero.add(row["fdc_id"])

    labels: list[str] = []
    protein_bars: list[float] = []
    fiber_bars: list[float] = []
    for food, label, basis in FOODS:
        row = protein[food]
        if row["retailer"].startswith("Walmart") and basis != "Walmart":
            raise SystemExit(f"{food} is Walmart in the file")
        if row["retailer"] == "BLS" and basis != "BLS":
            raise SystemExit(f"{food} is BLS in the file")
        if basis == "Walmart" and not row["retailer"].startswith("Walmart"):
            raise SystemExit(f"{food} retailer is {row['retailer']}")
        labels.append(f"{label}  {basis}")
        protein_bars.append(float(row["protein_g_per_dollar"]))
        if food in fiber:
            fiber_bars.append(float(fiber[food]["fiber_g_per_dollar"]))
        else:
            fdc_id = ZERO_FIBER_FDC[food]
            if fdc_id != row["fdc_id"]:
                raise SystemExit(f"{food} fdc mismatch")
            if fdc_id not in {"170894", "172373"} and fdc_id not in bls_zero:
                raise SystemExit(f"{food} has no zero-fiber source")
            fiber_bars.append(0.0)

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    positions = list(range(len(labels)))
    height = 0.38
    protein_drawn = ax.barh(
        [position - height / 2 for position in positions],
        protein_bars,
        height=height,
        color=ORANGE,
        label="Protein",
    )
    fiber_drawn = ax.barh(
        [position + height / 2 for position in positions],
        fiber_bars,
        height=height,
        color=SLATE,
        label="Fiber",
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
        if value == 0:
            text = "0"
            x = peak * 0.01
        else:
            text = f"{value:.1f}"
            x = value + peak * 0.01
        ax.text(
            x,
            bar.get_y() + bar.get_height() / 2,
            text,
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )

    fig.text(
        0.04,
        0.975,
        "Walmart Bulk vs BLS: Protein and Fiber per Dollar",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.04,
        0.935,
        "Grams per dollar. Orange is protein. Slate is fiber. Labels name the price basis, not a store-vs-store match.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Protein, grams per $1"),
            Patch(facecolor=SLATE, label="Fiber, grams per $1"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.36, 0.90),
        ncol=2,
        fontsize=9,
    )
    # Color the basis word on each tick by painting a thin marker via tick labels.
    for tick, (_food, _label, basis) in zip(ax.get_yticklabels(), FOODS, strict=True):
        tick.set_color(WALMART if basis == "Walmart" else BLS_COLOR)
        tick.set_fontweight("bold")

    fig.text(
        0.5,
        0.012,
        "Chart from protein-per-dollar-2026.csv and fiber-per-dollar-2026.csv. Zero fiber is the USDA record or the October BLS file. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.subplots_adjust(left=0.24, right=0.98, top=0.86, bottom=0.06)
    fig.savefig(
        OUT,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)
    print(OUT)
    for (food, label, basis), protein_value, fiber_value in zip(
        FOODS, protein_bars, fiber_bars, strict=True
    ):
        print(f"{basis}\t{label}\t{protein_value:.1f}\t{fiber_value:.1f}\t{food}")


if __name__ == "__main__":
    main()
