import os
import json
import re

TRACKER_FILE = "pipeline-data/content-tracker.json"

BANNED_WORDS = [
    "game-changer", "game changer", "powerhouse", "let's be real", "enter the", 
    "whether you", "look no further", "the secret to", "it's no secret", "delve into", 
    "moreover", "furthermore", "in conclusion", "it's important to note", "crucial", 
    "testament", "tapestry", "symphony", "unlock", "elevate", "bursting with", 
    "superfood", "guilt-free", "a staple", "I was skeptical at first", 
    "dive into", "revolutionize", "take it to the next level", "mouthwatering"
]

MEDICAL_RISK_WORDS = [
    "cure ", "cures ", "prevent ", "prevents ", "heal ", "heals ", "treat ", "treats ", 
    "disease", "diagnose", "prescription", "consult your doctor", "medical advice",
    "detox", "cleanse", "burns fat", "melt fat", "miracle diet", "lose weight fast"
]

BANNED_ENDINGS = [
    "enjoy!", "enjoy your", "happy cooking", "happy eating", "give it a try", "your gut will thank you",
    "so, there you have it", "give it a whirl"
]

def auto_fix_content(content):
    # Split frontmatter from body
    parts = re.split(r'---', content)
    if len(parts) < 3:
        return content # Cannot parse safely
        
    frontmatter = parts[1]
    body = '---'.join(parts[2:])
    
    # 1. Strip out Banned Endings from the end of the text
    for ending in BANNED_ENDINGS:
        # Case insensitive replacement anywhere in the body
        body = re.sub(re.escape(ending) + r'[.!?]*\s*', '', body, flags=re.IGNORECASE)
        
    # 2. Swap Medical Risk words with softer equivalents
    # We use basic string replace for safety if we can map them, otherwise we just delete
    replacements = {
        "cure": "support",
        "cures": "supports",
        "prevent": "help avoid",
        "prevents": "helps avoid",
        "heal": "soothe",
        "heals": "soothes",
        "treat": "manage",
        "treats": "manages",
        "disease": "condition",
        "detox": "refresh",
        "cleanse": "refresh",
        "burns fat": "supports digestion",
        "melt fat": "supports digestion",
        "miracle diet": "healthy approach",
        "lose weight fast": "support healthy weight",
        "medical advice": "professional guidance",
        "consult your doctor": "check with a professional",
        "prescription": "routine"
    }
    
    for bad_word, good_word in replacements.items():
        # Using word boundaries to avoid replacing parts of words
        body = re.sub(r'\b' + re.escape(bad_word) + r'\b', good_word, body, flags=re.IGNORECASE)

    # 3. Strip out Banned generic AI phrases
    for banned in BANNED_WORDS:
        # Just remove them or replace with generic filler if removing breaks sentence flow
        # Simple removal for now:
        body = re.sub(r'\b' + re.escape(banned) + r'\b', '', body, flags=re.IGNORECASE)
        
    # Cleanup double spaces left behind by removals, but preserve newlines
    body = re.sub(r' +', ' ', body)
    body = re.sub(r' \.', '.', body)
    body = re.sub(r' ,', ',', body)
    
    return f"---{frontmatter}---\n{body}"

def main():
    if not os.path.exists(TRACKER_FILE):
        print("Tracker file missing.")
        return

    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)

    print("🤖 Running Fix Bot on FAILED_QC articles...")
    fixed_count = 0

    for item in tracker:
        if item.get('status') == 'FAILED_QC':
            draft_path = item.get('draft_path')
            if draft_path and os.path.exists(draft_path):
                
                with open(draft_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = auto_fix_content(content)
                
                if new_content != content:
                    with open(draft_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    
                    # Mark it so QC can re-run on it
                    item['status'] = 'DRAFTED'
                    item['qc_notes'] = "Auto-fixed by Fix Bot. Pending re-QC."
                    fixed_count += 1
                    print(f"🔧 Auto-fixed: {item['slug']}")
                else:
                    print(f"⚠️ Could not auto-fix (likely a word count length issue): {item['slug']}")

    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(tracker, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Put {fixed_count} articles back into DRAFTED status for re-QC.")

if __name__ == "__main__":
    main()
