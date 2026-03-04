import os
import json
import requests
import time
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "gemini-2.5-flash"

PROJECT_DIR = "."
PINS_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "pins.json")
MAPPING_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "router-mapping.json")

def generate_titles(base_title, description):
    prompt = f"""
    You are an expert Pinterest marketer. I have an article with the following title and description.
    Original Title: {base_title}
    Description: {description}
    
    I need 3 MORE alternative, catchy Pinterest pin titles for this same article. 
    They should be high-performing, click-worthy, and relatively short (under 60 characters).
    Return ONLY a JSON array of 3 string titles. Do not use markdown blocks, just raw JSON array.
    Example: ["Title 1", "Title 2", "Title 3"]
    """
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
        }
    }
    
    try:
        res = requests.post(url, json=payload, timeout=30)
        if res.status_code == 200:
            data = res.json()
            text = data['candidates'][0]['content']['parts'][0]['text']
            text = text.replace('```json', '').replace('```', '').strip()
            return json.loads(text)
        elif res.status_code == 429:
            print("Quota hit, waiting 60s...")
            time.sleep(60)
            return generate_titles(base_title, description)
        else:
            print(f"Error {res.status_code}: {res.text}")
            return []
    except Exception as e:
        print(f"Exception: {e}")
        return []

def main():
    if not os.path.exists(PINS_FILE):
        print(f"File not found: {PINS_FILE}")
        return
        
    with open(PINS_FILE, 'r', encoding='utf-8') as f:
        pins = json.load(f)
        
    mapping = {}
    
    if os.path.exists(MAPPING_FILE):
        with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
            try:
                mapping = json.load(f)
            except Exception:
                mapping = {}
                
    print(f"Processing {len(pins)} articles...")
    
    for i, pin in enumerate(pins):
        slug = pin['slug']
        if slug in mapping and len(mapping[slug]) == 4:
            continue
            
        print(f"[{i+1}/{len(pins)}] Generating titles for: {slug}")
        base_title = pin['pin_title']
        desc = pin['description']
        
        alt_titles = generate_titles(base_title, desc)
        
        if not alt_titles or len(alt_titles) < 3:
            alt_titles = [f"{base_title} - Part 2", f"{base_title} - Tips", f"{base_title} - Guide"]
            
        variations = {
            "v1": base_title,
            "v2": alt_titles[0],
            "v3": alt_titles[1],
            "v4": alt_titles[2]
        }
        
        mapping[slug] = variations
        
        # Save incrementally
        with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
            json.dump(mapping, f, indent=2, ensure_ascii=False)
            
        time.sleep(2) # rate limit prevention
        
    print("Done generating router mapping!")

if __name__ == "__main__":
    main()
