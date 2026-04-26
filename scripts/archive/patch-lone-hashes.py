import glob
import re

DRAFTS_DIR = "pipeline-data/drafts"
files = glob.glob(f"{DRAFTS_DIR}/*.md")

total_removed = 0
for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        lines = fh.readlines()

    new_lines = [l for l in lines if l.strip() != '#']
    removed = len(lines) - len(new_lines)

    if removed > 0:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.writelines(new_lines)
        print(f"  Cleaned {removed} lone # from {f}")
        total_removed += removed

print(f"\nDone. Removed {total_removed} lone # lines total.")
