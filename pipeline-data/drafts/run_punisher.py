import os
import re

files_to_process = [
    "pipeline-data/drafts/store-cut-produce-without-odor.md",
    "pipeline-data/drafts/freezer-inventory-simple-system.md",
    "pipeline-data/drafts/fix-oversalted-soup-sauce-rice.md",
    "pipeline-data/drafts/how-to-clean-blender-fast-no-scrub.md",
    "pipeline-data/drafts/sheet-pan-organization-cook-vs-cool.md",
    "pipeline-data/drafts/keep-berries-fresh-longer-when-to-wash.md",
    "pipeline-data/drafts/reheat-pizza-crust-stays-crisp.md",
    "pipeline-data/drafts/grab-and-go-fridge-snack-drawer.md",
    "pipeline-data/drafts/cutting-board-basics-which-to-use.md",
    "pipeline-data/drafts/stop-garlic-from-burning-timing-heat.md"
]

contractions = {
    r'\bit is\b': "it's",
    r'\bIt is\b': "It's",
    r'\bdo not\b': "don't",
    r'\bDo not\b': "Don't",
    r'\bdoes not\b': "doesn't",
    r'\bDoes not\b': "Doesn't",
    r'\bthey are\b': "they're",
    r'\bThey are\b': "They're",
    r'\bwe are\b': "we're",
    r'\bWe are\b': "We're",
    r'\byou are\b': "you're",
    r'\bYou are\b': "You're",
    r'\bcannot\b': "can't",
    r'\bCannot\b': "Can't",
    r'\bwill not\b': "won't",
    r'\bWill not\b': "Won't",
    r'\bis not\b': "isn't",
    r'\bIs not\b': "Isn't",
    r'\bare not\b': "aren't",
    r'\bAre not\b': "Aren't"
}

medical_claims = {
    r'\bcure\b': "may support",
    r'\bCure\b': "May support",
    r'\bheals?\b': "could help",
    r'\bHeals?\b': "Could help",
    r'\brelieve\b': "ease",
    r'\bRelieve\b': "Ease",
    r'\bprevents\b': "might help avoid",
    r'\bPrevents\b': "Might help avoid",
    r'\bfights\b': "could help",
    r'\bFights\b': "Could help",
    r'\bcombats\b': "might improve",
    r'\bCombats\b': "Might improve",
    r'\bdetox\b': "refresh",
    r'\bDetox\b': "Refresh",
    r'\bcleanse\b': "refresh",
    r'\bCleanse\b': "Refresh",
    r'\breset your system\b': "feel refreshed"
}

banned_ai = [
    r'\bFurthermore,?\b', r'\bMoreover,?\b', r'\bIn conclusion,?\b', r'\bDelve into\b', 
    r'\bDive into\b', r'\bIt\'s important to note\b', r'\bIt\'s worth noting\b', 
    r'\bIn today\'s world\b', r'\bUnlock\b', r'\bElevate\b', r'\bNavigating\b', 
    r'\bGame-changer\b', r'\bRevolutionize\b', r'\bTake it to the next level\b', 
    r'\bMouthwatering\b', r'\bCrucial\b'
]

bad_endings = [
    r'Enjoy!', r'Happy eating!', r'Give it a try!', r'You won\'t regret it!', r'Your body will thank you!'
]

for filepath in files_to_process:
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # 1. Contractions
    for pattern, replacement in contractions.items():
        content = re.sub(pattern, replacement, content)
        
    # 2. Em-dashes
    content = content.replace("—", "-").replace("–", "-")
    
    # 3. Emojis (basic emoji regex removal)
    content = re.sub(r'[\U00010000-\U0010ffff]', '', content)

    # 4. Medical claims
    for pattern, replacement in medical_claims.items():
        content = re.sub(pattern, replacement, content)
        
    # 5. Banned AI Words (remove or replace with space)
    for pattern in banned_ai:
        content = re.sub(pattern, "", content, flags=re.IGNORECASE)

    # Clean up double spaces if we removed words
    content = re.sub(r' +', ' ', content)
    content = re.sub(r' \.', '.', content)
    content = re.sub(r' ,', ',', content)
        
    # 6. Bad endings
    for ending in bad_endings:
        content = content.replace(ending, "")

    # 7. "Conclusion" headings
    content = re.sub(r'##\s*Conclusion\s*\n', '\n', content, flags=re.IGNORECASE)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
    else:
        print(f"No changes: {filepath}")
