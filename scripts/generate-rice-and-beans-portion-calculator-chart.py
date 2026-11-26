"""Cost versus protein for one rice-and-beans dinner plate.

Each bar pair is 90 g of dry beans plus 60 g of dry brown rice.
Prices and protein rates are read from the published CSVs.
The figure is a chart.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images" / "rice-and-beans-portion-and-cost-calculator-chart.jpg"
RICE = "Brown rice (dry)"
BEAN_GRAMS = 90
RICE_GRAMS = 60

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"


def load(name):
    with (DATA / name).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def must(rows, food):
    for row in rows:
        if row["food"] == food:
            return row
    raise SystemExit(f"missing {food}")


def main():
    pairs = load("cheapest-complete-protein-pairs-2026.csv")
    costs = {row["food"]: row for row in load("canned-vs-dry-beans-cost-2026.csv")}
    pantry = {row["food"]: row for row in load("shelf-stable-pantry-per-dollar-2026.csv")}
    protein = {row["food"]: row for row in load("protein-per-dollar-2026.csv")}
    rice = must(list(pantry.values()), RICE)
    rice_protein = protein[RICE]
    plates = []
    for pair in pairs:
        if not pair["food"].endswith(f" + {RICE}"):
            continue
        food = pair["food"][: -len(f" + {RICE}")]
        bean = costs[food]
        bean_protein = protein[food]
        bean_cost = BEAN_GRAMS * float(bean["package_price_usd"]) / float(bean_protein["package_weight_g"])
        rice_cost = RICE_GRAMS * float(rice["package_price_usd"]) / float(rice_protein["package_weight_g"])
        bean_grams = BEAN_GRAMS * float(bean_protein["protein_g_per_100g"]) / 100
        rice_grams = RICE_GRAMS * float(rice_protein["protein_g_per_100g"]) / 100
        plates.append(
            {
                "label": food.replace(" (dry)", ""),
                "cost": bean_cost + rice_cost,
                "protein": bean_grams + rice_grams,
                "pair": float(pair["value"]),
            }
        )
    if len(plates) != 5:
        raise SystemExit(f"expected 5 plates, got {len(plates)}")

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(1, 2, figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.22, right=0.96, top=0.78, bottom=0.12, wspace=0.45)
    labels = [plate["label"] for plate in plates]
    positions = list(range(len(plates)))

    protein_bars = axes[0].barh(positions, [plate["protein"] for plate in plates], color=ORANGE, height=0.62)
    cost_bars = axes[1].barh(positions, [plate["cost"] for plate in plates], color=SLATE, height=0.62)
    for axis, bars, suffix in (
        (axes[0], protein_bars, "g"),
        (axes[1], cost_bars, ""),
    ):
        ceiling = max(bar.get_width() for bar in bars)
        axis.set_yticks(positions, labels)
        axis.invert_yaxis()
        axis.set_xlim(0, ceiling * 1.28)
        axis.spines[:].set_visible(False)
        axis.tick_params(axis="x", bottom=False, labelbottom=False)
        axis.tick_params(axis="y", length=0, labelsize=11, colors=SLATE)
        axis.grid(False)
        for bar in bars:
            text = f"{bar.get_width():.1f}{suffix}" if suffix else f"${bar.get_width():.2f}"
            axis.text(
                bar.get_width() + ceiling * 0.03,
                bar.get_y() + bar.get_height() / 2,
                text,
                va="center",
                color=SLATE,
                fontsize=10,
                fontweight="bold",
            )
    axes[0].set_xlabel("")
    fig.text(0.035, 0.94, "One Dinner Plate: Cost vs Protein", color=SLATE, fontsize=18, fontweight="bold", va="top")
    fig.text(
        0.035,
        0.875,
        "90 g dry beans + 60 g dry brown rice. Left is protein grams. Right is the bag price.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "Data: complete-protein pairs, bean cost, pantry, and protein CSVs | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, format="jpeg", pil_kwargs={"quality": 90, "optimize": True})
    plt.close(fig)


if __name__ == "__main__":
    main()
