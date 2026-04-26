import os
import json
import requests
import base64
import io
import time
import random
import argparse
from PIL import Image
from dotenv import load_dotenv

# ==========================================
# CONFIG
# ==========================================
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "nano-banana-pro-preview"

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "pipeline-data")
TRACKER_FILE = os.path.join(DATA_DIR, "content-tracker.json")
SCENES_FILE = os.path.join(DATA_DIR, "image-scenes.json")
ROUTER_MAPPING_FILE = os.path.join(DATA_DIR, "router-mapping.json")
ARTICLES_DIR = os.path.join(BASE_DIR, "src", "data", "articles")
SAVE_DIR_WEB = os.path.join(BASE_DIR, "public", "images")
SAVE_DIR_PINS = os.path.join(BASE_DIR, "public", "images", "pins")

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
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp, filepath)
    except Exception as e:
        print(f"Error writing {filepath}: {e}")

def call_api(prompt, file_path, aspect_ratio="3:4"):
    """Generate image via Nano Banana Pro (Gemini 3 Pro Image) API"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
            "temperature": 2.0,
            "imageConfig": {
                "aspectRatio": aspect_ratio
            }
        }
    }

    try:
        res = requests.post(url, json=payload, timeout=120)
        if res.status_code == 200:
            data = res.json()
            candidates = data.get('candidates', [])
            if candidates:
                parts = candidates[0].get('content', {}).get('parts', [])
                for part in parts:
                    if 'inlineData' in part:
                        b64 = part['inlineData']['data']
                        img = Image.open(io.BytesIO(base64.b64decode(b64)))
                        if img.mode == 'RGBA':
                            img = img.convert('RGB')
                        img.save(file_path, quality=95)
                        return "SUCCESS"
            print("   No image in response")
            return "ERROR"
        elif res.status_code == 429:
            return "QUOTA_LIMIT"
        else:
            print(f"   API error {res.status_code}: {res.text[:150]}")
            return "ERROR"
    except Exception as e:
        print(f"   System error: {str(e)[:150]}")
        return "ERROR"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Limit number of articles to process for testing")
    args = parser.parse_args()

    os.makedirs(SAVE_DIR_WEB, exist_ok=True)
    os.makedirs(SAVE_DIR_PINS, exist_ok=True)

    tracker = load_json(TRACKER_FILE, [])
    scenes = load_json(SCENES_FILE, ["A rustic kitchen table", "A bright marble countertop"])
    router_mapping = load_json(ROUTER_MAPPING_FILE, {})

    # Filter: only articles that exist on disk
    items_to_process = []
    for item in tracker:
        slug = item.get("slug")
        if slug and os.path.exists(os.path.join(ARTICLES_DIR, f"{slug}.md")):
            items_to_process.append(item)

    if not items_to_process:
        print("No articles found on disk. Nothing to generate.")
        return

    if args.limit > 0:
        items_to_process = items_to_process[:args.limit]

    print(f"\n{'='*50}")
    print(f"  Image Generation ({MODEL_NAME})")
    print(f"  {len(items_to_process)} articles queued")
    print(f"{'='*50}\n")

    quota_hit = False
    generated_count = 0

    for idx, item in enumerate(items_to_process, 1):
        if quota_hit:
            break

        slug = item['slug']
        base_title = item.get('pin_title', slug)
        
        print(f"\n[{idx}/{len(items_to_process)}] {slug}")

        # Web Image (16:9)
        web_filename = f"{slug}-main.jpg"
        web_path = os.path.join(SAVE_DIR_WEB, web_filename)
        
        if not os.path.exists(web_path):
            scene = random.choice(scenes)
            prompt_web = f"{base_title}, {scene}. Realistic food photography. No text on the image."
            print(f"  -> Web image (16:9) [{scene[:40]}]...")
            status = call_api(prompt_web, web_path, aspect_ratio="16:9")
            
            if status == "QUOTA_LIMIT":
                print("Quota limit hit — run again to continue.")
                quota_hit = True
                break
            elif status == "SUCCESS":
                generated_count += 1
                item['image_web'] = f"/images/{web_filename}"
            time.sleep(3)
        else:
            print("  -> Web image exists, skipping.")
            item['image_web'] = f"/images/{web_filename}"

        # Pin Images (3:4)
        slug_mapping = router_mapping.get(slug, {})
        pin_paths = []
        
        for v_num in range(1, 5):
            v_key = f"v{v_num}"
            pin_filename = f"{slug}_{v_key}.jpg"
            pin_path = os.path.join(SAVE_DIR_PINS, pin_filename)
            
            variant_title = slug_mapping.get(v_key, {}).get("title", base_title)
            
            if not os.path.exists(pin_path):
                scene = random.choice(scenes)
                prompt_pin = f'{variant_title}, {scene}. Realistic food photography. Write ONLY the text "{variant_title}" on the image in a bold, readable font. No other text.'
                print(f"  -> Pin {v_key} (3:4) [{scene[:40]}]...")
                status = call_api(prompt_pin, pin_path, aspect_ratio="3:4")
                
                if status == "QUOTA_LIMIT":
                    print("Quota limit hit — run again to continue.")
                    quota_hit = True
                    break
                elif status == "SUCCESS":
                    generated_count += 1
                time.sleep(3)
            else:
                print(f"  -> Pin {v_key} exists, skipping.")
                
            if os.path.exists(pin_path):
                pin_paths.append(f"public/images/pins/{pin_filename}")

        if not quota_hit:
            item['image_pins'] = pin_paths
            item['status'] = "IMAGES_READY"
            print("  DONE - Images ready")

        # Save tracker incrementally
        save_json(TRACKER_FILE, tracker)
        
        if not quota_hit:
            time.sleep(6)  # Pause between articles

    print(f"\nDone! Generated {generated_count} images.")

if __name__ == '__main__':
    main()
