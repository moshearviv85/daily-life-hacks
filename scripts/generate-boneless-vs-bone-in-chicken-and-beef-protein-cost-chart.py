"""Edible package share next to protein grams per dollar.

Protein grams per dollar, package price, and edible fraction come from
meat-per-dollar-protein-ranked-2026.csv and protein-per-dollar-2026.csv.
Drumstick edible share is 1 minus the USDA SR28 refuse already stored on
that row (33 percent bone and cartilage). Boneless rows are edible fraction
1. Do not hardcode the gram or dollar labels.
"""

from __future__ import annotations

import csv
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
MEAT = ROOT / "public" / "data" / "meat-per-dollar-protein-ranked-2026.csv"
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
OUT = (
    ROOT
    / "public"
    / "images"
    / "boneless-vs-bone-in-chicken-and-beef-protein-cost-chart.jpg"
)

ORANGE = "#F29B30"
SLATE = "#334155"
BLUE = "#1F4E79"
MUTED = "#64748B"
GRID = "#E7E9ED"

FOODS = (
    ("Chicken drumsticks (bone-in)", "Drumsticks"),
    ("Chicken thighs (boneless, skinless)", "Boneless thighs"),
    ("Pork shoulder butt roast (boneless)", "Pork shoulder"),
    ("Chicken breast (boneless, skinless)", "Boneless breast"),
    ("Ground beef (80/20)", "Ground beef 80/20"),
)


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def tenth(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def load(path: Path) -> dict[str, dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return {row["food"]: row for row in csv.DictReader(handle)}


def rows() -> list[dict[str, Decimal | str]]:
    meat = load(MEAT)
    protein = load(PROTEIN)
    parsed = []
    for food, label in FOODS:
        grams = Decimal(meat[food]["value"])
        edible = Decimal(protein[food]["edible_fraction"])
        parsed.append(
            {
                "food": food,
                "label": label,
                "grams": tenth(grams),
                "edible_pct": int((edible * Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)),
                "cost30": money(Decimal(30) / grams),
            }
        )
    return parsed


def panel(ax, labels: list[str], values: list[float], color: str, xlabel: str, suffix: str) -> None:
    ax.set_facecolor("white")
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=color, height=0.62, zorder=3)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            bar.get_width() + max(values) * 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}{suffix}" if suffix == " g" else f"{value:.0f}{suffix}",
            va="center",
            ha="left",
            fontsize=10,
            color=SLATE,
            fontweight="bold",
        )
    ax.set_yticks(positions, labels, fontsize=10, color=SLATE, fontweight="bold")
    ax.invert_yaxis()
    ax.set_xlabel(xlabel, fontsize=10, color=MUTED)
    ax.set_xlim(0, max(values) * 1.28)
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", colors=MUTED, labelsize=8)
    ax.tick_params(axis="y", length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)


def main() -> None:
    parsed = rows()
    labels = [str(row["label"]) for row in parsed]
    grams = [float(row["grams"]) for row in parsed]
    edible = [float(row["edible_pct"]) for row in parsed]
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(
        1,
        2,
        figsize=(12, 6.75),
        dpi=100,
        gridspec_kw={"width_ratios": [1.25, 1]},
    )
    fig.patch.set_facecolor("white")
    panel(axes[0], labels, grams, ORANGE, "Protein grams per dollar, bone already out", " g")
    panel(axes[1], labels, edible, BLUE, "Edible share of the purchased package", "%")
    fig.suptitle(
        "Bone-in still buys more protein per dollar",
        fontsize=16,
        color=SLATE,
        fontweight="bold",
        x=0.06,
        ha="left",
    )
    drum = parsed[0]
    breast = parsed[3]
    beef = parsed[4]
    fig.text(
        0.06,
        0.90,
        (
            f"Drumsticks {drum['grams']} g/$ versus breast {breast['grams']} "
            f"and 80/20 beef {beef['grams']}. Edible share is the file's fraction."
        ),
        color=MUTED,
        fontsize=10,
        ha="left",
    )
    fig.text(
        0.5,
        0.02,
        (
            "Chart from meat-per-dollar-protein-ranked-2026.csv and protein-per-dollar-2026.csv. "
            "Drumstick refuse is USDA SR28, 33 percent bone and cartilage. Not a photograph."
        ),
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.subplots_adjust(left=0.14, right=0.97, top=0.84, bottom=0.12, wspace=0.45)
    fig.savefig(
        OUT,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)
    print(OUT)
    for row in parsed:
        print(
            f"{row['label']}\t{row['grams']} g/$\t{row['edible_pct']}% edible\t30g=${row['cost30']}"
        )


if __name__ == "__main__":
    main()
