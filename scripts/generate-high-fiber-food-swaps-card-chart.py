"""Booster grams per kitchen portion, plus two swaps with both sides measured.

Bar lengths come from fiber-per-dollar-2026.csv, the FDC cache, the yogurt
parfait's published spoons, and the popcorn article's ounce table.
Wheat bran is not in the fiber file. Popped popcorn is not the kernel row.
Do not hardcode bar lengths.
"""

from __future__ import annotations

import csv
import json
import math
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
DAY = ROOT / "public" / "data" / "fiber-day-cost-2026.csv"
CACHE = ROOT / "src" / "data" / "fdc-cache.json"
YOGURT = ROOT / "src" / "data" / "articles" / "high-fiber-yogurt-parfait-for-breakfast.md"
POPCORN = ROOT / "src" / "data" / "articles" / "popcorn-vs-potato-chips-fiber-comparison.md"
OUT = ROOT / "public" / "images" / "high-fiber-food-swaps-and-boosters-card-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
TEAL = "#0F766E"
MUTED = "#64748B"
HALF_CUP_COOKED_DRY_G = 454 / 12


def one_decimal(value: float) -> float:
    return math.floor(value * 10 + 0.5 + 1e-9) / 10


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def must(rows: list[dict[str, str]], food: str) -> dict[str, str]:
    for row in rows:
        if row["food"] == food:
            return row
    raise SystemExit(f"missing {food}")


def portion(cache: dict, fdc_id: str, modifier: str) -> float:
    food = cache["foods"][fdc_id]
    for item in food["portions"]:
        if item["modifier"] == modifier:
            return float(item["grams"])
    raise SystemExit(f"{fdc_id} has no portion {modifier}")


def fiber_per_100(cache: dict, fdc_id: str) -> float:
    return float(cache["foods"][fdc_id]["nutrientsPer100g"]["fiber"])


def main() -> None:
    fiber_rows = load_csv(FIBER)
    day_rows = load_csv(DAY)
    cache = json.loads(CACHE.read_text(encoding="utf-8"))
    yogurt = YOGURT.read_text(encoding="utf-8")
    popcorn = POPCORN.read_text(encoding="utf-8")

    if "1 tbsp (12 g, kitchen measure)" not in yogurt or "| 4.1 g |" not in yogurt:
        raise SystemExit("yogurt parfait lost the 12 g chia tablespoon")
    if "1 tbsp (7 g)" not in yogurt or "| 1.9 g |" not in yogurt:
        raise SystemExit("yogurt parfait lost the 7 g ground flax tablespoon")
    if "1/2 cup (62 g)" not in yogurt or "| 4.0 g |" not in yogurt:
        raise SystemExit("yogurt parfait lost the 62 g raspberry half cup")

    density = {row["food"]: float(row["fiber_g_per_100g"]) for row in fiber_rows}
    for name, expected in (
        ("Chia seeds", 34.4),
        ("Whole flaxseed", 27.3),
        ("Old-fashioned rolled oats", 10.1),
        ("Black beans (dry)", 15.5),
        ("Navy beans (dry)", 15.3),
        ("Frozen green peas", 4.5),
        ("Raspberries", 6.5),
        ("Pearled barley (dry)", 15.6),
        ("100% whole wheat bread", 6.0),
    ):
        if density[name] != expected:
            raise SystemExit(f"{name} density drifted to {density[name]}")

    bread = next(row for row in day_rows if row["food"] == "Whole wheat bread, 2 slices (52g)")
    if bread["grams_used"] != "52" or bread["fiber_g"] != "3.1":
        raise SystemExit("whole wheat day-file slice drifted")
    if one_decimal(density["100% whole wheat bread"] * 52 / 100) != 3.1:
        raise SystemExit("52 g of whole wheat bread no longer matches 3.1 g")

    oat_cup = portion(cache, "173904", "cup")
    pea_cup = portion(cache, "170016", "cup")
    bran_cup = portion(cache, "169722", "cup")
    if oat_cup != 81 or pea_cup != 134 or bran_cup != 58:
        raise SystemExit("USDA cup weights drifted")
    bran_density = fiber_per_100(cache, "169722")
    rice_density = fiber_per_100(cache, "168877")
    if bran_density != 42.8 or rice_density != 1.3:
        raise SystemExit("bran or white rice density drifted")
    if fiber_per_100(cache, "170284") != density["Pearled barley (dry)"]:
        raise SystemExit("barley cache and fiber file disagree")
    flax_tbsp = portion(cache, "169414", "tbsp, ground")
    if flax_tbsp != 7:
        raise SystemExit("ground flax tablespoon drifted")
    chia_portions = [item["modifier"] for item in cache["foods"]["170554"]["portions"]]
    if any("tbsp" in item or "tablespoon" in item for item in chia_portions):
        raise SystemExit("chia gained a USDA tablespoon; stop using the kitchen 12 g")

    ounce = re.search(
        r"\| Fiber per ounce \(28g\) \| ~([0-9.]+)g \| ~([0-9.]+)g \|",
        popcorn,
    )
    per_100 = re.search(r"\| Fiber per 100g \| ([0-9.]+)g \| ([0-9.]+)g \|", popcorn)
    if not ounce or not per_100:
        raise SystemExit("popcorn article lost the ounce table")
    popped_100 = float(per_100.group(1))
    chips_100 = float(per_100.group(2))
    popped_oz = one_decimal(popped_100 * 28 / 100)
    chips_oz = one_decimal(chips_100 * 28 / 100)
    if popped_oz != float(ounce.group(1)) or chips_oz != float(ounce.group(2)):
        raise SystemExit("popcorn ounce table does not match the per-100 g line")

    boosters = [
        ("Wheat bran, 1/2 cup", one_decimal(bran_density * (bran_cup / 2) / 100)),
        ("Black beans, 1/2 cup cooked", one_decimal(density["Black beans (dry)"] * HALF_CUP_COOKED_DRY_G / 100)),
        ("Navy beans, 1/2 cup cooked", one_decimal(density["Navy beans (dry)"] * HALF_CUP_COOKED_DRY_G / 100)),
        ("Chia, 1 tbsp", one_decimal(density["Chia seeds"] * 12 / 100)),
        ("Rolled oats, 1/2 cup", one_decimal(density["Old-fashioned rolled oats"] * (oat_cup / 2) / 100)),
        ("Air-popped popcorn, 1 oz", popped_oz),
        ("Raspberries, 1/2 cup", one_decimal(density["Raspberries"] * 62 / 100)),
        ("Frozen peas, 1/2 cup", one_decimal(density["Frozen green peas"] * (pea_cup / 2) / 100)),
        ("Ground flax, 1 tbsp", one_decimal(density["Whole flaxseed"] * flax_tbsp / 100)),
    ]
    if boosters[3][1] != 4.1 or boosters[6][1] != 4.0 or boosters[8][1] != 1.9:
        raise SystemExit(f"published spoon fiber drifted: {boosters}")

    swaps = [
        ("White rice, 100 g dry", one_decimal(rice_density)),
        ("Pearled barley, 100 g dry", one_decimal(density["Pearled barley (dry)"])),
        ("Potato chips, 1 oz", chips_oz),
        ("Air-popped popcorn, 1 oz", popped_oz),
    ]

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(1, 2, figsize=(12, 6.75), dpi=100, facecolor="white")
    fig.subplots_adjust(left=0.22, right=0.97, top=0.78, bottom=0.12, wspace=0.55)

    def draw(ax, items: list[tuple[str, float]], title: str, colors: list[str]) -> None:
        labels = [label for label, _value in items]
        values = [value for _label, value in items]
        positions = list(range(len(labels)))
        bars = ax.barh(positions, values, color=colors, height=0.72)
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
                f"{value:.1f} g",
                va="center",
                color=SLATE,
                fontsize=8,
                fontweight="bold",
            )
        ax.set_title(title, loc="left", color=SLATE, fontsize=11, fontweight="bold", pad=8)

    draw(
        axes[0],
        boosters,
        "Fiber in the spoon or half cup",
        [ORANGE] * len(boosters),
    )
    draw(
        axes[1],
        swaps,
        "Same weight, both sides measured",
        [SLATE, ORANGE, SLATE, TEAL],
    )
    fig.text(
        0.22,
        0.93,
        "Fiber boosters and the swaps with a gram on both sides",
        color=SLATE,
        fontsize=15,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.22,
        0.875,
        "Wheat bran is FDC 169722. Popcorn is the popped ounce, not the kernel bag.",
        color=MUTED,
        fontsize=9,
        va="center",
    )
    fig.text(
        0.5,
        0.035,
        "Chart from fiber-per-dollar-2026.csv, FDC portions, and the published popcorn ounce table | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
    print("boosters", boosters)
    print("swaps", swaps)


if __name__ == "__main__":
    main()
