"""Three house-style charts for the sodium-per-dollar study.

Every value is read from public/data/sodium-per-dollar-2026.csv at render time, so a
chart can never drift from the published dataset.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "sodium-per-dollar-2026.csv"
OUT = ROOT / "public" / "images"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
DEEP = "#B3651B"
SOURCE = "USDA FoodData Central and the audited Daily Life Hacks price basket"


def setup() -> None:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.titlesize": 23,
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )


def load() -> list[dict]:
    rows = list(csv.DictReader(DATA.open(encoding="utf-8")))
    for row in rows:
        row["sodium"] = float(row["sodium_mg_per_100g"])
        row["per_dollar"] = float(row["sodium_mg_per_dollar"])
    return rows


def save(fig, name: str) -> None:
    fig.text(
        0.5,
        0.025,
        f"Data: {SOURCE} | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    fig.savefig(OUT / name, dpi=100, facecolor="white")
    plt.close(fig)


def heading(fig, title, subtitle):
    """Full-width title block, so a long headline never runs off the canvas."""
    fig.text(0.035, 0.915, title, color=SLATE, fontsize=25, fontweight="bold", va="top")
    fig.text(0.035, 0.845, subtitle, color=MUTED, fontsize=12.5, va="top")


def bars(title, subtitle, labels, values, name, unit, colors=None):
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.28, right=0.95, top=0.80, bottom=0.11)
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, values, color=colors or ORANGE, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    heading(fig, title, subtitle)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.grid(False)
    ax.set_xlim(0, max(values) * 1.2)
    for bar, value in zip(drawn, values):
        ax.text(
            value + max(values) * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} {unit}",
            va="center",
            color=SLATE,
            fontsize=11,
            fontweight="bold",
        )
    save(fig, name)


def chart_cheapest_are_cleanest(rows):
    """The foods that top the per-dollar rankings, plotted by sodium."""
    picks = [
        "Whole wheat flour",
        "Oat bran (dry)",
        "Tofu (extra firm)",
        "Green split peas (dry)",
        "Navy beans (dry)",
        "Brown rice (dry)",
        "Black beans (dry)",
        "Old-fashioned rolled oats",
        "Brown lentils (dry)",
        "Pinto beans (dry)",
    ]
    index = {r["food"]: r for r in rows}
    chosen = sorted((index[p] for p in picks), key=lambda r: r["sodium"])
    bars(
        "The Cheapest Staples Are Also the Lowest in Sodium",
        "Ten foods that win the fiber and protein per dollar rankings. None clears 12 mg per 100 g.",
        [r["food"] for r in chosen],
        [r["sodium"] for r in chosen],
        "sodium-per-dollar-cheapest-staples-chart.jpg",
        "mg",
    )


def chart_processing_gradient(rows):
    """Same ingredient, two forms, wildly different sodium."""
    index = {r["food"]: r for r in rows}
    pairs = [
        ("Wheat", "Whole wheat flour", "100% whole wheat bread"),
        ("Pork", "Pork loin chops (boneless)", "Bacon"),
        ("Beans", "Black beans (dry)", "Canned kidney beans"),
    ]
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.28, right=0.87, top=0.80, bottom=0.12)
    labels, values, colors = [], [], []
    for _, raw, processed in pairs:
        labels += [index[raw]["food"], index[processed]["food"]]
        values += [index[raw]["sodium"], index[processed]["sodium"]]
        colors += [ORANGE, DEEP]
    positions = [0, 0.75, 2.1, 2.85, 4.2, 4.95]
    drawn = ax.barh(positions, values, color=colors, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    heading(
        fig,
        "Sodium Is a Processing Story, Not a Food Story",
        "Same raw ingredient, two aisles. Milligrams of sodium per 100 g, USDA records.",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.set_xlim(0, max(values) * 1.16)
    for bar, value in zip(drawn, values):
        ax.text(
            value + max(values) * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} mg",
            va="center",
            color=SLATE,
            fontsize=11,
            fontweight="bold",
        )
    for offset, (_, raw, processed) in zip((0, 2.1, 4.2), pairs):
        low, high = index[raw]["sodium"], index[processed]["sodium"]
        ax.annotate(
            f"{high / low:.0f}x",
            xy=(1.035, offset + 0.375),
            xycoords=("axes fraction", "data"),
            va="center",
            ha="left",
            color=DEEP,
            fontsize=17,
            fontweight="bold",
            annotation_clip=False,
        )
    save(fig, "sodium-processing-gradient-chart.jpg")


def chart_distribution(rows):
    """Where the sodium actually sits in the basket.

    Deliberately not a sodium-per-dollar chart. Per-dollar rewards cheapness, so a
    bag of carrots outranks bacon on that metric, which tells a reader the opposite
    of the truth. Concentration is the real finding.
    """
    buckets = [
        ("Under 10 mg", 0, 10, ORANGE),
        ("10 to 50 mg", 10, 50, ORANGE),
        ("50 to 150 mg", 50, 150, ORANGE),
        ("150 to 400 mg", 150, 400, DEEP),
        ("Over 400 mg", 400, 10 ** 9, DEEP),
    ]
    labels, counts, colors = [], [], []
    for name, low, high, color in buckets:
        labels.append(name)
        counts.append(sum(1 for r in rows if low <= r["sodium"] < high))
        colors.append(color)

    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.22, right=0.95, top=0.80, bottom=0.14)
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, counts, color=colors, height=0.6)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    heading(
        fig,
        "Almost All of a Budget Basket Is Already Low in Sodium",
        f"{len(rows)} priced staples, sorted by milligrams of sodium per 100 g. "
        "The load sits in a handful of them.",
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=12)
    ax.set_xlim(0, max(counts) * 1.2)
    for bar, count in zip(drawn, counts):
        ax.text(
            count + max(counts) * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{count} foods",
            va="center",
            color=SLATE,
            fontsize=12,
            fontweight="bold",
        )
    ax.set_ylabel("Sodium per 100 g", color=MUTED, fontsize=12, labelpad=14)
    save(fig, "sodium-basket-distribution-chart.jpg")


def main() -> None:
    setup()
    OUT.mkdir(parents=True, exist_ok=True)
    rows = load()
    chart_cheapest_are_cleanest(rows)
    chart_processing_gradient(rows)
    chart_distribution(rows)
    print("wrote 3 charts to public/images/")


if __name__ == "__main__":
    main()
