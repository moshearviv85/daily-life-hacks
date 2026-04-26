import os
import json
import time
import requests
import base64

# ==========================================
# CONFIGURATION — Edit these values
# ==========================================
API_KEY = "YOUR_GOOGLE_API_KEY_HERE"
PROJECT_DIR = "."  # root of the Astro project
TRACKER_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
IMG_DIR = os.path.join(PROJECT_DIR, "public", "images")
PINS_DIR = os.path.join(IMG_DIR, "pins")
MODEL_NAME = "imagen-3.0-generate-001" # Note: Imagen 4.0 is not globally available without enterprise yet, using the stable API format
# If the user has access to imagen-4.0-ultra-generate-001 through AI Studio, they can change this to match their endpoint exactly.
# ==========================================

def load_tracker():
    if not os.path.exists(TRACKER_FILE):
        return None
    with open(TRACKER_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_tracker(data):
    with open(TRACKER_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def generate_image(prompt, filepath):
    """Calls Imagen API and saves the base64 output to a file."""
    if os.path.exists(filepath):
        print(f"⏭️ Skipping (already exists): {filepath}")
        return True

    print(f"🎨 Generating image: {os.path.basename(filepath)}")
    
    # Endpoint structure for Google Studio Imagen
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:predict?key={API_KEY}"
    
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1, 
            "aspectRatio": "3:4"
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 429:
            print("❌ Rate Limit Exceeded (429).")
            return "429"
            
        response.raise_for_status()
        data = response.json()
        
        # Parse based on API structure
        b64_data = None
        if "predictions" in data and len(data["predictions"]) > 0:
            pred = data["predictions"][0]
            if "bytesBase64Encoded" in pred:
                b64_data = pred["bytesBase64Encoded"]
                
        if not b64_data:
            print(f"❌ Unrecognized API response structure: {str(data)[:200]}...")
            return False
            
        img_bytes = base64.b64decode(b64_data)
        with open(filepath, 'wb') as f:
            f.write(img_bytes)
            
        print(f"✅ Saved to {filepath}")
        return True

    except Exception as e:
        print(f"❌ HTTP Error: {e}")
        if hasattr(e, 'response') and e.response:
            print(e.response.text)
        return False

def main():
    if API_KEY == "YOUR_GOOGLE_API_KEY_HERE":
        print("❌ Error: Please open scripts/4-images.py and replace YOUR_GOOGLE_API_KEY_HERE with your Google API Key.")
        return

    print("🚀 Running 4-images.py: Generating images via Imagen API...")
    os.makedirs(IMG_DIR, exist_ok=True)
    os.makedirs(PINS_DIR, exist_ok=True)
    
    tracker = load_tracker()
    if not tracker: return

    for item in tracker:
        if item.get('status') == 'VALIDATED':
            print(f"\n🖼️ Processing Article: {item['slug']}")
            
            # Generate Main Web Image (Clean)
            main_path = os.path.join(IMG_DIR, f"{item['slug']}-main.jpg")
            prompt_main = f"""Create a high-quality, professional image for a food and nutrition blog.
CONTENT TOPIC: {item['description']}
DESIGN REQUIREMENTS: Vertical 3:4 aspect ratio. Modern food photography with professional lighting.
CRITICAL INSTRUCTION: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS on the image. Clean composition only."""
            
            res = generate_image(prompt_main, main_path)
            if res == "429": break
            if res:
                item['image_web'] = os.path.relpath(main_path, PROJECT_DIR).replace('\\', '/')
            
            time.sleep(4) # Rate limit padding
            
            # Generate 4 Pinterest Pins (With Text)
            pins = []
            for i in range(1, 5):
                pin_path = os.path.join(PINS_DIR, f"{item['slug']}-pin-{i}.jpg")
                prompt_pin = f"""Create a high-quality, professional Pinterest pin image for food and nutrition content.
CONTENT TOPIC: {item['description']}
TITLE TO DISPLAY ON IMAGE: "{item['pin_title']}"
DESIGN REQUIREMENTS:
- Format: Vertical 3:4 aspect ratio (Pinterest standard)
- Style: Modern food photography aesthetic with professional lighting
- Text overlay: The title must be clearly visible in an elegant, bold, readable font
- Colors: Vibrant but natural
- Quality: High resolution, Pinterest worthy"""

                # Variation hint to get different images
                if i == 2: prompt_pin += "\n- Variation: Use a slightly darker, moody, warm lighting style."
                if i == 3: prompt_pin += "\n- Variation: Use a bright, airy, flat-lay overhead perspective."
                if i == 4: prompt_pin += "\n- Variation: Focus tightly on ingredients with beautiful typography."

                res2 = generate_image(prompt_pin, pin_path)
                if res2 == "429": return # Stop completely
                if res2:
                    pins.append(os.path.relpath(pin_path, PROJECT_DIR).replace('\\', '/'))
                    
                time.sleep(4) # Rate limit padding
                
            item['image_pins'] = pins
            
            if item['image_web'] and len(item['image_pins']) == 4:
                item['status'] = 'IMAGES_READY'
            
            save_tracker(tracker)
            print(f"⏳ Sleeping 10s before next article to respect rate limits...")
            time.sleep(10)

    print("\n✅ Image generation sweep complete.")

if __name__ == "__main__":
    main()
