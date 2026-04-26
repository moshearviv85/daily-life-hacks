import os
import glob
import re

def fix_headings():
    drafts_dir = "pipeline-data/drafts"
    articles_dir = "src/data/articles"
    
    # Process both drafts and articles
    all_files = glob.glob(os.path.join(drafts_dir, "*.md")) + glob.glob(os.path.join(articles_dir, "*.md"))
    
    fixed_count = 0
    
    for filepath in all_files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Split frontmatter
        parts = re.split(r'---', content)
        if len(parts) >= 3:
            frontmatter = parts[1]
            body = '---'.join(parts[2:])
            
            # Find any # heading that is squished right after a period or word.
            # Example: ...pounds. ### The Cereal
            # Replace: Add a double newline before the #
            # We use regex to find where a word or punctuation is immediately followed by space(s) and then #
            # (?<=\S) means "preceded by a non-whitespace character" (like a period)
            # then some optional spaces \s*
            # then ## or ###
            
            # We want to replace non-newline spaces before a ## with \n\n
            # e.g. "pounds. ###" -> "pounds.\n\n###"
            new_body = re.sub(r'(?<=\S)[ \t]+(##+ )', r'\n\n\1', body)
            
            # Also fix if it's literally squished without even a space like "pounds.###"
            new_body = re.sub(r'(?<=\S)(##+ )', r'\n\n\1', new_body)
            
            # Clean up excessive newlines we might have made
            new_body = re.sub(r'\n{3,}', '\n\n', new_body)
            
            if new_body != body:
                full_new_content = f"---{frontmatter}---{new_body}"
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(full_new_content)
                fixed_count += 1
                
    print(f"✅ Fixed squished headings in {fixed_count} markdown files.")

if __name__ == "__main__":
    fix_headings()
