"""Horizontal bar chart for the bean-free fiber page.

Bar lengths are grams of fiber per dollar from
public/data/fiber-per-dollar-2026.csv. Do not hardcode them.
"""

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "high-fiber-without-beans-chart.jpg"

ORANGE = "#F29B30"
DARK = "#2F3542"
MUTED = "#697386"
GRID = "#E7E9ED"

# The foods the page ranks. Names match the CSV `food` column.
FOODS = [
    "Whole wheat flour",
    "Pearled barley (dry)",
    "Popcorn kernels",
    "Old-fashioned rolled oats",
    "Chia seeds",
    "Avocado",
    "100% whole wheat bread",
    "Frozen broccoli florets",
    "Almonds",
    "Pears",
    "Apples (gala)",
    "Raspberries",
    "Blackberries",
]

LABELS = {
    "Whole wheat flour": "Whole wheat flour",
    "Pearled barley (dry)": "Pearled barley",
    "Popcorn kernels": "Popcorn kernels",
    "Old-fashioned rolled oats": "Rolled oats",
    "Chia seeds": "Chia seeds",
    "Avocado": "Avocado",
    "100% whole wheat bread": "Whole wheat bread",
    "Frozen broccoli florets": "Frozen broccoli",
    "Almonds": "Almonds",
    "Pears": "Pears",
    "Apples (gala)": "Apples",
    "Raspberries": "Raspberries",
    "Blackberries": "Blackberries",
}


def load_rows():
    with CSV.open(newline="") as handle:
        return list(csv.DictReader(handle))


def main():
    by_food = {row["food"]: row for row in load_rows()}
    missing = [name for name in FOODS if name not in by_food]
    if missing:
        raise SystemExit(f"CSV is missing {missing}")

    ranked = sorted(FOODS, key=lambda name: -float(by_food[name]["fiber_g_per_dollar"]))
    labels = [LABELS[name] for name in ranked]
    values = [float(by_food[name]["fiber_g_per_dollar"]) for name in ranked]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 8.4), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels=labels, fontsize=12, color=DARK)
    ax.invert_yaxis()
    ax.set_xlabel("Grams of fiber per dollar", fontsize=11, color=MUTED, labelpad=12)
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", colors=MUTED, labelsize=10)
    ax.tick_params(axis="y", length=0, pad=8)
    for spine in ax.spines.values():
        spine.set_visible(False)

    max_value = max(values)
    ax.set_xlim(0, max_value * 1.22)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            bar.get_width() + max_value * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f} g",
            va="center",
            ha="left",
            fontsize=11,
            fontweight="bold",
            color=DARK,
        )

    fig.text(0.24, 0.955, "Fiber per Dollar, Beans Left Out", fontsize=22, fontweight="bold", color=DARK)
    fig.text(
        0.24,
        0.918,
        "13 non-legume foods from the 2026 fiber-per-dollar file",
        fontsize=12,
        color=MUTED,
    )
    fig.text(
        0.24,
        0.02,
        "Data: fiber-per-dollar-2026.csv. Popcorn is a derived kernel figure. | daily-life-hacks.com",
        fontsize=9,
        color=MUTED,
    )
    fig.subplots_adjust(left=0.24, right=0.94, top=0.88, bottom=0.10)
    fig.savefig(
        OUT,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)
    print(OUT)


if __name__ == "__main__":
    main()
