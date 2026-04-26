import os
import json
import re
import glob

PROJECT_DIR = "."
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
DRAFTS_DIR = os.path.join(PROJECT_DIR, "pipeline-data", "drafts")

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
    "so, there you have it"
]

MEDICAL_RISK_WORDS = [
    "cure ", "cures ", "prevent ", "prevents ", "heal ", "heals ", "treat ", "treats ", 
    "disease", "diagnose", "prescription", "consult your doctor", "medical advice",
    "detox", "cleanse", "burns fat", "melt fat", "miracle diet", "lose weight fast"
]

def check_qc(filepath, is_recipe):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    issues = []
    
    # Check body length
    body_match = re.split(r'---', content)
    if len(body_match) >= 3:
        body = '---'.join(body_match[2:])
        word_count = len(body.split())
        
        target_wc = 600 if is_recipe else 800
        if word_count < target_wc:
            issues.append(f"Low word count: {word_count} (target {target_wc}+)")

        # Check banned words
        lower_body = body.lower()
        for banned in BANNED_WORDS:
            if re.search(r'\b' + re.escape(banned.lower()) + r'\b', lower_body):
                issues.append(f"Banned phrase used: '{banned}'")

        # Check medical / legal risk words
        for risk in MEDICAL_RISK_WORDS:
            if re.search(r'\b' + re.escape(risk.lower()) + r'\b', lower_body):
                issues.append(f"MEDICAL/LEGAL RISK phrase used: '{risk}'")

        # Check banned endings
        for ending in BANNED_ENDINGS:
            if re.search(re.escape(ending.lower()), lower_body[-300:]): # Check in last 300 chars
                issues.append(f"Call-to-action/banned ending used: '{ending}'")

    else:
        issues.append("Frontmatter not properly formatted")

    return issues

def main():
    if not os.path.exists(TRACKER_FILE):
        print("Tracker file not found.")
        return

    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)

    # Filter to only look at drafted, passed, or failed ones
    drafted = [item for item in tracker if item.get('status') in ['DRAFTED', 'PASSED_QC', 'FAILED_QC']]
    
    if not drafted:
        print("No articles with status DRAFTED, PASSED_QC, or FAILED_QC found to QC.")
        return

    print(f"Running QC on {len(drafted)} articles...")
    
    failed = 0
    passed = 0

    for item in drafted:
        draft_path = item.get('draft_path')
        if not draft_path or not os.path.exists(draft_path):
            print(f"[{item['slug']}] File missing: {draft_path}")
            issues = ["File missing"]
        else:
            is_recipe = item.get('category') == 'recipes'
            issues = check_qc(draft_path, is_recipe)

        if len(issues) > 0:
            print(f"\n❌ FAILED QC: {item['slug']}")
            for issue in issues:
                print(f"   - {issue}")
            failed += 1
            item['status'] = 'FAILED_QC'
            item['qc_notes'] = "; ".join(issues)
        else:
            print(f"✅ PASSED QC: {item['slug']}")
            passed += 1
            item['status'] = 'PASSED_QC'
            item['qc_notes'] = "Clean"

    # Save QC status
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)

    print(f"\nQC Complete. Passed: {passed} | Failed: {failed}")

if __name__ == '__main__':
    main()
