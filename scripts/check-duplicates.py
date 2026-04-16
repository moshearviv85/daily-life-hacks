import os
import csv
import glob

def check_duplicates():
    csv_file = "pipeline-data/production-sheet.csv"
    articles_dir = "src/data/articles"
    
    # Read CSV
    csv_articles = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            csv_articles.append({
                "slug": row.get("slug", "").strip(),
                "title": row.get("title", "").strip().lower(),
                "source": "production-sheet.csv",
                "row": row.get("row", "")
            })
            
    # Read Markdown files
    md_files = glob.glob(os.path.join(articles_dir, "*.md"))
    md_articles = []
    for md_file in md_files:
        basename = os.path.basename(md_file)
        slug = basename.replace(".md", "")
        # Very basic title extraction
        title = ""
        with open(md_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith("title:"):
                    title = line.replace("title:", "").strip().strip('"').strip("'").lower()
                    break
        
        md_articles.append({
            "slug": slug,
            "title": title,
            "source": f"src/data/articles/{basename}"
        })
        
    all_articles = csv_articles + md_articles
    
    # Check exact slug duplicates
    slugs = {}
    slug_duplicates = []
    for art in all_articles:
        if not art["slug"]:
            continue
        if art["slug"] in slugs:
            slug_duplicates.append((slugs[art["slug"]], art))
        else:
            slugs[art["slug"]] = art
            
    # Check exact title duplicates
    titles = {}
    title_duplicates = []
    for art in all_articles:
        if not art["title"]:
            continue
        if art["title"] in titles:
            title_duplicates.append((titles[art["title"]], art))
        else:
            titles[art["title"]] = art
            
    print("=== EXACT SLUG DUPLICATES ===")
    if not slug_duplicates:
        print("None found.")
    else:
        for a, b in slug_duplicates:
            print(f"- '{a['slug']}' found in both:\n  1. {a['source']} (row {a.get('row', 'N/A')})\n  2. {b['source']} (row {b.get('row', 'N/A')})")
            
    print("\n=== EXACT TITLE DUPLICATES ===")
    if not title_duplicates:
        print("None found.")
    else:
        for a, b in title_duplicates:
            if a['slug'] != b['slug']: # Only show if slugs differ
                print(f"- '{a['title']}' found in both:\n  1. {a['source']} (slug: {a['slug']})\n  2. {b['source']} (slug: {b['slug']})")

    # Simple similarity check for titles (using set intersection of words)
    print("\n=== POTENTIAL SIMILAR TITLES (Word Overlap) ===")
    import itertools
    
    def get_words(title):
        words = ''.join(c if c.isalnum() else ' ' for c in title).split()
        # filter out common stop words
        stops = {"how", "to", "the", "and", "a", "an", "in", "for", "with", "of", "on", "without", "from", "vs"}
        return set(w for w in words if w not in stops and len(w) > 2)
        
    similar_found = False
    # Check only within unique articles (using slugs to deduplicate first)
    unique_arts = list(slugs.values())
    
    for i in range(len(unique_arts)):
        for j in range(i+1, len(unique_arts)):
            art1 = unique_arts[i]
            art2 = unique_arts[j]
            words1 = get_words(art1["title"])
            words2 = get_words(art2["title"])
            
            if not words1 or not words2:
                continue
                
            intersection = words1.intersection(words2)
            smaller_len = min(len(words1), len(words2))
            
            # If 70% or more of the smaller title's words are in the larger one
            if smaller_len > 2 and len(intersection) / smaller_len >= 0.7:
                print(f"- Potential duplicate or very similar topics:")
                print(f"  1. {art1['title']} ({art1['slug']})")
                print(f"  2. {art2['title']} ({art2['slug']})")
                print(f"  Overlap: {intersection}\n")
                similar_found = True
                
    if not similar_found:
        print("None found.")

if __name__ == "__main__":
    check_duplicates()
