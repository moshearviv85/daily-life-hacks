import os
import csv

CSV_FILE = "pipeline-data/production-sheet.csv"

def check_images():
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    total = len(rows)
    fully_ready = 0
    partial = 0
    missing = 0

    print(f"{'Slug':<48} | {'Main':<4} | {'Ingr':<4} | {'Vid':<4} | {'Pins (v1-v5)'}")
    print("-" * 85)

    for row in rows:
        slug = row.get("slug", "").strip()
        
        # Paths
        main_path = os.path.join("public", "images", row.get("image_main_filename", "")) if row.get("image_main_filename") else ""
        ing_path = os.path.join("public", "images", "ingredients", row.get("image_ingredients_filename", "")) if row.get("image_ingredients_filename") else ""
        vid_path = os.path.join("public", "images", "video", row.get("image_video_filename", "")) if row.get("image_video_filename") else ""
        
        main_ok = os.path.exists(main_path) and os.path.isfile(main_path)
        ing_ok = os.path.exists(ing_path) and os.path.isfile(ing_path)
        vid_ok = os.path.exists(vid_path) and os.path.isfile(vid_path)
        
        pins_status = []
        pins_ok = 0
        for v in range(1, 6):
            pin_file = row.get(f"pin_v{v}_image_filename", "")
            if pin_file:
                pin_path = os.path.join("public", "images", "pins", pin_file)
                if os.path.exists(pin_path) and os.path.isfile(pin_path):
                    pins_status.append("V")
                    pins_ok += 1
                else:
                    pins_status.append("X")
            else:
                pins_status.append("-")
        
        # Status determination
        total_found = int(main_ok) + int(ing_ok) + int(vid_ok) + pins_ok
        
        if total_found == 8:
            fully_ready += 1
            status_char = "OK"
        elif total_found == 0:
            missing += 1
            status_char = "MISSING"
        else:
            partial += 1
            status_char = "PARTIAL"
            
        main_str = "V" if main_ok else "X"
        ing_str = "V" if ing_ok else "X"
        vid_str = "V" if vid_ok else "X"
        pins_str = "".join(pins_status)
        
        print(f"{slug[:46]:<48} |  {main_str}   |  {ing_str}   |  {vid_str}   | {pins_str} {status_char}")

    print("-" * 85)
    print(f"Total Topics in Production Sheet: {total}")
    print(f"Fully Ready (8/8 images): {fully_ready}")
    print(f"Partially Ready: {partial}")
    print(f"Completely Missing: {missing}")

if __name__ == "__main__":
    check_images()
