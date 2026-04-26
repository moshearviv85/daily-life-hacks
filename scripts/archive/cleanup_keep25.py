import os
import json
import glob

PROJECT_DIR = "."
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
DRAFTS_DIR = os.path.join(PROJECT_DIR, "pipeline-data", "drafts")
ARTICLES_DIR = os.path.join(PROJECT_DIR, "src", "data", "articles")

def main():
    if not os.path.exists(TRACKER_FILE):
        return
        
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)
        
    # Get all items that have drafts
    passed_items = [item for item in tracker if item.get('status') in ['PASSED_QC', 'DRAFTED', 'FAILED_QC', 'PUBLISHED'] or item.get('draft_path')]
    
    # Identify the LAST 25 to KEEP
    items_to_keep = passed_items[-25:]
    ids_to_keep = set([i['id'] for i in items_to_keep])
    
    reset_count = 0
    deleted_files = 0
    
    for item in tracker:
        if item['id'] not in ids_to_keep and item.get('status') not in ['IDEATED']:
            # Reset the item
            slug = item['slug']
            
            # Delete from drafts
            draft_file = os.path.join(DRAFTS_DIR, f"{slug}.md")
            if os.path.exists(draft_file):
                os.remove(draft_file)
                deleted_files += 1
                
            # Delete from articles
            article_file = os.path.join(ARTICLES_DIR, f"{slug}.md")
            if os.path.exists(article_file):
                os.remove(article_file)
                deleted_files += 1
                
            item['status'] = 'IDEATED'
            item['draft_path'] = None
            item['qc_notes'] = ""
            item.pop('article_title', None)
            item['published'] = False
            item['date_created'] = ""
            
            reset_count += 1
            
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)
        
    print(f"✅ Reset {reset_count} old/test items back to IDEATED.")
    print(f"🗑️ Deleted {deleted_files} physical markdown files.")
    print(f"🎯 Kept exactly {len(items_to_keep)} real articles (the final 25 in the list).")

if __name__ == "__main__":
    main()
