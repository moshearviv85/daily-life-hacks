import os
import json
import yaml
import re

# ==========================================
# CONFIGURATION — Edit these values
# ==========================================
API_KEY = "YOUR_GOOGLE_API_KEY_HERE"  # Kept in case we add auto-fix later
PROJECT_DIR = "."  # root of the Astro project
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
DRAFTS_DIR = os.path.join(PROJECT_DIR, "pipeline-data", "drafts")
VALIDATED_DIR = os.path.join(PROJECT_DIR, "pipeline-data", "validated")
# ==========================================

BANNED_PHRASES = [
    "cures", "miracle", "guaranteed to", "proven to cure",
    "lose weight fast", "burn belly fat", "detox", "cleanse"
]

def load_tracker():
    if not os.path.exists(TRACKER_FILE):
        print(f"❌ Error: Tracker file not found at {TRACKER_FILE}.")
        return None
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_tracker(data):
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def parse_markdown_file(filepath):
    """Simple parser to extract YAML frontmatter and Markdown body."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match frontmatter between --- and ---
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)
    if not match:
        return None, content, ["Frontmatter missing or invalid format (needs ---)"]
        
    yaml_text = match.group(1)
    body_text = match.group(2)
    
    try:
        frontmatter = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        return None, body_text, [f"YAML Parsing Error: {exc}"]
        
    return frontmatter, body_text, []

def validate_draft(item):
    errors = []
    draft_path = os.path.join(PROJECT_DIR, item.get('draft_path', ''))
    
    if not os.path.exists(draft_path):
        return [f"Draft file not found at {draft_path}"]
        
    frontmatter, body, parse_errors = parse_markdown_file(draft_path)
    if parse_errors:
        return parse_errors
        
    if not isinstance(frontmatter, dict):
        return ["Frontmatter is not a valid dictionary"]

    # 1. Check title & excerpt lengths
    title = frontmatter.get('title', '')
    if not title: errors.append("Missing title")
    elif len(str(title)) > 80: errors.append(f"Title too long ({len(str(title))} > 80 chars)")

    excerpt = frontmatter.get('excerpt', '')
    if not excerpt: errors.append("Missing excerpt")
    elif len(str(excerpt)) > 200: errors.append(f"Excerpt too long ({len(str(excerpt))} > 200 chars)")

    # 2. Category & Tags
    cat = frontmatter.get('category')
    if cat not in ['nutrition', 'recipes']: errors.append("Category must be 'nutrition' or 'recipes'")
    
    tags = frontmatter.get('tags', [])
    if not isinstance(tags, list) or len(tags) < 2: errors.append("Tags must be a list with at least 2 items")

    # 3. Image path check
    expected_image = f"/images/{item['slug']}-main.jpg"
    if frontmatter.get('image') != expected_image:
        errors.append(f"Image path mismatch. Expected: {expected_image}, Got: {frontmatter.get('image')}")
        
    if not frontmatter.get('date'): errors.append("Missing date")

    # 4. Recipe specific checks
    if cat == 'recipes':
        recipe_fields = ['prepTime', 'cookTime', 'totalTime', 'servings', 'calories', 'difficulty', 'ingredients', 'steps']
        for field in recipe_fields:
            if field not in frontmatter:
                errors.append(f"Recipe missing required field: {field}")
                
        diff = frontmatter.get('difficulty')
        if diff not in ['Easy', 'Medium', 'Hard']:
            errors.append(f"Difficulty must be Easy, Medium, or Hard. Got: {diff}")
            
        if not isinstance(frontmatter.get('servings', ''), (int, float)):
            errors.append("Servings must be a number")
            
        if not isinstance(frontmatter.get('calories', ''), (int, float)):
            errors.append("Calories must be a number")
            
        ings = frontmatter.get('ingredients', [])
        if not isinstance(ings, list) or len(ings) < 3: errors.append("Ingredients must be a list with at least 3 items")
        
        steps = frontmatter.get('steps', [])
        if not isinstance(steps, list) or len(steps) < 3: errors.append("Steps must be a list with at least 3 items")

    # 5. Body Checks
    words = len(body.split())
    if words < 400: errors.append(f"Article body too short ({words} words < 400 minimum)")
    
    # URL check
    if re.search(r'http[s]?://', body):
        errors.append("Body contains URLs (banned)")
        
    # Banned phrases
    body_lower = body.lower()
    for phrase in BANNED_PHRASES:
        if phrase in body_lower:
            errors.append(f"Body contains banned phrase: '{phrase}'")

    return errors, words

def main():
    print("🚀 Running 3-validate.py: Checking drafts...")
    os.makedirs(VALIDATED_DIR, exist_ok=True)
    
    tracker = load_tracker()
    if not tracker: return

    for idx, item in enumerate(tracker):
        if item.get('status') == 'DRAFTED':
            print(f"\n{'━'*40}")
            print(f"Article {idx+1}/{len(tracker)}: {item['slug']}")
            print(f"Category: {item['category']}")
            print(f"Title: \"{item.get('article_title', item.get('pin_title'))}\"")
            
            errors, word_count = validate_draft(item)
            if isinstance(errors, tuple): # unpacking error
                errors, word_count = errors[0], 0
                
            print(f"Word count: {word_count}")
            print(f"{'━'*40}")

            if not errors:
                print("\n✅ All automated checks passed.")
                choice = input("\n[A]pprove  [R]eject  [V]iew full frontmatter  [S]kip for later\n> ").strip().upper()
                
                if choice == 'A':
                    draft_path = os.path.join(PROJECT_DIR, item['draft_path'])
                    validated_path = os.path.join(VALIDATED_DIR, f"{item['slug']}.md")
                    
                    # Read and write to copy
                    with open(draft_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    with open(validated_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                        
                    item['status'] = 'VALIDATED'
                    item['validated_path'] = os.path.relpath(validated_path, PROJECT_DIR)
                    print(f"✅ Approved and moved to {validated_path}")
                    
                elif choice == 'R':
                    item['status'] = 'IDEATED'
                    print("❌ Rejected. Set back to IDEATED status to be regenerated.")
                elif choice == 'V':
                    # Simplistic View
                    frontmatter, _, _ = parse_markdown_file(os.path.join(PROJECT_DIR, item['draft_path']))
                    print(yaml.dump(frontmatter))
                    input("Press Enter to continue without changing status...")
                # Skip does nothing
                
            else:
                print("\n❌ Issues found:")
                for i, err in enumerate(errors, 1):
                    print(f"  {i}. {err}")
                    
                choice = input("\n[R]eject  [S]kip\n> ").strip().upper()
                if choice == 'R':
                    item['status'] = 'IDEATED'
                    print("❌ Rejected. Set back to IDEATED status to be regenerated.")

            save_tracker(tracker)

    print("\n✅ Validation sweep complete.")

if __name__ == "__main__":
    main()
