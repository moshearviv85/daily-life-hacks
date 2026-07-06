#!/usr/bin/env python3
"""
Monthly Price Index Updater — turns the *-per-dollar-* data studies into living indexes.

Discovers every dataset matching public/data/*-per-dollar-*.csv (fiber, protein, ...),
fetches the latest month of official BLS Average Price (AP) data for every food that
has a genuinely matching BLS series, updates package_price_usd + price_basis,
recomputes price_per_100g_usd and <nutrient>_g_per_dollar for ALL rows, re-ranks,
and writes the CSVs back.

Foods without a matching BLS series keep their audited price and price_basis
(Walmart snapshot) untouched — only the derived columns are recomputed.

Outputs a human-readable change report to stdout and (on real runs) to
pipeline-data/index-update-report-{YYYY-MM}.md. Rank changes are highlighted —
they are newsletter/social content.

Usage:
  python scripts/update-price-index.py            # real run: updates CSVs + writes report
  python scripts/update-price-index.py --dry-run  # report only, writes nothing

Env vars:
  BLS_API_KEY   optional BLS registration key (raises daily API quota); works without it
"""

import argparse
import csv
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

if hasattr(sys.stdout, "reconfigure"):  # avoid mojibake on Windows consoles
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "public" / "data"
REPORT_DIR = REPO_ROOT / "pipeline-data"

BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

GRAMS_PER_LB = 453.592
GRAMS_PER_12OZ = 340.194

# ── SERIES_MAP ─────────────────────────────────────────────────────────────────
# food name (as it appears in the CSV, case-insensitive) -> BLS AP series config.
#
# Only foods where a BLS AP series *genuinely* corresponds are mapped. Everything
# else keeps its audited Walmart price. Deliberately NOT mapped (verified against
# the live API, 2026-07): apples (APU0000711111 ended 2017), carrots (712404 ended
# 1997), cabbage (712401 ended 2012), peanut butter (716141 ended 2017), canned
# tuna (707111 ended 2017), yellow onions (712406) and pears (711414) — series
# exist but recent months report "-" (no value). White flour / white pasta / white
# rice series do NOT correspond to the whole-wheat items in the fiber study.
#
# "unit_g": the BLS price covers this many grams -> package price scales by weight.
# "per_package": the BLS price IS the package price (count/volume series);
#                "expect_package" guards against a mismatched package definition.
SERIES_MAP = {
    # ── fiber-per-dollar-2026.csv (verified live, May 2026 data) ──
    "pinto beans (dry)":            {"series": "APU0000714233", "unit_g": GRAMS_PER_LB},   # Beans, dried, any type, per lb
    "black beans (dry)":            {"series": "APU0000714233", "unit_g": GRAMS_PER_LB},
    "navy beans (dry)":             {"series": "APU0000714233", "unit_g": GRAMS_PER_LB},
    "100% whole wheat bread":       {"series": "APU0000702212", "unit_g": GRAMS_PER_LB},   # Bread, whole wheat, pan, per lb
    "bananas":                      {"series": "APU0000711211", "unit_g": GRAMS_PER_LB},   # Bananas, per lb
    "oranges (navel)":              {"series": "APU0000711311", "unit_g": GRAMS_PER_LB},   # Oranges, navel, per lb
    "russet potatoes (with skin)":  {"series": "APU0000712112", "unit_g": GRAMS_PER_LB},   # Potatoes, white, per lb
    "strawberries":                 {"series": "APU0000711415", "unit_g": GRAMS_PER_12OZ}, # Strawberries, dry pint, per 12 oz

    # ── protein-per-dollar-2026.csv candidates (series verified live; food names
    #    are best guesses — unused entries are listed in the report, so mismatched
    #    names surface as soon as the protein CSV lands and are easy to fix) ──
    "eggs (grade a, large)":        {"series": "APU0000708111", "per_package": True, "expect_package": "dozen"},   # per dozen
    "whole milk":                   {"series": "APU0000709112", "per_package": True, "expect_package": "gallon"},  # per gallon
    "ground beef":                  {"series": "APU0000703112", "unit_g": GRAMS_PER_LB},   # Ground beef, 100% beef, per lb
    "whole chicken":                {"series": "APU0000706111", "unit_g": GRAMS_PER_LB},   # Chicken, fresh, whole, per lb
    "chicken breast (boneless)":    {"series": "APU0000FF1101", "unit_g": GRAMS_PER_LB},   # Chicken breast, boneless, per lb
    "white rice (dry)":             {"series": "APU0000701312", "unit_g": GRAMS_PER_LB},   # Rice, white, long grain, per lb
    "spaghetti":                    {"series": "APU0000701322", "unit_g": GRAMS_PER_LB},   # Spaghetti and macaroni, per lb
}


def norm(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().lower())


# ── BLS API ────────────────────────────────────────────────────────────────────

def fetch_bls_latest(series_ids: list[str]) -> tuple[dict, list[str]]:
    """Fetch the latest monthly value for each series.
    Returns ({series_id: {"value": float, "month": "May", "year": "2026"}}, notes).
    On total API failure returns ({}, [note]) — callers treat missing series as 'skip'.
    """
    notes = []
    if not series_ids:
        return {}, notes

    year = datetime.now(timezone.utc).year
    payload = {
        "seriesid": sorted(set(series_ids)),
        "startyear": str(year - 1),
        "endyear": str(year),
    }
    api_key = os.environ.get("BLS_API_KEY", "").strip()
    if api_key:
        payload["registrationkey"] = api_key

    try:
        resp = requests.post(BLS_API_URL, json=payload,
                             headers={"Content-Type": "application/json"}, timeout=60)
        resp.raise_for_status()
        body = resp.json()
    except Exception as e:
        notes.append(f"BLS API request failed ({e}) — all BLS-mapped foods keep their previous prices this run.")
        return {}, notes

    if body.get("status") != "REQUEST_SUCCEEDED":
        msgs = "; ".join(body.get("message", [])) or body.get("status", "unknown error")
        notes.append(f"BLS API did not process the request ({msgs}) — all BLS-mapped foods keep their previous prices this run.")
        return {}, notes

    latest = {}
    for series in body.get("Results", {}).get("series", []):
        sid = series.get("seriesID")
        points = []
        for d in series.get("data", []):
            period = d.get("period", "")
            if not period.startswith("M") or period == "M13":  # monthly points only
                continue
            try:
                value = float(d["value"])
            except (KeyError, TypeError, ValueError):
                continue  # "-" = no value published for that month
            points.append((int(d["year"]), int(period[1:]), value, d.get("periodName", period)))
        if points:
            points.sort(reverse=True)
            y, m, value, month_name = points[0]
            latest[sid] = {"value": value, "month": month_name, "year": str(y)}
        else:
            notes.append(f"Series {sid}: no usable monthly value from BLS — food(s) on this series keep their previous price.")
    return latest, notes


# ── CSV processing ─────────────────────────────────────────────────────────────

def detect_nutrient(fieldnames: list[str]) -> str | None:
    """Find the '<nutrient>_g_per_100g' column; returns the nutrient prefix."""
    for col in fieldnames:
        m = re.fullmatch(r"(\w+)_g_per_100g", col)
        if m:
            return m.group(1)
    return None


def fmt_num(x: float) -> str:
    """Match the CSV's existing number style (round() repr: 0.2 not 0.200)."""
    return str(x)


def process_csv(path: Path, bls_latest: dict, notes: list[str]) -> dict | None:
    """Update one dataset in memory. Returns a result dict (rows, report data, changed flag)."""
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = [dict(r) for r in reader]

    nutrient = detect_nutrient(fieldnames)
    per_dollar_col = f"{nutrient}_g_per_dollar" if nutrient else None
    if not nutrient or per_dollar_col not in fieldnames:
        notes.append(f"{path.name}: could not detect nutrient columns — file skipped.")
        return None

    price_changes = []   # (food, old_price, new_price, old_basis, new_basis)
    matched_foods = set()

    for row in rows:
        key = norm(row["food"])
        cfg = SERIES_MAP.get(key)
        if not cfg:
            continue
        matched_foods.add(key)
        info = bls_latest.get(cfg["series"])
        if not info:
            continue  # API failure / no value — noted already, price stays as-is

        if cfg.get("per_package"):
            expect = cfg.get("expect_package", "")
            if expect and expect not in row["package"].lower():
                notes.append(f'{path.name}: "{row["food"]}" package is "{row["package"]}", '
                             f'expected a per-{expect} package for series {cfg["series"]} — price left unchanged.')
                continue
            new_price = round(info["value"], 2)
        else:
            new_price = round(info["value"] * float(row["package_weight_g"]) / cfg["unit_g"], 2)

        old_price = float(row["package_price_usd"])
        new_basis = f'BLS AP {cfg["series"]} {info["month"][:3]}-{info["year"]}'
        if new_price != old_price or row["price_basis"] != new_basis:
            price_changes.append((row["food"], old_price, new_price, row["price_basis"], new_basis))
        row["package_price_usd"] = f"{new_price:.2f}"
        row["price_basis"] = new_basis

    # Recompute derived columns for ALL rows (spec: keeps the file internally consistent)
    for row in rows:
        price = float(row["package_price_usd"])
        weight = float(row["package_weight_g"])
        edible = float(row["edible_fraction"])
        per_100g = price / weight * 100
        per_dollar = float(row[f"{nutrient}_g_per_100g"]) * edible / per_100g
        row["price_per_100g_usd"] = fmt_num(round(per_100g, 3))
        row[per_dollar_col] = fmt_num(round(per_dollar, 1))

    # Re-rank (highest nutrient-per-dollar first; ties keep previous order)
    old_ranks = {norm(r["food"]): int(r["rank"]) for r in rows}
    rows.sort(key=lambda r: (-float(r[per_dollar_col]), int(r["rank"])))
    rank_changes = []
    for i, row in enumerate(rows, start=1):
        old = old_ranks[norm(row["food"])]
        if old != i:
            rank_changes.append((row["food"], old, i))
        row["rank"] = str(i)

    unused_map_entries = sorted(k for k in SERIES_MAP if k not in matched_foods)
    return {
        "path": path,
        "fieldnames": fieldnames,
        "rows": rows,
        "nutrient": nutrient,
        "price_changes": price_changes,
        "rank_changes": rank_changes,
        "unused_map_entries": unused_map_entries,
    }


def write_csv(result: dict) -> None:
    with open(result["path"], "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=result["fieldnames"])
        writer.writeheader()
        writer.writerows(result["rows"])


# ── Report ─────────────────────────────────────────────────────────────────────

def build_report(results: list[dict], notes: list[str], month_tag: str, dry_run: bool) -> str:
    lines = [f"# Price index update — {month_tag}", ""]
    if dry_run:
        lines += ["> DRY RUN — no files were changed.", ""]
    lines += ["Prices come from the U.S. Bureau of Labor Statistics (BLS), the official "
              "government source for average grocery prices across the country. Foods the "
              "government does not track keep their store-checked (Walmart) price.", ""]

    any_change = False
    for res in results:
        lines.append(f"## {res['path'].name}")
        lines.append("")
        pc, rc = res["price_changes"], res["rank_changes"]

        if pc:
            any_change = True
            lines.append(f"### Prices updated from BLS ({len(pc)})")
            lines.append("")
            lines.append("| Food | Old price | New price | Change | New source |")
            lines.append("|------|-----------|-----------|--------|------------|")
            for food, old, new, _ob, nb in pc:
                diff = new - old
                pct = (diff / old * 100) if old else 0
                arrow = "up" if diff > 0 else ("down" if diff < 0 else "same price, source updated")
                change = f"{arrow} {abs(diff):.2f} ({pct:+.1f}%)" if diff else arrow
                lines.append(f"| {food} | ${old:.2f} | ${new:.2f} | {change} | {nb} |")
            lines.append("")
        else:
            lines.append("No price changes this month.")
            lines.append("")

        if rc:
            any_change = True
            lines.append(f"### RANK changes ({len(rc)}) — newsletter/social material")
            lines.append("")
            lines.append("| Food | Old rank | New rank | Moved |")
            lines.append("|------|----------|----------|-------|")
            for food, old, new in sorted(rc, key=lambda x: x[2]):
                moved = f"up {old - new}" if new < old else f"down {new - old}"
                lines.append(f"| {food} | #{old} | #{new} | {moved} |")
            lines.append("")
        else:
            lines.append("No rank changes — the leaderboard order is unchanged.")
            lines.append("")

        if res["unused_map_entries"]:
            lines.append("<details><summary>Mapped foods not found in this file (expected until "
                         "the matching dataset exists / names align)</summary>")
            lines.append("")
            for k in res["unused_map_entries"]:
                lines.append(f"- {k} ({SERIES_MAP[k]['series']})")
            lines.append("")
            lines.append("</details>")
            lines.append("")

    if notes:
        lines.append("## Notes / skipped")
        lines.append("")
        for n in notes:
            lines.append(f"- {n}")
        lines.append("")

    if not any_change:
        lines.append("**Bottom line: nothing changed this month.**")
    else:
        lines.append("**Bottom line: the files above were updated with the latest official prices.**")
    lines.append("")
    return "\n".join(lines)


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh *-per-dollar-* datasets from BLS AP data")
    parser.add_argument("--dry-run", action="store_true",
                        help="report what would change without writing any files")
    parser.add_argument("--report-only", action="store_true",
                        help="write the monthly Price Watch report but leave the CSVs untouched "
                             "(keeps the published ranking on its single consistent price basis)")
    args = parser.parse_args()

    csv_paths = sorted(DATA_DIR.glob("*-per-dollar-*.csv"))
    if not csv_paths:
        print("No *-per-dollar-*.csv datasets found under public/data/ — nothing to do.")
        return 0
    print(f"Datasets found: {', '.join(p.name for p in csv_paths)}")

    # Only fetch series that at least one CSV row actually needs
    needed = set()
    for path in csv_paths:
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                cfg = SERIES_MAP.get(norm(row.get("food", "")))
                if cfg:
                    needed.add(cfg["series"])
    print(f"BLS series needed: {len(needed)}")

    bls_latest, notes = fetch_bls_latest(sorted(needed))
    for sid, info in sorted(bls_latest.items()):
        print(f"  {sid}: {info['value']} ({info['month']} {info['year']})")

    results = []
    for path in csv_paths:
        res = process_csv(path, bls_latest, notes)
        if res:
            results.append(res)

    month_tag = datetime.now(timezone.utc).strftime("%Y-%m")
    report = build_report(results, notes, month_tag, args.dry_run)
    print("\n" + report)

    if args.dry_run:
        print("Dry run complete — no files written.")
        return 0

    if not args.report_only:
        for res in results:
            write_csv(res)
            print(f"Wrote {res['path'].relative_to(REPO_ROOT)}")

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORT_DIR / f"index-update-report-{month_tag}.md"
    report_path.write_text(report, encoding="utf-8")
    print(f"Wrote {report_path.relative_to(REPO_ROOT)}")
    if args.report_only:
        print("Report-only mode: CSVs left untouched (ranking keeps its consistent price basis).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
