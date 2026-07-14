"""Generate deterministic data charts used inside budget nutrition guides."""

from pathlib import Path
from textwrap import fill

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "images"

ORANGE = "#F29B30"
DARK = "#2F3542"
MUTED = "#697386"
GRID = "#E7E9ED"
LIGHT_ORANGE = "#F8D3A5"


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


def save_range_bar_chart(
    filename: str,
    labels: list[str],
    ranges: list[tuple[float, float]],
    annotations: list[str],
    title: str,
    subtitle: str,
    xlabel: str,
    footer: str,
) -> None:
    """Draw exact values and ranges without turning a range into a fake midpoint."""
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
    ax.set_xlabel(xlabel, fontsize=11, color=MUTED, labelpad=12)
    ax.xaxis.grid(True, color=GRID, linewidth=1)
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", colors=MUTED, labelsize=10)
    ax.tick_params(axis="y", length=0, pad=10)
    for spine in ax.spines.values():
        spine.set_visible(False)

    max_value = max(maximum for _minimum, maximum in ranges)
    ax.set_xlim(0, max_value * 1.35)
    for position, ((_minimum, maximum), annotation) in enumerate(
        zip(ranges, annotations, strict=True)
    ):
        ax.text(
            maximum + max_value * 0.03,
            position,
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
    fig.subplots_adjust(left=0.30, right=0.93, top=0.82, bottom=0.15)

    path = OUTPUT / filename
    fig.savefig(
        path,
        format="jpg",
        dpi=100,
        pil_kwargs={"quality": 91, "optimize": True, "progressive": True},
    )
    plt.close(fig)
    print(path)


def save_step_diagram(
    filename: str,
    steps: list[tuple[str, str]],
    title: str,
    subtitle: str,
    footer: str,
) -> None:
    fig = plt.figure(figsize=(12, 6.75), dpi=100, facecolor="white")
    ax = fig.add_axes((0, 0, 1, 1))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    fig.text(0.065, 0.91, title, fontsize=25, fontweight="bold", color=DARK)
    fig.text(0.065, 0.855, subtitle, fontsize=12, color=MUTED)

    box_width = 0.205
    box_height = 0.36
    gap = 0.035
    start_x = 0.055
    box_y = 0.29
    for index, (heading, detail) in enumerate(steps):
        x = start_x + index * (box_width + gap)
        box = FancyBboxPatch(
            (x, box_y),
            box_width,
            box_height,
            boxstyle="round,pad=0.012,rounding_size=0.018",
            linewidth=1.25,
            edgecolor=GRID,
            facecolor="white",
        )
        ax.add_patch(box)
        ax.add_patch(
            FancyBboxPatch(
                (x, box_y + box_height - 0.055),
                box_width,
                0.055,
                boxstyle="round,pad=0.012,rounding_size=0.018",
                linewidth=0,
                facecolor=ORANGE,
            )
        )
        ax.text(
            x + 0.025,
            box_y + box_height - 0.105,
            str(index + 1),
            fontsize=16,
            fontweight="bold",
            color=ORANGE,
            va="center",
        )
        ax.text(
            x + 0.025,
            box_y + box_height - 0.17,
            fill(heading, 16),
            fontsize=15,
            fontweight="bold",
            color=DARK,
            va="top",
        )
        ax.text(
            x + 0.025,
            box_y + 0.075,
            fill(detail, 24),
            fontsize=11,
            color=MUTED,
            va="bottom",
            linespacing=1.35,
        )
        if index < len(steps) - 1:
            arrow_x = x + box_width + 0.007
            ax.add_patch(
                FancyArrowPatch(
                    (arrow_x, box_y + box_height / 2),
                    (arrow_x + gap - 0.012, box_y + box_height / 2),
                    arrowstyle="-|>",
                    mutation_scale=14,
                    linewidth=1.4,
                    color=ORANGE,
                )
            )

    fig.text(0.065, 0.045, footer, fontsize=9, color=MUTED)
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

    # Measurements come directly from the peppermint ginger tea brew section.
    save_step_diagram(
        "peppermint-ginger-tea-brew-guide.jpg",
        [
            ("Slice ginger", "Use 3 to 4 thin coins."),
            ("Add peppermint", "Use 1 teaspoon dried mint."),
            ("Pour the water", "Add 12 oz just-boiled water."),
            ("Cover and steep", "Wait 5 to 10 minutes."),
        ],
        "Peppermint Ginger Tea in Four Steps",
        "One 12-ounce cup, measured so it tastes like something",
        "Recipe: Daily Life Hacks peppermint ginger tea guide | daily-life-hacks.com",
    )

    # Cooked-cup values are copied from the oatmeal-versus-grits table.
    save_range_bar_chart(
        "oatmeal-vs-grits-fiber-chart.jpg",
        ["Oatmeal", "Regular grits"],
        [(4.0, 4.0), (1.0, 2.0)],
        ["4 g", "1 to 2 g"],
        "Oatmeal Has More Fiber per Cooked Cup",
        "The lighter segment shows the stated range for regular grits",
        "Grams of fiber per cooked cup",
        "Data: USDA FoodData Central values cited in the article | daily-life-hacks.com",
    )

    # One-ounce values are copied from the popcorn-versus-chips table.
    save_bar_chart(
        "popcorn-vs-chips-fiber-chart.jpg",
        ["Air-popped popcorn", "Potato chips"],
        [3.6, 1.2],
        ["3.6 g", "1.2 g"],
        "Popcorn Delivers 3x the Fiber per Ounce",
        "Equal 1-ounce (28 g) servings",
        "Grams of fiber per 1 oz",
        "Data: USDA FoodData Central values cited in the article | daily-life-hacks.com",
    )

    # Values use the representative figures requested from the article's 2-ounce range.
    save_bar_chart(
        "whole-wheat-vs-white-pasta-fiber-chart.jpg",
        ["Whole wheat pasta", "White pasta"],
        [6.0, 2.0],
        ["6 g", "2 g"],
        "Whole Wheat Pasta Brings About 3x the Fiber",
        "Equal 2-ounce (56 g) dry servings",
        "Grams of fiber per 2 oz dry",
        "Data: USDA FoodData Central and typical labels cited in the article | daily-life-hacks.com",
    )

    # Serving definitions intentionally follow the comparison table in the recipe.
    save_range_bar_chart(
        "cauliflower-crust-fiber-comparison.jpg",
        ["This cauliflower crust", "Typical whole-wheat crust", "Typical white crust"],
        [(4.0, 4.0), (2.0, 3.0), (1.0, 1.0)],
        ["4 g", "2 to 3 g", "1 g"],
        "Fiber Across Three Pizza Crust Servings",
        "Serving definitions differ: 1/4 homemade crust versus typical slices",
        "Approximate grams of fiber",
        "Data: Serving estimates stated in the article | daily-life-hacks.com",
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
