"""Quick test: Does higher temperature + creative hint produce variety?"""
import os, json, requests, base64, io
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL = "nano-banana-pro-preview"
OUT = os.path.join(".", "public", "images", "test-variety")
os.makedirs(OUT, exist_ok=True)

def gen(prompt, path, ar="3:4"):
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

tests = [
    ("variety-1", "Generate an image about: High Fiber Smoothies For Kids\nRealistic. Unique creative style. No text on the image.", "16:9"),
    ("variety-2", "Generate an image about: Fiber Rich Soup for Weight Loss Cabbage\nRealistic. Unique creative style. No text on the image.", "16:9"),
    ("variety-3", "Generate an image about: Chia Pudding Variations For Breakfast\nRealistic. Unique creative style. No text on the image.", "16:9"),
    ("variety-4", "Generate an image about: High Fiber Pizza Crust Cauliflower\nRealistic. Unique creative style. No text on the image.", "16:9"),
]

for name, prompt, ar in tests:
    path = os.path.join(OUT, f"{name}.jpg")
    print(f"[{name}] Generating...")
    if gen(prompt, path, ar):
        print(f"  SAVED: {path}")
    else:
        print(f"  FAILED")

print("\nDone! Check: public/images/test-variety/")
