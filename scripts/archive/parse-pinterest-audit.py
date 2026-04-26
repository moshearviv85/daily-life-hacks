"""
Parse Pinterest audit data: filter only our site pins,
map keyword slugs to actual article slugs, compare with local inventory.
"""

import json, re, os
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent

# Re-parse raw pins to filter by domain
audit = json.loads((BASE / "pipeline-data" / "pinterest-published-audit.json").read_text(encoding="utf-8"))

# Our site's article slugs
articles_dir = BASE / "src" / "data" / "articles"
our_slugs = {p.stem for p in articles_dir.glob("*.md")}

# Filter: only pins linking to our domain
our_pins = {}
keyword_pins = {}  # slug variants that don't match exactly

for slug, info in audit["slugs"].items():
    if "/" in slug or slug.startswith("campaign") or slug.startswith("search"):
        continue
    if slug.startswith("(") or len(slug) < 5:
        continue

    count = len(info) if isinstance(info, list) else info.get("count", 0) if isinstance(info, dict) else 0

    if slug in our_slugs:
        our_pins[slug] = count
    else:
        keyword_pins[slug] = count

# Try to map keyword slugs to actual articles
slug_mapping = {}
for ks in keyword_pins:
    for real_slug in our_slugs:
        if real_slug in ks or ks in real_slug:
            slug_mapping[ks] = real_slug
            break

# Merge mapped pins
for ks, real in slug_mapping.items():
    our_pins[real] = our_pins.get(real, 0) + keyword_pins[ks]

# Remaining unmapped keyword slugs
unmapped = {k: v for k, v in keyword_pins.items() if k not in slug_mapping}

print(f"=== PINTEREST AUDIT RESULTS ===")
print(f"Total pins on account: {audit['total_pins']}")
print(f"Our site pins (matched): {sum(our_pins.values())}")
print(f"Our articles with pins: {len(our_pins)}")
print()

print("=== ARTICLES ALREADY ON PINTEREST ===")
for s in sorted(our_pins.keys()):
    print(f"  {s} ({our_pins[s]} pins)")

print(f"\n=== KEYWORD SLUGS MAPPED TO ARTICLES ===")
for ks, real in sorted(slug_mapping.items()):
    print(f"  {ks} -> {real}")

print(f"\n=== UNMAPPED KEYWORD SLUGS (possibly external) ===")
for s in sorted(unmapped.keys()):
    print(f"  {s} ({unmapped[s]} pins)")

# Compare with local inventory
not_on_pinterest = sorted(our_slugs - set(our_pins.keys()))
print(f"\n=== ARTICLES NOT YET ON PINTEREST ({len(not_on_pinterest)}) ===")
for s in not_on_pinterest:
    pin_count = len(list((BASE / "public" / "images" / "pins").glob(f"{s}_v*.jpg")))
    marker = f"({pin_count} pin images ready)" if pin_count > 0 else "(NO pin images)"
    print(f"  {s} {marker}")

# Save clean report
report = {
    "published_on_pinterest": sorted(our_pins.keys()),
    "published_pin_count": our_pins,
    "not_on_pinterest": not_on_pinterest,
    "not_on_pinterest_with_images": [
        s for s in not_on_pinterest
        if len(list((BASE / "public" / "images" / "pins").glob(f"{s}_v*.jpg"))) > 0
    ],
    "keyword_slug_mapping": slug_mapping,
    "unmapped_external": sorted(unmapped.keys()),
}

out_path = BASE / "pipeline-data" / "pinterest-clean-audit.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f"\nSaved clean report: {out_path}")
