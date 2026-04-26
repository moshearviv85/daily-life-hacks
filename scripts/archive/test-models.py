"""
Quick test: Compare Nano Banana Pro vs Imagen 4 Fast
2 images from each model (with text + without text) = 4 images total
"""
import os
import json
import requests
import base64
import io
from PIL import Image
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")

OUTPUT_DIR = os.path.join(".", "public", "images", "test-models")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Pick a topic from the tracker
TOPIC = "Fiber Rich Soup for Weight Loss Cabbage"


def call_imagen_fast(prompt, file_path, aspect_ratio="3:4"):
    """Imagen 4 Fast API (same as Ultra but different model)"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key={API_KEY}"
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": aspect_ratio}
    }
    res = requests.post(url, json=payload, timeout=90)
    if res.status_code == 200:
        data = res.json()
        if 'predictions' in data:
            b64 = data['predictions'][0]['bytesBase64Encoded']
        elif 'generatedImages' in data:
            b64 = data['generatedImages'][0]['image']['imageBytes']
        else:
            print(f"  Unexpected format: {list(data.keys())}")
            return False
        img = Image.open(io.BytesIO(base64.b64decode(b64)))
        if img.mode == 'RGBA':
            img = img.convert('RGB')
        img.save(file_path, quality=95)
        return True
    else:
        print(f"  Imagen Fast error {res.status_code}: {res.text[:200]}")
        return False


def call_nano_banana(prompt, file_path, aspect_ratio="3:4"):
    """Nano Banana (Gemini 2.5 Flash Image) via generateContent API"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
            "temperature": 1.0
        }
    }
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
                    return True
        print(f"  No image in response: {json.dumps(data, indent=2)[:300]}")
        return False
    else:
        print(f"  Nano Banana error {res.status_code}: {res.text[:200]}")
        return False


def call_nano_banana_pro(prompt, file_path, aspect_ratio="3:4"):
    """Nano Banana Pro via Gemini generateContent API"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
            "temperature": 1.0
        }
    }
    res = requests.post(url, json=payload, timeout=120)
    if res.status_code == 200:
        data = res.json()
        candidates = data.get('candidates', [])
        if candidates:
            parts = candidates[0].get('content', {}).get('parts', [])
            for part in parts:
                if 'inlineData' in part:
                    b64 = part['inlineData']['data']
                    mime = part['inlineData'].get('mimeType', 'image/png')
                    img = Image.open(io.BytesIO(base64.b64decode(b64)))
                    if img.mode == 'RGBA':
                        img = img.convert('RGB')
                    img.save(file_path, quality=95)
                    return True
        print(f"  No image in response: {json.dumps(data, indent=2)[:300]}")
        return False
    else:
        print(f"  Nano Banana Pro error {res.status_code}: {res.text[:200]}")
        return False


# ============================================
# TEST
# ============================================
print(f"\nTesting with topic: {TOPIC}\n")

tests = [
    {
        "name": "imagen-fast_no-text",
        "model": "imagen_fast",
        "prompt": f"""Create a high-quality, professional food photography image.
TOPIC: {TOPIC}
STYLE: Vertical 3:4 aspect ratio. Modern food photography, professional lighting.
IMPORTANT: The image must look realistic and natural - show food that real people actually eat and prepare.
CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS on the image."""
    },
    {
        "name": "imagen-fast_with-text",
        "model": "imagen_fast",
        "prompt": f"""Create a high-quality, professional Pinterest pin image with food photography.
TOPIC: {TOPIC}
STYLE: Vertical 3:4 aspect ratio. Modern food photography, professional lighting.
IMPORTANT: The image must look realistic and natural.
TEXT OVERLAY: Display ONLY the exact text "{TOPIC}" on the image in an elegant, bold, readable font. No other text."""
    },
    {
        "name": "nano-banana-pro_no-text",
        "model": "nano_banana_pro",
        "prompt": f"""Create a high-quality, professional food photography image.
TOPIC: {TOPIC}
STYLE: Vertical 3:4 aspect ratio. Modern food photography, professional lighting.
IMPORTANT: The image must look realistic and natural - show food that real people actually eat and prepare.
CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS on the image."""
    },
    {
        "name": "nano-banana-pro_with-text",
        "model": "nano_banana_pro",
        "prompt": f"""Create a high-quality, professional Pinterest pin image with food photography.
TOPIC: {TOPIC}
STYLE: Vertical 3:4 aspect ratio. Modern food photography, professional lighting.
IMPORTANT: The image must look realistic and natural.
TEXT OVERLAY: Display ONLY the exact text "{TOPIC}" on the image in an elegant, bold, readable font. No other text."""
    },
    {
        "name": "nano-banana_no-text",
        "model": "nano_banana",
        "prompt": f"""Create a high-quality, professional food photography image.
TOPIC: {TOPIC}
STYLE: Vertical 3:4 aspect ratio. Modern food photography, professional lighting.
IMPORTANT: The image must look realistic and natural - show food that real people actually eat and prepare.
CRITICAL: ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS on the image."""
    },
    {
        "name": "nano-banana_with-text",
        "model": "nano_banana",
        "prompt": f"""Create a high-quality, professional Pinterest pin image with food photography.
TOPIC: {TOPIC}
STYLE: Vertical 3:4 aspect ratio. Modern food photography, professional lighting.
IMPORTANT: The image must look realistic and natural.
TEXT OVERLAY: Display ONLY the exact text "{TOPIC}" on the image in an elegant, bold, readable font. No other text."""
    },
]

for t in tests:
    file_path = os.path.join(OUTPUT_DIR, f"{t['name']}.jpg")
    print(f"[{t['name']}] Generating...")

    if t['model'] == 'imagen_fast':
        ok = call_imagen_fast(t['prompt'], file_path, aspect_ratio="3:4")
    elif t['model'] == 'nano_banana_pro':
        ok = call_nano_banana_pro(t['prompt'], file_path)
    elif t['model'] == 'nano_banana':
        ok = call_nano_banana(t['prompt'], file_path)

    if ok:
        print(f"  SAVED: {file_path}")
    else:
        print(f"  FAILED")

print("\nDone! Check images in: public/images/test-models/")
