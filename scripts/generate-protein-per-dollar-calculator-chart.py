"""Raw vs DIAAS-adjusted protein grams per dollar for the calculator page.

Rates come from protein-quality-per-dollar-2026.csv, checked against
protein-per-dollar-2026.csv. Scores above 1.00 are already capped in the
adjusted column. This file is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
QUALITY = ROOT / "public" / "data" / "protein-quality-per-dollar-2026.csv"
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "protein-per-dollar-calculator-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# Spec order. Labels are short; the CSV food field is the lookup key.
FOODS = (
    ("Chicken drumsticks (bone-in)", "Drumsticks", "50.3", "1.08", "1.00", "50.3"),
    ("Brown lentils (dry)", "Brown lentils", "77.7", "0.63", "0.63", "49.0"),
    ("Chickpeas (dry)", "Chickpeas", "56.7", "0.83", "0.83", "47.1"),
    ("Eggs (large)", "Eggs", "34.4", "1.13", "1.00", "34.4"),
    ("Mozzarella (low-moisture part-skim)", "Mozzarella", "30.1", "1.14", "1.00", "30.1"),
    ("Greek yogurt (plain, nonfat)", "Greek yogurt", "27.5", "1.14", "1.00", "27.5"),
    ("Chicken breast (boneless, skinless)", "Chicken breast", "24.6", "1.08", "1.00", "24.6"),
)


def load(path: Path) -> dict[str, dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return {row["food"]: row for row in csv.DictReader(handle)}


def main() -> None:
    quality = load(QUALITY)
    protein = load(PROTEIN)
    labels: list[str] = []
    raw_values: list[float] = []
    adjusted_values: list[float] = []
    for food, label, raw, score, capped, adjusted in FOODS:
        quality_row = quality[food]
        protein_row = protein[food]
        if protein_row["protein_g_per_dollar"] != raw:
            raise SystemExit(f"{food} protein CSV {protein_row['protein_g_per_dollar']} != {raw}")
        checks = {
            "protein_g_per_dollar": raw,
            "diaas_score": score,
            "diaas_capped_for_multiplication": capped,
            "adjusted_g_per_dollar": adjusted,
        }
        for field, expected in checks.items():
            if quality_row[field] != expected:
                raise SystemExit(f"{food} {field} is {quality_row[field]!r}, expected {expected}")
        labels.append(label)
        raw_values.append(float(raw))
        adjusted_values.append(float(adjusted))

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.18, right=0.98, top=0.76, bottom=0.14)
    positions = list(range(len(labels)))
    height = 0.36
    raw_bars = ax.barh(
        [pos + height / 2 for pos in positions],
        raw_values,
        height=height,
        color=ORANGE,
        label="Raw g per $",
    )
    adjusted_bars = ax.barh(
        [pos - height / 2 for pos in positions],
        adjusted_values,
        height=height,
        color=SLATE,
        label="DIAAS-adjusted g per $",
    )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.grid(False)
    peak = max(raw_values + adjusted_values)
    ax.set_xlim(0, peak * 1.22)
    for bar, value in list(zip(raw_bars, raw_values)) + list(zip(adjusted_bars, adjusted_values)):
        ax.text(
            value + peak * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.text(
        0.18,
        0.93,
        "Raw vs DIAAS-adjusted protein per dollar",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.18,
        0.865,
        "Scores above 1.00 are capped at 1.00. Chart, not a photograph.",
        color=MUTED,
        fontsize=11,
        va="center",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Raw grams per dollar"),
            Patch(facecolor=SLATE, label="DIAAS-adjusted grams per dollar"),
        ],
        frameon=False,
        loc="lower center",
        bbox_to_anchor=(0.58, 0.78),
        ncol=2,
        fontsize=9,
    )
    fig.text(
        0.5,
        0.035,
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
