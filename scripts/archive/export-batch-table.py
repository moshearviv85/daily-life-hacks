"""
Export `pipeline-data/batch.json` to a human-viewable table:
- pipeline-data/batch-table.csv  (open in Excel)
- pipeline-data/batch-table.md   (quick view)
"""

from __future__ import annotations

import csv
import json
from pathlib import Path


BASE = Path(__file__).resolve().parent.parent


def main() -> None:
    batch_path = BASE / "pipeline-data" / "batch.json"
    if not batch_path.exists():
        raise SystemExit("Missing pipeline-data/batch.json")

    batch = json.loads(batch_path.read_text(encoding="utf-8"))
    rows = batch.get("rows", [])

    cols = [
        "row",
        "a1_slug",
        "a1_category",
        "a1_topic",
        "a1_excerpt",
        "a2_draft_path",
        "a3_done",
        "a4_done",
        "a4_source",
        "a5_pin_images_found",
        "a5_pin_variants_found",
        "a5_done",
        "a6_done",
        "a7_done",
    ]

    out_csv = BASE / "pipeline-data" / "batch-table.csv"
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            rr = dict(r)
            # normalize arrays for CSV
            v = rr.get("a5_pin_variants_found")
            if isinstance(v, list):
                rr["a5_pin_variants_found"] = ",".join(str(x) for x in v)
            w.writerow({k: rr.get(k, "") for k in cols})

    out_md = BASE / "pipeline-data" / "batch-table.md"
    # Markdown table (first 50 rows; already 50)
    md_lines = []
    md_lines.append(f"# Batch Table ({batch.get('batch_created','')})")
    md_lines.append("")
    md_lines.append(f"- rows: {len(rows)}")
    md_lines.append(f"- source: `{batch.get('source','')}`")
    md_lines.append("")
    md_lines.append("| row | slug | cat | a3 | a4 | pins | pin vars | a5 |")
    md_lines.append("|---:|---|---|---|---|---:|---|---|")
    for r in rows:
        md_lines.append(
            "| {row} | {slug} | {cat} | {a3} | {a4} | {pins} | {vars} | {a5} |".format(
                row=r.get("row", ""),
                slug=r.get("a1_slug", ""),
                cat=r.get("a1_category", ""),
                a3="✅" if r.get("a3_done") else "—",
                a4="✅" if r.get("a4_done") else "—",
                pins=r.get("a5_pin_images_found", 0) or 0,
                vars=",".join(str(x) for x in (r.get("a5_pin_variants_found") or [])),
                a5="✅" if r.get("a5_done") else "—",
            )
        )
    out_md.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    print(f"Wrote: {out_csv}")
    print(f"Wrote: {out_md}")


if __name__ == "__main__":
    main()

