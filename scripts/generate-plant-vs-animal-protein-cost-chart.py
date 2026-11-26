"""Paired bar chart for plant versus animal protein per dollar.

Raw grams and DIAAS-adjusted grams are read from
public/data/protein-quality-per-dollar-2026.csv. Raw grams are checked
against the plant and animal ranking CSVs. The image is a chart, not a photo.
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
OUT = ROOT / "public" / "images" / "plant-vs-animal-protein-cost-per-dollar-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# The ten foods on the page, looked up by USDA record so a renamed row still matches.
FDC_IDS = [
    "172373",
    "172420",
    "173756",
    "172428",
    "171287",
    "171244",
    "171265",
    "171077",
    "174290",
    "174036",
]

SHORT = {
    "172373": "Drumsticks, bone-in",
    "172420": "Brown lentils, dry",
    "173756": "Chickpeas, dry",
    "172428": "Split peas, dry",
    "171287": "Eggs, large",
    "171244": "Mozzarella",
    "171265": "Whole milk",
    "171077": "Chicken breast",
    "174290": "Extra-firm tofu",
    "174036": "Ground beef, 80/20",
}


def load(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    quality = {row["fdc_id"]: row for row in load("protein-quality-per-dollar-2026.csv") if row["fdc_id"]}
    ranked = {}
    for name in (
        "plant-protein-per-dollar-ranked-2026.csv",
        "animal-protein-per-dollar-ranked-2026.csv",
    ):
        for row in load(name):
            if row["fdc_id"]:
                ranked[row["fdc_id"]] = row

    rows = []
    for fdc_id in FDC_IDS:
        quality_row = quality[fdc_id]
        ranked_row = ranked[fdc_id]
        raw = quality_row["protein_g_per_dollar"]
        if ranked_row["value"] != raw:
            raise SystemExit(
                f"{fdc_id} raw {raw} != ranking CSV {ranked_row['value']}"
            )
        rows.append(
            {
                "label": SHORT[fdc_id],
                "raw": float(raw),
                "adjusted": float(quality_row["adjusted_g_per_dollar"]),
            }
        )
    rows.sort(key=lambda row: (-row["adjusted"], -row["raw"], row["label"]))

    labels = [row["label"] for row in rows]
    raw_values = [row["raw"] for row in rows]
    adjusted_values = [row["adjusted"] for row in rows]

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.24, right=0.96, top=0.76, bottom=0.08)
    positions = list(range(len(labels)))
    height = 0.36
    raw_bars = ax.barh(
        [position + height / 2 for position in positions],
        raw_values,
        height=height,
        color=SLATE,
    )
    adjusted_bars = ax.barh(
        [position - height / 2 for position in positions],
        adjusted_values,
        height=height,
        color=ORANGE,
    )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.955,
        "Raw grams vs DIAAS-adjusted grams per dollar",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.895,
        "Ten foods. Scores above 1.00 are capped at 1.00 before the multiplication.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.grid(False)
    peak = max(raw_values)
    ax.set_xlim(0, peak * 1.22)
    for bar, value in list(zip(raw_bars, raw_values)) + list(zip(adjusted_bars, adjusted_values)):
        ax.text(
            value + peak * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.legend(
        handles=[
            Patch(facecolor=SLATE, label="Raw grams per dollar"),
            Patch(facecolor=ORANGE, label="DIAAS-adjusted grams per dollar"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.24, 0.84),
        ncol=2,
        fontsize=9,
    )
    fig.text(
        0.5,
        0.02,
        "Chart from protein-quality-per-dollar-2026.csv, checked against the plant and animal ranking CSVs. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT.name}")


if __name__ == "__main__":
    main()
