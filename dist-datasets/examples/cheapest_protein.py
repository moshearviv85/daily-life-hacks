#!/usr/bin/env python3
"""
What does a day of protein actually cost, and does protein *quality* change the answer?

Reads two files from this repo:
  data/protein-per-dollar-2026.csv        - 49 foods, grams of protein per dollar
  data/protein-quality-per-dollar-2026.csv - 25 of those foods with a DIAAS score

Raw "protein per dollar" treats a gram of gelatin like a gram of egg, which is
wrong. DIAAS (Digestible Indispensable Amino Acid Score) corrects for how much
of that protein your body can actually use. This script ranks the cheapest way
to hit a 50 g daily protein target both ways, and shows what the correction does.

Standard library only. Run from anywhere:
    python examples/cheapest_protein.py

Data: Daily Life Hacks Food Value Data - https://www.daily-life-hacks.com/data/
Methodology: https://www.daily-life-hacks.com/methodology/
"""

import csv
from pathlib import Path

DAILY_TARGET_G = 50.0  # a common everyday protein target, not a clinical recommendation
DATA = Path(__file__).resolve().parent.parent / "data"


def load(filename):
    with open(DATA / filename, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def cost_for_target(grams_per_dollar, target=DAILY_TARGET_G):
    """Dollars needed to buy `target` grams of protein from this food alone."""
    return target / float(grams_per_dollar)


def main():
    raw = load("protein-per-dollar-2026.csv")
    quality = load("protein-quality-per-dollar-2026.csv")

    print(f"Cost to hit {DAILY_TARGET_G:.0f} g of protein from a single food")
    print("US national prices, July 2026, as-purchased with USDA refuse removed")
    print("=" * 74)

    # ---- 1. Raw protein per dollar -------------------------------------------------
    ranked = sorted(raw, key=lambda r: float(r["protein_g_per_dollar"]), reverse=True)

    print(f"\nCHEAPEST 10, RAW PROTEIN (all {len(raw)} foods in the index)\n")
    print(f"{'#':>2}  {'Food':<34}{'g/$':>7}{'$/50g':>9}   Price basis")
    print("-" * 74)
    for i, row in enumerate(ranked[:10], 1):
        gpd = float(row["protein_g_per_dollar"])
        print(f"{i:>2}. {row['food']:<34}{gpd:>7.1f}{cost_for_target(gpd):>9.2f}   "
              f"{row['price_basis'][:24]}")

    # ---- 2. Adjusted for protein quality -------------------------------------------
    q_ranked = sorted(quality, key=lambda r: float(r["adjusted_g_per_dollar"]), reverse=True)

    print(f"\n\nCHEAPEST 10, DIAAS-ADJUSTED ({len(quality)} foods carry a DIAAS score)\n")
    print(f"{'#':>2}  {'Food':<34}{'DIAAS':>7}{'adj g/$':>9}{'$/50g':>9}")
    print("-" * 74)
    for i, row in enumerate(q_ranked[:10], 1):
        adj = float(row["adjusted_g_per_dollar"])
        print(f"{i:>2}. {row['food']:<34}{float(row['diaas_score']):>7.2f}"
              f"{adj:>9.1f}{cost_for_target(adj):>9.2f}")

    # ---- 3. What the correction actually did ----------------------------------------
    raw_rank = {r["food"]: i for i, r in enumerate(
        sorted(quality, key=lambda r: float(r["protein_g_per_dollar"]), reverse=True), 1)}
    adj_rank = {r["food"]: i for i, r in enumerate(q_ranked, 1)}

    movers = sorted(
        ((f, raw_rank[f] - adj_rank[f], raw_rank[f], adj_rank[f]) for f in raw_rank),
        key=lambda t: t[1],
    )

    print("\n\nBIGGEST MOVERS ONCE QUALITY IS ACCOUNTED FOR")
    print("(negative = fell down the ranking, positive = climbed)\n")
    print(f"{'Food':<34}{'raw':>6}{'adj':>6}{'move':>7}")
    print("-" * 74)
    for food, delta, r_rank, a_rank in movers[:4]:
        print(f"{food:<34}{r_rank:>6}{a_rank:>6}{delta:>+7}")
    print("  ...")
    for food, delta, r_rank, a_rank in movers[-4:]:
        print(f"{food:<34}{r_rank:>6}{a_rank:>6}{delta:>+7}")

    cheapest_raw = q_ranked and sorted(
        quality, key=lambda r: float(r["protein_g_per_dollar"]), reverse=True)[0]
    cheapest_adj = q_ranked[0]
    print("\n" + "=" * 74)
    print(f"Cheapest before quality adjustment: {cheapest_raw['food']} "
          f"(${cost_for_target(float(cheapest_raw['protein_g_per_dollar'])):.2f}/50 g)")
    print(f"Cheapest after quality adjustment:  {cheapest_adj['food']} "
          f"(${cost_for_target(float(cheapest_adj['adjusted_g_per_dollar'])):.2f}/50 g)")
    print("\nSource: Daily Life Hacks Food Value Data (2026.1)")
    print("Study:  https://www.daily-life-hacks.com/protein-per-dollar-adjusted-for-quality/")
    print("Terms:  https://www.daily-life-hacks.com/methodology/#data-license")


if __name__ == "__main__":
    main()
