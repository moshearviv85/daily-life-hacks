"""Remove hashtags from description fields in content-tracker.json"""
import json

TRACKER_FILE = "pipeline-data/content-tracker.json"

with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
    tracker = json.load(f)

fixed = 0
for item in tracker:
    desc = item.get('description', '')
    if '#' in desc:
        clean = desc.split('#')[0].strip()
        item['description'] = clean
        fixed += 1

with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
    json.dump(tracker, f, indent=2, ensure_ascii=False)

print(f"Cleaned hashtags from {fixed} descriptions.")
