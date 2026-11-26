"""Regional multi-year chart for the BLS grocery price explorer.

Every point is protein_g_per_dollar for boneless chicken breast (BLS FF1101)
in public/data/bls-nutrition-per-dollar-monthly.csv. Missing months stay
missing. The figure is a chart, not a photograph.
"""

from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.dates import DateFormatter, YearLocator

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "bls-nutrition-per-dollar-monthly.csv"
OUT = ROOT / "public" / "images" / "bls-grocery-prices-2017-to-2026-data-chart.jpg"

CODE = "FF1101"
AREAS = [
    ("U.S. city average", "#F29B30"),
    ("Northeast", "#1D4ED8"),
    ("Midwest", "#0F766E"),
    ("South", "#7C3AED"),
    ("West", "#9F1239"),
]


def month_starts():
    year, month = 2017, 1
    while (year, month) <= (2026, 10):
        yield datetime(year, month, 1)
        month += 1
        if month == 13:
            month = 1
            year += 1


def load():
    by_area = {name: {} for name, _color in AREAS}
    protein = None
    with CSV.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row["bls_item_code"] != CODE:
                continue
            if row["area_name"] not in by_area:
                continue
            by_area[row["area_name"]][row["date"]] = float(row["protein_g_per_dollar"])
            protein = row["protein_g_per_100g"]
    if protein is None:
        raise SystemExit(f"no monthly rows for {CODE}")
    for name, _color in AREAS:
        if not by_area[name]:
            raise SystemExit(f"no {name} rows for {CODE}")
    return by_area, protein


def main():
    by_area, protein = load()
    dates = list(month_starts())
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.08, right=0.98, top=0.78, bottom=0.22)

    peak = 0.0
    for name, color in AREAS:
        values = []
        for day in dates:
            key = day.strftime("%Y-%m-%d")
            value = by_area[name].get(key, float("nan"))
            values.append(value)
            if value == value:
                peak = max(peak, value)
        ax.plot(dates, values, color=color, linewidth=2.2, label=name)

    ax.set_ylabel("Grams of protein per dollar", color="#334155", fontsize=12)
    ax.set_ylim(0, max(40, peak * 1.15))
    ax.xaxis.set_major_locator(YearLocator())
    ax.xaxis.set_major_formatter(DateFormatter("%Y"))
    ax.tick_params(colors="#64748B")
    ax.spines[:].set_visible(False)
    ax.yaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    ax.legend(
        loc="upper center",
        bbox_to_anchor=(0.5, -0.14),
        ncol=5,
        frameon=False,
        fontsize=10,
    )
    fig.text(
        0.035,
        0.94,
        "Chicken Breast Protein per Dollar, by Region",
        color="#334155",
        fontsize=20,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.88,
        f"BLS Average Price, January 2017 to October 2026. USDA protein stays {protein} g per 100 g.",
        color="#64748B",
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.02,
        "Data: bls-nutrition-per-dollar-monthly.csv | daily-life-hacks.com",
        ha="center",
        color="#64748B",
        fontsize=9,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=100, format="jpeg", pil_kwargs={"quality": 90})
    plt.close(fig)


if __name__ == "__main__":
    main()
