import os
import json
import subprocess
import time

PROJECT_DIR = "."
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")

def reset_failed_articles():
    print("\n🔄 Stage 1: Resetting FAILED_QC articles back into the queue...")
    if not os.path.exists(TRACKER_FILE):
        return
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)
        
    reset_count = 0
    for item in tracker:
        if item.get('status') == 'FAILED_QC':
            item['status'] = 'IDEATED'  # Send back to generation step
            item['qc_notes'] = ""
            reset_count += 1
            
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)
        
    print(f"   => Reset {reset_count} articles. They will be regenerated.\n")

def run_script(script_path):
    print(f"\n==============================================")
    print(f"▶️ RUNNING: {script_path}")
    print(f"==============================================\n")
    subprocess.run(["python", script_path], check=True)

def main():
    print("🤖 STARTING FULL CONTENT AUTOMATION PIPELINE 🤖")
    print("This script will run indefinitely until you stop it (Ctrl+C).")
    print("It handles: FAILED_QC reset -> Generation -> Quality Control -> Publishing.")
    
    # We run the loop. You can stick this in a cron job, or just run it once.
    # We will do a single pass run here. If you want a continuous loop, 
    # you can wrap this in `while True:` and add `time.sleep(3600)`.
    
    try:
        # Step 1: Put failed ones back into the queue
        reset_failed_articles()
        
        # Step 2: Generate Drafts (only grabs IDEATED status items)
        run_script("scripts/2-generate.py")
        
        # Step 3: Run the rigorous Quality Control
        run_script("scripts/4-qc.py")
        
        # Step 4: Publish ONLY the ones that passed QC
        run_script("scripts/publish_passed.py")
        
        print("\n✅ PIPELINE PASS COMPLETE.")
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Pipeline stopped due to an error in one of the scripts: {e}")
    except KeyboardInterrupt:
        print("\n🛑 Pipeline stopped manually.")

if __name__ == "__main__":
    main()
