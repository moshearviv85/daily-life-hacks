"""Horizontal bars: sodium mg per 100 g, with a line at 140.

Milligrams come from sodium-per-dollar-2026.csv when the FDC id is in
that file. Canned black beans and canned chickpeas are not. Their
regular-can milligrams are the first number in the protein-per-dollar
note ("differ only in sodium, 384 vs 138"). Do not hardcode the bar
lengths. Cottage cheese is not on the chart: the sodium file has no row.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SODIUM = ROOT / "public" / "data" / "sodium-per-dollar-2026.csv"
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "how-to-cut-sodium-in-canned-beans-and-budget-meals-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
LINE = 140.0
NOTE = re.compile(r"differ only in sodium, (\d+(?:\.\d+)?) vs (\d+(?:\.\d+)?)")

# Display labels only. The milligrams are read from the files.
FOODS = (
    ("172688", "Whole wheat bread"),
    ("175188", "Canned black beans"),
    ("173741", "Canned kidney beans"),
    ("175206", "Canned chickpeas"),
    ("173709", "Canned tuna"),
    ("172373", "Chicken drumsticks"),
    ("171077", "Chicken breast"),
    ("170894", "Greek yogurt"),
    ("173756", "Dry chickpeas"),
    ("175199", "Dry pinto beans"),
    ("170562", "Sunflower kernels"),
    ("168410", "Frozen edamame"),
    ("173734", "Dry black beans"),
    ("173745", "Dry navy beans"),
    ("170567", "Almonds"),
)


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def sodium_mg() -> dict[str, float]:
    found: dict[str, float] = {}
    sodium_rows = load(SODIUM)
    if len(sodium_rows) != 56:
        raise SystemExit(f"expected 56 sodium rows, found {len(sodium_rows)}")
    for row in sodium_rows:
        found[row["fdc_id"]] = float(row["sodium_mg_per_100g"])
    for row in load(PROTEIN):
        fdc = row["fdc_id"]
        if fdc in found:
            continue
        match = NOTE.search(row.get("nutrition_source_note") or "")
        if match:
            found[fdc] = float(match.group(1))
    return found


def main() -> None:
    values_by_fdc = sodium_mg()
    rows: list[tuple[str, float]] = []
    for fdc, label in FOODS:
        if fdc not in values_by_fdc:
            raise SystemExit(f"missing sodium for FDC {fdc} ({label})")
        rows.append((label, values_by_fdc[fdc]))
    if len(rows) != 15:
        raise SystemExit(f"expected 15 bars, found {len(rows)}")
    if any(fdc == "172179" for fdc, _label in FOODS):
        raise SystemExit("cottage cheese is not a sodium-file row")
    rows.sort(key=lambda item: (-item[1], item[0]))

    labels = [label for label, _value in rows]
    values = [value for _label, value in rows]
    colors = [ORANGE if value > LINE else SLATE for value in values]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.28, right=0.96, top=0.78, bottom=0.08)
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=colors, height=0.68)
    ax.set_yticks(positions, labels)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=8)
    ax.grid(False)
    ax.set_xlim(0, max(values) * 1.18)
    ax.axvline(LINE, color=MUTED, linewidth=1, linestyle="--")
    ax.text(
        LINE + 6,
        len(labels) - 0.55,
        "140 mg",
        color=MUTED,
        fontsize=8,
        fontweight="bold",
        va="bottom",
    )
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            value + max(values) * 0.012,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g}",
            va="center",
            color=SLATE,
            fontsize=8,
            fontweight="bold",
        )
    fig.text(
        0.06,
        0.975,
        "Sodium per 100 g: cans, the loaf, and the swaps",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.06,
        0.915,
        "Dashed line is 140 mg per 100 g on this chart. The low-sodium claim is per reference amount.",
        color=MUTED,
        fontsize=9,
        va="top",
    )
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Over 140 mg per 100 g"),
            Patch(facecolor=SLATE, label="140 mg or under"),
        ],
        frameon=False,
        loc="upper left",
        bbox_to_anchor=(0.28, 0.86),
        ncol=2,
        fontsize=8,
    )
    fig.text(
        0.5,
        0.012,
        "Data: sodium-per-dollar-2026.csv and protein-per-dollar-2026.csv notes | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    for label, value in rows:
        print(f"{value:g}\t{label}")
    print(OUT)


if __name__ == "__main__":
    main()
