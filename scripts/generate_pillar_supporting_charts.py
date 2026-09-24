"""Generate supporting charts for the four Daily Life Hacks pillar guides.

Protein and fiber bar lengths are read from the public CSVs. Do not hardcode
grams per dollar here.
"""

from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "images"
DATA = ROOT / "public" / "data"
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


def save(fig, name, source, prefix="Data"):
    fig.text(
        0.5,
        0.025,
        f"{prefix}: {source} | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=10,
    )
    fig.savefig(OUT / name, dpi=100, facecolor="white", bbox_inches=None)
    plt.close(fig)


def horizontal_chart(
    title,
    subtitle,
    labels,
    values,
    name,
    source,
    unit="g",
    figsize=(12, 6.75),
    left=0.28,
    prefix="Data",
):
    fig, ax = plt.subplots(figsize=figsize, facecolor="white")
    fig.subplots_adjust(left=left, right=0.94, top=0.79, bottom=0.13)
    y = list(range(len(labels)))
    bars = ax.barh(y, values, color=ORANGE, height=0.62)
    ax.set_yticks(y, labels)
    ax.invert_yaxis()
    ax.set_title(title, loc="left", color=SLATE, pad=28)
    ax.text(0, 1.035, subtitle, transform=ax.transAxes, color=MUTED, fontsize=12)
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=9 if len(labels) > 12 else 11)
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
    save(fig, name, source, prefix=prefix)


def load_csv(name):
    text = (DATA / name).read_text()
    rows = []
    headers = None
    for line in text.splitlines():
        if not line.strip():
            continue
        record = parse_csv_line(line)
        if headers is None:
            headers = record
            continue
        rows.append(dict(zip(headers, record)))
    return rows


def parse_csv_line(line):
    record = []
    field = []
    quoted = False
    index = 0
    while index < len(line):
        character = line[index]
        if quoted:
            if character == '"' and index + 1 < len(line) and line[index + 1] == '"':
                field.append('"')
                index += 2
                continue
            if character == '"':
                quoted = False
            else:
                field.append(character)
            index += 1
            continue
        if character == '"':
            quoted = True
        elif character == ",":
            record.append("".join(field))
            field = []
        else:
            field.append(character)
        index += 1
    record.append("".join(field))
    return record


def by_food(rows):
    return {row["food"]: row for row in rows}


def grams(row, column):
    return float(row[column])


def five_dollars(protein_g_per_dollar):
    scaled = (Decimal(str(protein_g_per_dollar)) * 5).quantize(
        Decimal("1"),
        rounding=ROUND_HALF_UP,
    )
    return int(scaled)


PROTEIN = by_food(load_csv("protein-per-dollar-2026.csv"))
FIBER = by_food(load_csv("fiber-per-dollar-2026.csv"))
ONE_DOLLAR_FIBER = load_csv("one-dollar-fiber-what-it-buys-2026.csv")


def protein_of(food):
    return grams(PROTEIN[food], "protein_g_per_dollar")


def fiber_of(food):
    return grams(FIBER[food], "fiber_g_per_dollar")


def budget_chart():
    # Same five staples as the playbook shortlist, ordered by protein per dollar.
    foods = [
        ("Green split peas (dry)", "Split peas"),
        ("Pinto beans (dry)", "Pinto beans"),
        ("Whole wheat spaghetti", "Whole wheat pasta"),
        ("Old-fashioned rolled oats", "Rolled oats"),
        ("Eggs (large)", "Eggs"),
    ]
    labels = [label for _, label in foods]
    protein = [protein_of(food) for food, _ in foods]
    fiber = [fiber_of(food) if food in FIBER else 0 for food, _ in foods]
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


def five_dollar_protein_chart():
    foods = [
        ("Brown lentils (dry)", "Brown lentils"),
        ("Pinto beans (dry)", "Dried pinto beans"),
        ("Whole wheat spaghetti", "Whole wheat pasta"),
        ("Peanut butter", "Peanut butter"),
        ("Chicken drumsticks (bone-in)", "Chicken drumsticks"),
        ("Eggs (large)", "Eggs"),
        ("Whole milk", "Whole milk"),
        ("Chicken breast (boneless, skinless)", "Chicken breast"),
        ("Canned tuna (chunk light, in water)", "Canned tuna"),
        ("Bacon", "Bacon"),
    ]
    ranked = sorted(
        ((label, five_dollars(protein_of(food))) for food, label in foods),
        key=lambda item: item[1],
        reverse=True,
    )
    labels, values = zip(*ranked)
    horizontal_chart(
        "What Does $5 Buy in Protein?",
        "Grams of protein from a five dollar spend. Same nutrient, wildly different receipt.",
        list(labels),
        list(values),
        "protein-per-dollar-five-dollars.jpg",
        "USDA FoodData Central + July 2026 US grocery prices",
        figsize=(12, 6),
        left=0.24,
        prefix="Source",
    )


def one_dollar_fiber_chart():
    labels = []
    values = []
    for row in ONE_DOLLAR_FIBER:
        food = row["food"]
        parent = FIBER[food]
        if parent["fiber_g_per_dollar"] != row["value"]:
            raise SystemExit(f"{food} drifted from the fiber CSV: {row['value']} vs {parent['fiber_g_per_dollar']}")
        labels.append(food.replace(" (dry)", "").replace("Old-fashioned ", ""))
        values.append(float(row["value"]))
    horizontal_chart(
        "What Does $1 Buy in Fiber?",
        "Grams of fiber from a single dollar. The whole list clears a daily value.",
        labels,
        values,
        "one-dollar-fiber-what-it-buys-chart.jpg",
        "USDA FoodData Central + July 2026 US grocery prices",
        left=0.30,
        prefix="Source",
    )


def fiber_day_chart():
    # Portion fiber grams already published on the fiber guide. Only the pinto
    # line's price moved with the BLS bag, so the dollar total is recomputed
    # from that CSV row: 50 g of a 1,814 g bag at the current package price.
    pinto = FIBER["Pinto beans (dry)"]
    portion_g = Decimal("50")
    pinto_cost = (Decimal(pinto["package_price_usd"]) * portion_g / Decimal(pinto["package_weight_g"])).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    other_costs = Decimal("0.11") + Decimal("0.17") + Decimal("0.20") + Decimal("0.10") + Decimal("0.08") + Decimal("0.11")
    total = other_costs + pinto_cost
    horizontal_chart(
        "What a 37g Fiber Day Costs",
        f"About 37 grams of fiber. About ${total}.",
        ["Breakfast", "Lunch", "Snack", "Dinner"],
        [7.1, 16.1, 3.9, 9.6],
        "fiber-budget-day-breakdown.jpg",
        "USDA FoodData Central and July 2026 prices",
        figsize=(12, 6.75),
        left=0.18,
    )


def main():
    setup()
    OUT.mkdir(parents=True, exist_ok=True)
    fiber_foods = [
        ("Whole wheat flour", "Whole wheat flour"),
        ("Green split peas (dry)", "Green split peas"),
        ("Popcorn kernels", "Popcorn kernels"),
        ("Pinto beans (dry)", "Pinto beans"),
        ("Old-fashioned rolled oats", "Rolled oats"),
        ("Frozen green peas", "Frozen green peas"),
        ("Fresh broccoli crowns", "Broccoli crowns"),
        ("Blueberries", "Blueberries"),
    ]
    horizontal_chart(
        "How Much Fiber Does $1 Buy?",
        "The dry goods aisle makes the produce section look financially confused.",
        [label for _, label in fiber_foods],
        [fiber_of(food) for food, _ in fiber_foods],
        "fiber-on-a-budget-value-chart.jpg",
        "USDA FoodData Central and audited shelf prices",
    )
    protein_foods = [
        ("Brown lentils (dry)", "Brown lentils"),
        ("Green split peas (dry)", "Green split peas"),
        ("Pinto beans (dry)", "Pinto beans"),
        ("Peanut butter", "Peanut butter"),
        ("Chicken drumsticks (bone-in)", "Chicken drumsticks"),
        ("Eggs (large)", "Eggs"),
        ("Whole milk", "Whole milk"),
        ("Greek yogurt (plain, nonfat)", "Greek yogurt"),
    ]
    horizontal_chart(
        "How Much Protein Does $1 Buy?",
        "Dry beans win. The deli case would prefer you didn't see this chart.",
        [label for _, label in protein_foods],
        [protein_of(food) for food, _ in protein_foods],
        "protein-on-a-budget-value-chart.jpg",
        "USDA FoodData Central and audited shelf prices",
    )
    budget_chart()
    five_dollar_protein_chart()
    one_dollar_fiber_chart()
    fiber_day_chart()
    meal_prep_chart()


if __name__ == "__main__":
    main()
