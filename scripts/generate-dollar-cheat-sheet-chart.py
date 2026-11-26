"""Two-panel chart: what $1 buys in protein, and what $1 buys in fiber.

Bar lengths are the value column of the two one-dollar CSVs.
A food that exists on only one list is not given a zero on the other.
Do not hardcode bar lengths.
"""

from __future__ import annotations

import csv
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "one-dollar-protein-what-it-buys-2026.csv"
FIBER = ROOT / "public" / "data" / "one-dollar-fiber-what-it-buys-2026.csv"
OUT = ROOT / "public" / "images" / "high-fiber-and-protein-dollar-cheat-sheet-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def short(name: str) -> str:
    if name == "Old-fashioned rolled oats":
        return "Rolled oats"
    if name == "Bran flakes cereal":
        return "Bran flakes"
    return name.split("(")[0].strip()


def ranked(rows: list[dict[str, str]]) -> list[tuple[str, float]]:
    labels = [short(row["food"]) for row in rows]
    if len(labels) != len(set(labels)):
        raise SystemExit(f"short labels collided: {labels}")
    parsed = [(label, float(row["value"])) for label, row in zip(labels, rows, strict=True)]
    parsed.sort(key=lambda item: (-item[1], item[0]))
    return parsed


def draw(ax, items: list[tuple[str, float]], title: str) -> None:
    labels = [label for label, _value in items]
    values = [value for _label, value in items]
    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=ORANGE, height=0.72)
    ax.set_yticks(positions, labels, fontsize=8)
    ax.invert_yaxis()
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0)
    peak = max(values)
    ax.set_xlim(0, peak * 1.28)
    for bar, value in zip(bars, values, strict=True):
        ax.text(
            value + peak * 0.02,
            bar.get_y() + bar.get_height() / 2,
            f"{value:.1f}",
            va="center",
            color=SLATE,
            fontsize=7,
            fontweight="bold",
        )
    ax.set_title(title, loc="left", color=SLATE, fontsize=11, fontweight="bold", pad=8)


def main() -> None:
    protein = load(PROTEIN)
    fiber = load(FIBER)
    if len(protein) != 15:
        raise SystemExit(f"expected 15 protein rows, found {len(protein)}")
    if len(fiber) != 15:
        raise SystemExit(f"expected 15 fiber rows, found {len(fiber)}")
    for row in protein + fiber:
        if not row["food"] or row["value"] == "":
            raise SystemExit(f"blank food or value: {row}")

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(1, 2, figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.16, right=0.98, top=0.78, bottom=0.1, wspace=0.42)
    draw(axes[0], ranked(protein), "Protein grams per $1")
    draw(axes[1], ranked(fiber), "Fiber grams per $1")
    fig.text(
        0.16,
        0.93,
        "What $1 buys, from the two published lists",
        color=SLATE,
        fontsize=16,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.16,
        0.875,
        "Each panel is its own file. A food missing from one list is not drawn as zero.",
        color=MUTED,
        fontsize=9,
        va="center",
    )
    fig.text(
        0.5,
        0.03,
        "Chart from one-dollar-protein-what-it-buys-2026.csv and one-dollar-fiber-what-it-buys-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
