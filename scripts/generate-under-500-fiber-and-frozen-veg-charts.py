"""Chart heroes for the under-500 fast-food fiber page and the frozen-vegetable page.

Bar lengths are read from the public CSVs. The JPEGs are charts only.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = ROOT / "public" / "images"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
LINE = "#B3651B"

FAST_CHART = "high-fiber-fast-food-under-500-calories-chart.jpg"
FROZEN_CHART = "cheapest-frozen-vegetables-for-fiber-and-protein-chart.jpg"


def setup() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.titlesize": 16,
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )


def load(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def save(fig, name: str, source: str) -> None:
    fig.text(
        0.5,
        0.012,
        f"Data: {source} | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT / name, dpi=100, facecolor="white")
    plt.close(fig)


def heading(fig, title: str, subtitle: str) -> None:
    fig.text(0.06, 0.975, title, color=SLATE, fontsize=15, fontweight="bold", va="top")
    fig.text(0.06, 0.925, subtitle, color=MUTED, fontsize=9, va="top")


def order_label(row: dict[str, str]) -> str:
    item = row["item"]
    if "Tortilla Soup" in item:
        return "Chick-fil-A Chicken Tortilla Soup"
    if "Green Goddess" in item:
        return "Panera Green Goddess Chicken Wrap"
    if "Chicken Caesar" in item:
        return "Panera Chicken Caesar Wrap"
    if "Frontega" in item:
        return "Panera Frontega Chicken Wrap"
    if item.startswith("Guacamole"):
        return "Chipotle Large Guacamole"
    if "6-inch Veggie Patty" in item:
        return "Subway 6-inch Veggie Patty"
    if "Avocado Toast" in item:
        return "Dunkin' Avocado Toast"
    if "Rolled & Steel-Cut" in item:
        return "Starbucks Plain Oatmeal"
    if "Red Beans" in item and "regular" in item:
        return "Popeyes Regular Red Beans and Rice"
    if "Bean Burrito" in item:
        return "Taco Bell Bean Burrito"
    if "Multigrain Bagel" in item:
        return "Dunkin' Multigrain Bagel"
    if "Steel Cut Oatmeal" in item:
        return "Panera Steel Cut Oatmeal"
    if "Chili Cheese" in item:
        return "Wendy's Chili Cheese Potato"
    return f"{row['chain']}: {item.split(',')[0][:36]}"


def under_500(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    picked = [row for row in rows if float(row["calories"]) <= 500]
    picked.sort(
        key=lambda row: (
            -float(row["fiber_per_100_kcal"]),
            -float(row["fiber_g"]),
            float(row["calories"]),
            row["chain"],
            row["item"],
        )
    )
    return picked


def chart_fast_food() -> None:
    rows = under_500(load("high-fiber-fast-food-2026.csv"))
    if len(rows) < 10:
        raise SystemExit(f"expected at least 10 orders under 500 calories, found {len(rows)}")
    labels = [order_label(row) for row in rows]
    values = [float(row["fiber_per_100_kcal"]) for row in rows]

    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.36, right=0.96, top=0.78, bottom=0.08)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=ORANGE, height=0.72)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    heading(
        fig,
        "Fast food under 500 calories, by fiber density",
        "Fiber grams per 100 calories. Every chain order in the file at or under 500 kcal.",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=8)
    ax.grid(False)
    peak = max(values)
    ax.set_xlim(0, peak * 1.22)
    for bar, value in zip(bars, values):
        ax.text(
            value + peak * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    save(fig, FAST_CHART, "high-fiber-fast-food-2026.csv, chain files checked 2026-11-23")
    print(f"wrote {FAST_CHART} ({len(rows)} orders)")


def chart_frozen() -> None:
    fiber_rows = [
        row for row in load("fiber-per-dollar-2026.csv") if row["category"] == "Frozen vegetables"
    ]
    fiber_rows.sort(key=lambda row: -float(row["fiber_g_per_dollar"]))
    protein = {
        row["food"]: float(row["protein_g_per_dollar"])
        for row in load("protein-per-dollar-2026.csv")
    }
    fresh = next(
        row for row in load("fiber-per-dollar-2026.csv") if row["food"] == "Fresh broccoli crowns"
    )
    if len(fiber_rows) != 5:
        raise SystemExit(f"expected 5 frozen vegetables, found {len(fiber_rows)}")

    labels = [row["food"] for row in fiber_rows]
    fiber_values = [float(row["fiber_g_per_dollar"]) for row in fiber_rows]
    protein_values = [protein.get(row["food"]) for row in fiber_rows]
    fresh_fiber = float(fresh["fiber_g_per_dollar"])

    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.30, right=0.96, top=0.76, bottom=0.10)
    positions = list(range(len(labels)))
    height = 0.36
    ax.barh(
        [pos + height / 2 for pos in positions],
        fiber_values,
        height=height,
        color=ORANGE,
        label="Fiber per dollar",
    )
    protein_positions = []
    protein_heights = []
    for pos, value in zip(positions, protein_values):
        if value is None:
            continue
        protein_positions.append(pos - height / 2)
        protein_heights.append(value)
    ax.barh(
        protein_positions,
        protein_heights,
        height=height,
        color=SLATE,
        label="Protein per dollar",
    )
    ax.axvline(
        fresh_fiber,
        color=LINE,
        linewidth=1.5,
        linestyle="--",
        label=f"Fresh broccoli crowns, {fresh_fiber:g} g fiber/$",
    )
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    heading(
        fig,
        "Frozen vegetables, fiber and protein per dollar",
        "Protein bars only where the protein sheet has the food. Edamame fiber is the unresolved published figure.",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=9)
    ax.grid(False)
    peak = max(fiber_values + protein_heights + [fresh_fiber])
    ax.set_xlim(0, peak * 1.18)
    for pos, value in zip(positions, fiber_values):
        ax.text(
            value + peak * 0.012,
            pos + height / 2,
            f"{value:g}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    for pos, value in zip(protein_positions, protein_heights):
        ax.text(
            value + peak * 0.012,
            pos,
            f"{value:g}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    ax.legend(frameon=False, loc="lower right", fontsize=8)
    save(
        fig,
        FROZEN_CHART,
        "fiber-per-dollar-2026.csv and protein-per-dollar-2026.csv",
    )
    print(f"wrote {FROZEN_CHART} ({len(fiber_rows)} bags)")


def main() -> None:
    setup()
    chart_fast_food()
    chart_frozen()


if __name__ == "__main__":
    main()
