"""
One-shot image generator for a single article.
Generates: public/images/{slug}-main.jpg  (16:9 landscape)
Usage: python scripts/gen-one-image.py
"""
import os, json, requests, base64, io, random
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

API_KEY    = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "imagen-4.0-ultra-generate-001"
API_URL    = (
    f"https://generativelanguage.googleapis.com/v1beta/models"
    f"/{MODEL_NAME}:predict?key={API_KEY}"
)

SLUG  = "gut-friendly-high-fiber-smoothies-for-daily-wellness"
TITLE = "Gut-Friendly Smoothie Blends for Daily Wellness"

SAVE_PATH = os.path.join("public", "images", f"{SLUG}-main.jpg")

SCENES_FILE = os.path.join("pipeline-data", "image-scenes.json")
with open(SCENES_FILE, "r", encoding="utf-8") as f:
    scenes = json.load(f)

# Pick a scene that fits smoothies well — skip market/outdoor scenes
smoothie_scenes = [s for s in scenes if not any(x in s.lower() for x in ["market", "outdoor", "patio", "garden", "bbq", "grill"])]
scene = random.choice(smoothie_scenes)
print(f"Scene: {scene}")

PROMPT = (
    f"{TITLE}, {scene}. "
    "Two or three colorful smoothie glasses on a clean kitchen counter, "
    "fresh berries, spinach, banana and chia seeds scattered nearby. "
    "Bright natural light, minimal clean styling. "
    "Realistic food photography, beautifully composed. "
    "No text, no words, no watermarks."
)
print(f"Prompt:\n{PROMPT}\n")

payload = {
    "instances": [{"prompt": PROMPT}],
    "parameters": {"sampleCount": 1, "aspectRatio": "16:9"},
}

print("Calling Imagen 4 Ultra…")
r = requests.post(API_URL, json=payload, timeout=180)
print(f"Status: {r.status_code}")

if r.status_code == 200:
    data = r.json()
    b64 = ""
    if "predictions" in data and data["predictions"]:
        b64 = data["predictions"][0].get("bytesBase64Encoded", "")
    elif "generatedImages" in data and data["generatedImages"]:
        b64 = data["generatedImages"][0]["image"].get("imageBytes", "")
    if b64:
        img = Image.open(io.BytesIO(base64.b64decode(b64)))
        if img.mode == "RGBA":
            img = img.convert("RGB")
        # Delete old image first
        if os.path.exists(SAVE_PATH):
            os.remove(SAVE_PATH)
            print("Old image deleted.")
        img.save(SAVE_PATH, quality=95)
        print(f"Saved: {SAVE_PATH}  ({img.width}x{img.height})")
    else:
        print("No image data in response:", json.dumps(data)[:300])
else:
    print("Error:", r.text[:300])
