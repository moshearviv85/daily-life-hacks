"""
Fetch all published pins from Pinterest API and extract slugs.
"""

import json, re, sys
from urllib.request import Request, urlopen
from urllib.parse import urlencode

ACCESS_TOKEN = sys.argv[1] if len(sys.argv) > 1 else ""

if not ACCESS_TOKEN:
    print("Usage: python pinterest-audit-local.py <access_token>")
    sys.exit(1)

def fetch_all_pins():
    all_pins = []
    bookmark = None
    page = 0

    while True:
        page += 1
        url = "https://api.pinterest.com/v5/pins?page_size=250"
        if bookmark:
            url += f"&bookmark={bookmark}"

        req = Request(url, headers={"Authorization": f"Bearer {ACCESS_TOKEN}"})
        with urlopen(req) as resp:
            data = json.loads(resp.read().decode())

        items = data.get("items", [])
        all_pins.extend(items)
        print(f"  Page {page}: {len(items)} pins (total so far: {len(all_pins)})")

        bookmark = data.get("bookmark")
        if not bookmark or not items or page > 50:
            break

    return all_pins

print("Fetching all pins from Pinterest API...")
pins = fetch_all_pins()
print(f"\nTotal pins found: {len(pins)}")

slug_map = {}
for pin in pins:
    link = pin.get("link", "")
    if not link:
        continue
    path = re.sub(r"^https?://[^/]+/", "", link).strip("/")
    slug = path.split("?")[0]
    if not slug:
        continue
    if slug not in slug_map:
        slug_map[slug] = []
    slug_map[slug].append({
        "pin_id": pin.get("id", ""),
        "title": pin.get("title", ""),
        "created_at": pin.get("created_at", ""),
    })

slugs = sorted(slug_map.keys())
print(f"Unique article slugs: {len(slugs)}\n")

print("=== PUBLISHED ON PINTEREST ===")
for s in slugs:
    print(f"  {s} ({len(slug_map[s])} pins)")

output = {
    "total_pins": len(pins),
    "unique_slugs": len(slugs),
    "slug_list": slugs,
    "slugs": slug_map,
}

with open("pipeline-data/pinterest-published-audit.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\nSaved to pipeline-data/pinterest-published-audit.json")
