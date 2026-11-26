"""Dollar cost of 100 g of protein, raw versus DIAAS-adjusted.

Rates are checked against protein-per-dollar-2026.csv,
protein-quality-per-dollar-2026.csv, meat-per-dollar-protein-ranked-2026.csv,
and plant-protein-per-dollar-ranked-2026.csv. Pork shoulder has no DIAAS row,
so it gets a raw bar only. This file is a chart, not a photograph.
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
OUT = ROOT / "public" / "images" / "protein-swap-cost-calculator-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
TARGET = 100.0

# food, short label, raw g/$, protein g/100 g, score, capped, adjusted or None
FOODS = (
    ("Brown lentils (dry)", "Brown lentils", "77.7", "24.63", "0.63", "0.63", "49.0"),
    ("Pinto beans (dry)", "Pinto beans", "57.6", "21.42", "0.59", "0.59", "34.0"),
    ("Chicken drumsticks (bone-in)", "Drumsticks", "50.3", "18.08", "1.08", "1.00", "50.3"),
    ("Eggs (large)", "Eggs", "34.4", "12.56", "1.13", "1.00", "34.4"),
    ("Chicken thighs (boneless, skinless)", "Thighs", "27.7", "19.66", "1.08", "1.00", "27.7"),
    ("Pork shoulder butt roast (boneless)", "Pork shoulder", "25.2", "17.42", None, None, None),
    ("Chicken breast (boneless, skinless)", "Chicken breast", "24.6", "22.5", "1.08", "1.00", "24.6"),
    ("TVP (textured vegetable protein)", "TVP", "23.4", "52.17", "0.90", "0.90", "21.1"),
    ("Canned tuna (chunk light, in water)", "Canned tuna", "22.4", "19.44", "1.00", "1.00", "22.4"),
    ("Tofu (extra firm)", "Extra-firm tofu", "13.6", "9.98", "0.90", "0.90", "12.2"),
    ("Ground beef (80/20)", "Ground beef 80/20", "11.3", "17.17", "1.11", "1.00", "11.3"),
)

MEAT = {
    "Chicken drumsticks (bone-in)",
    "Chicken thighs (boneless, skinless)",
    "Pork shoulder butt roast (boneless)",
    "Chicken breast (boneless, skinless)",
    "Ground beef (80/20)",
}
PLANT = {
    "Brown lentils (dry)",
    "Pinto beans (dry)",
    "TVP (textured vegetable protein)",
    "Tofu (extra firm)",
}


def load(name: str) -> dict[str, dict[str, str]]:
    with (DATA / name).open(newline="", encoding="utf-8") as handle:
        return {row["food"]: row for row in csv.DictReader(handle)}


def require(row: dict[str, str], field: str, expected: str, food: str) -> None:
    if row[field] != expected:
        raise SystemExit(f"{food} {field} is {row[field]!r}, expected {expected}")


def main() -> None:
    protein = load("protein-per-dollar-2026.csv")
    quality = load("protein-quality-per-dollar-2026.csv")
    meat = load("meat-per-dollar-protein-ranked-2026.csv")
    plant = load("plant-protein-per-dollar-ranked-2026.csv")

    labels: list[str] = []
    raw_cost: list[float] = []
    adjusted_cost: list[float | None] = []

    for food, label, raw, per100, score, capped, adjusted in FOODS:
        protein_row = protein[food]
        require(protein_row, "protein_g_per_dollar", raw, food)
        require(protein_row, "protein_g_per_100g", per100, food)
        if food in MEAT:
            require(meat[food], "value", raw, food)
        if food in PLANT:
            require(plant[food], "value", raw, food)
        if adjusted is None:
            if food in quality:
                raise SystemExit(f"{food} unexpectedly gained a DIAAS row")
        else:
            quality_row = quality[food]
            require(quality_row, "protein_g_per_dollar", raw, food)
            require(quality_row, "diaas_score", score or "", food)
            require(quality_row, "diaas_capped_for_multiplication", capped or "", food)
            require(quality_row, "adjusted_g_per_dollar", adjusted, food)
        labels.append(label if adjusted else f"{label} (no DIAAS row)")
        raw_cost.append(TARGET / float(raw))
        adjusted_cost.append(None if adjusted is None else TARGET / float(adjusted))

    order = sorted(range(len(labels)), key=lambda index: raw_cost[index])
    labels = [labels[index] for index in order]
    raw_cost = [raw_cost[index] for index in order]
    adjusted_cost = [adjusted_cost[index] for index in order]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.24, right=0.98, top=0.74, bottom=0.12)
    positions = list(range(len(labels)))
    height = 0.36
    raw_bars = ax.barh(
        [pos + height / 2 for pos in positions],
        raw_cost,
        height=height,
        color=ORANGE,
        label="Raw cost of 100 g protein",
    )
    adjusted_positions = []
    adjusted_values = []
    for pos, value in zip(positions, adjusted_cost):
        if value is None:
            continue
        adjusted_positions.append(pos - height / 2)
        adjusted_values.append(value)
    adjusted_bars = ax.barh(
        adjusted_positions,
        adjusted_values,
        height=height,
        color=SLATE,
        label="DIAAS-adjusted cost of 100 g protein",
    )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=10)
    ax.grid(False)
    peak = max(raw_cost + adjusted_values)
    ax.set_xlim(0, peak * 1.22)
    for bar, value in list(zip(raw_bars, raw_cost)) + list(zip(adjusted_bars, adjusted_values)):
        ax.text(
            value + peak * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"${value:.2f}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.text(
        0.24,
        0.92,
        "What 100 g of protein costs, food against food",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.24,
        0.855,
        "Scores above 1.00 are capped at 1.00. Pork shoulder has no DIAAS row. Chart, not a photograph.",
        color=MUTED,
        fontsize=10,
        va="center",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Raw cost"),
            Patch(facecolor=SLATE, label="DIAAS-adjusted cost"),
        ],
        frameon=False,
        loc="lower center",
        bbox_to_anchor=(0.62, 0.76),
        ncol=2,
        fontsize=9,
    )
    fig.text(
        0.5,
        0.03,
        "Data: protein-per-dollar-2026.csv and protein-quality-per-dollar-2026.csv. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
