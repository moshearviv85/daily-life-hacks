import os
import requests
import json
import base64
from PIL import Image
import io
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "nano-banana-pro-preview"

url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"
payload = {
    "contents": [{"parts": [{"text": "A test image of a cat"}]}],
    "generationConfig": {
        "responseModalities": ["IMAGE"],
        "temperature": 2.0,
        "imageConfig": {
            "aspectRatio": "3:4"
        }
    }
}

res = requests.post(url, json=payload)
if res.status_code == 200:
    data = res.json()
    b64 = data['candidates'][0]['content']['parts'][0]['inlineData']['data']
    img = Image.open(io.BytesIO(base64.b64decode(b64)))
    print(f"Image size with 3:4 aspect ratio: {img.size}")
else:
    print(res.text)
