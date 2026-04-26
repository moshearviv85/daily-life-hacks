import os
import json
import requests
import re
import time
import argparse
from datetime import datetime
from dotenv import load_dotenv

# ==========================================
# CONFIG
# ==========================================
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "gemini-3.1-pro-preview"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "pipeline-data")
TRACKER_FILE = os.path.join(DATA_DIR, "content-tracker.json")
CLUSTERS_FILE = os.path.join(DATA_DIR, "keyword-clusters.json")
ROUTER_MAPPING_FILE = os.path.join(DATA_DIR, "router-mapping.json")
ARTICLES_DIR = os.path.join(BASE_DIR, "src", "data", "articles")

def call_gemini(prompt, is_json=False):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.85,
            "maxOutputTokens": 8192
        }
    }
    
    if is_json:
        payload["generationConfig"]["responseMimeType"] = "application/json"
        
    try:
        res = requests.post(url, json=payload, timeout=120)
        res.raise_for_status()
        data = res.json()
        text = data['candidates'][0]['content']['parts'][0]['text']
        return text.strip()
    except Exception as e:
        print(f"   Gemini API Error: {e}")
        return None

def load_json(filepath, default_val):
    if not os.path.exists(filepath):
        return default_val
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load {filepath} - {e}")
        return default_val

def save_json(filepath, data):
    tmp = filepath + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, filepath)

def generate_faq(base_query, keywords, category):
    kws_str = ", ".join(keywords)
    prompt = f"""You are an SEO expert. Generate 5 frequently asked questions (with answers) for an article about: "{base_query}"

The article keywords are: {kws_str}
Category: {category}

Rules:
- Questions must be things real people search for (conversational, natural phrasing)
- Answers: 2-4 sentences, informative but concise
- No medical claims (use "may", "could", "might")
- No detox/cleanse language
- Use contractions (it's, don't, they're)
- Questions and answers in English

Return ONLY a JSON array like this, no markdown:
[
  {{"question": "Question here?", "answer": "Answer here."}},
  {{"question": "Question here?", "answer": "Answer here."}}
]"""
    
    res = call_gemini(prompt, is_json=True)
    if res:
        try:
            return json.loads(res)
        except json.JSONDecodeError:
            pass
    return []

def format_faq_yaml(faq_list):
    if not faq_list:
        return ""
    lines = ["faq:"]
    for item in faq_list:
        q = item.get("question", "").replace('"', '\\"')
        a = item.get("answer", "").replace('"', '\\"')
        lines.append(f'  - question: "{q}"')
        lines.append(f'    answer: "{a}"')
    return "\n".join(lines) + "\n"

def to_camel_case(kw):
    words = kw.replace('-', ' ').split()
    return "".join(w.capitalize() for w in words)

def update_existing_frontmatter(content, title, camel_keywords, faq_yaml):
    # Match the frontmatter block between the first two ---
    match = re.search(r'^(---[\s\S]*?\n---\n)', content)
    if not match:
        return content
        
    frontmatter = match.group(1)
    body = content[len(frontmatter):]
    
    # 1. Update Title
    frontmatter = re.sub(r'(?m)^title:\s*".*?"$', f'title: "{title}"', frontmatter)
    
    # 2. Update Tags
    tags_match = re.search(r'(?m)^tags:\s*\[(.*?)\]$', frontmatter)
    if tags_match:
        existing_tags = [t.strip().strip('"\'') for t in tags_match.group(1).split(',')]
        # keep up to 4 non-keyword original tags
        new_tags = camel_keywords + existing_tags[:4]
        new_tags = list(dict.fromkeys(new_tags))[:8] # dedupe, max 8
    else:
        new_tags = camel_keywords
        
    tags_str = ", ".join(f'"{t}"' for t in new_tags if t)
    if 'tags:' in frontmatter:
        frontmatter = re.sub(r'(?m)^tags:\s*\[.*?\]$', f'tags: [{tags_str}]', frontmatter)
    else:
        # inject just before the ending ---
        frontmatter = frontmatter.replace('\n---', f'\ntags: [{tags_str}]\n---')
        
    # 3. Update FAQ
    if 'faq:' in frontmatter:
        # remove existing faq block up to the ending ---
        frontmatter = re.sub(r'(?m)^faq:[\s\S]*?\n(?=---$)', faq_yaml, frontmatter)
    else:
        frontmatter = frontmatter.replace('\n---', f'\n{faq_yaml}---', 1)
        
    return frontmatter + body

def extract_markdown_block(text):
    match = re.search(r'```(?:markdown|md)?\s*([\s\S]*?)```', text)
    if match:
        return match.group(1).strip()
    return text.strip()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only-update-existing", action="store_true", help="only update frontmatter of existing articles")
    parser.add_argument("--new-only", action="store_true", help="only write new articles")
    args = parser.parse_args()

    tracker = load_json(TRACKER_FILE, [])
    tracker_dict = {i["slug"]: i for i in tracker if "slug" in i}
    
    clusters = load_json(CLUSTERS_FILE, {})
    router_map = load_json(ROUTER_MAPPING_FILE, {})
    
    os.makedirs(ARTICLES_DIR, exist_ok=True)
    
    total = len(clusters)
    idx = 0
    
    for slug, data in clusters.items():
        if data.get("status") != "researched":
            continue
            
        idx += 1
        print(f"\n[{idx}/{total}] {slug}")
        
        article_path = os.path.join(ARTICLES_DIR, f"{slug}.md")
        is_existing = os.path.exists(article_path)
        
        if is_existing and args.new_only:
            print("  Skipping (exists, --new-only flag)")
            continue
        if not is_existing and args.only_update_existing:
            print("  Skipping (new, --only-update-existing flag)")
            continue
            
        base_query = data.get("base_query", slug.replace("-", " "))
        category = data.get("category", "nutrition")
        cluster_kws = data.get("cluster", [])
        keywords = [k.get("keyword", "") for k in cluster_kws]
        
        if len(keywords) < 4:
            keywords += [""] * (4 - len(keywords)) # pad if needed
            
        camel_keywords = [to_camel_case(k) for k in keywords if k]
        
        v1_title = router_map.get(slug, {}).get("v1", {}).get("title", keywords[0].title() if keywords[0] else slug)
        
        print("  -> Generating FAQ...")
        faq_data = generate_faq(base_query, keywords, category)
        faq_yaml = format_faq_yaml(faq_data)
        
        if is_existing:
            print("  -> Updating existing frontmatter...")
            try:
                with open(article_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    
                new_content = update_existing_frontmatter(content, v1_title, camel_keywords, faq_yaml)
                
                with open(article_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                    
                if slug in tracker_dict:
                    tracker_dict[slug]["status"] = "article_written"
                print("  -> Saved existing article.")
                
            except Exception as e:
                print(f"  Error updating article: {e}")
                
        else:
            print("  -> Generating new article...")
            
            # Format FAQ block for the prompt
            faq_prompt_block = faq_yaml.strip() if faq_yaml else "faq:\n  - question: \"\"\n    answer: \"\"\n"
            
            today_str = datetime.now().strftime("%Y-%m-%d")
            
            if category == "recipes":
                frontmatter_template = f"""---
title: "{v1_title}"
excerpt: "{{1 sentence, 120–150 chars, conversational}}"
category: "recipes"
tags: ["{camel_keywords[0]}", "{camel_keywords[1] if len(camel_keywords)>1 else ''}", "{camel_keywords[2] if len(camel_keywords)>2 else ''}", "{camel_keywords[3] if len(camel_keywords)>3 else ''}", "EasyRecipe", "GutHealth"]
image: "/images/{slug}-main.jpg"
imageAlt: "{{descriptive alt text}}"
date: {today_str}
author: "Daily Life Hacks Team"
featured: false
editorsPick: false
whatsHot: false
mustRead: false
prepTime: "{{X minutes}}"
cookTime: "{{X minutes}}"
totalTime: "{{X minutes}}"
servings: {{number}}
calories: {{number}}
difficulty: "{{Easy|Medium|Hard}}"
ingredients:
  - "{{exact measurement + ingredient}}"
steps:
  - "{{complete step description}}"
{faq_prompt_block}
---"""
            else:
                frontmatter_template = f"""---
title: "{v1_title}"
excerpt: "{{1 sentence, 120–150 chars, no medical claims, conversational}}"
category: "nutrition"
tags: ["{camel_keywords[0]}", "{camel_keywords[1] if len(camel_keywords)>1 else ''}", "{camel_keywords[2] if len(camel_keywords)>2 else ''}", "{camel_keywords[3] if len(camel_keywords)>3 else ''}", "GutHealth", "HealthyEating"]
image: "/images/{slug}-main.jpg"
imageAlt: "{{descriptive, no keyword stuffing}}"
date: {today_str}
author: "Daily Life Hacks Team"
featured: false
editorsPick: false
whatsHot: false
mustRead: false
{faq_prompt_block}
---"""

            main_prompt = f"""You are writing a blog article for Daily Life Hacks (daily-life-hacks.com), a US-focused healthy lifestyle site.

ARTICLE DETAILS:
- Primary keyword (use as H1 title): {keywords[0]}
- Supporting keywords to incorporate naturally: {keywords[1]}, {keywords[2]}, {keywords[3]}
- Category: {category}
- Target length: 1400–2000 words
- Slug: {slug}

MANDATORY CONTENT RULES:
- Always use contractions: it's, don't, they're, you'll, won't (never "it is", "do not")
- Tone: warm, conversational, personal blogger. Occasional casual fragments are fine.
- No em dashes (—). Use regular hyphens sparingly, or rewrite the sentence.
- No emojis anywhere.
- No "Conclusion" heading. Close naturally with 1 short paragraph.
- No sign-off phrases: never "Enjoy!", "Happy eating!", "Give it a try!", "You won't regret it!"
- No medical claims: never "cures", "treats", "heals", "prevents", "fights". Use "may support", "could help", "might improve", "is thought to".
- No detox/cleanse language: use "refresh", "feel lighter" instead.
- No absolute statements: never "is good for your gut" — always hedge with "could", "may", "might".
- No banned AI words: Furthermore, Moreover, In conclusion, Delve into, Dive into, It's important to note, It's worth noting, In today's world, Unlock, Elevate, Navigating, Game-changer, Revolutionize, Mouthwatering.
- Vary sentence lengths aggressively: mix short punchy sentences with longer ones.
- Sprinkle 1–2 personal-sounding anecdotes naturally.
- Include supporting keywords naturally in 1–2 H2 or H3 headings and in body text.

IF CATEGORY IS "recipes":
- ONE main recipe with exact measurements (grams or cups/tbsp — never "a handful")
- Realistic calories per serving (calculate accurately)
- Include prep time, cook time, total time, servings
- 2–3 variation ideas after the main recipe
- Tips/storage section
- Ingredients and steps go in frontmatter only (not in the body)

IF CATEGORY IS "nutrition":
- Informational article, no recipe required
- Specific data: fiber grams, nutrients, % daily value where relevant
- Mix of H2 and H3 headings
- Practical "how to eat more of this" section

OUTPUT FORMAT:
Return ONLY the complete markdown file content, starting with --- frontmatter. No explanation, no code block markers.

FRONTMATTER TEMPLATE:
{frontmatter_template}"""

            article_md = call_gemini(main_prompt, is_json=False)
            
            if article_md:
                article_md = extract_markdown_block(article_md)
                
                # Verify sanity
                if article_md.startswith("---"):
                    with open(article_path, "w", encoding="utf-8") as f:
                        f.write(article_md)
                        
                    # Add to tracker if not exists
                    if slug not in tracker_dict:
                        new_item = {
                            "slug": slug,
                            "category": category,
                            "date_created": today_str,
                            "status": "article_written",
                            "published": False,
                            "image_web": None,
                            "image_pins": []
                        }
                        tracker.append(new_item)
                        tracker_dict[slug] = new_item
                    else:
                        tracker_dict[slug]["status"] = "article_written"
                        tracker_dict[slug]["published"] = False
                        
                    print("  -> Saved new article.")
                else:
                    print("  -> Error: Invalid markdown structure returned from Gemini.")
            else:
                print("  -> Error: Gemini returned no content.")
                
        # Save tracker incrementally
        all_tracker_items = list(tracker_dict.values())
        if tracker:
            # maintain order for existing, append new
            out_tracker = []
            for t in tracker:
                if t["slug"] in tracker_dict:
                    out_tracker.append(tracker_dict[t["slug"]])
            for _, dict_t in tracker_dict.items():
                if dict_t not in out_tracker:
                    out_tracker.append(dict_t)
            save_json(TRACKER_FILE, out_tracker)
        else:
            save_json(TRACKER_FILE, all_tracker_items)
            
        time.sleep(3)

    print("\nAll done.")

if __name__ == "__main__":
    main()
