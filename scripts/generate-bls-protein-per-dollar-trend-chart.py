"""Multi-line trend chart for the 2017-2026 BLS protein-per-dollar page.

Points are protein_g_per_dollar on the U.S. city average rows in
public/data/bls-nutrition-per-dollar-monthly.csv. Missing months stay
missing. Do not hardcode the line.
"""

import csv
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.dates import DateFormatter, YearLocator

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "bls-nutrition-per-dollar-monthly.csv"
OUT = ROOT / "public" / "images" / "protein-per-dollar-2017-to-2026-bls-trends-chart.jpg"

SERIES = [
    ("708111", "Eggs, grade A large", "#F29B30"),
    ("709112", "Whole milk", "#1D4ED8"),
    ("706111", "Whole chicken", "#0F766E"),
    ("FF1101", "Chicken breast", "#7C3AED"),
    ("703112", "Ground beef, 100%", "#9F1239"),
    ("701322", "Spaghetti / macaroni", "#334155"),
]


def month_starts():
    year, month = 2017, 1
    while (year, month) <= (2026, 10):
        yield datetime(year, month, 1)
        month += 1
        if month == 13:
            month = 1
            year += 1


def load_us_average():
    by_code = {code: {} for code, _label, _color in SERIES}
    with CSV.open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row["area_name"] != "U.S. city average":
                continue
            if row["bls_item_code"] not in by_code:
                continue
            by_code[row["bls_item_code"]][row["date"]] = float(row["protein_g_per_dollar"])
    return by_code


def main():
    by_code = load_us_average()
    dates = list(month_starts())
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 7.2), dpi=120)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")
    fig.subplots_adjust(left=0.08, right=0.98, top=0.78, bottom=0.22)

    for code, label, color in SERIES:
        values = []
        for day in dates:
            key = day.strftime("%Y-%m-%d")
            values.append(by_code[code].get(key, float("nan")))
        if all(value != value for value in values):
            raise SystemExit(f"no U.S. city average rows for {code}")
        ax.plot(dates, values, color=color, linewidth=2.2, label=label)

    ax.set_ylabel("Grams of protein per dollar", color="#2F3542", fontsize=12)
    ax.set_ylim(0, 70)
    ax.xaxis.set_major_locator(YearLocator())
    ax.xaxis.set_major_formatter(DateFormatter("%Y"))
    ax.tick_params(colors="#697386")
    ax.spines[:].set_visible(False)
    ax.yaxis.grid(True, color="#E7E9ED")
    ax.set_axisbelow(True)
    ax.legend(
        frameon=False,
        ncol=3,
        loc="upper center",
        bbox_to_anchor=(0.5, -0.12),
        fontsize=11,
    )
    fig.text(
        0.06,
        0.94,
        "Protein per dollar, U.S. city average",
        color="#2F3542",
        fontsize=20,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.885,
        "BLS Average Price series, January 2017 to October 2026. Gaps are months with no row.",
        color="#697386",
        fontsize=12,
        va="top",
    )
    fig.text(
        0.5,
        0.02,
        "Data: bls-nutrition-per-dollar-monthly.csv | daily-life-hacks.com",
        ha="center",
        color="#697386",
        fontsize=9,
    )
    fig.savefig(OUT, format="jpg")
    plt.close(fig)
    print(OUT)


if __name__ == "__main__":
    main()
