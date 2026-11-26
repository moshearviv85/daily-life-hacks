"""Three storage formats: protein per dollar, fiber per dollar, sodium per 100 g.

Protein comes from public/data/protein-per-dollar-2026.csv.
Fiber comes from public/data/fiber-per-dollar-2026.csv, joined on fdc_id.
Sodium comes from public/data/sodium-per-dollar-2026.csv, joined on fdc_id.
Canned black beans and canned chickpeas are not in the sodium file. Their
regular-sodium milligrams are the first number in the protein-file note
("differ only in sodium, 384 vs 138"). Bar lengths are read from those
files. Do not hardcode them.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
FIBER = ROOT / "public" / "data" / "fiber-per-dollar-2026.csv"
SODIUM = ROOT / "public" / "data" / "sodium-per-dollar-2026.csv"
OUT = (
    ROOT
    / "public"
    / "images"
    / "how-much-protein-and-fiber-in-canned-vs-frozen-vs-dry-staples-chart.jpg"
)

ORANGE = "#F29B30"
TEAL = "#0F766E"
SLATE = "#334155"
MUTED = "#64748B"
NOTE = re.compile(r"differ only in sodium, (\d+(?:\.\d+)?) vs (\d+(?:\.\d+)?)")

# fdc_id, short label, format. Order is the chart order.
FOODS = (
    ("172428", "Split peas, dry", "Dry"),
    ("173734", "Black beans, dry", "Dry"),
    ("170016", "Green peas, frozen", "Frozen"),
    ("168410", "Edamame, frozen", "Frozen"),
    ("175188", "Black beans, canned", "Canned"),
    ("173741", "Kidney beans, canned", "Canned"),
    ("175206", "Chickpeas, canned", "Canned"),
    ("173709", "Tuna, canned", "Canned"),
    ("173690", "Pink salmon, canned", "Canned"),
)

COLORS = {"Dry": ORANGE, "Frozen": TEAL, "Canned": SLATE}


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def by_fdc(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    found: dict[str, dict[str, str]] = {}
    for row in rows:
        fdc = (row.get("fdc_id") or "").strip()
        if fdc:
            found[fdc] = row
    return found


def by_food(rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {row["food"]: row for row in rows}


def sodium_mg(protein_rows: dict[str, dict[str, str]]) -> dict[str, float]:
    found: dict[str, float] = {}
    for row in load(SODIUM):
        fdc = (row.get("fdc_id") or "").strip()
        if fdc:
            found[fdc] = float(row["sodium_mg_per_100g"])
    for fdc, row in protein_rows.items():
        if fdc in found:
            continue
        match = NOTE.search(row.get("nutrition_source_note") or "")
        if match:
            found[fdc] = float(match.group(1))
    return found


def main() -> None:
    protein = by_fdc(load(PROTEIN))
    fiber_rows = load(FIBER)
    fiber = by_fdc(fiber_rows)
    fiber_names = by_food(fiber_rows)
    sodium = sodium_mg(protein)

    labels: list[str] = []
    formats: list[str] = []
    protein_values: list[float] = []
    fiber_values: list[float | None] = []
    sodium_values: list[float] = []
    fiber_unresolved: list[bool] = []

    for fdc, label, fmt in FOODS:
        row = protein.get(fdc)
        if row is None:
            raise SystemExit(f"missing protein row for FDC {fdc}")
        if fdc not in sodium:
            raise SystemExit(f"missing sodium for FDC {fdc}")
        fiber_row = fiber.get(fdc) or fiber_names.get(row["food"])
        labels.append(label)
        formats.append(fmt)
        protein_values.append(float(row["protein_g_per_dollar"]))
        if fiber_row is None:
            fiber_values.append(None)
            fiber_unresolved.append(False)
        else:
            fiber_values.append(float(fiber_row["fiber_g_per_dollar"]))
            fiber_unresolved.append(
                (fiber_row.get("nutrition_source_status") or "").strip().lower()
                == "unresolved"
            )
        sodium_values.append(sodium[fdc])
        fiber_text = "no row" if fiber_row is None else fiber_row["fiber_g_per_dollar"]
        flag = " unresolved" if fiber_row is not None and fiber_unresolved[-1] else ""
        fiber_fdc = "" if fiber_row is None else (fiber_row.get("fdc_id") or "").strip() or "blank"
        print(
            f"{fdc}\t{row['food']}\t{fmt}\t{row['protein_g_per_dollar']}\t"
            f"{fiber_text}{flag}\tfiber_fdc={fiber_fdc}\t{sodium[fdc]:g}\t{row['package']}\t"
            f"${row['package_price_usd']}"
        )

    if len(labels) != 9:
        raise SystemExit(f"expected 9 foods, found {len(labels)}")

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(1, 3, figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.16, right=0.98, top=0.76, bottom=0.12, wspace=0.28)
    y = list(range(len(labels)))
    colors = [COLORS[fmt] for fmt in formats]

    def draw(ax, values: list[float | None], title: str, unresolved: list[bool] | None):
        drawn = [0 if value is None else value for value in values]
        bars = ax.barh(y, drawn, color=colors, height=0.72)
        if unresolved is not None:
            for bar, flag in zip(bars, unresolved):
                if flag:
                    bar.set_hatch("///")
                    bar.set_edgecolor("white")
        ax.set_yticks(y, labels if ax is axes[0] else [""] * len(labels))
        ax.invert_yaxis()
        ax.set_title(title, loc="left", color=SLATE, fontsize=11, fontweight="bold", pad=8)
        ax.spines[:].set_visible(False)
        ax.tick_params(axis="x", bottom=False, labelbottom=False)
        ax.tick_params(axis="y", length=0, labelsize=8)
        ax.grid(False)
        peak = max(value for value in drawn if value is not None)
        ax.set_xlim(0, peak * 1.38)
        for bar, value in zip(bars, values):
            if value is None:
                ax.text(peak * 0.02, bar.get_y() + bar.get_height() / 2, "no row", va="center", color=MUTED, fontsize=7)
                continue
            ax.text(
                value + peak * 0.02,
                bar.get_y() + bar.get_height() / 2,
                f"{value:g}",
                va="center",
                color=SLATE,
                fontsize=7,
                fontweight="bold",
            )

    draw(axes[0], protein_values, "Protein, g per $", None)
    draw(axes[1], fiber_values, "Fiber, g per $", fiber_unresolved)
    draw(axes[2], sodium_values, "Sodium, mg per 100 g", None)

    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Dry bag"),
            Patch(facecolor=TEAL, label="Frozen"),
            Patch(facecolor=SLATE, label="Canned"),
            Patch(facecolor=TEAL, hatch="///", edgecolor="white", label="Fiber row unresolved"),
        ],
        frameon=False,
        loc="lower center",
        bbox_to_anchor=(0.58, 0.86),
        ncol=4,
        fontsize=8,
    )
    fig.text(
        0.16,
        0.94,
        "Dry vs frozen vs canned: protein, fiber, and sodium",
        color=SLATE,
        fontsize=14,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.5,
        0.02,
        "Data: protein-per-dollar-2026.csv, fiber-per-dollar-2026.csv, sodium-per-dollar-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=7,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
