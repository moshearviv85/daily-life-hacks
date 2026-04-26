import os
import json
import time
import requests
import re
import random
from datetime import datetime, timedelta

# ==========================================
# CONFIGURATION — Edit these values
# ==========================================
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
PROJECT_DIR = "."  # root of the Astro project
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
DRAFTS_DIR = os.path.join(PROJECT_DIR, "pipeline-data", "drafts")
MODEL_NAME = "gemini-2.5-flash"
# ==========================================

SYSTEM_PROMPT = """EXTREME ANTI-AI DETECTION RULES (CRITICAL):
Your output is being tested by GPTZero. To pass as human, you must NOT write like a typical LLM. 
1. BAN LIST - You are FORBIDDEN from using these words/phrases: 
   "game-changer", "powerhouse", "let's be real", "enter the", "whether you", "look no further", "the secret to", "it's no secret", "delve into", "moreover", "furthermore", "in conclusion", "it's important to note", "crucial", "testament", "tapestry", "symphony", "unlock", "elevate", "bursting with", "game changing", "superfood", "guilt-free", "a staple", "I was skeptical at first", "Dive into", "Revolutionize", "Take it to the next level", "Mouthwatering".
2. STRUCTURE: Do not use the typical "Hook -> My experience -> 3 Reasons Why -> The Recipe -> Conclusion" structure. AI always uses this. Start directly with a weird or highly specific thought. 
3. SENTENCE FLOW (BURSTINESS): Force yourself to write terribly disjointed sentences. Put a 1-word sentence. Then a 30-word run-on sentence that feels a bit rambling. Then a normal sentence. 
4. TONE: Write as if you are slightly distracted and just talking out loud to a friend while cooking. Be a little messy. Use parentheses to interrupt yourself abruptly. Use some 90s/2000s slang or Gen-Z slang ironically.
5. NEVER do a "wrapping up" paragraph. No call to action. No "Enjoy!", "Give it a try!", "Your gut will thank you!". The final paragraph should contain useful information, a storage tip, or a personal thought, ending abruptly.

NEVER WRITE:
- Medical cure claims: "cures cancer", "prevents diabetes", "heals depression"
- Weight loss promises: "lose 10 pounds in a week", "burns belly fat", "miracle diet"
- Diagnosis: "if you have symptom X, you have disease Y"
- Drug replacement: "stop taking medication and eat Z instead"

ALWAYS USE CAUTIOUS LANGUAGE:
- "may help support" instead of "will cure"

NEVER INCLUDE:
- External links (no URLs at all in the article body)
- References to other websites
- Affiliate promotions
- Brand name product recommendations"""

NUTRITION_SCHEMA = """---
title: "Article Title Here (Max 65 chars, includes keyword)"
excerpt: "A compelling 1-2 sentence summary for SEO and social sharing."
category: "nutrition"
tags: ["tag1", "tag2", "tag3", "tag4"]
image: "/images/{slug}-main.jpg"
imageAlt: "{alt_text}"
date: {date}
author: "Daily Life Hacks Team"
featured: false
editorsPick: false
whatsHot: false
mustRead: false
---"""

RECIPE_SCHEMA = """---
title: "Recipe Title Here (Max 65 chars, includes keyword)"
excerpt: "A compelling 1-2 sentence summary."
category: "recipes"
tags: ["tag1", "tag2", "tag3", "tag4"]
image: "/images/{slug}-main.jpg"
imageAlt: "{alt_text}"
date: {date}
author: "Daily Life Hacks Team"
featured: false
editorsPick: false
whatsHot: false
mustRead: false
prepTime: "10 minutes"
cookTime: "25 minutes"
totalTime: "35 minutes"
servings: 4
calories: 380
difficulty: "Easy"
ingredients:
  - "Ingredient 1 with quantity"
  - "Ingredient 2 with quantity"
steps:
  - "Full instruction for step 1."
  - "Full instruction for step 2."
---"""

def load_tracker():
    if not os.path.exists(TRACKER_FILE):
        print(f"❌ Error: Tracker file not found at {TRACKER_FILE}.")
        return None
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_tracker_item(item_update):
    d = load_tracker()
    if d is None: return
    for i, item in enumerate(d):
        if item['id'] == item_update['id']:
            d[i] = item_update
            break
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

def generate_article(item):
    cat = item['category']
    word_count_req = "800-1200 words" if cat == "nutrition" else "600-900 words. Since the recipe ingredients and steps are in the frontmatter, the body should focus on personal thoughts, tips, nutritional breakdown, and variations."
    schema = NUTRITION_SCHEMA if cat == "nutrition" else RECIPE_SCHEMA
    
    # Generate random date between Dec 15 2025 and Feb 22 2026
    start_date = datetime(2025, 12, 15)
    end_date = datetime(2026, 2, 22)
    random_days = random.randrange((end_date - start_date).days)
    random_date = (start_date + timedelta(days=random_days)).strftime('%Y-%m-%d')
    
    schema = schema.replace("{slug}", item['slug']).replace("{alt_text}", item['alt_text'].replace('"', '\\"')).replace("{date}", random_date)
    
    prompt = f"""Write a complete Markdown article for a nutrition blog.
WRITE WITH HIGH BURSTINESS AND HIGH PERPLEXITY TO DEFEAT AI DETECTORS.
Do not use generic AI language patterns. Be creative, authentic, and slightly colloquial.

TOPIC: {item['description']}
TARGET KEYWORD: {item['keyword']}
CATEGORY: {item['category']}
HASHTAGS FOR TAGS: {', '.join(item['hashtags'])}
IMAGE ALT TEXT: {item['alt_text']}
WORD COUNT TARGET: {word_count_req}

Output a complete .md file exactly starting with --- frontmatter --- followed by the article body.
No markdown block wrappers inside the frontmatter.

The frontmatter MUST exactly follow this schema:
{schema}

ARTICLE BODY REQUIREMENTS:
- Use `##` for main headings, `###` for subheadings. NEVER BOLD THE HEADINGS (e.g. use `## Main Heading`, NOT `## **Main Heading**`). Use engaging, non-robotic heading titles.
- VERY IMPORTANT FORMATTING: ALWAYS put a blank empty line BEFORE and AFTER every heading. Never stick a heading on the same line as the previous paragraph.
- Include practical, actionable advice with personal-sounding commentary.
- Tone: warm, highly approachable, distinct human voice.
- Include a "Meal Prep Tips" or "How to Store" section when relevant.
- NEVER include hashtags (e.g., #healthy) anywhere in the body text or at the bottom. The tags are strictly handled by the frontmatter.
{'- Include a "Nutritional Breakdown" and "Variations" section.' if cat == "recipes" else ''}

[SYSTEM RULES]
{SYSTEM_PROMPT}

BEGIN MARKDOWN:
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.85,
            "topP": 0.95
        }
    }

    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 429:
            print("❌ Rate Limit Exceeded (429). Stopping gracefully.")
            return "429"
        
        response.raise_for_status()
        data = response.json()
        
        text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', "")
        
        # Clean up markdown code blocks if the AI wrapped the whole response in ```markdown
        text = text.strip()
        if text.startswith("```markdown"):
            text = text[11:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        # Hard-force removal of hashtags from the body just in case AI ignores instructions
        parts = re.split(r'---', text)
        if len(parts) >= 3:
            body = '---'.join(parts[2:])
            body = re.sub(r'(?<!\S)#[a-zA-Z0-9_]+', '', body)  # Delete hashtags
            body = re.sub(r'(?m)^\s*#\s*$', '', body)          # Delete lone # used as dividers by AI
            body = re.sub(r'\n{3,}', '\n\n', body).strip()     # Clean extra lines
            text = f"---{parts[1]}---\n{body}\n"
            
        return text.strip()
        
    except Exception as e:
        print(f"❌ API Error for {item['slug']}: {e}")
        if hasattr(e, 'response') and e.response:
            print(e.response.text)
        return None

def main():
    if API_KEY == "YOUR_GOOGLE_API_KEY_HERE":
        print("❌ Error: Please open scripts/2-generate.py and replace YOUR_GOOGLE_API_KEY_HERE with your actual Gemini API Key.")
        return

    print("🚀 Running 2-generate.py: Connecting to Gemini API to draft articles...")
    os.makedirs(DRAFTS_DIR, exist_ok=True)
    
    tracker = load_tracker()
    if not tracker:
        return

    completed_count = 0
    
    for item in tracker:
        if completed_count >= 25:
            print("Reached limit of 25 articles. Stopping.")
            break
            
        if item.get('status') == 'IDEATED':
            print(f"⏳ Generating article {completed_count + 1} for: {item['slug']} ({item['category']})")
            md_content = generate_article(item)
            
            if md_content == "429":
                break # Rate limit
                
            if md_content:
                draft_path = os.path.join(DRAFTS_DIR, f"{item['slug']}.md")
                with open(draft_path, "w", encoding="utf-8") as f:
                    f.write(md_content)
                
                # Try to extract the Title from the actual Markdown to keep the tracker synced
                title_match = re.search(r'title:\s*"?([^"\n]+)"?', md_content)
                extracted_title = title_match.group(1) if title_match else item['pin_title']
                
                item['status'] = 'DRAFTED'
                item['draft_path'] = os.path.relpath(draft_path, PROJECT_DIR)
                item['article_title'] = extracted_title
                
                completed_count += 1
                save_tracker(tracker) # Save progres continuously
                print(f"✅ Saved draft: {draft_path}")
                
                # Sleep to respect rate limits
                time.sleep(4)

    print(f"\n🎉 Finished execution. Generated {completed_count} highly-optimized drafts.")

if __name__ == "__main__":
    main()
