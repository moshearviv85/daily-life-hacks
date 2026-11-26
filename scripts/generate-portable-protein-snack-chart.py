"""Cost of 10 g protein and 5 g fiber for ten portable snacks.

Protein rates come from no-cook-protein-per-dollar-2026.csv, checked
against protein-per-dollar-2026.csv. Fiber rates come from
high-fiber-snacks-per-dollar-2026.csv, checked against
fiber-per-dollar-2026.csv. Greek yogurt and cottage cheese have no
fiber bar: FDC 170894 and FDC 172179 publish 0 g fiber, and the fiber
files don't price them. Produce has no protein bar because those foods
aren't in the protein file. Do not hardcode the bar lengths.
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
NO_COOK = ROOT / "public" / "data" / "no-cook-protein-per-dollar-2026.csv"
SNACKS = ROOT / "public" / "data" / "high-fiber-snacks-per-dollar-2026.csv"
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "cheapest-high-protein-snacks-and-portable-foods-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

# Ten portable foods. Popcorn is in the snack fiber file and stays off:
# that row has no USDA id.
FOODS = [
    ("174262", "Dry roasted peanuts", True, True),
    ("170562", "Sunflower kernels", True, True),
    ("174266", "Peanut butter", True, True),
    ("170894", "Greek yogurt", True, False),
    ("172179", "Cottage cheese", True, False),
    ("170567", "Almonds", True, True),
    ("170393", "Carrots", False, True),
    ("168162", "Prunes", False, True),
    ("173944", "Bananas", False, True),
    ("168204", "Gala apples", False, True),
]


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


def money(grams: Decimal, rate: Decimal) -> Decimal:
    return (grams / rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def require_match(short: dict[str, str] | None, long_row: dict[str, str] | None, column: str, label: str) -> Decimal:
    if short is None and long_row is None:
        raise SystemExit(f"{label} missing from both files")
    if short is not None and long_row is not None and Decimal(short["value"]) != Decimal(long_row[column]):
        raise SystemExit(f"{label} {short['value']} != {long_row[column]}")
    source = short if short is not None else long_row
    assert source is not None
    key = "value" if short is not None else column
    return Decimal(source[key])


def main() -> None:
    no_cook = by_fdc(load(NO_COOK))
    snacks = by_fdc(load(SNACKS))
    protein = by_fdc(load(PROTEIN))
    fiber = by_fdc(load(FIBER))
    popcorn = next(row for row in load(SNACKS) if row["food"] == "Popcorn kernels")
    if popcorn.get("fdc_id"):
        raise SystemExit("popcorn unexpectedly gained an FDC id")

    rows: list[dict[str, object]] = []
    for fdc_id, label, want_protein, want_fiber in FOODS:
        protein_cost = None
        fiber_cost = None
        if want_protein:
            rate = require_match(no_cook.get(fdc_id), protein.get(fdc_id), "protein_g_per_dollar", label)
            protein_cost = money(Decimal("10"), rate)
        elif fdc_id in no_cook or fdc_id in protein:
            raise SystemExit(f"{label} unexpectedly has a protein row")
        if want_fiber:
            rate = require_match(snacks.get(fdc_id), fiber.get(fdc_id), "fiber_g_per_dollar", label)
            fiber_cost = money(Decimal("5"), rate)
        elif fdc_id in snacks or fdc_id in fiber:
            raise SystemExit(f"{label} unexpectedly has a fiber row")
        cheapest = min(value for value in (protein_cost, fiber_cost) if value is not None)
        rows.append(
            {
                "label": label,
                "protein": protein_cost,
                "fiber": fiber_cost,
                "cheapest": cheapest,
            }
        )

    rows.sort(key=lambda row: (row["cheapest"], str(row["label"])))
    labels = [str(row["label"]) for row in rows]
    protein_costs = [row["protein"] for row in rows]
    fiber_costs = [row["fiber"] for row in rows]

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )
    fig, ax = plt.subplots(figsize=(12, 7.4), facecolor="white")
    fig.subplots_adjust(left=0.22, right=0.96, top=0.80, bottom=0.10)
    positions = list(range(len(labels)))
    height = 0.36
    protein_drawn = ax.barh(
        [position + height / 2 for position in positions],
        [float(value) if value is not None else 0 for value in protein_costs],
        height=height,
        color=ORANGE,
    )
    fiber_drawn = ax.barh(
        [position - height / 2 for position in positions],
        [float(value) if value is not None else 0 for value in fiber_costs],
        height=height,
        color=SLATE,
    )
    # A missing side is not a $0.00 bar.
    for bar, value in zip(protein_drawn, protein_costs):
        if value is None:
            bar.set_width(0)
    for bar, value in zip(fiber_drawn, fiber_costs):
        if value is None:
            bar.set_width(0)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    fig.text(
        0.035,
        0.955,
        "Portable Snacks: Cost of 10 g Protein and 5 g Fiber",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.90,
        "Blank side means that file doesn't price the nutrient. Popcorn is left off.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.grid(False)
    peak = max(float(row["cheapest"]) for row in rows)
    for row in rows:
        for value in (row["protein"], row["fiber"]):
            if value is not None:
                peak = max(peak, float(value))
    ax.set_xlim(0, peak * 1.28)
    for bar, value in list(zip(protein_drawn, protein_costs)) + list(zip(fiber_drawn, fiber_costs)):
        if value is None:
            continue
        ax.text(
            float(value) + peak * 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"${value:.2f}",
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Cost of 10 g protein"),
            Patch(facecolor=SLATE, label="Cost of 5 g fiber"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.22, 0.86),
        ncol=2,
        fontsize=9,
    )
    fig.text(
        0.5,
        0.025,
        "Chart from no-cook-protein-per-dollar-2026.csv and high-fiber-snacks-per-dollar-2026.csv. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT.name}")


if __name__ == "__main__":
    main()
