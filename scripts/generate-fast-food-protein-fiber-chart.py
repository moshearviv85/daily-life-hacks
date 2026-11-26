"""Chart fast-food orders that clear 20 g protein and 10 g fiber.

Bar lengths are read from public/data/high-fiber-fast-food-2026.csv.
Do not hardcode grams in this file.
"""

from pathlib import Path

import matplotlib.pyplot as plt


ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "public" / "data" / "high-fiber-fast-food-2026.csv"
OUT = ROOT / "public" / "images" / "fast-food-meals-with-protein-and-fiber-chart.jpg"
ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
PROTEIN_MIN = 20
FIBER_MIN = 10


def parse_csv(text):
    rows = []
    headers = None
    field = ""
    quoted = False
    record = []
    for ch in text:
        if quoted:
            if ch == '"':
                quoted = False
            else:
                field += ch
            continue
        if ch == '"':
            quoted = True
        elif ch == ",":
            record.append(field)
            field = ""
        elif ch == "\n":
            record.append(field)
            field = ""
            if headers is None:
                headers = record
            elif any(cell.strip() for cell in record):
                rows.append(dict(zip(headers, record)))
            record = []
        elif ch != "\r":
            field += ch
    if field or record:
        record.append(field)
        if headers is not None and any(cell.strip() for cell in record):
            rows.append(dict(zip(headers, record)))
    return rows


def short_label(row):
    item = row["item"]
    chain = row["chain"]
    if "Grande Avocado" in item:
        return "El Pollo Loco Grande Avocado Bowl"
    if "Spicy Lamb" in item:
        return "Cava Spicy Lamb + Avocado"
    if "Cool Wrap" in item:
        return "Chick-fil-A Cool Wrap"
    if "Shredded Chicken Nachos" in item:
        return "El Pollo Loco Chicken Nachos"
    if "Chicken Caesar" in item:
        return "Panera Chicken Caesar Wrap"
    if "Green Goddess" in item:
        return "Panera Green Goddess Wrap"
    if "Frontega" in item:
        return "Panera Frontega Wrap"
    if "Cantina Chicken" in item:
        return "Taco Bell Cantina Chicken Bowl"
    if "Plain Baked Potato" in item:
        return "Wendy's Potato + Small Chili"
    if "Tortilla Soup" in item:
        return "Chick-fil-A Tortilla Soup"
    if "Falafel Crunch" in item:
        return "Cava Falafel Crunch"
    if item.startswith("Veggie burrito bowl"):
        return "Chipotle Veggie Burrito Bowl"
    if item.startswith("Sofritas"):
        return "Chipotle Sofritas Bowl"
    if "Veggie Patty Protein Bowl" in item:
        return "Subway Veggie Patty Bowl"
    return f"{chain}: {item[:42]}"


def qualifying(rows):
    picked = []
    for row in rows:
        protein = float(row["protein_g"])
        fiber = float(row["fiber_g"])
        if protein >= PROTEIN_MIN and fiber >= FIBER_MIN:
            picked.append(row)
    picked.sort(
        key=lambda row: (
            -float(row["protein_g"]),
            -float(row["fiber_g"]),
            row["chain"],
            row["item"],
        )
    )
    return picked


def main():
    rows = qualifying(parse_csv(CSV.read_text()))
    if len(rows) < 10:
        raise SystemExit(f"expected at least 10 qualifying orders, found {len(rows)}")

    labels = [short_label(row) for row in rows]
    protein = [float(row["protein_g"]) for row in rows]
    fiber = [float(row["fiber_g"]) for row in rows]

    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.titlesize": 18,
            "axes.labelcolor": SLATE,
            "xtick.color": MUTED,
            "ytick.color": SLATE,
        }
    )

    fig, ax = plt.subplots(figsize=(12, 10.2), facecolor="white")
    fig.subplots_adjust(left=0.34, right=0.96, top=0.84, bottom=0.08)
    y = list(range(len(labels)))
    height = 0.36
    protein_bars = ax.barh(
        [value - height / 2 for value in y],
        protein,
        height=height,
        color=ORANGE,
        label="Protein (g)",
    )
    fiber_bars = ax.barh(
        [value + height / 2 for value in y],
        fiber,
        height=height,
        color=SLATE,
        label="Fiber (g)",
    )
    ax.set_yticks(y, labels)
    ax.invert_yaxis()
    fig.text(
        0.34,
        0.955,
        "Fast-food orders with 20 g protein and 10 g fiber",
        ha="left",
        va="center",
        color=SLATE,
        fontsize=18,
        fontweight="bold",
    )
    fig.text(
        0.34,
        0.915,
        "Every order in the November 23, 2026 chain-file check that clears both lines",
        ha="left",
        va="center",
        color=MUTED,
        fontsize=11,
    )
    ax.spines[:].set_visible(False)
    ax.tick_params(axis="x", bottom=False, labelbottom=False)
    ax.tick_params(axis="y", length=0, labelsize=10)
    ax.grid(False)
    peak = max(protein + fiber)
    ax.set_xlim(0, peak * 1.18)
    for bar, value in list(zip(protein_bars, protein)) + list(zip(fiber_bars, fiber)):
        ax.text(
            value + peak * 0.015,
            bar.get_y() + bar.get_height() / 2,
            f"{value:g}",
            va="center",
            color=SLATE,
            fontsize=9,
            fontweight="bold",
        )
    ax.legend(
        loc="lower right",
        frameon=False,
        fontsize=11,
    )
    fig.text(
        0.5,
        0.02,
        "Data: high-fiber-fast-food-2026.csv, official chain nutrition files checked 2026-11-23 | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=9,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes, {len(rows)} orders)")
    for row, label in zip(rows, labels):
        print(
            f"{label}\t{row['chain']}\t{float(row['protein_g']):g}\t{float(row['fiber_g']):g}\t"
            f"{row['calories']}\t{row['sodium_mg']}"
        )


if __name__ == "__main__":
    main()
