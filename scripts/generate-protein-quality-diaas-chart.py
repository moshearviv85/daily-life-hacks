"""Slope chart: raw protein grams per dollar vs the published DIAAS-adjusted figure.

Only rows in protein-quality-per-dollar-2026.csv are drawn.
Meat and dairy rows with no matching name are named in the footer and not scored.
Adjusted grams are the file's adjusted_g_per_dollar column, not a fresh multiplication.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
QUALITY = ROOT / "public" / "data" / "protein-quality-per-dollar-2026.csv"
DAIRY = ROOT / "public" / "data" / "dairy-protein-per-dollar-ranked-2026.csv"
MEAT = ROOT / "public" / "data" / "meat-per-dollar-protein-ranked-2026.csv"
OUT = ROOT / "public" / "images" / "protein-quality-diaas-and-cost-index-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"

SPECIAL = {
    "Ground beef (80/20)": "Ground beef 80/20",
    "Old-fashioned rolled oats": "Rolled oats",
    "100% whole wheat bread": "Whole wheat bread",
    "TVP (textured vegetable protein)": "TVP",
}


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def short(name: str) -> str:
    if name in SPECIAL:
        return SPECIAL[name]
    return name.split("(")[0].strip()


def main() -> None:
    quality = load(QUALITY)
    if not quality:
        raise SystemExit("quality file has no rows")
    by_name = {row["food"]: row for row in quality}
    if len(by_name) != len(quality):
        raise SystemExit("duplicate food name in the quality file")

    for row in quality:
        if row["diaas_score"] == "" or row["diaas_source"] == "" or row["adjusted_g_per_dollar"] == "":
            raise SystemExit(f"quality row missing a published DIAAS field: {row['food']}")
        if row["diaas_capped_for_multiplication"] == "":
            raise SystemExit(f"quality row missing the capped multiplier: {row['food']}")

    gaps: list[str] = []
    for path in (DAIRY, MEAT):
        for row in load(path):
            published = by_name.get(row["food"])
            if published is None:
                gaps.append(row["food"])
                continue
            if published["protein_g_per_dollar"] != row["value"]:
                raise SystemExit(f"raw grams disagree for {row['food']}")
    if not gaps:
        raise SystemExit("expected meat or dairy foods with no DIAAS row")

    ranked = sorted(quality, key=lambda row: (-float(row["protein_g_per_dollar"]), row["food"]))
    labels = [short(row["food"]) for row in ranked]
    if len(labels) != len(set(labels)):
        raise SystemExit(f"short labels collided: {labels}")

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.20, right=0.96, top=0.78, bottom=0.16)
    ys = list(range(len(ranked)))
    for y, row in zip(ys, ranked, strict=True):
        raw = float(row["protein_g_per_dollar"])
        adjusted = float(row["adjusted_g_per_dollar"])
        same = raw == adjusted
        color = ORANGE if same else SLATE
        ax.plot([raw, adjusted], [y, y], color=color, linewidth=1.5, solid_capstyle="round", zorder=2)
        ax.scatter([raw], [y], color=ORANGE, s=16, zorder=3)
        ax.scatter([adjusted], [y], color=SLATE, s=16, zorder=3)
        if adjusted < raw:
            ax.text(adjusted - 1.1, y, f"{adjusted:.1f}", va="center", ha="right", color=SLATE, fontsize=7)
        else:
            ax.text(adjusted + 1.4, y, f"{adjusted:.1f}", va="center", ha="left", color=SLATE, fontsize=7)
    ax.set_yticks(ys, labels, fontsize=7)
    ax.invert_yaxis()
    ax.set_xlim(0, 118)
    ax.set_xlabel("Grams of protein per dollar", color=MUTED, fontsize=8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.tick_params(axis="y", length=0, colors=SLATE)
    ax.tick_params(axis="x", colors=MUTED, labelsize=8)
    ax.legend(
        handles=[
            Line2D([0], [0], color=ORANGE, marker="o", markerfacecolor=ORANGE, label="Adjusted equals raw"),
            Line2D([0], [0], color=SLATE, marker="o", markerfacecolor=SLATE, label="DIAAS-adjusted, from the file"),
        ],
        frameon=False,
        fontsize=8,
        loc="lower right",
    )
    fig.text(
        0.20,
        0.94,
        "Raw grams per dollar, then the published DIAAS adjustment",
        color=SLATE,
        fontsize=15,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.20,
        0.885,
        f"{len(quality)} foods in protein-quality-per-dollar-2026.csv. The number by the slate dot is that file's adjusted column.",
        color=MUTED,
        fontsize=9,
        va="center",
    )
    gap_line = "Not drawn, no DIAAS row: " + "; ".join(gaps)
    fig.text(0.5, 0.035, gap_line, ha="center", color=MUTED, fontsize=7)
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
    print("gaps:", "; ".join(gaps))


if __name__ == "__main__":
    main()
