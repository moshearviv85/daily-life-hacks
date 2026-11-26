"""Range chart for cooked grains and beans in the fridge.

Ranges are the USDA FoodKeeper v128 refrigerator windows (products 174, 177,
178, and 426) and the FSIS leftovers page's 3 to 4 day rule. A range is drawn
as a minimum plus the extra days, not as a midpoint.
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
OUT = (
    ROOT
    / "public"
    / "images"
    / "how-long-do-cooked-grains-and-beans-last-in-the-fridge-chart.jpg"
)

ORANGE = "#F29B30"
LIGHT_ORANGE = "#F8D3A5"
DARK = "#2F3542"
MUTED = "#697386"
GRID = "#E7E9ED"

# (label, min days, max days, annotation)
ROWS = [
    ("FSIS leftovers", 3, 4, "3 to 4 days"),
    ("Cooked beans", 3, 4, "3 to 4 days"),
    ("Cooked pasta", 3, 5, "3 to 5 days"),
    ("Cooked rice", 4, 6, "4 to 6 days"),
    ("Cooked quinoa", 6, 7, "6 to 7 days"),
]


def main():
    labels = [row[0] for row in ROWS]
    ranges = [(row[1], row[2]) for row in ROWS]
    annotations = [row[3] for row in ROWS]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    positions = list(range(len(labels)))
    for position, (minimum, maximum) in zip(positions, ranges, strict=True):
        ax.barh(position, minimum, color=ORANGE, height=0.58)
        if maximum > minimum:
            ax.barh(
                position,
                maximum - minimum,
                left=minimum,
                color=LIGHT_ORANGE,
                edgecolor=ORANGE,
                linewidth=1.5,
                height=0.58,
            )

    ax.set_yticks(positions, labels=labels, fontsize=13, color=DARK)
    ax.invert_yaxis()
    ax.set_xlabel("Days in the refrigerator at 40°F or below", fontsize=11, color=MUTED, labelpad=12)
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", colors=MUTED, labelsize=10)
    ax.tick_params(axis="y", length=0, pad=10)
    for spine in ax.spines.values():
        spine.set_visible(False)

    max_value = max(maximum for _minimum, maximum in ranges)
    ax.set_xlim(0, max_value * 1.45)
    for position, ((_minimum, maximum), annotation) in enumerate(
        zip(ranges, annotations, strict=True)
    ):
        ax.text(
            maximum + max_value * 0.03,
            position,
            annotation,
            va="center",
            ha="left",
            fontsize=12,
            fontweight="bold",
            color=DARK,
        )

    fig.text(
        0.28,
        0.945,
        "How Long Cooked Grains and Beans Last",
        fontsize=22,
        fontweight="bold",
        color=DARK,
    )
    fig.text(
        0.28,
        0.900,
        "FoodKeeper ranges beside the FSIS leftovers rule. Lighter bar is the extra days.",
        fontsize=11,
        color=MUTED,
    )
    fig.text(
        0.28,
        0.025,
        "Data: USDA FoodKeeper v128 (beans use leftovers without meat) and FSIS leftovers guidance | daily-life-hacks.com",
        fontsize=9,
        color=MUTED,
    )
    fig.subplots_adjust(left=0.28, right=0.93, top=0.84, bottom=0.14)
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
