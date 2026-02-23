import json
import os

TRACKER_FILE = "pipeline-data/content-tracker.json"
DRAFTS_DIR = "pipeline-data/drafts"
ARTICLES_DIR = "src/data/articles"

def main():
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)
        
    for item in tracker:
        item['status'] = 'IDEATED'
        item['draft_path'] = None
        item['qc_notes'] = ""
        item['published'] = False
        
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)
        
    for d in [DRAFTS_DIR, ARTICLES_DIR]:
        if os.path.exists(d):
            for f in os.listdir(d):
                if f.endswith('.md'):
                    os.remove(os.path.join(d, f))

if __name__ == "__main__":
    main()
