"""Test: 3 images with random scenes from the scenes list."""
import os, json, random, requests, base64, io
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL = "nano-banana-pro-preview"
OUT = os.path.join(".", "public", "images", "test-random")
os.makedirs(OUT, exist_ok=True)

with open(os.path.join(".", "pipeline-data", "image-scenes.json"), 'r', encoding='utf-8') as f:
    scenes = json.load(f)

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

topics = [
    "Fiber Rich Soup for Weight Loss Cabbage",
    "High Fiber Pizza Crust Cauliflower",
    "Chia Pudding Variations For Breakfast",
]

for i, title in enumerate(topics):
    scene = random.choice(scenes)
    prompt = f"{title}, {scene}. Realistic food photography. No text on the image."
    path = os.path.join(OUT, f"test-{i+1}.jpg")
    print(f"[{i+1}] {title}")
    print(f"    Scene: {scene}")
    if gen(prompt, path):
        print(f"    SAVED")
    else:
        print(f"    FAILED")

print("\nDone! Check: public/images/test-random/")
