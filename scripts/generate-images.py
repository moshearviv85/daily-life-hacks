"""
Image Generation Script - Daily Life Hacks
Uses Nano Banana Pro (Gemini 3 Pro Image) for all images.
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
import random
from datetime import datetime
from PIL import Image

# ==========================================
# CONFIG
# ==========================================
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "nano-banana-pro-preview"
PINS_PER_ARTICLE = 4
SITE_URL = "https://www.daily-life-hacks.com"

# Paths
PROJECT_DIR = "."
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
SCENES_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "image-scenes.json")
ROUTER_MAPPING_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "router-mapping.json")
DRAFTS_DIR = os.path.join(PROJECT_DIR, "pipeline-data", "drafts")
SAVE_DIR_WEB = os.path.join(PROJECT_DIR, "public", "images")
SAVE_DIR_PINS = os.path.join(PROJECT_DIR, "public", "images", "pins")
EXPORT_CSV = os.path.join(PROJECT_DIR, "pipeline-data", "pins-export.csv")

# Limit (set to 0 for all, or N for test run)
LIMIT = 0
# Comma-separated slugs, e.g. SET GENERATE_IMAGES_ONLY=slug-a,slug-b
# If set, only those slugs are processed (must exist in tracker + on disk).
# ==========================================


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
            print(f"   No image in response: {json.dumps(data, indent=2)[:200]}")
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
    os.makedirs(SAVE_DIR_WEB, exist_ok=True)
    os.makedirs(SAVE_DIR_PINS, exist_ok=True)

    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        tracker = json.load(f)

    with open(SCENES_FILE, 'r', encoding='utf-8') as f:
        scenes = json.load(f)

    router_mapping = {}
    if os.path.exists(ROUTER_MAPPING_FILE):
        with open(ROUTER_MAPPING_FILE, 'r', encoding='utf-8') as f:
            try:
                router_mapping = json.load(f)
            except json.JSONDecodeError:
                pass

    # Filter: site articles or pipeline drafts (same slug .md must exist on disk)
    ARTICLES_DIR = os.path.join(PROJECT_DIR, "src", "data", "articles")

    def slug_has_markdown_source(slug):
        if not slug:
            return False
        return os.path.exists(os.path.join(ARTICLES_DIR, f"{slug}.md")) or os.path.exists(
            os.path.join(DRAFTS_DIR, f"{slug}.md")
        )

    items = [item for item in tracker if item.get("slug") and slug_has_markdown_source(item["slug"])]

    if not items:
        print("No articles found. Nothing to generate.")
        return

    only = [s.strip() for s in os.getenv("GENERATE_IMAGES_ONLY", "").split(",") if s.strip()]
    if only:
        want = set(only)
        items = [item for item in items if item.get("slug") in want]

    if LIMIT > 0:
        items = items[:LIMIT]

    print(f"\n{'='*50}")
    print(f"  Image Generation ({MODEL_NAME})")
    print(f"  {len(items)} articles, {len(items) * 5} total images")
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
            scene = random.choice(scenes)
            prompt_web = f"{title}, {scene}. Realistic food photography. No text on the image."

            print(f"  -> Web image (16:9) [{scene[:40]}]...")
            status = call_api(prompt_web, web_path, aspect_ratio="16:9")
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

            variant_key = f"v{v}"
            variant_title = title
            if slug in router_mapping and variant_key in router_mapping[slug]:
                variant_title = router_mapping[slug][variant_key]

            if not os.path.exists(pin_path):
                scene = random.choice(scenes)
                prompt_pin = f"""{variant_title}, {scene}. Realistic food photography.
Write ONLY the text "{variant_title}" on the image in a bold, readable font. No other text."""

                print(f"  -> Pin v{v}/{PINS_PER_ARTICLE} [{scene[:40]}]...")
                status = call_api(prompt_pin, pin_path, aspect_ratio="3:4")
                if status == "QUOTA_LIMIT":
                    print("  QUOTA LIMIT - stopping.")
                    quota_hit = True
                    break
                elif status == "SUCCESS":
                    generated_count += 1
                elif status == "ERROR":
                    print(f"  -> Pin v{v} failed, continuing to next version.")
                time.sleep(4)
            else:
                print(f"  -> Pin v{v} exists, skipping.")

            # Only add to export if file exists on disk
            if os.path.exists(pin_path):
                pin_paths.append(f"public/images/pins/{pin_filename}")

                # Add to pin export
                hashtag_str = " ".join([f"#{h}" for h in hashtags]) if isinstance(hashtags, list) else str(hashtags)
                destination_url = f"{SITE_URL}/{slug}-v{v}"
                board = "Healthy Recipes" if category == "recipes" else "Nutrition Tips"

                pin_export_rows.append({
                    "image_filename": pin_filename,
                    "pin_title": variant_title,
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
