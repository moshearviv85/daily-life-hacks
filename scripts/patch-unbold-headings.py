import os
import glob
import re

def unbold_headings():
    drafts_dir = "pipeline-data/drafts"
    articles_dir = "src/data/articles"
    
    md_files = glob.glob(os.path.join(drafts_dir, "*.md")) + glob.glob(os.path.join(articles_dir, "*.md"))
    
    fixed_count = 0
    
    for filepath in md_files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        lines = content.split('\n')
        changed = False
        
        for i, line in enumerate(lines):
            # Check if this line is a markdown heading
            if re.match(r'^\s*#+\s', line):
                original = line
                # Strip all asterisks from the heading line
                cleaned = line.replace('**', '')
                if cleaned != original:
                    lines[i] = cleaned
                    changed = True
                    
        if changed:
            new_content = '\n'.join(lines)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            fixed_count += 1
                
    print(f"✅ Removed bold from headings in {fixed_count} markdown files.")

if __name__ == "__main__":
    unbold_headings()
