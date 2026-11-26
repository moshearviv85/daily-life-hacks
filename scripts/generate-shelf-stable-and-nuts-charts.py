"""Chart heroes for the shelf-stable pantry page and the nuts-and-seeds page.

Bar lengths are read from the CSVs. Do not hardcode them.
Frozen tilapia is the slate bar: it is in the pantry file and it needs a freezer.
Chia and flax have no protein bar: they are not in the protein file.
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
PANTRY_CSV = DATA / "shelf-stable-pantry-per-dollar-2026.csv"
PROTEIN_CSV = DATA / "protein-per-dollar-2026.csv"
FIBER_CSV = DATA / "fiber-per-dollar-2026.csv"
PANTRY_OUT = ROOT / "public" / "images" / "cheapest-shelf-stable-pantry-foods-for-protein-chart.jpg"
NUTS_OUT = ROOT / "public" / "images" / "cheapest-nuts-and-seeds-for-protein-and-fiber-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
FREEZER_ID = "175176"

# Six audited nuts and seeds. Order is highest published grams per dollar first.
NUT_IDS = ("174266", "174262", "170554", "170562", "169414", "170567")
NUT_LABELS = {
    "174266": "Peanut butter",
    "174262": "Dry roasted peanuts",
    "170554": "Chia seeds",
    "170562": "Sunflower kernels",
    "169414": "Whole flaxseed",
    "170567": "Almonds",
}


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def by_fdc(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {row["fdc_id"]: row for row in rows if row.get("fdc_id")}


def save(fig: plt.Figure, path: Path) -> None:
    fig.savefig(
        path,
        format="jpg",
        dpi=100,
        facecolor="white",
        pil_kwargs={"quality": 90, "optimize": True},
    )
    plt.close(fig)
    print(path)


def pantry_chart() -> None:
    rows = load(PANTRY_CSV)
    if len(rows) != 27:
        raise SystemExit(f"expected 27 pantry rows, found {len(rows)}")
    values = [float(row["value"]) for row in rows]
    if values != sorted(values, reverse=True):
        raise SystemExit("pantry file is no longer ranked high to low")
    if not any(row["fdc_id"] == FREEZER_ID for row in rows):
        raise SystemExit("frozen tilapia left the pantry file")

    labels = [row["food"] for row in rows]
    colors = [SLATE if row["fdc_id"] == FREEZER_ID else ORANGE for row in rows]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 11.5), facecolor="white")
    fig.subplots_adjust(left=0.40, right=0.96, top=0.90, bottom=0.06)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=colors, height=0.72)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=8)
    ax.grid(False)
    peak = max(values)
    ax.set_xlim(0, peak * 1.16)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            value + peak * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} g",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.text(
        0.04,
        0.975,
        "Shelf-stable pantry foods: protein per dollar",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.04,
        0.942,
        "27 rows. The slate bar is frozen tilapia. It needs a freezer.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Room-temperature row"),
            Patch(facecolor=SLATE, label="Frozen tilapia"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.40, 0.90),
        ncol=2,
        fontsize=8,
    )
    fig.text(
        0.5,
        0.012,
        "Chart from shelf-stable-pantry-per-dollar-2026.csv. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    save(fig, PANTRY_OUT)


def nuts_chart() -> None:
    protein = by_fdc(load(PROTEIN_CSV))
    fiber = by_fdc(load(FIBER_CSV))
    rows = []
    for fdc_id in NUT_IDS:
        protein_row = protein.get(fdc_id)
        fiber_row = fiber.get(fdc_id)
        if fiber_row is None:
            raise SystemExit(f"{fdc_id} missing from the fiber file")
        protein_value = float(protein_row["protein_g_per_dollar"]) if protein_row else None
        fiber_value = float(fiber_row["fiber_g_per_dollar"])
        rows.append((NUT_LABELS[fdc_id], protein_value, fiber_value))
    if rows[0][1] != 50.7 or rows[2][1] is not None:
        raise SystemExit("nut order or chia protein row changed")

    labels = [row[0] for row in rows]
    protein_values = [row[1] for row in rows]
    fiber_values = [row[2] for row in rows]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.24, right=0.96, top=0.78, bottom=0.10)
    positions = list(range(len(labels)))
    height = 0.36
    protein_drawn = ax.barh(
        [position + height / 2 for position in positions],
        [value if value is not None else 0 for value in protein_values],
        height=height,
        color=ORANGE,
    )
    fiber_drawn = ax.barh(
        [position - height / 2 for position in positions],
        fiber_values,
        height=height,
        color=SLATE,
    )
    for bar, value in zip(protein_drawn, protein_values, strict=True):
        if value is None:
            bar.set_width(0)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.grid(False)
    peak = max(value for value in protein_values + fiber_values if value is not None)
    ax.set_xlim(0, peak * 1.22)
    for bar, value in list(zip(protein_drawn, protein_values, strict=True)) + list(
        zip(fiber_drawn, fiber_values, strict=True)
    ):
        if value is None:
            continue
        ax.text(
            value + peak * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} g",
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    fig.text(
        0.04,
        0.96,
        "Nuts and seeds: protein and fiber per dollar",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.04,
        0.905,
        "No protein bar means the protein file doesn't price that food.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Protein per dollar"),
            Patch(facecolor=SLATE, label="Fiber per dollar"),
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
        "Chart from protein-per-dollar-2026.csv and fiber-per-dollar-2026.csv. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    save(fig, NUTS_OUT)


def main() -> None:
    pantry_chart()
    nuts_chart()


if __name__ == "__main__":
    main()
