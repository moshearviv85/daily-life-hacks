import os
import json
import shutil

PROJECT_DIR = "."
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
DEST_DIR = os.path.join(PROJECT_DIR, "src", "data", "articles")

def main():
    print("🚀 Running Fast Publisher: Moving PASSED_QC articles to live Astro content directory...")
    os.makedirs(DEST_DIR, exist_ok=True)
    
    if not os.path.exists(TRACKER_FILE):
        print("Tracker file missing.")
        return

    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)

    ready_items = [item for item in tracker if item.get('status') == 'PASSED_QC']
    
    if not ready_items:
        print("ℹ️ No articles in PASSED_QC status to publish.")
        return

    print(f"\n📦 Publishing {len(ready_items)} articles to src/data/articles/")
    published_count = 0
    
    for item in ready_items:
        src_path = os.path.join(PROJECT_DIR, item.get('draft_path', ''))
        
        if not os.path.exists(src_path):
            print(f"⚠️ Warning: Draft file missing at {src_path}. Skipping.")
            continue
            
        dest_path = os.path.join(DEST_DIR, f"{item['slug']}.md")
        
        # Move the markdown file
        try:
            shutil.copy2(src_path, dest_path)
            item['status'] = 'PUBLISHED'
            item['published'] = True
            published_count += 1
            print(f"✅ Published to site: {item['slug']}")
        except Exception as e:
            print(f"❌ Failed to copy {item['slug']}: {e}")

    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)
        
    print(f"\n🎉 Successfully published {published_count} articles into Astro.")

if __name__ == "__main__":
    main()
