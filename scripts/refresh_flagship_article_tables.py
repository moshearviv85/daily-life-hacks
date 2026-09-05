#!/usr/bin/env python3
"""Rewrite flagship ranking tables and density-article price cells from CSVs."""

from __future__ import annotations

import csv
import re
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def half_up(value: str, places: str) -> str:
    return format(Decimal(value).quantize(Decimal(places), rounding=ROUND_HALF_UP), "f")


def load(name: str) -> list[dict]:
    with (ROOT / "public" / "data" / name).open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def protein_table(rows: list[dict]) -> str:
    lines = [
        "| Rank | Food | Protein (g per 100g) | Price per 100g | Protein per $1 |",
        "|---|---|---|---|---|",
    ]
    for row in rows:
        lines.append(
            f"| {row['rank']} | {row['food']} | {half_up(row['protein_g_per_100g'], '0.1')} g "
            f"| ${half_up(row['price_per_100g_usd'], '0.01')} | {row['protein_g_per_dollar']} g |"
        )
    return "\n".join(lines)


def fiber_table(rows: list[dict]) -> str:
    lines = [
        "| Rank | Food | Fiber (g per 100g) | Price per 100g | Fiber per $1 |",
        "|---|---|---|---|---|",
    ]
    for row in rows:
        lines.append(
            f"| {row['rank']} | {row['food']} | {half_up(row['fiber_g_per_100g'], '0.1')} g "
            f"| ${half_up(row['price_per_100g_usd'], '0.01')} | {row['fiber_g_per_dollar']} g |"
        )
    return "\n".join(lines)


def replace_table(markdown: str, header: str, new_table: str) -> str:
    pattern = re.compile(
        re.escape(header) + r"\n\|---\|.*?\n(?:\|.*\n)+",
        re.MULTILINE,
    )
    replacement = new_table + "\n"
    updated, count = pattern.subn(replacement, markdown, count=1)
    if count != 1:
        raise SystemExit(f"Could not replace table starting {header!r}")
    return updated


def patch_density_prices(path: Path, csv_name: str, header: str, price_col: int) -> None:
    rows = {row["food"]: row for row in load(csv_name)}
    text = path.read_text(encoding="utf-8")
    header_index = text.index(header)
    body_start = text.index("\n", header_index) + 1
    # skip separator
    body_start = text.index("\n", body_start) + 1
    lines = text[body_start:].splitlines(keepends=True)
    out = []
    i = 0
    while i < len(lines) and lines[i].startswith("|"):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        food = cells[0]
        if food in rows:
            cells[price_col] = f"${rows[food]['price_per_100g_usd']}"
            lines[i] = "| " + " | ".join(cells) + " |\n"
        out.append(lines[i])
        i += 1
    path.write_text(text[:body_start] + "".join(lines), encoding="utf-8")


def main() -> int:
    protein = load("protein-per-dollar-2026.csv")
    fiber = load("fiber-per-dollar-2026.csv")

    protein_path = ROOT / "src/data/articles/protein-per-dollar-cheapest-protein-sources.md"
    fiber_path = ROOT / "src/data/articles/fiber-per-dollar-cheapest-high-fiber-foods.md"
    protein_md = replace_table(
        protein_path.read_text(encoding="utf-8"),
        "| Rank | Food | Protein (g per 100g) | Price per 100g | Protein per $1 |",
        protein_table(protein),
    )
    fiber_md = replace_table(
        fiber_path.read_text(encoding="utf-8"),
        "| Rank | Food | Fiber (g per 100g) | Price per 100g | Fiber per $1 |",
        fiber_table(fiber),
    )
    protein_path.write_text(protein_md, encoding="utf-8")
    fiber_path.write_text(fiber_md, encoding="utf-8")

    patch_density_prices(
        ROOT / "src/data/articles/foods-highest-in-protein-per-100-grams.md",
        "protein-per-dollar-2026.csv",
        "| Food | Protein per 100 g | USDA form / status | Price per 100 g | Nutrition source |",
        3,
    )
    print("updated flagship ranking tables and protein-density price cells")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
