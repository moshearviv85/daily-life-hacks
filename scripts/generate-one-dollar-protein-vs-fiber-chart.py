"""Paired chart: grams of protein and fiber one dollar buys.

Bar lengths come from protein-per-dollar-2026.csv and
fiber-per-dollar-2026.csv. Chia protein is not in the protein file.
It is FDC 170554's 16.54 g per 100 g times the fiber file's chia price.
Drumstick fiber is 0 on FDC 172373, which the fiber file does not price.
Do not hardcode the other bar lengths.
"""

from __future__ import annotations

import csv
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
ONE_PROTEIN = ROOT / "public" / "data" / "one-dollar-protein-what-it-buys-2026.csv"
ONE_FIBER = ROOT / "public" / "data" / "one-dollar-fiber-what-it-buys-2026.csv"
OUT = ROOT / "public" / "images" / "one-dollar-of-protein-vs-one-dollar-of-fiber-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# The fifteen FDC ids on the page, short labels for the axis.
FOODS = [
    ("168893", "Whole wheat flour"),
    ("172420", "Brown lentils"),
    ("172428", "Green split peas"),
    ("173745", "Navy beans"),
    ("173734", "Black beans, dry"),
    ("175199", "Pinto beans"),
    ("173756", "Chickpeas"),
    ("174284", "Red lentils"),
    ("169738", "Whole wheat spaghetti"),
    ("174266", "Peanut butter"),
    ("172373", "Chicken drumsticks"),
    ("173904", "Rolled oats"),
    ("170284", "Pearled barley"),
    ("175188", "Canned black beans"),
    ("170554", "Chia seeds"),
]

# Same record the fiber file already cites. Protein is not a protein-file row.
CHIA_FDC = "170554"
CHIA_PROTEIN_PER_100 = Decimal("16.54")
DRUM_FDC = "172373"


def load(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def by_fdc(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    found: dict[str, dict[str, str]] = {}
    for row in rows:
        fdc_id = row.get("fdc_id", "")
        if fdc_id:
            found[fdc_id] = row
    return found


def half_up(value: Decimal, places: str) -> Decimal:
    return value.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def grams_per_dollar(per_100: Decimal, package_g: Decimal, edible: Decimal, price: Decimal) -> Decimal:
    total = per_100 / Decimal("100") * package_g * edible / price
    return half_up(total, "0.1")


def published(row: dict[str, str], column: str) -> Decimal:
    return Decimal(row[column])


def main() -> None:
    protein = by_fdc(load(PROTEIN))
    fiber = by_fdc(load(FIBER))
    one_protein = by_fdc(load(ONE_PROTEIN))
    one_fiber = by_fdc(load(ONE_FIBER))

    labels: list[str] = []
    protein_bars: list[float] = []
    fiber_bars: list[float] = []

    for fdc_id, label in FOODS:
        protein_row = protein.get(fdc_id)
        fiber_row = fiber.get(fdc_id)
        if fdc_id == CHIA_FDC:
            if protein_row is not None:
                raise SystemExit("chia unexpectedly appeared in the protein file")
            if fiber_row is None:
                raise SystemExit("chia missing from the fiber file")
            protein_value = grams_per_dollar(
                CHIA_PROTEIN_PER_100,
                Decimal(fiber_row["package_weight_g"]),
                Decimal(fiber_row["edible_fraction"]),
                Decimal(fiber_row["package_price_usd"]),
            )
        else:
            if protein_row is None:
                raise SystemExit(f"{fdc_id} missing from the protein file")
            protein_value = published(protein_row, "protein_g_per_dollar")
            short = one_protein.get(fdc_id)
            if short is not None and Decimal(short["value"]) != protein_value:
                raise SystemExit(f"{label} protein {protein_value} != one-dollar file {short['value']}")

        if fdc_id == DRUM_FDC:
            if fiber_row is not None:
                raise SystemExit("drumsticks unexpectedly appeared in the fiber file")
            fiber_value = Decimal("0.0")
        else:
            if fiber_row is None:
                raise SystemExit(f"{fdc_id} missing from the fiber file")
            fiber_value = published(fiber_row, "fiber_g_per_dollar")
            short = one_fiber.get(fdc_id)
            if short is not None and Decimal(short["value"]) != fiber_value:
                raise SystemExit(f"{label} fiber {fiber_value} != one-dollar file {short['value']}")

        labels.append(label)
        protein_bars.append(float(protein_value))
        fiber_bars.append(float(fiber_value))

    order = sorted(range(len(labels)), key=lambda index: (-protein_bars[index], labels[index]))
    labels = [labels[index] for index in order]
    protein_bars = [protein_bars[index] for index in order]
    fiber_bars = [fiber_bars[index] for index in order]

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 10.5), facecolor="white")
    fig.subplots_adjust(left=0.22, right=0.96, top=0.86, bottom=0.07)
    positions = list(range(len(labels)))
    height = 0.36
    protein_drawn = ax.barh(
        [position + height / 2 for position in positions],
        protein_bars,
        height=height,
        color=ORANGE,
    )
    fiber_drawn = ax.barh(
        [position - height / 2 for position in positions],
        fiber_bars,
        height=height,
        color=SLATE,
    )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.965,
        "What $1 Buys in Protein vs. Fiber",
        color=SLATE,
        fontsize=22,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.925,
        "Grams per dollar. Fifteen staples. Chia protein is calculated. Drumstick fiber is 0.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.grid(False)
    peak = max(protein_bars + fiber_bars)
    ax.set_xlim(0, peak * 1.18)
    for bar, value in list(zip(protein_drawn, protein_bars)) + list(zip(fiber_drawn, fiber_bars)):
        ax.text(
            value + peak * 0.01,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Protein, grams per $1"),
            Patch(facecolor=SLATE, label="Fiber, grams per $1"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.22, 0.90),
        ncol=2,
        fontsize=9,
    )
    fig.text(
        0.5,
        0.018,
        "Chart from protein-per-dollar-2026.csv and fiber-per-dollar-2026.csv. Chia protein uses FDC 170554 and the fiber-file price. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT.name}")


if __name__ == "__main__":
    main()
