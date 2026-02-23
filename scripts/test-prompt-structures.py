"""Test: Use pin description as the image prompt base."""
import os, json, requests, base64, io
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL = "nano-banana-pro-preview"
OUT = os.path.join(".", "public", "images", "test-prompts")
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

# Test with descriptions from real tracker entries
tests = [
    # A: Current approach (title-based)
    ("A-title",
     "Generate an image about: Chia Pudding Variations For Breakfast\nRealistic. Unique creative style. No text on the image."),

    # B: Description as prompt (the pin marketing description)
    ("B-description",
     "Kickstart your morning with these simple, gut-loving high-fiber breakfasts. Chia pudding, overnight oats and veggie smoothies to keep you full and support microbiome health all day! No text on the image."),

    # C: alt_text as prompt (already describes the image)
    ("C-alttext",
     "Easy High Fiber Breakfast Ideas for Gut Health - beautiful breakfast bowls with fresh toppings with oats, chia seeds for a healthy morning. No text on the image."),

    # D: Description-based, different topic
    ("D-desc-soup",
     "Warm up with this cozy, fiber-packed cabbage soup that supports healthy weight loss. Hearty vegetables, rich broth and satisfying texture make this the ultimate comfort food for your gut and waistline! No text on the image."),

    # E: alt_text based, different topic
    ("E-alt-soup",
     "Fiber Rich Soup for Weight Loss Cabbage - steaming bowl of hearty cabbage soup with colorful vegetables in rich broth for healthy weight management. No text on the image."),

    # F: Description-based, smoothie topic
    ("F-desc-smoothie",
     "Getting kids to eat fiber just got easy and fun! Blend up colorful, fruity high-fiber smoothies that taste like milkshakes but pack serious nutrition. Picky eaters approved! No text on the image."),
]

for name, prompt in tests:
    path = os.path.join(OUT, f"{name}.jpg")
    print(f"\n[{name}]")
    print(f"  Prompt: {prompt[:80]}...")
    if gen(prompt, path):
        print(f"  SAVED: {path}")
    else:
        print(f"  FAILED")

print("\nDone! Check: public/images/test-prompts/")
print("Compare A (current title-based) vs B/C/D/E/F (description/alt-text based)")
