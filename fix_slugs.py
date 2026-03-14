import json
import os

files_to_check = ['c:/Users/offic/Desktop/dlh-fresh/pipeline-data/pins.json', 'c:/Users/offic/Desktop/dlh-fresh/pipeline-data/content-tracker.json']
replacements = {
    'for-constipation-relief': 'for-gut-health',
    'for-natural-relief': 'for-better-digestion',
    'for-bloating-relief': 'for-healthy-digestion',
    'for-constipation': 'for-gut-health'
}

for filepath in files_to_check:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        changed = False
        for i, item in enumerate(data):
            if 'slug' in item and isinstance(item['slug'], str):
                old_slug = item['slug']
                new_slug = old_slug
                for old_str, new_str in replacements.items():
                    if old_str in new_slug:
                        new_slug = new_slug.replace(old_str, new_str)
                
                if old_slug != new_slug:
                    data[i]['slug'] = new_slug
                    print(f'Changed {old_slug} -> {new_slug} in {os.path.basename(filepath)}')
                    changed = True
                    
        if changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print(f'Saved {os.path.basename(filepath)}')
        else:
            print(f'No changes for {os.path.basename(filepath)}')

