"""
Image Generation Script - Daily Life Hacks
Generates 5 images per article:
  - 1 web image (16:9, no text)
  - 4 Pinterest pins (3:4, with title text overlay)
Reads from content-tracker.json, updates tracker on completion.
"""
import os
import json
import requests
import base64
import io
import time
import csv
from datetime import datetime
from PIL import Image

# ==========================================
# CONFIG
# ==========================================
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "imagen-4.0-ultra-generate-001"
PINS_PER_ARTICLE = 4
SITE_URL = "https://www.daily-life-hacks.com"

# Paths
PROJECT_DIR = "."
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
SAVE_DIR_WEB = os.path.join(PROJECT_DIR, "public", "images")
SAVE_DIR_PINS = os.path.join(PROJECT_DIR, "public", "images", "pins")
EXPORT_CSV = os.path.join(PROJECT_DIR, "pipeline-data", "pins-export.csv")

# Limit (set to 0 for all, or N for test run)
LIMIT = 0
# ==========================================


def call_imagen_api(prompt, file_path, aspect_ratio="3:4"):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:predict?key={API_KEY}"
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": aspect_ratio}
    }

    try:
        res = requests.post(url, json=payload, timeout=90)
        if res.status_code == 200:
            data = res.json()
            if 'predictions' in data:
                b64 = data['predictions'][0]['bytesBase64Encoded']
            elif 'generatedImages' in data:
                b64 = data['generatedImages'][0]['image']['imageBytes']
            else:
                print(f"   Unexpected response format: {list(data.keys())}")
                return "ERROR"

            img = Image.open(io.BytesIO(base64.b64decode(b64)))
            if img.mode == 'RGBA':
                img = img.convert('RGB')
            img.save(file_path, quality=95)
            return "SUCCESS"
        elif res.status_code == 429:
            return "QUOTA_LIMIT"
        else:
            print(f"   API error {res.status_code}: {res.text[:150]}")
            return "ERROR"
    except Exception as e:
        print(f"   System error: {str(e)[:150]}")
        return "ERROR"


def main():
    os.makedirs(SAVE_DIR_WEB, exist_ok=True)
    os.makedirs(SAVE_DIR_PINS, exist_ok=True)

    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)

    # Filter: articles that have drafts (ignore tracker status, check actual files)
    items = [item for item in tracker if item.get('slug')]

    if not items:
        print("No articles found. Nothing to generate.")
        return

    if LIMIT > 0:
        items = items[:LIMIT]

    print(f"\n{'='*50}")
    print(f"  Image Generation - {len(items)} articles")
    print(f"  {len(items) * 5} total images ({len(items)} web + {len(items) * 4} pins)")
    print(f"{'='*50}\n")

    quota_hit = False
    generated_count = 0
    pin_export_rows = []

    for item in items:
        if quota_hit:
            break

        slug = item['slug']
        title = item.get('pin_title', '')
        description = item.get('description', '')
        alt_text = item.get('alt_text', '')
        hashtags = item.get('hashtags', [])
        category = item.get('category', '')

        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] {slug}")

        # =========================================
        # WEB IMAGE - 16:9, no text
        # =========================================
        web_filename = f"{slug}-main.jpg"
        web_path = os.path.join(SAVE_DIR_WEB, web_filename)

        if not os.path.exists(web_path):
            prompt_web = f"""Create a high-quality, professional image for a food and nutrition blog.
CONTENT TOPIC: {description}
DESIGN REQUIREMENTS: Horizontal 16:9 aspect ratio. Modern food photography with professional lighting. Warm, inviting colors.
CRITICAL INSTRUCTION: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS on the image. Clean composition only."""

            print(f"  -> Web image (16:9)...")
            status = call_imagen_api(prompt_web, web_path, aspect_ratio="16:9")
            if status == "QUOTA_LIMIT":
                print("  QUOTA LIMIT - stopping.")
                quota_hit = True
                break
            elif status == "SUCCESS":
                generated_count += 1
            time.sleep(3)
        else:
            print(f"  -> Web image exists, skipping.")

        # Update tracker web image
        item['image_web'] = f"/images/{web_filename}"

        # =========================================
        # PIN IMAGES - 3:4, with title text
        # =========================================
        pin_paths = []
        for v in range(1, PINS_PER_ARTICLE + 1):
            pin_filename = f"{slug}_v{v}.jpg"
            pin_path = os.path.join(SAVE_DIR_PINS, pin_filename)

            if not os.path.exists(pin_path):
                prompt_pin = f"""Create a high-quality, professional Pinterest pin image for food and nutrition.
CONTENT TOPIC: {description}
DESIGN REQUIREMENTS: Vertical 3:4 aspect ratio. Modern food photography with professional lighting.
TEXT OVERLAY: Display ONLY the exact text "{title}" on the image in an elegant, bold, readable font. Do NOT add any other text, subtitles, descriptions, hashtags, or captions. ONLY the title above."""

                print(f"  -> Pin v{v}/{PINS_PER_ARTICLE}...")
                status = call_imagen_api(prompt_pin, pin_path, aspect_ratio="3:4")
                if status == "QUOTA_LIMIT":
                    print("  QUOTA LIMIT - stopping.")
                    quota_hit = True
                    break
                elif status == "SUCCESS":
                    generated_count += 1
                time.sleep(4)
            else:
                print(f"  -> Pin v{v} exists, skipping.")

            pin_paths.append(f"public/images/pins/{pin_filename}")

            # Add to pin export
            hashtag_str = " ".join([f"#{h}" for h in hashtags]) if isinstance(hashtags, list) else str(hashtags)
            destination_url = f"{SITE_URL}/{slug}?utm_content=v{v}"
            board = "Healthy Recipes" if category == "recipes" else "Nutrition Tips"

            pin_export_rows.append({
                "image_filename": pin_filename,
                "pin_title": title,
                "description": f"{description} {hashtag_str}",
                "destination_url": destination_url,
                "board": board,
                "alt_text": alt_text
            })

        if not quota_hit:
            item['image_pins'] = pin_paths
            item['status'] = 'IMAGES_READY'
            print(f"  DONE - 5 images generated")

        # Save tracker after each article (resume support)
        with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
            json.dump(tracker, f, indent=2, ensure_ascii=False)

        time.sleep(6)  # Pause between articles

    # Export pins CSV for Tailwind app
    if pin_export_rows:
        with open(EXPORT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=["image_filename", "pin_title", "description", "destination_url", "board", "alt_text"])
            writer.writeheader()
            writer.writerows(pin_export_rows)
        print(f"\nPins export CSV: {EXPORT_CSV} ({len(pin_export_rows)} rows)")

    print(f"\n{'='*50}")
    print(f"  Done! Generated {generated_count} images.")
    if quota_hit:
        print(f"  Quota limit hit - run again later to continue.")
    print(f"{'='*50}")


if __name__ == '__main__':
    main()
