import os
import json
import yaml
import requests
import re
import time
import sys

# Windows terminal encoding fix for emojis
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    from openai import OpenAI
    import anthropic
except ImportError:
    print("❌ Error: Missing required libraries. Please run: pip install openai anthropic")
    exit(1)

# ==========================================
# CONFIGURATION — Edit these values
# ==========================================
PROJECT_DIR = "."  # root of the Astro project
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
DEST_DIR = os.path.join(PROJECT_DIR, "src", "data", "articles")

# API KEYS - Fill these in before running!
from dotenv import load_dotenv
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
XAI_API_KEY = os.getenv("XAI_API_KEY", "")
# ==========================================

SYSTEM_PROMPT = """STRICT CONTENT RULES — VIOLATION OF ANY RULE MEANS THE ARTICLE IS REJECTED:

NEVER WRITE:
- Medical cure claims: "cures cancer", "prevents diabetes", "heals depression"
- Weight loss promises: "lose 10 pounds in a week", "burns belly fat", "miracle diet"
- Specific weight loss numbers or timeframes
- Diagnosis: "if you have symptom X, you have disease Y"
- Drug replacement: "stop taking medication and eat Z instead"
- Fake science: "studies prove..." without naming a real study
- "Superfood" as a medical term
- "Detox" or "cleanse" as medical concepts
- "Boosts immunity" or "prevents flu/cold"
- Any claim that food can replace medical treatment

ALWAYS USE CAUTIOUS LANGUAGE:
- "may help support" instead of "will cure"
- "some research suggests" instead of "proven to"
- "could contribute to" instead of "guaranteed to"
- "supports healthy weight management" instead of "makes you lose weight"
- "may support digestive comfort" instead of "cures IBS"
- "nutrients that support immune function" instead of "boosts immunity"
- "foods linked to better mood" instead of "cures anxiety"

ALWAYS INCLUDE in every article:
- Target audience: healthy adults looking to eat better (NOT sick people seeking cures)
- Tone: warm, practical, encouraging — like a knowledgeable friend
- The article must provide genuinely useful, actionable information

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

def clean_markdown(text):
    text = text.strip()
    if text.startswith("```markdown"): text = text[11:]
    if text.startswith("```"): text = text[3:]
    if text.endswith("```"): text = text[:-3]
    return text.strip()

def build_prompt(item):
    cat = item['category']
    word_count_req = "800-1200 words" if cat == "nutrition" else "600-900 words. Since the recipe ingredients and steps are in the frontmatter, the body should focus on tips, nutritional breakdown, and variations."
    schema = NUTRITION_SCHEMA if cat == "nutrition" else RECIPE_SCHEMA
    schema = schema.replace("{slug}", item['slug']).replace("{alt_text}", item['alt_text'].replace('"', '\\"')).replace("{date}", item['date_created'])
    
    return f"""Write a complete Markdown article for a nutrition blog.

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
- Use `##` for main headings, `###` for subheadings.
- Include practical, actionable advice.
- Tone: warm, approachable.
- Include a "Meal Prep Tips" or "How to Store" section when relevant.
{'- Include a "Nutritional Breakdown" and "Variations" section.' if cat == "recipes" else ''}

[SYSTEM RULES]
{SYSTEM_PROMPT}

BEGIN MARKDOWN:
"""

def generate_openai(prompt):
    if OPENAI_API_KEY.startswith("sk-proj-YOUR"): return None
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    return clean_markdown(response.choices[0].message.content)

def generate_anthropic(prompt):
    if ANTHROPIC_API_KEY.startswith("sk-ant-YOUR"): return None
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=2500,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    return clean_markdown(response.content[0].text)

def generate_gemini(prompt):
    if GEMINI_API_KEY.startswith("YOUR_"): return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {"temperature": 0.7}
    }
    response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
    response.raise_for_status()
    data = response.json()
    text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', "")
    return clean_markdown(text)

def generate_grok(prompt):
    if XAI_API_KEY.startswith("xoxb-YOUR"): return None
    # xAI uses the OpenAI SDK format
    client = OpenAI(
        api_key=XAI_API_KEY,
        base_url="https://api.x.ai/v1",
    )
    response = client.chat.completions.create(
        model="grok-beta",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    return clean_markdown(response.choices[0].message.content)

def main():
    print("🚀 Running test-ais.py: Generating 4 variations per item...")
    os.makedirs(DEST_DIR, exist_ok=True)
    
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)

    # Find 1 nutrition and 1 recipe
    nutrition_item = next((i for i in tracker if i['category'] == 'nutrition'), None)
    recipe_item = next((i for i in tracker if i['category'] == 'recipes'), None)
    
    test_items = [nutrition_item, recipe_item]
    
    models = {
        "gpt4o": generate_openai,
        "claude": generate_anthropic,
        "gemini": generate_gemini,
        "grok": generate_grok
    }
    
    for item in test_items:
        if not item: continue
        print(f"\n📝 Testing Item: {item['slug']} ({item['category']})")
        prompt = build_prompt(item)
        
        for name, func in models.items():
            print(f"  🤖 Requesting {name}...")
            try:
                result = func(prompt)
                if not result:
                    print(f"    ⚠️ Skipping {name}: API Key not set.")
                    continue
                    
                # Modify frontmatter title slightly so we can tell them apart in the browser
                # and append the "Written by" tag to the body
                
                parts = result.split("---")
                if len(parts) >= 3:
                     frontmatter = parts[1]
                     body = "---".join(parts[2:])
                     
                     # Add suffix to title
                     frontmatter = re.sub(r'(title:\s*".*?)(")', rf'\1 ({name.upper()})\2', frontmatter)
                     
                     # Append signature
                     signature = f"\n\n---\n*This article variation was written completely by the **{name.upper()}** AI model for testing purposes.*"
                     body += signature
                     
                     final_content = f"---{frontmatter}---{body}"
                else:
                     final_content = result
                     
                slug = f"test-{name}-{item['slug']}"
                file_path = os.path.join(DEST_DIR, f"{slug}.md")
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(final_content)
                print(f"    ✅ Saved to src/data/articles/{slug}.md")
                
            except Exception as e:
                print(f"    ❌ Failed: {e}")

    print("\n🎉 Test generation complete. Start `npm run dev` and navigate to /test-ai_name-slug to compare!")

if __name__ == "__main__":
    main()
