"""Cost of 10 g of fiber for one published food in each grocery format.

Bar lengths are 10 divided by fiber grams per dollar.
Dry and canned beans come from canned-vs-dry-beans-cost-2026.csv prices
checked against fiber-per-dollar-2026.csv.
Frozen peas and fresh cabbage come from produce-fiber-per-dollar-ranked-2026.csv
checked against the same fiber file.
Do not hardcode bar lengths.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
BEANS = ROOT / "public" / "data" / "canned-vs-dry-beans-cost-2026.csv"
PRODUCE = ROOT / "public" / "data" / "produce-fiber-per-dollar-ranked-2026.csv"
OUT = ROOT / "public" / "images" / "canned-vs-frozen-vs-fresh-cost-calculator-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
TEAL = "#0F766E"
GREEN = "#3F6F4A"
MUTED = "#64748B"


def one_decimal(value: float) -> float:
    return math.floor(value * 10 + 0.5 + 1e-9) / 10


def money(value: float) -> str:
    cents = math.floor(value * 100 + 0.5 + 1e-9)
    return f"{cents // 100}.{cents % 100:02d}"


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def must(rows: list[dict[str, str]], food: str) -> dict[str, str]:
    for row in rows:
        if row["food"] == food:
            return row
    raise SystemExit(f"missing {food}")


def main() -> None:
    fiber = load(FIBER)
    beans = load(BEANS)
    produce = load(PRODUCE)
    picks = [
        ("Dry", "Black beans (dry)", ORANGE, beans, "3.38", "58.0"),
        ("Canned", "Canned black beans", SLATE, beans, "0.88", "30.1"),
        ("Frozen", "Frozen green peas", TEAL, produce, "2.32", "17.6"),
        ("Fresh", "Green cabbage", GREEN, produce, "0.78", "14.6"),
    ]
    items: list[tuple[str, float, str]] = []
    for label, food, _color, price_rows, price, rate in picks:
        fiber_row = must(fiber, food)
        price_row = must(price_rows, food)
        if fiber_row["package_price_usd"] != price or price_row["package_price_usd"] != price:
            raise SystemExit(f"{food} package price drifted")
        if price_rows is produce and price_row["value"] != rate:
            raise SystemExit(f"{food} produce rate drifted")
        if price_rows is beans and price_row["value"] != rate:
            raise SystemExit(f"{food} bean protein rate drifted")
        if price_rows is produce and fiber_row["fiber_g_per_dollar"] != rate:
            raise SystemExit(f"{food} fiber rate disagrees with produce")
        if food == "Black beans (dry)" and fiber_row["fiber_g_per_dollar"] != "41.6":
            raise SystemExit("dry black bean fiber rate drifted")
        if food == "Canned black beans" and fiber_row["fiber_g_per_dollar"] != "34.4":
            raise SystemExit("canned black bean fiber rate drifted")
        fiber_rate = float(fiber_row["fiber_g_per_dollar"])
        cost = 10 / fiber_rate
        items.append((f"{label}: {food}", cost, money(cost)))

    labels = [label for label, _cost, _text in items]
    values = [cost for _label, cost, _text in items]
    colors = [ORANGE, SLATE, TEAL, GREEN]
    positions = list(range(len(labels)))

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.32, right=0.96, top=0.78, bottom=0.12)
    bars = ax.barh(positions, values, color=colors, height=0.62)
    ax.set_yticks(positions, labels, fontsize=11)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0)
    peak = max(values)
    ax.set_xlim(0, peak * 1.22)
    for bar, (_label, _cost, text) in zip(bars, items, strict=True):
        ax.text(
            bar.get_width() + peak * 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"${text}",
            va="center",
            color=SLATE,
            fontsize=12,
            fontweight="bold",
        )
    fig.text(
        0.32,
        0.92,
        "What 10 g of fiber costs in four formats",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.32,
        0.86,
        "File prices only. A number you type on the calculator is not drawn here.",
        color=MUTED,
        fontsize=10,
        va="center",
    )
    fig.text(
        0.5,
        0.04,
        "Chart from fiber-per-dollar-2026.csv, canned-vs-dry-beans-cost-2026.csv, and produce-fiber-per-dollar-ranked-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
    for label, cost, text in items:
        print(f"{label}: {one_decimal(cost)} displayed ${text}")


if __name__ == "__main__":
    main()
