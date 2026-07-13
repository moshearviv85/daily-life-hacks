"""Generate deterministic data charts used inside budget nutrition guides."""

from pathlib import Path

import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "images"

ORANGE = "#F29B30"
DARK = "#2F3542"
MUTED = "#697386"
GRID = "#E7E9ED"


def save_bar_chart(
    filename: str,
    labels: list[str],
    values: list[float],
    annotations: list[str],
    title: str,
    subtitle: str,
    xlabel: str,
    footer: str,
) -> None:
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    positions = list(range(len(labels)))
    bars = ax.barh(positions, values, color=ORANGE, height=0.58)
    ax.set_yticks(positions, labels=labels, fontsize=13, color=DARK)
    ax.invert_yaxis()
    ax.set_xlabel(xlabel, fontsize=11, color=MUTED, labelpad=12)
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", colors=MUTED, labelsize=10)
    ax.tick_params(axis="y", length=0, pad=10)

    for spine in ax.spines.values():
        spine.set_visible(False)

    max_value = max(values)
    ax.set_xlim(0, max_value * 1.28)
    for bar, annotation in zip(bars, annotations, strict=True):
        ax.text(
            bar.get_width() + max_value * 0.025,
            bar.get_y() + bar.get_height() / 2,
            annotation,
            va="center",
            ha="left",
            fontsize=11,
            fontweight="bold",
            color=DARK,
        )

    fig.text(0.075, 0.945, title, fontsize=25, fontweight="bold", color=DARK)
    fig.text(0.075, 0.902, subtitle, fontsize=12, color=MUTED)
    fig.text(0.075, 0.025, footer, fontsize=9, color=MUTED)
    fig.subplots_adjust(left=0.27, right=0.93, top=0.82, bottom=0.15)

    path = OUTPUT / filename
    fig.savefig(
        path,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)
    print(path)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    # Meal values come from the priced one-day example in the fiber budget guide.
    save_bar_chart(
        "fiber-budget-day-breakdown.jpg",
        ["Breakfast", "Lunch", "Snack", "Dinner"],
        [7.1, 16.1, 4.4, 9.6],
        ["7.1 g  |  $0.28", "16.1 g  |  $0.30", "4.4 g  |  $0.08", "9.6 g  |  $0.22"],
        "37 Grams of Fiber for $0.88",
        "Fiber-carrying ingredients in one sample day",
        "Grams of fiber",
        "Data: Daily Life Hacks priced meal example, July 2026 | daily-life-hacks.com",
    )

    # Package protein totals and prices come from the guide's $20 basket table.
    save_bar_chart(
        "protein-budget-weekly-backbone.jpg",
        ["Pinto beans", "Chicken drumsticks", "Eggs", "Brown lentils", "Cottage cheese", "Canned tuna"],
        [389, 275, 151, 112, 76, 44],
        ["$3.97", "$5.46", "$4.38", "$1.44", "$2.87", "$1.96"],
        "$20.08 Buys 1,047 Grams of Protein",
        "Package totals, not a one-person intake target",
        "Grams of protein in the package",
        "Data: USDA nutrition data and July 2026 U.S. prices | daily-life-hacks.com",
    )

    # Protein-per-dollar results are copied from the large-family protein ladder.
    save_bar_chart(
        "family-protein-ladder.jpg",
        ["Cooked base — Pinto beans", "Fast dry good — Lentils", "Pantry lunch — Peanut butter", "Meat night — Drumsticks", "Quick dinner — Eggs", "Emergency lunch — Tuna"],
        [98, 78, 51, 50, 34, 22],
        ["98 g/$", "78 g/$", "51 g/$", "50 g/$", "34 g/$", "22 g/$"],
        "Build a Protein Ladder, Not a One-Food Plan",
        "Use a cheap base, flexible backups, and one convenient option",
        "Grams of protein per $1",
        "Data: USDA nutrition data and July 2026 U.S. prices | daily-life-hacks.com",
    )


if __name__ == "__main__":
    main()
