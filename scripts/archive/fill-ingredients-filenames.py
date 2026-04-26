"""
Write image_ingredients_filename for every data row: {slug}-ingredients.jpg

Only updates that column. Reads/writes pipeline-data/production-sheet.csv.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "pipeline-data" / "production-sheet.csv"


def main() -> None:
    if not CSV_PATH.is_file():
        raise SystemExit(f"Missing {CSV_PATH}")

    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f))
    if len(rows) < 2:
        raise SystemExit("CSV has no data rows")

    header = rows[0]
    try:
        i_slug = header.index("slug")
        i_fn = header.index("image_ingredients_filename")
    except ValueError as e:
        raise SystemExit(f"Missing required column: {e}") from e

    width = len(header)
    updated = 0
    for r in rows[1:]:
        while len(r) < width:
            r.append("")
        slug = (r[i_slug] or "").strip()
        if not slug:
            continue
        want = f"{slug}-ingredients.jpg"
        if (r[i_fn] or "").strip() != want:
            r[i_fn] = want
            updated += 1

    tmp = CSV_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8", newline="") as f:
        csv.writer(f, lineterminator="\n").writerows(rows)
    tmp.replace(CSV_PATH)
    print("OK: image_ingredients_filename set to {slug}-ingredients.jpg for each row's slug.")
    print(f"Rows changed: {updated}")


if __name__ == "__main__":
    main()
