import openpyxl
import json
import os
import re
from datetime import datetime

# ==========================================
# CONFIGURATION — Edit these values
# ==========================================
PROJECT_DIR = "."  # root of the Astro project
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
EXCEL_FILE = os.path.join(PROJECT_DIR, "..", "diet-website.xlsx") # As it was placed in the parent earlier
# If it's in dlh-fresh, adjust to:
# EXCEL_FILE = os.path.join(PROJECT_DIR, "diet-website.xlsx")
# ==========================================

def create_slug(keyword):
    """Generate a clean slug from a string."""
    if not keyword:
        return ""
    slug = str(keyword).lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug)
    return slug

def determine_category(board_name, title):
    """Determine category based on board name and title rules."""
    board_name = str(board_name).strip()
    title_lower = str(title).lower()
    
    if board_name == "Gut Health Tips and Nutrition Charts":
        return "nutrition"
    elif board_name == "High Fiber Dinner and Gut Health Recipes":
        return "recipes"
    elif board_name == "Healthy Breakfast, Smoothies and Snacks":
        recipe_keywords = ["recipe", "meal", "bowl", "smoothie bowl", "toast", "pancake", "oats"]
        if any(keyword in title_lower for keyword in recipe_keywords):
            return "recipes"
        else:
            return "nutrition"
    
    return "nutrition" # Fallback

def main():
    print("🚀 Running 1-research.py: Parsing Excel and generating content tracker...")
    
    # Ensure pipeline directories exist
    os.makedirs(os.path.dirname(TRACKER_FILE), exist_ok=True)
    os.makedirs(os.path.join(PROJECT_DIR, "pipeline-data", "drafts"), exist_ok=True)
    os.makedirs(os.path.join(PROJECT_DIR, "pipeline-data", "validated"), exist_ok=True)
    
    # Try parent directory first, then root
    excel_path = EXCEL_FILE
    if not os.path.exists(excel_path):
        excel_path = os.path.join(PROJECT_DIR, "diet-website.xlsx")
    
    if not os.path.exists(excel_path):
        print(f"❌ Error: Could not find Excel file at {excel_path}")
        return

    try:
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        sheet = wb.active
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")
        return

    # Map column headers to indices
    headers = {cell.value.lower().strip() if cell.value else "": i for i, cell in enumerate(sheet[1])}
    
    # Note: the user spec mentioned 'discription' instead of 'description'
    desc_col = headers.get('discription') or headers.get('description')
    
    if desc_col is None:
        print("❌ Error: Could not find 'discription' or 'description' column.")
        return

    required_cols = ['pin title', 'longtail keyword', 'hashtags', 'alt text', 'board']
    for col in required_cols:
        if headers.get(col) is None:
             print(f"❌ Error: Could not find required column '{col}'. Available: {list(headers.keys())}")
             return

    tracker_data = []
    current_id = 101
    today_str = datetime.now().strftime("%Y-%m-%d")

    for row in sheet.iter_rows(min_row=2, values_only=True):
        keyword = row[headers['longtail keyword']]
        if not keyword:
            continue # Skip empty rows
            
        pin_title = row[headers['pin title']] or ""
        desc = row[desc_col] or ""
        raw_hashtags = str(row[headers['hashtags']] or "")
        alt_text = row[headers['alt text']] or ""
        board = row[headers['board']] or ""

        # Process fields
        category = determine_category(board, pin_title)
        slug = create_slug(keyword)
        
        # Clean hashtags: remove #, split by space or comma, filter empty
        clean_hashtags = [h.strip().replace('#', '') for h in re.split(r'[,\s]+', raw_hashtags) if h.strip()]

        item = {
            "id": current_id,
            "category": category,
            "keyword": str(keyword).strip(),
            "pin_title": str(pin_title).strip(),
            "description": str(desc).strip(),
            "hashtags": clean_hashtags,
            "alt_text": str(alt_text).strip(),
            "slug": slug,
            "status": "IDEATED",
            "date_created": today_str,
            "article_title": None,
            "draft_path": None,
            "validated_path": None,
            "image_web": None,
            "image_pins": [],
            "published": False,
            "deployed": False
        }
        
        tracker_data.append(item)
        current_id += 1

    # Save to JSON
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Successfully processed {len(tracker_data)} rows from Excel.")
    print(f"✅ Created tracker file at: {TRACKER_FILE}")
    
    # Output some quick stats
    cat_counts = {}
    for item in tracker_data:
        cat = item['category']
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
        
    print("\n📊 Category Breakdown:")
    for cat, count in cat_counts.items():
        print(f"   - {cat}: {count}")

if __name__ == "__main__":
    main()
