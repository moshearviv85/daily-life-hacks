import os
import glob
import re

def clean_hashtags():
    articles_dir = "src/data/articles"
    drafts_dir = "pipeline-data/drafts"
    md_files = glob.glob(os.path.join(articles_dir, "*.md")) + glob.glob(os.path.join(drafts_dir, "*.md"))
    
    cleaned_count = 0
    for filepath in md_files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        parts = re.split(r'---', content)
        if len(parts) >= 3:
            frontmatter = parts[1]
            body = '---'.join(parts[2:])
            
            # Remove #Hashtags (starts with #, followed by words, no space after #)
            # (?<!\S) ensures we're at the start of a string or preceded by whitespace
            new_body = re.sub(r'(?<!\S)#\w+', '', body)
            
            # Remove multiple empty lines that might be left over from removing block hashtags
            new_body = re.sub(r'(?m)^\s*#\s*$', '', new_body)
            new_body = re.sub(r'\n\s*\n\s*\n', '\n\n', new_body)
            
            if new_body != body:
                full_new_content = f"---{frontmatter}---{new_body}"
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(full_new_content)
                cleaned_count += 1
                
    print(f"✅ Cleaned dangling hashtags from {cleaned_count} articles.")

if __name__ == "__main__":
    clean_hashtags()
