"""Grouped bars: dry bag vs 15.5 oz can, protein per dollar and sodium.

Protein per dollar comes from public/data/canned-vs-dry-beans-cost-2026.csv.
Sodium per 100 g comes from public/data/sodium-per-dollar-2026.csv when that
file has the FDC id. Canned black beans and canned chickpeas are not in the
sodium file. Their regular-sodium milligrams are the first number in the
protein-per-dollar note ("differ only in sodium, 384 vs 138"). Do not
hardcode bar lengths.
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
COST = ROOT / "public" / "data" / "canned-vs-dry-beans-cost-2026.csv"
SODIUM = ROOT / "public" / "data" / "sodium-per-dollar-2026.csv"
PROTEIN = ROOT / "public" / "data" / "protein-per-dollar-2026.csv"
OUT = ROOT / "public" / "images" / "canned-vs-dry-beans-cost-and-sodium-per-serving-chart.jpg"

ORANGE = "#F29B30"
SLATE = "#334155"
MUTED = "#64748B"
NOTE = re.compile(r"differ only in sodium, (\d+(?:\.\d+)?) vs (\d+(?:\.\d+)?)")

# Same-bean pairs, then pinto dry against canned kidney. Not the same legume.
PAIRS = (
    ("Black beans", "173734", "175188"),
    ("Chickpeas", "173756", "175206"),
    ("Pinto dry / kidney can", "175199", "173741"),
)


def load(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def sodium_mg(cost_rows: list[dict[str, str]]) -> dict[str, float]:
    found: dict[str, float] = {}
    for row in load(SODIUM):
        found[row["fdc_id"]] = float(row["sodium_mg_per_100g"])
    for row in load(PROTEIN):
        fdc = row["fdc_id"]
        if fdc in found:
            continue
        match = NOTE.search(row.get("nutrition_source_note") or "")
        if match:
            found[fdc] = float(match.group(1))
    missing = [row["fdc_id"] for row in cost_rows if row["fdc_id"] not in found]
    if missing:
        raise SystemExit(f"missing sodium for FDC {', '.join(missing)}")
    return found


def main() -> None:
    cost_rows = load(COST)
    if len(cost_rows) != 10:
        raise SystemExit(f"expected 10 cost rows, found {len(cost_rows)}")
    by_fdc = {row["fdc_id"]: row for row in cost_rows}
    sodium = sodium_mg(cost_rows)

    labels: list[str] = []
    dry_protein: list[float] = []
    can_protein: list[float] = []
    dry_sodium: list[float] = []
    can_sodium: list[float] = []
    for label, dry_id, can_id in PAIRS:
        dry = by_fdc[dry_id]
        can = by_fdc[can_id]
        labels.append(label)
        dry_protein.append(float(dry["value"]))
        can_protein.append(float(can["value"]))
        dry_sodium.append(sodium[dry_id])
        can_sodium.append(sodium[can_id])
        print(
            f"{label}\t{dry['value']} vs {can['value']}\t"
            f"{sodium[dry_id]:g} vs {sodium[can_id]:g}\t"
            f"price x{float(dry['value']) / float(can['value']):.2f}\t"
            f"sodium x{sodium[can_id] / sodium[dry_id]:.1f}"
        )

    plt.rcParams.update({"font.family": "DejaVu Sans"})
    fig, axes = plt.subplots(1, 2, figsize=(12, 6.75), facecolor="white")
    fig.subplots_adjust(left=0.22, right=0.98, top=0.78, bottom=0.12, wspace=0.55)
    y = list(range(len(labels)))
    height = 0.36

    def draw(ax, dry_values, can_values, title, unit):
        dry_bars = ax.barh(
            [value + height / 2 for value in y],
            dry_values,
            height=height,
            color=ORANGE,
            label="Dry bag",
        )
        can_bars = ax.barh(
            [value - height / 2 for value in y],
            can_values,
            height=height,
            color=SLATE,
            label="15.5 oz can",
        )
        ax.set_yticks(y, labels)
        ax.invert_yaxis()
        ax.set_title(title, loc="left", color=SLATE, fontsize=12, fontweight="bold", pad=8)
        ax.spines[:].set_visible(False)
        ax.tick_params(axis="x", bottom=False, labelbottom=False)
        ax.tick_params(axis="y", length=0, labelsize=9)
        ax.grid(False)
        peak = max(dry_values + can_values)
        ax.set_xlim(0, peak * 1.34)
        for bar, value in list(zip(dry_bars, dry_values)) + list(zip(can_bars, can_values)):
            text = f"{value:g}" if unit == "g" else f"{value:g}"
            ax.text(
                value + peak * 0.02,
                bar.get_y() + bar.get_height() / 2,
                text,
                va="center",
                color=SLATE,
                fontsize=8,
                fontweight="bold",
            )

    draw(axes[0], dry_protein, can_protein, "Protein, grams per dollar", "g")
    draw(axes[1], dry_sodium, can_sodium, "Sodium, mg per 100 g", "mg")
    fig.legend(
        handles=[
            Patch(facecolor=ORANGE, label="Dry bag"),
            Patch(facecolor=SLATE, label="15.5 oz can"),
        ],
        frameon=False,
        loc="lower center",
        bbox_to_anchor=(0.62, 0.88),
        ncol=2,
        fontsize=9,
    )
    fig.text(
        0.22,
        0.95,
        "Dry bag vs 15.5 oz can: protein per dollar and sodium",
        color=SLATE,
        fontsize=15,
        fontweight="bold",
        va="center",
    )
    fig.text(
        0.5,
        0.02,
        "Data: canned-vs-dry-beans-cost-2026.csv and sodium-per-dollar-2026.csv | daily-life-hacks.com",
        ha="center",
        color=MUTED,
        fontsize=8,
    )
    fig.savefig(OUT, dpi=100, facecolor="white")
    plt.close(fig)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
