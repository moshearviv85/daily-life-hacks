"""Protein-per-dollar chart for four canned and frozen fish.

Bar lengths are read from public/data/protein-per-dollar-2026.csv and checked
against public/data/animal-protein-per-dollar-ranked-2026.csv. Do not hardcode
the grams.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images" / "cheapest-canned-fish-and-seafood-protein-per-dollar-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# Display order is highest protein per dollar first. Lookup is the USDA id.
FISH = [
    ("173709", "Chunk light tuna"),
    ("173690", "Canned pink salmon"),
    ("175176", "Frozen tilapia"),
    ("175139", "Sardines in oil"),
]


def load(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def by_fdc(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {row["fdc_id"]: row for row in rows}


def main() -> None:
    protein = by_fdc(load("protein-per-dollar-2026.csv"))
    animal = by_fdc(load("animal-protein-per-dollar-ranked-2026.csv"))
    labels: list[str] = []
    rates: list[float] = []
    for fdc_id, label in FISH:
        row = protein[fdc_id]
        other = animal[fdc_id]
        if row["protein_g_per_dollar"] != other["value"]:
            raise SystemExit(
                f"FDC {fdc_id} protein {row['protein_g_per_dollar']} != animal {other['value']}"
            )
        labels.append(label)
        rates.append(float(row["protein_g_per_dollar"]))

    order = sorted(range(len(rates)), key=lambda index: (-rates[index], labels[index]))
    labels = [labels[index] for index in order]
    rates = [rates[index] for index in order]

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 6.4), facecolor="white")
    fig.subplots_adjust(left=0.24, right=0.94, top=0.76, bottom=0.14)
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, rates, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.93,
        "Cheapest Canned and Frozen Fish",
        color=SLATE,
        fontsize=24,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.845,
        "Grams of protein per dollar. Chunk light tuna leads the four.",
        color=MUTED,
        fontsize=13,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=13)
    ax.grid(False)
    ax.set_xlim(0, max(rates) * 1.28)
    for bar, value in zip(drawn, rates):
        ax.text(
            value + max(rates) * 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f} g",
            va="center",
            color=SLATE,
            fontsize=13,
            fontweight="bold",
        )
    fig.text(
        0.5,
        0.035,
        "Chart rendered from protein-per-dollar-2026.csv and animal-protein-per-dollar-ranked-2026.csv. Not a photograph. daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)


if __name__ == "__main__":
    main()
