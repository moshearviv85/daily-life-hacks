import os
import json
import csv

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "pipeline-data")
CONTENT_TRACKER_FILE = os.path.join(DATA_DIR, "content-tracker.json")
ROUTER_MAPPING_FILE = os.path.join(DATA_DIR, "router-mapping.json")
PINS_FILE = os.path.join(DATA_DIR, "pins.json")
ARTICLES_DIR = os.path.join(BASE_DIR, "src", "data", "articles")
PINS_IMG_DIR = os.path.join(BASE_DIR, "public", "images", "pins")
OUTPUT_CSV = os.path.join(DATA_DIR, "pins-export.csv")

def load_json(filepath, default_val):
    if not os.path.exists(filepath):
        return default_val
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load {filepath} - {e}")
        return default_val

def get_board(slug, category):
    slug_lower = slug.lower()
    breakfast_keywords = ["breakfast", "smoothie", "oat", "snack", "granola", "yogurt", "morning"]
    if any(kw in slug_lower for kw in breakfast_keywords):
        return "Healthy Breakfast, Smoothies and Snacks"
    elif category == "recipes":
        return "High Fiber Dinner and Gut Health Recipes"
    else:
        return "Gut Health Tips and Nutrition Charts"

def main():
    print("Starting export-publer.py...")
    
    tracker_data = load_json(CONTENT_TRACKER_FILE, [])
    router_mapping = load_json(ROUTER_MAPPING_FILE, {})
    pins_data = load_json(PINS_FILE, [])
    
    # Create pins lookup by slug
    pins_lookup = {}
    for p in pins_data:
        if "slug" in p:
            pins_lookup[p["slug"]] = p

    # Build CSV rows
    csv_rows = []
    
    # Track stats
    included_articles = 0
    skipped_articles = 0
    board_counts = {
        "High Fiber Dinner and Gut Health Recipes": 0,
        "Healthy Breakfast, Smoothies and Snacks": 0,
        "Gut Health Tips and Nutrition Charts": 0
    }
    
    total_articles = len(tracker_data)
    
    for idx, item in enumerate(tracker_data, 1):
        slug = item.get("slug")
        if not slug:
            continue
            
        category = item.get("category", "nutrition")
        article_path = os.path.join(ARTICLES_DIR, f"{slug}.md")
        
        if not os.path.exists(article_path):
            skipped_articles += 1
            print(f"[{idx}/{total_articles}] {slug} - Skipped (markdown file not found)")
            continue
            
        variants = ["v1", "v2", "v3", "v4"]
        
        # Check mapping data
        slug_mapping = router_mapping.get(slug, {})
        
        # Check pins data
        pin_info = pins_lookup.get(slug, {})
        
        valid_variants_found = False
        
        for v in variants:
            image_filename = f"{slug}_{v}.jpg"
            image_path = os.path.join(PINS_IMG_DIR, image_filename)
            
            if not os.path.exists(image_path):
                continue
                
            valid_variants_found = True
            
            # Title
            variant_data = slug_mapping.get(v, {})
            title = variant_data.get("title") or item.get("pin_title") or slug
            
            # Destination URL
            url_slug = variant_data.get("url_slug") or f"{slug}-{v}"
            destination_url = f"https://www.daily-life-hacks.com/{url_slug}"
            
            # Description
            desc = pin_info.get("description")
            hashtags = pin_info.get("hashtags", "")
            if desc:
                if hashtags and hashtags not in desc:
                    desc = f"{desc} {hashtags}".strip()
            else:
                desc = item.get("description", "")
            
            # Board
            board = get_board(slug, category)
            board_counts[board] = board_counts.get(board, 0) + 1
            
            # Alt text
            alt_text = pin_info.get("alt_text") or f"{title} - healthy {category} tips"
            
            csv_rows.append({
                "image_filename": image_filename,
                "pin_title": title,
                "description": desc,
                "destination_url": destination_url,
                "board": board,
                "alt_text": alt_text
            })
            
        if valid_variants_found:
            included_articles += 1
            print(f"[{idx}/{total_articles}] {slug} - Included")
        else:
            skipped_articles += 1
            print(f"[{idx}/{total_articles}] {slug} - Skipped (no pin images found)")
            
    # Write CSV
    tmp_csv = OUTPUT_CSV + ".tmp"
    headers = ["image_filename", "pin_title", "description", "destination_url", "board", "alt_text"]
    
    try:
        with open(tmp_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers, quoting=csv.QUOTE_ALL)
            writer.writeheader()
            writer.writerows(csv_rows)
        os.replace(tmp_csv, OUTPUT_CSV)
    except Exception as e:
        print(f"Error writing CSV: {e}")
        if os.path.exists(tmp_csv):
            os.remove(tmp_csv)
            
    print(f"\nExport complete: {len(csv_rows)} pins -> pipeline-data/pins-export.csv")
    print(f"  Boards: Dinner/Gut: {board_counts['High Fiber Dinner and Gut Health Recipes']} | Breakfast: {board_counts['Healthy Breakfast, Smoothies and Snacks']} | Nutrition: {board_counts['Gut Health Tips and Nutrition Charts']}")
    print(f"  Articles: {included_articles} included, {skipped_articles} skipped")

if __name__ == "__main__":
    main()
