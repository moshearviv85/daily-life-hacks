import os
import json
import shutil

# ==========================================
# CONFIGURATION — Edit these values
# ==========================================
PROJECT_DIR = "."  # root of the Astro project
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
VALIDATED_DIR = os.path.join(PROJECT_DIR, "pipeline-data", "validated")
DEST_DIR = os.path.join(PROJECT_DIR, "src", "data", "articles")
# ==========================================

def load_tracker():
    if not os.path.exists(TRACKER_FILE):
        return None
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_tracker(data):
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def main():
    print("🚀 Running 5-publish.py: Moving validated articles to live Astro content directory...")
    os.makedirs(DEST_DIR, exist_ok=True)
    
    tracker = load_tracker()
    if not tracker: return

    ready_items = [item for item in tracker if item.get('status') == 'IMAGES_READY']
    
    if not ready_items:
        print("ℹ️ No articles in IMAGES_READY status to publish.")
        return

    print(f"\n📦 Ready to publish {len(ready_items)} articles to src/data/articles/")
    choice = input("Proceed? [Y/N]\n> ").strip().upper()
    
    if choice != 'Y':
        print("❌ Publishing cancelled.")
        return

    published_count = 0
    
    for item in ready_items:
        src_path = os.path.join(PROJECT_DIR, item.get('validated_path', ''))
        
        if not os.path.exists(src_path):
            print(f"⚠️ Warning: Validated file missing at {src_path}. Skipping.")
            continue
            
        dest_path = os.path.join(DEST_DIR, f"{item['slug']}.md")
        
        if os.path.exists(dest_path):
            confirm = input(f"⚠️ Warning: {dest_path} already exists. Overwrite? [Y/N]\n> ").strip().upper()
            if confirm != 'Y':
                print(f"⏭️ Skipped {item['slug']}")
                continue

        # Move the markdown file
        try:
            shutil.copy2(src_path, dest_path)
            item['status'] = 'PUBLISHED'
            item['published'] = True
            published_count += 1
            print(f"✅ Published: {item['slug']}")
        except Exception as e:
            print(f"❌ Failed to copy {item['slug']}: {e}")

    save_tracker(tracker)
    print(f"\n🎉 Successfully published {published_count} articles into Astro.")

if __name__ == "__main__":
    main()
