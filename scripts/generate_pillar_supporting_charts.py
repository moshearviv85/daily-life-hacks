"""Generate supporting charts for the four Daily Life Hacks pillar guides."""

from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images"
ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
PALE = "#FFF4E5"


def setup():
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.titlesize": 23,
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )


def save(fig, name, source):
    fig.text(
        0.5,
        0.025,
        f"Data: {source} | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=10,
    )
    fig.savefig(OUT / name, dpi=100, facecolor="white", bbox_inches=None)
    plt.close(fig)


def horizontal_chart(title, subtitle, labels, values, name, source, unit="g"):
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.25, right=0.94, top=0.79, bottom=0.13)
    y = list(range(len(labels)))
    bars = ax.barh(y, values, color=ORANGE, height=0.62)
    ax.set_yticks(y, labels)
    ax.invert_yaxis()
    ax.set_title(title, loc="left", color=SLATE, pad=28)
    ax.text(0, 1.035, subtitle, transform=ax.transAxes, color=MUTED, fontsize=12)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=11)
    ax.grid(False)
    ax.set_xlim(0, max(values) * 1.18)
    for bar, value in zip(bars, values):
        ax.text(
            value + max(values) * 0.018,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g} {unit}",
            va="center",
            color=SLATE,
            fontsize=11,
            fontweight="bold",
        )
    save(fig, name, source)


def budget_chart():
    labels = ["Pinto beans", "Split peas", "Whole wheat pasta", "Rolled oats", "Eggs"]
    protein = [97.9, 73.9, 53.4, 46.6, 34.4]
    fiber = [70.8, 71.0, 35.4, 35.8, 0]
    fig, (left, right) = plt.subplots(1, 2, figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.16, right=0.95, top=0.76, bottom=0.15, wspace=0.38)
    fig.suptitle("What One Grocery Dollar Buys", x=0.08, y=0.91, ha="left", color=SLATE, fontsize=25, fontweight="bold")
    fig.text(0.08, 0.835, "The cheap staples aren't subtle about winning.", color=MUTED, fontsize=12)
    for ax, values, heading in [(left, protein, "Protein per $1"), (right, fiber, "Fiber per $1")]:
        bars = ax.barh(range(len(labels)), values, color=ORANGE, height=0.6)
        ax.set_yticks(range(len(labels)), labels if ax is left else [""] * len(labels))
        ax.invert_yaxis()
        ax.set_title(heading, color=SLATE, fontsize=15, pad=12)
        ax.spines[:].set_visible(False)
        ax.tick_params(axis="x", bottom=False, labelbottom=False)
        ax.tick_params(axis="y", length=0, labelsize=10)
        ax.set_xlim(0, 110 if ax is left else 82)
        for bar, value in zip(bars, values):
            if value:
                ax.text(value + 2, bar.get_y() + bar.get_height() / 2, f"{value:g} g", va="center", color=SLATE, fontsize=10, fontweight="bold")
            else:
                ax.text(2, bar.get_y() + bar.get_height() / 2, "0 g", va="center", color=MUTED, fontsize=10)
    save(fig, "eat-healthy-on-a-budget-value-chart.jpg", "USDA FoodData Central and audited shelf prices")


def meal_prep_chart():
    fig, ax = plt.subplots(figsize=(12, 6.75), facecolor="white")
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 6.75)
    ax.axis("off")
    ax.text(0.6, 6.1, "The 2 x 2 x 2 Meal Prep System", fontsize=25, fontweight="bold", color=SLATE)
    ax.text(0.6, 5.65, "Six components. Eight possible meals. Far less Wednesday regret.", fontsize=12, color=MUTED)
    columns = [
        (0.7, "2 BASES", ["Rice", "Roasted potatoes"]),
        (4.15, "2 PROTEINS", ["Turkey meatballs", "Shredded chicken"]),
        (7.6, "2 SAUCES", ["Peanut sauce", "Lemon vinaigrette"]),
    ]
    for x, heading, items in columns:
        ax.text(x, 4.75, heading, fontsize=11, fontweight="bold", color=ORANGE)
        for index, item in enumerate(items):
            y = 3.7 - index * 1.25
            box = FancyBboxPatch((x, y), 2.8, 0.75, boxstyle="round,pad=0.04,rounding_size=0.12", facecolor=PALE, edgecolor=ORANGE, linewidth=1.5)
            ax.add_patch(box)
            ax.text(x + 1.4, y + 0.375, item, ha="center", va="center", color=SLATE, fontsize=11, fontweight="bold")
    ax.text(10.7, 3.35, "=", fontsize=29, fontweight="bold", color=MUTED, ha="center")
    result = FancyBboxPatch((10.25, 2.05), 1.35, 1.05, boxstyle="round,pad=0.05,rounding_size=0.14", facecolor=ORANGE, edgecolor=ORANGE)
    ax.add_patch(result)
    ax.text(10.925, 2.72, "8", fontsize=25, fontweight="bold", color="white", ha="center")
    ax.text(10.925, 2.35, "MEALS", fontsize=9, fontweight="bold", color="white", ha="center")
    save(fig, "meal-prep-component-system-chart.jpg", "Daily Life Hacks component system")


def main():
    setup()
    OUT.mkdir(parents=True, exist_ok=True)
    horizontal_chart(
        "How Much Fiber Does $1 Buy?",
        "The dry goods aisle makes the produce section look financially confused.",
        ["Whole wheat flour", "Green split peas", "Pinto beans", "Popcorn kernels", "Rolled oats", "Frozen green peas", "Broccoli crowns", "Blueberries"],
        [77.8, 71.0, 70.8, 57.7, 35.8, 17.6, 6.1, 2.5],
        "fiber-on-a-budget-value-chart.jpg",
        "USDA FoodData Central and audited shelf prices",
    )
    horizontal_chart(
        "How Much Protein Does $1 Buy?",
        "Dry beans win. The deli case would prefer you didn't see this chart.",
        ["Pinto beans", "Brown lentils", "Green split peas", "Peanut butter", "Chicken drumsticks", "Eggs", "Whole milk", "Greek yogurt"],
        [97.9, 77.7, 73.9, 50.7, 50.3, 34.4, 29.1, 27.5],
        "protein-on-a-budget-value-chart.jpg",
        "USDA FoodData Central and audited shelf prices",
    )
    budget_chart()
    meal_prep_chart()


if __name__ == "__main__":
    main()
