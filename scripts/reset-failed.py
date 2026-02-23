import os
import json

TRACKER_FILE = "pipeline-data/content-tracker.json"

def main():
    print("🔄 Resetting FAILED_QC articles back to IDEATED...")
    
    if not os.path.exists(TRACKER_FILE):
        print("Tracker file missing.")
        return

    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)
        
    reset_count = 0
    for item in tracker:
        if item.get('status') == 'FAILED_QC':
            item['status'] = 'IDEATED'
            item['qc_notes'] = ""
            reset_count += 1
            
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)
        
    print(f"✅ Reset {reset_count} failed articles back into the queue. Run scripts/2-generate.py to re-generate them.")

if __name__ == "__main__":
    main()
