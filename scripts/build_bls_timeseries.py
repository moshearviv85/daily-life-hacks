#!/usr/bin/env python3
"""Build the BLS nutrition-per-dollar monthly time series.

WHAT THIS IS
------------
The flagship per-dollar rankings on daily-life-hacks.com have one structural
weakness, stated publicly on /data/: one retailer, national, one date. This
script builds the opposite kind of dataset. Prices come from a federal
statistical survey (BLS Average Price data), they are monthly, they are broken
out by census region, they carry years of history, and they refresh themselves
from a public API that needs no key.

Prices:   U.S. Bureau of Labor Statistics, Average Price Data (AP series),
          public API v2, https://api.bls.gov/publicAPI/v2/timeseries/data/
Nutrients: USDA FoodData Central, via the reviewed item-to-record map in
          pipeline-data/bls/bls-food-nutrient-map.json
Areas:    pipeline-data/bls/ap.area.tsv

Series ID format: AP + U + 4-char area code + 6-char item code.
For example APU0000709112 is area 0000 (U.S. city average) and item 709112
(milk, fresh, whole, fortified, per gal.).


THE IDENTITY, DERIVED
---------------------
Nothing here is copied from the flagship CSVs; the identity is derived from
what each source actually publishes, then checked against them.

BLS publishes one number per item per area per month: P, the average price in
US dollars of ONE priced unit. The priced unit is whatever the item name says
it is: one pound, one dozen, one gallon, eight ounces.

The map publishes two numbers about that priced unit:

    G = grams_per_priced_unit    gross grams of product in the priced unit,
                                 before any refuse is removed
    f = edible_fraction          the share of G that is edible food

so the edible mass a shopper actually gets for P dollars is

    (1)  G_e = G * f             grams of edible food per priced unit

Dividing (1) into the price gives a price that is comparable across items
priced in different units, expressed per 100 g of edible food:

    (2)  price_per_100g = 100 * P / G_e
                        = 100 * P / (G * f)

Invert (2) and one dollar buys

    (3)  grams of edible food per dollar = G_e / P = 100 / price_per_100g

USDA publishes nutrients per 100 g of edible food, call it N. So the grams of
that nutrient a dollar buys is (3) scaled by N per 100 g:

    (4)  nutrient_g_per_dollar = (N / 100) * (G_e / P)
                               = N / price_per_100g

Equation (4) is what the CSV publishes as protein_g_per_dollar and
fiber_g_per_dollar. Note the edible fraction is applied exactly once, inside
price_per_100g. Applying it again to the nutrient would double count it.

The repo's existing flagship CSVs write the same identity the other way round:
they keep price_per_100g_usd on the gross package weight and multiply the
edible fraction into the nutrient side. The two are algebraically identical,
because N * f / (100 P / G) equals N / (100 P / (G f)). This script uses the
edible-basis price because the published price_per_100g column is then the
number a reader can compare directly against another food, with no hidden
multiplier left to apply.

Worked check against a published row. Whole chicken, item 706111, at the U.S.
city average: G = 453.6, f = 0.61, N = 18.60 g protein per 100 g. At the BLS
May 2026 price of 2.04 per lb the flagship CSV publishes 25.3 g protein per
dollar. Here: G_e = 276.7 g, price_per_100g = 100 * 2.04 / 276.7 = 0.7373,
protein per dollar = 18.60 / 0.7373 = 25.2. Agreement to the rounding.


WHAT IT WRITES
--------------
public/data/bls-nutrition-per-dollar-monthly.csv
    Every item x area x month with a published price. One row per observation,
    carrying every input used, so any row can be recomputed by hand from the
    row itself.

public/data/bls-nutrition-per-dollar-latest.csv
    The most recent month per item per area. Same schema. This is what a
    ranking page renders.

Both files are written with LF line endings on every platform. This repo is
LF-only and CRLF has broken datapackage checksums here before.


USAGE
-----
    python scripts/build_bls_timeseries.py                    # 10 years, US + 4 regions
    python scripts/build_bls_timeseries.py --years 3
    python scripts/build_bls_timeseries.py --areas 0000
    python scripts/build_bls_timeseries.py --dry-run

BLS keyless API limits, respected here: at most 25 series per request and at
most 10 years per request. Requests are batched accordingly with a short sleep
between them.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAP_PATH = ROOT / "pipeline-data" / "bls" / "bls-food-nutrient-map.json"
AREA_PATH = ROOT / "pipeline-data" / "bls" / "ap.area.tsv"
DATA_DIR = ROOT / "public" / "data"
MONTHLY_PATH = DATA_DIR / "bls-nutrition-per-dollar-monthly.csv"
LATEST_PATH = DATA_DIR / "bls-nutrition-per-dollar-latest.csv"

BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"

# Keyless public API v2 limits. Do not raise these without a registered key.
MAX_SERIES_PER_REQUEST = 25
MAX_YEARS_PER_REQUEST = 10

DEFAULT_AREAS = ["0000", "0100", "0200", "0300", "0400"]
DEFAULT_YEARS = 10
DEFAULT_SLEEP_SECONDS = 1.0
REQUEST_TIMEOUT_SECONDS = 90

# Rounding. Prices per 100 g need four decimals because cheap staples land
# near a tenth of a cent; the per-dollar columns are published to two so a
# month-over-month move is visible without implying false precision.
PRICE_DECIMALS = 4
PER_DOLLAR_DECIMALS = 2

# ---------------------------------------------------------------------------
# Output schema. Every column that feeds the arithmetic is published, so a
# reader can recompute price_per_100g_usd, protein_g_per_dollar and
# fiber_g_per_dollar from the row itself without opening any other file.
# ---------------------------------------------------------------------------
COLUMNS: list[tuple[str, str]] = [
    ("bls_series_id", "BLS Average Price series ID, AP + U + area_code + bls_item_code."),
    ("bls_item_code", "BLS item code, the last 6 characters of the series ID."),
    ("bls_item_name", "BLS item name, verbatim, including the priced unit."),
    ("area_code", "BLS area code. 0000 is the U.S. city average; 0100/0200/0300/0400 are the four census regions."),
    ("area_name", "Human-readable area name from ap.area.tsv."),
    ("year", "Calendar year of the price observation."),
    ("period", "BLS period code, M01 through M12."),
    ("date", "First day of the observation month, ISO 8601, for charting."),
    ("price_usd", "BLS published average price in US dollars for ONE priced unit of the item."),
    ("grams_per_priced_unit", "Gross grams in that priced unit, before refuse is removed."),
    ("edible_fraction", "Share of the gross grams that is edible food. 1.0 when there is no refuse."),
    ("edible_grams_per_priced_unit", "grams_per_priced_unit x edible_fraction."),
    ("price_per_100g_usd", "100 x price_usd / edible_grams_per_priced_unit. Dollars per 100 g of edible food."),
    ("fdc_id", "USDA FoodData Central record ID supplying the nutrient values."),
    ("fdc_description", "USDA record description, verbatim."),
    ("protein_g_per_100g", "Grams of protein per 100 g of edible food, from the USDA record."),
    ("fiber_g_per_100g", "Grams of dietary fiber per 100 g of edible food, from the USDA record."),
    ("protein_g_per_dollar", "protein_g_per_100g / price_per_100g_usd."),
    ("fiber_g_per_dollar", "fiber_g_per_100g / price_per_100g_usd."),
    ("value_source", "Where the nutrient values came from: a full-precision repo CSV, or the USDA portal endpoint which rounds to 3 significant figures."),
]
HEADER = [name for name, _ in COLUMNS]


class BlsError(RuntimeError):
    """BLS returned something other than a successful payload."""


# ---------------------------------------------------------------------------
# Inputs
# ---------------------------------------------------------------------------
def load_map(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(f"missing nutrient map: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    matched = data.get("matched") or []
    if not matched:
        raise SystemExit(f"{path.name} has no matched items")

    required = (
        "bls_item_code",
        "bls_item_name",
        "fdc_id",
        "fdc_description",
        "protein_g_per_100g",
        "fiber_g_per_100g",
        "grams_per_priced_unit",
        "edible_fraction",
        "value_source",
    )
    for entry in matched:
        missing = [field for field in required if entry.get(field) is None]
        if missing:
            raise SystemExit(
                f"{path.name}: item {entry.get('bls_item_code', '?')} is missing {', '.join(missing)}"
            )
        code = str(entry["bls_item_code"])
        if len(code) != 6:
            raise SystemExit(
                f"{path.name}: item code {code!r} is not 6 characters, so it cannot form a series ID"
            )
        grams = float(entry["grams_per_priced_unit"])
        fraction = float(entry["edible_fraction"])
        if grams <= 0:
            raise SystemExit(f"{path.name}: item {code} has grams_per_priced_unit {grams}")
        if not 0 < fraction <= 1:
            raise SystemExit(f"{path.name}: item {code} has edible_fraction {fraction}")

    codes = [str(e["bls_item_code"]) for e in matched]
    duplicates = sorted({c for c in codes if codes.count(c) > 1})
    if duplicates:
        raise SystemExit(f"{path.name}: duplicate item codes {', '.join(duplicates)}")

    return data


def load_areas(path: Path) -> dict[str, str]:
    if not path.exists():
        raise SystemExit(f"missing area file: {path}")
    areas: dict[str, str] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            code = (row.get("area_code") or "").strip()
            name = (row.get("area_name") or "").strip()
            if code:
                areas[code] = name
    if not areas:
        raise SystemExit(f"{path.name} produced no areas")
    return areas


def series_id(area_code: str, item_code: str) -> str:
    return f"APU{area_code}{item_code}"


# ---------------------------------------------------------------------------
# BLS fetch
# ---------------------------------------------------------------------------
def chunk(values: list, size: int) -> list[list]:
    return [values[i : i + size] for i in range(0, len(values), size)]


def year_windows(start_year: int, end_year: int) -> list[tuple[int, int]]:
    """Split an inclusive year range into windows of at most 10 years."""
    windows = []
    lower = start_year
    while lower <= end_year:
        upper = min(lower + MAX_YEARS_PER_REQUEST - 1, end_year)
        windows.append((lower, upper))
        lower = upper + 1
    return windows


def post_bls(series_ids: list[str], start_year: int, end_year: int) -> list[dict]:
    payload = json.dumps(
        {
            "seriesid": series_ids,
            "startyear": str(start_year),
            "endyear": str(end_year),
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        BLS_API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "daily-life-hacks-bls-timeseries/1.0 (+https://www.daily-life-hacks.com/data/)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        raise BlsError(
            f"BLS returned HTTP {error.code} for {len(series_ids)} series {start_year}-{end_year}: "
            f"{error.read().decode('utf-8', 'replace')[:400]}"
        ) from error
    except urllib.error.URLError as error:
        raise BlsError(f"could not reach the BLS API: {error.reason}") from error

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as error:
        raise BlsError(f"BLS returned a non-JSON body: {body[:400]}") from error

    status = parsed.get("status")
    if status != "REQUEST_SUCCEEDED":
        messages = "; ".join(parsed.get("message") or []) or "no message returned"
        raise BlsError(
            f"BLS status {status!r} for {start_year}-{end_year} "
            f"({len(series_ids)} series): {messages}"
        )

    for message in parsed.get("message") or []:
        print(f"  BLS note: {message}", file=sys.stderr)

    return (parsed.get("Results") or {}).get("series") or []


def fetch_series(
    series_ids: list[str], start_year: int, end_year: int, sleep_seconds: float
) -> tuple[dict[str, list[dict]], list[str]]:
    """Return {series_id: [observation, ...]} plus the IDs BLS never returned."""
    collected: dict[str, list[dict]] = {sid: [] for sid in series_ids}
    returned: set[str] = set()

    batches = chunk(series_ids, MAX_SERIES_PER_REQUEST)
    windows = year_windows(start_year, end_year)
    total = len(batches) * len(windows)
    done = 0

    for window_start, window_end in windows:
        for batch in batches:
            done += 1
            print(
                f"[{done}/{total}] BLS request: {len(batch)} series, {window_start}-{window_end}",
                file=sys.stderr,
            )
            for series in post_bls(batch, window_start, window_end):
                sid = series.get("seriesID")
                if sid is None:
                    continue
                returned.add(sid)
                collected.setdefault(sid, []).extend(series.get("data") or [])
            if done < total and sleep_seconds > 0:
                time.sleep(sleep_seconds)

    never_returned = sorted(set(series_ids) - returned)
    return collected, never_returned


# ---------------------------------------------------------------------------
# Rows
# ---------------------------------------------------------------------------
def parse_price(raw) -> float | None:
    """BLS publishes suppressed or unavailable values as '-' or an empty string."""
    if raw is None:
        return None
    text = str(raw).strip().replace(",", "")
    if text in {"", "-", "--", "(NA)", "NA"}:
        return None
    try:
        value = float(text)
    except ValueError:
        return None
    return value if value > 0 else None


def build_rows(
    item: dict,
    area_code: str,
    area_name: str,
    observations: list[dict],
) -> list[dict]:
    grams = float(item["grams_per_priced_unit"])
    fraction = float(item["edible_fraction"])
    edible_grams = grams * fraction
    protein = float(item["protein_g_per_100g"])
    fiber = float(item["fiber_g_per_100g"])
    sid = series_id(area_code, str(item["bls_item_code"]))

    rows = []
    for point in observations:
        period = str(point.get("period") or "")
        # M13 is the annual average, not a month. It has no place in a monthly file.
        if not period.startswith("M") or period == "M13":
            continue
        try:
            month = int(period[1:])
        except ValueError:
            continue
        if not 1 <= month <= 12:
            continue
        year_text = str(point.get("year") or "")
        if not year_text.isdigit():
            continue

        price = parse_price(point.get("value"))
        if price is None:
            continue

        price_per_100g = 100.0 * price / edible_grams
        rows.append(
            {
                "bls_series_id": sid,
                "bls_item_code": str(item["bls_item_code"]),
                "bls_item_name": item["bls_item_name"],
                "area_code": area_code,
                "area_name": area_name,
                "year": year_text,
                "period": period,
                "date": f"{int(year_text):04d}-{month:02d}-01",
                "price_usd": f"{price:.3f}",
                "grams_per_priced_unit": f"{grams:g}",
                "edible_fraction": f"{fraction:g}",
                "edible_grams_per_priced_unit": f"{edible_grams:.1f}",
                "price_per_100g_usd": f"{price_per_100g:.{PRICE_DECIMALS}f}",
                "fdc_id": str(item["fdc_id"]),
                "fdc_description": item["fdc_description"],
                "protein_g_per_100g": f"{protein:g}",
                "fiber_g_per_100g": f"{fiber:g}",
                "protein_g_per_dollar": f"{protein / price_per_100g:.{PER_DOLLAR_DECIMALS}f}",
                "fiber_g_per_dollar": f"{fiber / price_per_100g:.{PER_DOLLAR_DECIMALS}f}",
                "value_source": item["value_source"],
            }
        )
    return rows


def sort_key(row: dict) -> tuple:
    return (row["bls_item_code"], row["area_code"], row["date"])


def latest_rows(rows: list[dict]) -> list[dict]:
    """Most recent month per item per area."""
    newest: dict[tuple[str, str], dict] = {}
    for row in rows:
        key = (row["bls_item_code"], row["area_code"])
        current = newest.get(key)
        if current is None or row["date"] > current["date"]:
            newest[key] = row
    return sorted(newest.values(), key=sort_key)


def write_csv(path: Path, rows: list[dict]) -> None:
    """Write with LF line endings on every platform."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=HEADER, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the BLS nutrition-per-dollar monthly time series.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--years",
        type=int,
        default=DEFAULT_YEARS,
        help=f"How many calendar years back to fetch, including this one (default {DEFAULT_YEARS}).",
    )
    parser.add_argument(
        "--areas",
        default=",".join(DEFAULT_AREAS),
        help="Comma-separated BLS area codes (default: U.S. city average plus the four census regions).",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=DEFAULT_SLEEP_SECONDS,
        help=f"Seconds to sleep between BLS requests (default {DEFAULT_SLEEP_SECONDS}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be fetched and written, then exit without calling BLS.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.years < 1:
        raise SystemExit("--years must be at least 1")

    nutrient_map = load_map(MAP_PATH)
    items = nutrient_map["matched"]
    areas = load_areas(AREA_PATH)

    requested_areas = [code.strip() for code in args.areas.split(",") if code.strip()]
    unknown = [code for code in requested_areas if code not in areas]
    if unknown:
        raise SystemExit(
            f"unknown area code(s) {', '.join(unknown)}. "
            f"Known codes: {', '.join(sorted(areas))}"
        )
    if not requested_areas:
        raise SystemExit("--areas resolved to nothing")

    end_year = dt.date.today().year
    start_year = end_year - args.years + 1

    pairs = [(item, area) for area in requested_areas for item in items]
    series_ids = [series_id(area, str(item["bls_item_code"])) for item, area in pairs]

    batches = len(chunk(series_ids, MAX_SERIES_PER_REQUEST))
    windows = year_windows(start_year, end_year)

    print(f"items:   {len(items)} (from {MAP_PATH.name})")
    print(f"areas:   {len(requested_areas)} -> {', '.join(f'{c} {areas[c]}' for c in requested_areas)}")
    print(f"years:   {start_year}-{end_year}")
    print(f"series:  {len(series_ids)}")
    print(f"requests: {batches * len(windows)} ({batches} batch(es) x {len(windows)} year window(s))")

    if args.dry_run:
        print("\n--dry-run: no BLS call made. Would fetch these series:")
        for sid in series_ids:
            print(f"  {sid}")
        print(f"\nWould write:\n  {MONTHLY_PATH}\n  {LATEST_PATH}")
        return 0

    try:
        fetched, never_returned = fetch_series(series_ids, start_year, end_year, args.sleep)
    except BlsError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    rows: list[dict] = []
    empty_series: list[tuple[str, str]] = []
    for item, area in pairs:
        sid = series_id(area, str(item["bls_item_code"]))
        item_rows = build_rows(item, area, areas[area], fetched.get(sid) or [])
        if item_rows:
            rows.extend(item_rows)
        else:
            empty_series.append((sid, item["bls_item_name"]))

    rows.sort(key=sort_key)
    latest = latest_rows(rows)

    write_csv(MONTHLY_PATH, rows)
    write_csv(LATEST_PATH, latest)

    # ---- summary -----------------------------------------------------------
    items_with_data = sorted({row["bls_item_code"] for row in rows})
    areas_with_data = sorted({row["area_code"] for row in rows})
    months = sorted({row["date"] for row in rows})

    print("\n" + "=" * 68)
    print("SUMMARY")
    print("=" * 68)
    print(f"items with data:  {len(items_with_data)} of {len(items)}")
    print(f"areas with data:  {len(areas_with_data)} of {len(requested_areas)}")
    if months:
        print(f"months covered:   {len(months)} ({months[0][:7]} to {months[-1][:7]})")
    else:
        print("months covered:   0")
    print(f"monthly rows:     {len(rows)}  -> {MONTHLY_PATH.relative_to(ROOT).as_posix()}")
    print(f"latest rows:      {len(latest)}  -> {LATEST_PATH.relative_to(ROOT).as_posix()}")

    if empty_series:
        print(f"\nempty series ({len(empty_series)}) - BLS returned no usable monthly price:")
        for sid, name in empty_series:
            marker = "  (series not returned by BLS at all)" if sid in never_returned else ""
            print(f"  {sid}  {name}{marker}")
        print(
            "\nAn empty series is normally a discontinued or never-published item at that\n"
            "area. BLS retires AP items and does not publish every item for every region.\n"
            "These are reported, not dropped silently, and they do not fail the run."
        )
    else:
        print("\nempty series: none")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
