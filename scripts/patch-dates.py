import os
import json
import random
import re
from datetime import datetime, timedelta

def get_random_date(start_date, end_date):
    time_between_dates = end_date - start_date
    days_between_dates = time_between_dates.days
    if days_between_dates <= 0:
        return start_date
    random_number_of_days = random.randrange(days_between_dates)
    return start_date + timedelta(days=random_number_of_days)

def main():
    tracker_path = "pipeline-data/content-tracker.json"
    if not os.path.exists(tracker_path):
        print("Tracker not found.")
        return

    with open(tracker_path, 'r', encoding='utf-8') as f:
        tracker = json.load(f)

    start_date = datetime(2025, 12, 15)
    end_date = datetime(2026, 2, 22)

    patched_count = 0

    for item in tracker:
        # We only care about randomizing the dates for items that are being worked on or finished
        status = item.get('status')
        if status in ['DRAFTED', 'PASSED_QC', 'FAILED_QC', 'PUBLISHED'] or item.get('draft_path'):
            rand_date = get_random_date(start_date, end_date).strftime('%Y-%m-%d')
            item['date_created'] = rand_date
            
            # Now patch the markdown files if they exist
            paths_to_check = [
                item.get('draft_path', '') if item.get('draft_path') else '',
                f"src/data/articles/{item['slug']}.md"
            ]
            
            for p in paths_to_check:
                if p and os.path.exists(p):
                    with open(p, 'r', encoding='utf-8') as file:
                        content = file.read()
                    # replace the date field in the yaml frontmatter
                    new_content = re.sub(r'(?m)^date:\s*\d{4}-\d{2}-\d{2}', f'date: {rand_date}', content)
                    with open(p, 'w', encoding='utf-8') as file:
                        file.write(new_content)
            
            patched_count += 1

    with open(tracker_path, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)
        
    print(f"Dates randomized successfully for {patched_count} articles tracked to the last 2 months.")

if __name__ == "__main__":
    main()
