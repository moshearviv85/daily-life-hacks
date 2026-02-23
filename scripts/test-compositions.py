"""Test: Same topic, different COMPOSITION types (not surfaces)."""
import os, requests, base64, io
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL = "nano-banana-pro-preview"
OUT = os.path.join(".", "public", "images", "test-comps")
os.makedirs(OUT, exist_ok=True)

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

tests = [
    ("1-hands", "Two hands holding a warm bowl of cabbage soup, close-up, cozy feeling. No text."),
    ("2-macro", "Extreme close-up macro shot of cabbage soup texture, steam rising, rich details. No text."),
    ("3-cooking", "Pouring broth into a pot of cabbage and vegetables, cooking action shot. No text."),
    ("4-ingredients", "Fresh cabbage, carrots, onions and spices laid out as raw ingredients before cooking soup. No text."),
    ("5-lifestyle", "A woman smiling while eating a bowl of soup at a cafe, warm natural light. No text."),
]

for name, prompt in tests:
    path = os.path.join(OUT, f"{name}.jpg")
    print(f"[{name}] {prompt[:70]}...")
    if gen(prompt, path):
        print(f"  SAVED")
    else:
        print(f"  FAILED")

print("\nDone! Check: public/images/test-comps/")
