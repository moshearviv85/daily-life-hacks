"""Chart heroes for the two dual-constraint grocery pages.

Every bar is read from the public CSVs at render time. The protein chart is
the join of protein-per-dollar-2026.csv and sodium-per-dollar-2026.csv: foods
at or under 140 mg sodium per 100 g and at least 9.9 g protein per 100 g.
The produce chart is produce-fiber-per-dollar-ranked-2026.csv, longest bar
first. Neither file is a photograph.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images"

ORANGE = "#F29B30"
DEEP = "#B3651B"
SLATE = "#334155"
MUTED = "#64748B"
SODIUM_MAX = 140.0
PROTEIN_MIN = 9.9

PROTEIN_CHART = "low-sodium-high-protein-foods-per-dollar-chart.jpg"
PRODUCE_CHART = "cheapest-high-fiber-fruits-and-vegetables-chart.jpg"


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


def save(fig, name: str, source: str) -> None:
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


def heading(fig, title: str, subtitle: str) -> None:
    fig.text(0.06, 0.975, title, color=SLATE, fontsize=16, fontweight="bold", va="top")
    fig.text(0.06, 0.930, subtitle, color=MUTED, fontsize=10, va="top")


def qualifying_protein_rows() -> list[dict[str, str]]:
    sodium = {row["fdc_id"]: row for row in load("sodium-per-dollar-2026.csv") if row["fdc_id"]}
    joined = []
    for protein in load("protein-per-dollar-2026.csv"):
        sodium_row = sodium.get(protein["fdc_id"])
        if not sodium_row:
            continue
        protein_per_100 = float(protein["protein_g_per_100g"])
        sodium_mg = float(sodium_row["sodium_mg_per_100g"])
        if sodium_mg <= SODIUM_MAX and protein_per_100 >= PROTEIN_MIN:
            joined.append(
                {
                    "food": protein["food"],
                    "protein_per_dollar": protein["protein_g_per_dollar"],
                    "protein_per_100g": protein["protein_g_per_100g"],
                    "sodium_mg": sodium_row["sodium_mg_per_100g"],
                    "fdc_id": protein["fdc_id"],
                    "value": float(protein["protein_g_per_dollar"]),
                    "sodium_value": sodium_mg,
                }
            )
    joined.sort(key=lambda row: (-row["value"], row["food"]))
    return joined


def protein_chart() -> None:
    rows = qualifying_protein_rows()
    if len(rows) != 25:
        raise SystemExit(f"expected 25 qualifying foods, found {len(rows)}")
    labels = [f"{row['food']}  ({row['sodium_mg']} mg)" for row in rows]
    values = [row["value"] for row in rows]
    colors = [ORANGE if row["sodium_value"] < 20 else SLATE for row in rows]

    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.34, right=0.96, top=0.78, bottom=0.07)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=colors, height=0.72)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    heading(
        fig,
        "Low-sodium foods, by protein per dollar",
        "25 foods at or under 140 mg sodium per 100 g, with at least 9.9 g protein per 100 g",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=7.5)
    ax.grid(False)
    ax.set_xlim(0, max(values) * 1.16)
    for bar, value in zip(bars, values):
        ax.text(
            value + max(values) * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} g",
            va="center",
            color=SLATE,
            fontsize=7.5,
            fontweight="bold",
        )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Under 20 mg sodium / 100 g"),
            Patch(facecolor=SLATE, label="20 to 140 mg sodium / 100 g"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.34, 0.855),
        ncol=2,
        fontsize=8,
    )
    save(
        fig,
        PROTEIN_CHART,
        "sodium-per-dollar-2026.csv and protein-per-dollar-2026.csv",
    )


def produce_chart() -> None:
    rows = load("produce-fiber-per-dollar-ranked-2026.csv")
    if len(rows) != 22:
        raise SystemExit(f"expected 22 produce rows, found {len(rows)}")
    rows.sort(key=lambda row: -float(row["value"]))
    labels = [row["food"] for row in rows]
    values = [float(row["value"]) for row in rows]
    palette = {
        "Frozen vegetables": ORANGE,
        "Fresh vegetables": DEEP,
        "Fresh fruit": SLATE,
    }
    colors = [palette[row["category"]] for row in rows]

    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.30, right=0.96, top=0.78, bottom=0.07)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=colors, height=0.72)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    heading(
        fig,
        "Fiber per dollar: fresh and frozen produce",
        "22 priced rows. Frozen peas lead at 17.6 g per dollar. Blueberries finish at 2.5 g.",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=8)
    ax.grid(False)
    ax.set_xlim(0, max(values) * 1.18)
    for bar, value in zip(bars, values):
        ax.text(
            value + max(values) * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} g",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.legend(
        handles=[Patch(facecolor=color, label=label) for label, color in palette.items()],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.30, 0.855),
        ncol=3,
        fontsize=8,
    )
    save(fig, PRODUCE_CHART, "produce-fiber-per-dollar-ranked-2026.csv")


def main() -> None:
    setup()
    protein_chart()
    produce_chart()
    print(f"wrote {PROTEIN_CHART} and {PRODUCE_CHART}")


if __name__ == "__main__":
    main()
