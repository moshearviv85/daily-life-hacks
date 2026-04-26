import csv

CSV_FILE = "pipeline-data/production-sheet.csv"
slug_to_update = "tuscan-white-bean-kale-soup-stovetop"

with open(CSV_FILE, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    rows = list(reader)

updated = False
for row in rows:
    if row.get("slug") == slug_to_update:
        row["qa_passed"] = "TRUE"
        row["publish_article_done"] = "TRUE"
        row["publish_article_date"] = "2026-04-12"
        row["pinterest_publish_done"] = "TRUE"
        updated = True
        break

if updated:
    with open(CSV_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print("Row updated successfully.")
else:
    print("Slug not found.")
