"""Non-linear seasoning multipliers from a 0.5x batch to a 4x batch.

Salt, dried herbs, garlic, onion, and chili use the published table:
0.375, 1.25, 1.5, 2.25, 3. The 2x salt start (1.5x) is the figure from
Mississippi State University Extension and Heart Foundation NZ.
Braise liquid stays on the batch factor through 1.5x, then 12.5% under
a full multiple: 1.75, 2.625, 3.5. Fresh herbs and leavening stay on
the dashed full-batch line.

This file is a chart, not a photograph.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images" / "recipe-spice-and-batch-scaler-chart.jpg"

BATCHES = [0.5, 1.5, 2, 3, 4]
# Keep these in lockstep with src/pages/tools/recipe-spice-and-batch-scaler/index.astro.
STRONG = [0.375, 1.25, 1.5, 2.25, 3]
LIQUID = [0.5, 1.5, 1.75, 2.625, 3.5]
FULL = BATCHES

ORANGE = "#F29B30"
DEEP = "#9A5B16"
SLATE = "#334155"
MUTED = "#64748B"


def main() -> None:
    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.08, right=0.98, top=0.76, bottom=0.16)
    ax.plot(
        BATCHES,
        FULL,
        color=SLATE,
        linestyle="--",
        linewidth=2,
        marker="o",
        label="Full batch: beef, fresh herbs, leavening",
    )
    ax.plot(
        BATCHES,
        STRONG,
        color=ORANGE,
        linewidth=2.6,
        marker="o",
        label="Salt, dried herbs, garlic, chili",
    )
    ax.plot(
        BATCHES,
        LIQUID,
        color=DEEP,
        linewidth=2.6,
        marker="o",
        label="Braise liquid or stock",
    )
    ax.annotate(
        "Salt at a double: 1.5x",
        xy=(2, 1.5),
        xytext=(2.35, 0.85),
        color=ORANGE,
        fontsize=10,
        fontweight="bold",
        arrowprops={"arrowstyle": "-", "color": ORANGE},
    )
    ax.set_xlim(0.2, 4.35)
    ax.set_ylim(0, 4.6)
    ax.set_xticks(BATCHES)
    ax.set_xticklabels(["0.5x", "1.5x", "2x", "3x", "4x"], color=SLATE, fontsize=11)
    ax.set_ylabel("Multiplier on the original amount", color=SLATE, fontsize=11)
    ax.tick_params(axis="y", colors=SLATE)
    ax.spines[:].set_color("#E2E8F0")
    ax.grid(axis="y", color="#E2E8F0", linewidth=0.8)
    ax.legend(frameon=False, loc="upper left", fontsize=10)
    fig.text(
        0.035,
        0.94,
        "Seasoning Multipliers Are Not the Batch Factor",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
        va="top",
    )
    fig.text(
        0.035,
        0.87,
        "A 2x pot starts salt near 1.5x. The dashed line is the blind double.",
        color=MUTED,
        fontsize=11,
        va="top",
    )
    fig.text(
        0.5,
        0.035,
        "1.5x salt at a double: MSU Extension and Heart Foundation NZ | Liquid from 2x up is 12.5% under a full multiple | Chart, not a photograph",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT, dpi=100, format="jpeg", facecolor="white", pil_kwargs={"quality": 90})
    plt.close(fig)


if __name__ == "__main__":
    main()
