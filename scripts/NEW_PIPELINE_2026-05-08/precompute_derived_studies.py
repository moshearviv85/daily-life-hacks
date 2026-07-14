#!/usr/bin/env python3
"""Precompute verified numbers + hero charts for the derived-study batch (Lane A).

Every number an article may cite is computed HERE from the audited CSVs and
written to pipeline-data/derived-studies/{slug}.json. Writers (human or agent)
may only use numbers present in these JSONs. Hero charts are rendered in house
style to public/images/{slug}-main.jpg.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "pipeline-data" / "derived-studies"
IMG = ROOT / "public" / "images"
ORANGE = "#F29B30"
SLATE = "#2E3944"


def load(name: str, metric: str) -> list[dict]:
    rows = []
    with open(ROOT / "public" / "data" / name, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append({
                "food": r["food"],
                "category": r["category"],
                "value": float(r[metric]),
                "package": r.get("package", ""),
                "package_price_usd": float(r["package_price_usd"]),
                "price_basis": r.get("price_basis", ""),
            })
    return rows


P = load("protein-per-dollar-2026.csv", "protein_g_per_dollar")
F = load("fiber-per-dollar-2026.csv", "fiber_g_per_dollar")


def pick(rows: list[dict], cats: list[str] | None = None, foods: list[str] | None = None) -> list[dict]:
    sel = rows
    if cats:
        sel = [r for r in sel if r["category"] in cats]
    if foods:
        low = [f.lower() for f in foods]
        sel = [r for r in sel if any(k in r["food"].lower() for k in low)]
    return sorted(sel, key=lambda r: -r["value"])


NO_COOK_P = ["canned tuna", "canned pink salmon", "sardines", "peanut butter", "greek yogurt",
             "cottage cheese", "whole milk", "canned black beans", "canned kidney beans",
             "canned chickpeas", "rotisserie", "almonds", "sunflower", "peanuts", "cheddar"]
BREAKFAST = ["rolled oats", "eggs", "whole milk", "greek yogurt", "peanut butter",
             "cottage cheese", "whole wheat flour", "banana", "apple"]
SNACKS_F = ["popcorn", "almonds", "peanuts", "sunflower", "apple", "banana", "carrot",
            "raisins", "prunes", "peanut butter"]

TOPICS: list[dict] = [
    {"slug": "meat-per-dollar-protein-ranked", "csv": "P", "cats": ["Meat & poultry"],
     "title": "Meat per Dollar: 11 Cuts Ranked by Protein Value",
     "chart_label": "Protein (g) per dollar"},
    {"slug": "animal-protein-per-dollar-ranked", "csv": "P",
     "cats": ["Meat & poultry", "Fish (canned & frozen)", "Eggs & dairy"],
     "title": "Every Animal Protein in Our Study, Ranked by Cost",
     "chart_label": "Protein (g) per dollar"},
    {"slug": "dairy-protein-per-dollar-ranked", "csv": "P", "cats": ["Eggs & dairy"],
     "title": "Dairy Protein per Dollar: Milk Beats the Hype",
     "chart_label": "Protein (g) per dollar"},
    {"slug": "plant-protein-per-dollar-ranked", "csv": "P",
     "cats": ["Dried beans & lentils", "Canned beans", "Soy & plant proteins", "Nuts & seeds"],
     "title": "Plant Protein per Dollar: 18 Sources Ranked",
     "chart_label": "Protein (g) per dollar"},
    {"slug": "no-cook-protein-per-dollar", "csv": "P", "foods": NO_COOK_P,
     "title": "The Cheapest Protein That Needs Zero Cooking",
     "chart_label": "Protein (g) per dollar"},
    {"slug": "canned-vs-dry-beans-cost", "csv": "P",
     "cats": ["Dried beans & lentils", "Canned beans"],
     "title": "Canned vs Dry Beans: What Convenience Actually Costs",
     "chart_label": "Protein (g) per dollar"},
    {"slug": "one-dollar-protein-what-it-buys", "csv": "P", "top": 15,
     "title": "What One Dollar of Protein Buys, Food by Food",
     "chart_label": "Protein (g) per single dollar"},
    {"slug": "eggs-vs-everything-protein-value", "csv": "P",
     "title": "Eggs vs Everything: Where the Default Protein Really Ranks",
     "chart_label": "Protein (g) per dollar"},
    {"slug": "grains-fiber-per-dollar-ranked", "csv": "F", "cats": ["Whole grains"],
     "title": "Grains Ranked by Fiber per Dollar",
     "chart_label": "Fiber (g) per dollar"},
    {"slug": "produce-fiber-per-dollar-ranked", "csv": "F",
     "cats": ["Fresh produce", "Fruits", "Vegetables", "Frozen vegetables", "Fresh fruit", "Fresh vegetables"],
     "title": "Fruits and Vegetables Ranked by Fiber per Dollar",
     "chart_label": "Fiber (g) per dollar"},
    {"slug": "high-fiber-snacks-per-dollar", "csv": "F", "foods": SNACKS_F,
     "title": "High-Fiber Snacks Ranked by Cost",
     "chart_label": "Fiber (g) per dollar"},
    {"slug": "one-dollar-fiber-what-it-buys", "csv": "F", "top": 15,
     "title": "What One Dollar of Fiber Buys, Food by Food",
     "chart_label": "Fiber (g) per single dollar"},
    {"slug": "beans-double-win-fiber-protein", "csv": "BOTH",
     "cats": ["Dried beans & lentils", "Canned beans", "Dried beans & peas"],
     "title": "Beans Win Twice: Fiber and Protein per Dollar",
     "chart_label": "Grams per dollar"},
    {"slug": "breakfast-staples-per-dollar", "csv": "BOTH", "foods": BREAKFAST,
     "title": "Breakfast Staples Ranked by Nutrition per Dollar",
     "chart_label": "Grams per dollar"},
    {"slug": "shelf-stable-pantry-per-dollar", "csv": "P",
     "cats": ["Dried beans & lentils", "Canned beans", "Grains & pantry", "Nuts & seeds", "Fish (canned & frozen)"],
     "title": "The Shelf-Stable Pantry, Ranked by Protein per Dollar",
     "chart_label": "Protein (g) per dollar"},
    {"slug": "cheapest-complete-protein-pairs", "csv": "PAIRS",
     "title": "Rice and Beans Math: The Cheapest Complete-Protein Combos",
     "chart_label": "Combined protein (g) per dollar"},
]


def chart(slug: str, rows: list[dict], label: str, title: str) -> None:
    top = rows[:10]
    fig, ax = plt.subplots(figsize=(12, 6.75), dpi=100)
    foods = [r["food"] for r in reversed(top)]
    vals = [r["value"] for r in reversed(top)]
    ax.barh(foods, vals, color=ORANGE)
    for i, v in enumerate(vals):
        ax.text(v + max(vals) * 0.01, i, f"{v:.0f}", va="center", color=SLATE, fontsize=11, fontweight="bold")
    ax.set_xlabel(label, color=SLATE, fontsize=12)
    ax.set_title(title, color=SLATE, fontsize=16, fontweight="bold", pad=14)
    ax.tick_params(colors=SLATE, labelsize=11)
    for s in ["top", "right"]:
        ax.spines[s].set_visible(False)
    fig.text(0.99, 0.01, "Data: USDA FoodData Central + store prices, Jul 2026 | daily-life-hacks.com",
             ha="right", fontsize=9, color="#888888")
    fig.tight_layout(rect=[0, 0.03, 1, 1])
    fig.savefig(IMG / f"{slug}-main.jpg", facecolor="white")
    plt.close(fig)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for t in TOPICS:
        if t["csv"] == "P":
            rows = pick(P, t.get("cats"), t.get("foods"))
            metric = "protein_g_per_dollar"
        elif t["csv"] == "F":
            rows = pick(F, t.get("cats"), t.get("foods"))
            metric = "fiber_g_per_dollar"
        elif t["csv"] == "BOTH":
            prot = {r["food"]: r for r in pick(P, t.get("cats"), t.get("foods"))}
            fib = {r["food"]: r for r in pick(F, t.get("cats"), t.get("foods"))}
            rows = []
            for food in set(prot) | set(fib):
                p_v = prot.get(food, {}).get("value")
                f_v = fib.get(food, {}).get("value")
                base = prot.get(food) or fib[food]
                rows.append({**base, "protein_g_per_dollar": p_v, "fiber_g_per_dollar": f_v,
                             "value": (p_v or 0) + (f_v or 0)})
            rows.sort(key=lambda r: -r["value"])
            metric = "combined"
        elif t["csv"] == "PAIRS":
            grains = pick(P, foods=["brown rice", "whole wheat flour", "rolled oats", "pearled barley"])
            legumes = pick(P, cats=["Dried beans & lentils"])
            rows = []
            for g in grains:
                for l in legumes[:5]:
                    # 50/50 dollar split: grams from each per combined dollar
                    combined = round(g["value"] * 0.5 + l["value"] * 0.5, 1)
                    rows.append({"food": f"{l['food']} + {g['food']}", "category": "combo",
                                 "value": combined, "package": "", "package_price_usd": 0,
                                 "price_basis": f"50/50 dollar split of audited rows: {l['food']} {l['value']}, {g['food']} {g['value']}"})
            rows.sort(key=lambda r: -r["value"])
            metric = "combined_g_per_dollar_5050"
        if t.get("top"):
            rows = rows[:t["top"]]
        if len(rows) < 4:
            print(f"SKIP {t['slug']}: only {len(rows)} rows")
            continue
        data = {
            "slug": t["slug"], "suggested_title": t["title"], "metric": metric,
            "computed_from": "audited public/data CSVs (protein-per-dollar-2026, fiber-per-dollar-2026)",
            "n_foods": len(rows),
            "winner": rows[0]["food"], "winner_value": rows[0]["value"],
            "loser": rows[-1]["food"], "loser_value": rows[-1]["value"],
            "spread_x": round(rows[0]["value"] / rows[-1]["value"], 1) if rows[-1]["value"] else None,
            "rows": [{k: r.get(k) for k in ("food", "category", "value", "package",
                                             "package_price_usd", "price_basis",
                                             "protein_g_per_dollar", "fiber_g_per_dollar")
                      if r.get(k) is not None} for r in rows],
        }
        (OUT / f"{t['slug']}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        chart(t["slug"], rows, t["chart_label"], t["title"])
        print(f"OK {t['slug']}: {len(rows)} foods, winner={rows[0]['food']} ({rows[0]['value']})")


if __name__ == "__main__":
    main()
