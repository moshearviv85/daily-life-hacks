"""Test: Same food topic with different scene settings."""
import os, requests, base64, io
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL = "nano-banana-pro-preview"
OUT = os.path.join(".", "public", "images", "test-scenes")
os.makedirs(OUT, exist_ok=True)

SCENES = [
    "on a white marble countertop",
    "on a bright modern kitchen counter",
    "on an outdoor table with natural sunlight",
    "on colorful ceramic tiles, overhead shot",
    "on a clean minimalist surface with soft lighting",
]

def gen(prompt, path, ar="16:9"):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
            "temperature": 2.0,
            "imageConfig": {"aspectRatio": ar}
        }
    }
    res = requests.post(url, json=payload, timeout=120)
    if res.status_code == 200:
        data = res.json()
        for part in data.get('candidates', [{}])[0].get('content', {}).get('parts', []):
            if 'inlineData' in part:
                img = Image.open(io.BytesIO(base64.b64decode(part['inlineData']['data'])))
                if img.mode == 'RGBA': img = img.convert('RGB')
                img.save(path, quality=95)
                return True
    print(f"  Error: {res.status_code}")
    return False

# Same topic - cabbage soup - 5 different scenes
title = "Fiber Rich Soup for Weight Loss Cabbage"

for i, scene in enumerate(SCENES):
    name = f"scene-{i+1}"
    prompt = f"{title}, {scene}. Realistic food photography. No text on the image."
    path = os.path.join(OUT, f"{name}.jpg")
    print(f"[{name}] {scene}")
    if gen(prompt, path):
        print(f"  SAVED")
    else:
        print(f"  FAILED")

print("\nDone! Check: public/images/test-scenes/")
