"""
Sync tracker with existing drafts, run QC, publish passing articles.
One-shot script to get 25 articles live.
"""
import os, json, re, glob, shutil

PROJECT_DIR = "."
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
DRAFTS_DIR = os.path.join(PROJECT_DIR, "pipeline-data", "drafts")
DEST_DIR = os.path.join(PROJECT_DIR, "src", "data", "articles")

BANNED_WORDS = [
    "game-changer", "game changer", "powerhouse", "let's be real", "enter the",
    "whether you", "look no further", "the secret to", "it's no secret", "delve into",
    "moreover", "furthermore", "in conclusion", "it's important to note", "crucial",
    "testament", "tapestry", "symphony", "unlock", "elevate", "bursting with",
    "superfood", "guilt-free", "a staple", "I was skeptical at first",
    "dive into", "revolutionize", "take it to the next level", "mouthwatering"
]

BANNED_ENDINGS = [
    "enjoy!", "happy cooking", "happy eating", "give it a try", "your gut will thank you",
    "so, there you have it", "give it a whirl"
]

MEDICAL_RISK_WORDS = [
    "cure ", "cures ", "prevent ", "prevents ", "heal ", "heals ", "treat ", "treats ",
    "disease", "diagnose", "prescription", "consult your doctor", "medical advice",
    "detox", "cleanse", "burns fat", "melt fat", "miracle diet", "lose weight fast"
]

REQUIRED_FIELDS = ["title", "excerpt", "category", "tags", "image", "imageAlt", "date"]
VALID_CATEGORIES = ["nutrition", "recipes"]
VALID_DIFFICULTIES = ["Easy", "Medium", "Hard"]

def parse_frontmatter(content):
    """Parse YAML frontmatter from markdown content."""
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None, content
    fm_text = parts[1].strip()
    body = parts[2]

    fm = {}
    current_key = None
    current_list = None

    for line in fm_text.split('\n'):
        stripped = line.strip()
        if not stripped:
            continue

        # List item
        if stripped.startswith('- ') and current_key:
            if current_list is None:
                current_list = []
            val = stripped[2:].strip().strip('"').strip("'")
            current_list.append(val)
            fm[current_key] = current_list
            continue

        # Key-value pair
        if ':' in stripped and not stripped.startswith('-'):
            if current_list is not None:
                current_list = None

            colon_idx = stripped.index(':')
            key = stripped[:colon_idx].strip()
            val = stripped[colon_idx+1:].strip()
            current_key = key

            # Handle inline arrays like ["tag1", "tag2"]
            if val.startswith('[') and val.endswith(']'):
                inner = val[1:-1]
                items = [x.strip().strip('"').strip("'") for x in inner.split(',') if x.strip()]
                fm[key] = items
                current_list = None
                continue

            # Remove quotes
            if val.startswith('"') and val.endswith('"'):
                val = val[1:-1]
            elif val.startswith("'") and val.endswith("'"):
                val = val[1:-1]

            if val == '' or val == '[]':
                current_list = []
                fm[key] = []
            else:
                fm[key] = val
                current_list = None

    return fm, body

def check_frontmatter(fm, filepath):
    """Validate frontmatter against Astro schema."""
    issues = []

    if fm is None:
        return ["Frontmatter not properly formatted"]

    # Required fields
    for field in REQUIRED_FIELDS:
        if field not in fm or not fm[field]:
            issues.append(f"Missing required field: {field}")

    # Category validation
    cat = fm.get('category', '')
    if cat not in VALID_CATEGORIES:
        issues.append(f"Invalid category: '{cat}' (must be nutrition or recipes)")

    # Tags must be list
    tags = fm.get('tags', '')
    if not isinstance(tags, list):
        issues.append(f"Tags must be an array, got: {type(tags).__name__}")

    # Title should not contain markdown
    title = fm.get('title', '')
    if '**' in str(title) or '__' in str(title):
        issues.append(f"Title contains markdown formatting: {title}")

    # Numeric fields for recipes
    if cat == 'recipes':
        for num_field in ['servings', 'calories']:
            val = fm.get(num_field)
            if val is not None:
                try:
                    float(str(val))
                except ValueError:
                    issues.append(f"{num_field} must be a number, got: '{val}'")

        diff = fm.get('difficulty')
        if diff and diff not in VALID_DIFFICULTIES:
            issues.append(f"Invalid difficulty: '{diff}'")

    return issues

def check_content_qc(body, is_recipe):
    """QC check on article body."""
    issues = []
    word_count = len(body.split())

    target_wc = 600 if is_recipe else 800
    if word_count < target_wc:
        issues.append(f"Low word count: {word_count} (target {target_wc}+)")

    lower_body = body.lower()
    for banned in BANNED_WORDS:
        if re.search(r'\b' + re.escape(banned.lower()) + r'\b', lower_body):
            issues.append(f"Banned phrase: '{banned}'")

    for risk in MEDICAL_RISK_WORDS:
        if re.search(r'\b' + re.escape(risk.lower()) + r'\b', lower_body):
            issues.append(f"MEDICAL RISK: '{risk}'")

    for ending in BANNED_ENDINGS:
        if re.search(re.escape(ending.lower()), lower_body[-300:]):
            issues.append(f"Banned ending: '{ending}'")

    return issues

def main():
    # Load tracker
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)

    # Build slug -> tracker index map
    slug_map = {}
    for i, item in enumerate(tracker):
        slug_map[item['slug']] = i

    # Find all draft files
    draft_files = glob.glob(os.path.join(DRAFTS_DIR, "*.md"))
    print(f"Found {len(draft_files)} draft files\n")

    # STEP 1: Sync tracker with existing drafts
    print("=" * 50)
    print("STEP 1: Syncing tracker with draft files")
    print("=" * 50)
    synced = 0
    for df in draft_files:
        slug = os.path.splitext(os.path.basename(df))[0]
        if slug in slug_map:
            idx = slug_map[slug]
            tracker[idx]['status'] = 'DRAFTED'
            tracker[idx]['draft_path'] = os.path.relpath(df, PROJECT_DIR).replace('/', '\\')
            synced += 1
        else:
            print(f"  WARNING: No tracker entry for {slug}")
    print(f"  Synced {synced} entries\n")

    # STEP 2: Run QC on all drafts
    print("=" * 50)
    print("STEP 2: Running QC")
    print("=" * 50)
    passed = 0
    failed = 0

    for df in draft_files:
        slug = os.path.splitext(os.path.basename(df))[0]

        with open(df, 'r', encoding='utf-8') as f:
            content = f.read()

        fm, body = parse_frontmatter(content)
        is_recipe = (fm or {}).get('category') == 'recipes'

        # Combined QC
        issues = check_frontmatter(fm, df) + check_content_qc(body, is_recipe)

        if slug in slug_map:
            idx = slug_map[slug]
            if issues:
                tracker[idx]['status'] = 'FAILED_QC'
                tracker[idx]['qc_notes'] = "; ".join(issues)
                failed += 1
                print(f"\n  FAILED: {slug}")
                for issue in issues:
                    print(f"    - {issue}")
            else:
                tracker[idx]['status'] = 'PASSED_QC'
                tracker[idx]['qc_notes'] = "Clean"
                passed += 1
                print(f"  PASSED: {slug}")

    print(f"\n  QC Results: {passed} passed, {failed} failed\n")

    # STEP 3: Publish passing articles
    print("=" * 50)
    print("STEP 3: Publishing passed articles")
    print("=" * 50)
    os.makedirs(DEST_DIR, exist_ok=True)
    published = 0

    for item in tracker:
        if item.get('status') != 'PASSED_QC':
            continue

        src_path = item.get('draft_path', '')
        if not src_path or not os.path.exists(src_path):
            print(f"  SKIP (no file): {item['slug']}")
            continue

        dest_path = os.path.join(DEST_DIR, f"{item['slug']}.md")
        shutil.copy2(src_path, dest_path)
        item['status'] = 'PUBLISHED'
        item['published'] = True
        published += 1
        print(f"  Published: {item['slug']}")

    # Save tracker
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 50}")
    print(f"DONE: {published} articles published to src/data/articles/")
    print(f"{'=' * 50}")

if __name__ == '__main__':
    main()
