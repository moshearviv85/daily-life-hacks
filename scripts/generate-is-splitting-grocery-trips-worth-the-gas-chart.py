"""Extra grocery miles versus the savings on the receipt.

Mileage rates are the published 2026 figures, not a CSV column:
IRS business standard mileage is 72.5 cents for January 1 through June 30
(Notice 2026-10) and 76 cents for July 1 through December 31
(Announcement 2026-11). AAA Your Driving Costs 2026 puts fuel at 17.3 cents
a mile and maintenance, repair, and tires at 11.7 cents, so operating cost
is 29.0 cents. The 86-cent total is the 15,000-mile ownership average.

The reference line is a real package gap from protein-per-dollar-2026.csv:
two purchased pounds of boneless breast minus two purchased pounds of
bone-in drumsticks. The BLS print is bls-nutrition-per-dollar-monthly.csv,
U.S. city average, one pound of breast plus one pound of 80/20 ground beef
plus one dozen eggs, July 2026 versus October 2026. Do not hardcode those
dollars.
"""

from __future__ import annotations

import csv
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
BLS = ROOT / "public" / "data" / "bls-nutrition-per-dollar-monthly.csv"
OUT = (
    ROOT
    / "public"
    / "images"
    / "is-splitting-grocery-trips-worth-the-gas-chart.jpg"
)

ORANGE = "#F29B30"
SLATE = "#334155"
BLUE = "#1F4E79"
MUTED = "#64748B"
GRID = "#E7E9ED"

# IRS business rate, July 1 through December 31, 2026. Announcement 2026-11.
IRS_H2 = Decimal("0.76")
# AAA Your Driving Costs 2026, fuel only, then fuel plus maintenance/repair/tires.
AAA_FUEL = Decimal("0.173")
AAA_OPERATING = Decimal("0.290")
MILES = (2, 5, 10, 15)
BASKETS = (Decimal("35"), Decimal("75"), Decimal("150"))
BREAST = "Chicken breast (boneless, skinless)"
DRUMS = "Chicken drumsticks (bone-in)"
BLS_BASKET = (
    ("APU0000FF1101", "breast"),
    ("APU0000703112", "ground beef 80/20"),
    ("APU0000708111", "eggs"),
)


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def load(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def trip_cost(rate: Decimal, miles: int) -> Decimal:
    return money(rate * Decimal(miles))


def package_gap() -> Decimal:
    rows = {row["food"]: row for row in load(PROTEIN)}
    breast = Decimal(rows[BREAST]["package_price_usd"])
    drums = Decimal(rows[DRUMS]["package_price_usd"]) / Decimal("5")
    return money((breast - drums) * Decimal(2))


def bls_move() -> tuple[Decimal, Decimal, Decimal]:
    latest: dict[tuple[str, str], Decimal] = {}
    for row in load(BLS):
        if row["area_name"] != "U.S. city average":
            continue
        if row["date"] not in ("2026-07-01", "2026-10-01"):
            continue
        if row["bls_series_id"] not in {series for series, _name in BLS_BASKET}:
            continue
        latest[(row["bls_series_id"], row["date"])] = Decimal(row["price_usd"])

    def total(day: str) -> Decimal:
        return money(sum(latest[(series, day)] for series, _name in BLS_BASKET))

    july = total("2026-07-01")
    october = total("2026-10-01")
    return july, october, money(october - july)


def main() -> None:
    gap = package_gap()
    july, october, move = bls_move()
    series = (
        ("AAA fuel, 17.3¢", AAA_FUEL, "#F8D3A5"),
        ("AAA fuel + upkeep, 29¢", AAA_OPERATING, ORANGE),
        ("IRS business, 76¢", IRS_H2, BLUE),
    )
    labels = [str(miles) for miles in MILES]
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    width = 0.24
    positions = list(range(len(MILES)))
    for index, (label, rate, color) in enumerate(series):
        offset = (index - 1) * width
        heights = [float(trip_cost(rate, miles)) for miles in MILES]
        bars = ax.bar(
            [pos + offset for pos in positions],
            heights,
            width=width,
            color=color,
            label=label,
            zorder=3,
        )
        for bar, height in zip(bars, heights, strict=True):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                height + 0.18,
                f"${height:.2f}",
                ha="center",
                va="bottom",
                fontsize=8,
                color=SLATE,
                fontweight="bold",
            )
    ax.axhline(float(gap), color=ORANGE, linestyle="--", linewidth=1.4, zorder=2)
    ax.text(
        0.02,
        float(gap) + 0.22,
        f"${gap:.2f} package gap, 2 lb",
        ha="left",
        va="bottom",
        fontsize=8,
        color="#9A5B12",
        fontweight="bold",
    )
    ax.set_xticks(positions, labels, fontsize=11, color=SLATE, fontweight="bold")
    ax.set_xlabel("Extra round-trip miles", fontsize=11, color=SLATE)
    ax.set_ylabel("Cost of those miles", fontsize=11, color=SLATE)
    ax.set_ylim(0, 14.5)
    ax.yaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(axis="y", colors=MUTED, labelsize=9)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.spines["left"].set_color(GRID)
    ax.spines["bottom"].set_color(GRID)
    ax.legend(frameon=False, fontsize=9, loc="upper left")
    fig.suptitle(
        "Is the extra grocery store worth the miles?",
        fontsize=16,
        color=SLATE,
        fontweight="bold",
        x=0.06,
        ha="left",
    )
    fig.text(
        0.06,
        0.90,
        "July through December 2026 IRS business rate, next to AAA 2026 fuel and operating cost.",
        color=MUTED,
        fontsize=10,
        ha="left",
    )
    fig.text(
        0.5,
        0.02,
        (
            f"Dashed line: protein-per-dollar-2026.csv, two purchased pounds. "
            f"BLS breast + beef + eggs moved from ${july:.2f} in July to ${october:.2f} in October "
            f"({move:+.2f}). Chart, not a photograph."
        ),
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.subplots_adjust(left=0.08, right=0.98, top=0.84, bottom=0.12)
    fig.savefig(
        OUT,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)
    print(OUT)
    print(f"gap={gap} july={july} october={october} move={move}")
    for miles in MILES:
        costs = " ".join(
            f"{label.split(',')[0]}={trip_cost(rate, miles)}" for label, rate, _color in series
        )
        print(f"{miles}mi {costs}")
    for basket in BASKETS:
        for miles in MILES:
            cost = trip_cost(IRS_H2, miles)
            pct = (cost / basket * Decimal(100)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
            print(f"basket={basket} miles={miles} irs={cost} pct={pct}")


if __name__ == "__main__":
    main()
