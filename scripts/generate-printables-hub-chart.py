"""Four-panel chart for the /printables/ hub.

Bar lengths are read from the same sources as the five printables:
dry vs canned black-bean protein per dollar, fridge windows, oil smoke
points, and flour already inside 100 g of 100% vs 80% discard.
The grocery planner is a form, so it is named in the footer and not drawn
as a fake bar. This file is a chart, not a photograph.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
BEANS = ROOT / "public" / "data" / "canned-vs-dry-beans-cost-2026.csv"
FRIDGE = ROOT / "src" / "content" / "lead-magnet-data.mjs"
HYDRATION = ROOT / "src" / "data" / "articles" / "sourdough-discard-hydration-conversion-chart.md"
OUT = ROOT / "public" / "images" / "printables-hub-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

SMOKE_OILS = (
    ("Coconut", "Coconut (refined, deodorized)", "385°F"),
    ("Peanut", "Peanut (refined, deodorized)", "446°F"),
    ("Canola", "Canola (refined, deodorized)", "457°F"),
    ("Soybean", "Soybean, aka vegetable oil (refined, deodorized)", "464°F"),
)

FRIDGE_ROWS = (
    ("Leftovers", '["Cooked meat or poultry", "3 to 4 days"]', 4),
    ("Dairy dressing", '["Dairy or buttermilk", "3 to 4 days"]', 4),
    ("Garlic dressing", '["With fresh garlic or herbs", "Up to 1 week"]', 7),
    ("Vinaigrette", '["Vinaigrette (oil, vinegar, dried herbs and spices)", "Up to 2 weeks"]', 14),
)


def load_beans() -> dict[str, dict[str, str]]:
    with BEANS.open(newline="", encoding="utf-8") as handle:
        return {row["food"]: row for row in csv.DictReader(handle)}


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f"{label} missing {needle!r}")


def bars(ax, labels: list[str], values: list[float], unit: str, title: str) -> None:
    positions = list(range(len(labels)))
    drawn = ax.barh(positions, values, color=ORANGE, height=0.62)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.set_title(title, loc="left", color=SLATE, fontsize=11, fontweight="bold", pad=6)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=8)
    ax.grid(False)
    peak = max(values)
    ax.set_xlim(0, peak * 1.38)
    for bar, value in zip(drawn, values):
        ax.text(
            value + peak * 0.03,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g}{unit}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )


def main() -> None:
    beans = load_beans()
    dry = beans["Black beans (dry)"]
    canned = beans["Canned black beans"]
    dry_rate = float(dry["value"])
    canned_rate = float(canned["value"])
    if dry_rate != 58.0 or canned_rate != 30.1:
        raise SystemExit(f"black bean rates drifted: dry {dry_rate}, canned {canned_rate}")

    fridge = FRIDGE.read_text(encoding="utf-8")
    smoke_labels: list[str] = []
    smoke_values: list[float] = []
    for label, oil, point in SMOKE_OILS:
        require(fridge, f'["{oil}", "{point}"', "smoke-point table")
        smoke_labels.append(label)
        smoke_values.append(float(point.replace("°F", "")))

    fridge_labels: list[str] = []
    fridge_values: list[float] = []
    for label, needle, days in FRIDGE_ROWS:
        require(fridge, needle, "fridge card")
        fridge_labels.append(label)
        fridge_values.append(float(days))

    hydration = HYDRATION.read_text(encoding="utf-8")
    hundred = re.search(r"100 gram pour is (\d+(?:\.\d+)?) grams of each", hydration)
    eighty = re.search(
        r"100 gram scoop is (\d+(?:\.\d+)?) grams of flour and (\d+(?:\.\d+)?) grams of water",
        hydration,
    )
    if not hundred or not eighty:
        raise SystemExit("hydration article no longer states the 100 g flour split")
    flour_100 = float(hundred.group(1))
    flour_80 = float(eighty.group(1))
    if flour_100 != 50 or flour_80 != 55.6:
        raise SystemExit(f"discard flour drifted: 100% {flour_100}, 80% {flour_80}")

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(2, 2, figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.10, right=0.98, top=0.80, bottom=0.12, hspace=0.55, wspace=0.42)
    bars(
        axes[0, 0],
        ["Dry black beans", "Canned black beans"],
        [dry_rate, canned_rate],
        " g/$",
        "Protein, grams per dollar",
    )
    bars(axes[0, 1], fridge_labels, fridge_values, " days", "Fridge window, upper published day")
    bars(axes[1, 0], smoke_labels, smoke_values, "°F", "Refined oil smoke point")
    bars(
        axes[1, 1],
        ["100% hydration", "80% hydration"],
        [flour_100, flour_80],
        " g",
        "Flour in 100 g of discard",
    )
    fig.text(
        0.10,
        0.94,
        "Benchmarks behind the printable kitchen guides",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.10,
        0.885,
        "Chart drawn from the published tables. Not a photograph.",
        color=MUTED,
        fontsize=9,
        va="center",
    )
    fig.text(
        0.5,
        0.03,
        "Data: canned-vs-dry-beans-cost-2026.csv, fridge-life card, smoke-point chart, discard hydration chart. Not a photograph.",
        ha="center",
        color=MUTED,
        fontsize=7.5,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
