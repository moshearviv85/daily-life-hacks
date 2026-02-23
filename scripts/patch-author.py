import os
import glob
import re

articles_dir = "src/data/articles"
md_files = glob.glob(os.path.join(articles_dir, "*.md"))

for filepath in md_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if author already exists
    if 'author: "Daily Life Hacks Team"' not in content:
        # Add after date: if date exists
        new_content = re.sub(r'(date:.*?\n)', r'\1author: "Daily Life Hacks Team"\n', content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Patched: {filepath}")

print("Done patching existing articles.")
