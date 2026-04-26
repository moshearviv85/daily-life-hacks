import os
import csv
import json
import random
import time
import requests
from dotenv import load_dotenv

# ==========================================
# CONFIGURATION
# ==========================================
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
PROJECT_DIR = "."
CSV_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "production-sheet.csv")
HOOKS_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "pinterest-hooks.json")
MODEL_NAME = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are David Miller, the direct, practical, and slightly cynical voice of Daily Life Hacks.
Your task is to generate Pinterest pin copy (titles, descriptions, and alt text) for articles.
Follow these RULES strictly:
1. Tone: Direct, practical, no fluff. No emojis. No em dashes (- or --). Use regular hyphens sparingly.
2. Banned Words: Unlock, Elevate, Game-changer, Delve into, Dive into, Tapestry, Symphony, Revolutionize, Furthermore, Moreover, Mouthwatering.
3. No medical claims: Do not claim to cure, prevent, or treat any disease. Use "may support", "might help".
4. Description length: 2-3 short, punchy sentences.
5. Alt text: Describe a generic image that fits the topic and mention there is a text overlay with the title. E.g., "A bowl of healthy soup on a wooden table with text overlay saying '...'"

I will provide an article summary and specific hook templates. 
You MUST use the provided hook templates as the exact structure for your titles, filling in the placeholders like [Topic], [Ingredient], [Diet], etc., with relevant words from the article.

Respond ONLY with valid JSON in this format:
{
  "pins": [
    {
      "title": "The Filled Hook Title",
      "description": "The matching description...",
      "alt_text": "The matching alt text..."
    }
  ]
}"""

def call_gemini(prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {
            "temperature": 0.8,
            "responseMimeType": "application/json"
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 429:
            print("Rate Limit Exceeded (429). Waiting 10s...")
            time.sleep(10)
            return call_gemini(prompt)
        
        response.raise_for_status()
        data = response.json()
        
        if "candidates" in data and len(data["candidates"]) > 0:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
    except Exception as e:
        print(f"API Error: {e}")
        try:
            print(response.text)
        except:
            pass
    return None

def process_csv():
    # Load hooks
    with open(HOOKS_FILE, 'r', encoding='utf-8') as f:
        hooks_pool = json.load(f)

    # Read CSV
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    updated = 0
    total = len(rows)

    print(f"Loaded {total} rows. Checking for missing pin copy...")

    for i, row in enumerate(rows):
        missing_variants = []
        for v in [2, 3, 4, 5]:
            if not row.get(f'pin_v{v}_title', '').strip():
                missing_variants.append(v)
        
        if not missing_variants:
            continue

        print(f"Row {row['row']} ({row['slug']}): Needs variants {missing_variants}")
        
        # Pick random hooks
        selected_hooks = random.sample(hooks_pool, len(missing_variants))
        
        prompt = f"""Article Details:
Title: {row['title']}
Category: {row['category']}
Keyword: {row['keyword']}
Excerpt: {row['article_markdown'][:300]}...

Generate exactly {len(missing_variants)} pins. 
Use these EXACT templates for the titles, replacing the brackets with specific words matching the article:
"""
        for idx, hook in enumerate(selected_hooks):
            prompt += f"{idx+1}. {hook}\n"

        print(f"Calling Gemini for {len(missing_variants)} pins...")
        time.sleep(4) # Rate limiting
        
        result = call_gemini(prompt)
        if result and "pins" in result and len(result["pins"]) == len(missing_variants):
            for idx, v in enumerate(missing_variants):
                pin = result["pins"][idx]
                row[f'pin_v{v}_title'] = pin['title'].replace('"', "'")
                row[f'pin_v{v}_description'] = pin['description'].replace('"', "'")
                row[f'pin_v{v}_alt_text'] = pin['alt_text'].replace('"', "'")
                
                # Fill the standard filenames and links if empty
                if not row.get(f'pin_v{v}_image_filename', '').strip():
                    row[f'pin_v{v}_image_filename'] = f"{row['slug']}_v{v}.jpg"
                if not row.get(f'pin_v{v}_link', '').strip():
                    row[f'pin_v{v}_link'] = f"https://www.daily-life-hacks.com/{row['slug']}?utm_content=v{v}"
            
            updated += 1
            print(f"Successfully generated copy for {row['slug']}")
            
            # Save progressively so we don't lose data
            with open(CSV_FILE, 'w', encoding='utf-8', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
        else:
            print(f"Failed to generate correct number of pins for {row['slug']}. Result: {result}", flush=True)

    print(f"\nDone. Updated {updated} rows.", flush=True)

if __name__ == "__main__":
    if not API_KEY:
        print("GEMINI_API_KEY missing in .env", flush=True)
    else:
        process_csv()
