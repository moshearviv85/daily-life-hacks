"""Horizontal bar chart of fiber grams per dollar for ten grocery snacks.

Bar lengths are the `value` column in
public/data/high-fiber-snacks-per-dollar-2026.csv, checked against
fiber_g_per_dollar in fiber-per-dollar-2026.csv. Popcorn stays on the
chart and is drawn in slate: that row has no USDA id. Do not hardcode
the bar lengths.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SNACKS = ROOT / "public" / "data" / "high-fiber-snacks-per-dollar-2026.csv"
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "cheapest-high-fiber-snacks-per-dollar-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    rows = load(SNACKS)
    if len(rows) != 10:
        raise SystemExit(f"expected 10 snack rows, found {len(rows)}")
    fiber = {row["food"]: row for row in load(FIBER)}
    popcorn = next(row for row in rows if row["food"] == "Popcorn kernels")
    if popcorn["fdc_id"]:
        raise SystemExit("popcorn unexpectedly gained an FDC id")
    verified = 0
    for row in rows:
        match = fiber.get(row["food"])
        if match is None:
            raise SystemExit(f"{row['food']} missing from the fiber file")
        if match["fiber_g_per_dollar"] != row["value"]:
            raise SystemExit(
                f"{row['food']} {row['value']} != {match['fiber_g_per_dollar']}"
            )
        if row["fdc_id"]:
            verified += 1
    if verified != 9:
        raise SystemExit(f"expected 9 FDC snack rows, found {verified}")

    ranked = sorted(rows, key=lambda row: -float(row["value"]))
    labels = [
        f"{row['food']} (no USDA id)" if not row["fdc_id"] else row["food"]
        for row in ranked
    ]
    values = [float(row["value"]) for row in ranked]
    colors = [SLATE if not row["fdc_id"] else ORANGE for row in ranked]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.36, right=0.96, top=0.80, bottom=0.08)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=colors, height=0.68)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=9)
    ax.grid(False)
    ax.set_xlim(0, max(values) * 1.22)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            value + max(values) * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} g",
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    fig.text(
        0.06,
        0.975,
        "Fiber per dollar: ten grocery snacks",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.925,
        "Grams of fiber per $1. Popcorn stays on the chart and has no USDA id.",
        color=MUTED,
        fontsize=10,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="USDA id in the file"),
            Patch(facecolor=SLATE, label="No USDA id"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.36, 0.86),
        ncol=2,
        fontsize=8,
    )
    fig.text(
        0.5,
        0.012,
        "Data: high-fiber-snacks-per-dollar-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(OUT)


if __name__ == "__main__":
    main()
