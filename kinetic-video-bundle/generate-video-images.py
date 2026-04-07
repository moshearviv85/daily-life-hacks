"""
Generate 9:16 (Shorts format) images for kinetic videos using Imagen 4 Ultra.
Output: projects/{project}/images/img1.jpg ... imgN.jpg
"""

import os
import sys
import json
import base64
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# ─── CONFIG ────────────────────────────────────────────────────────────────────
load_dotenv(Path(__file__).parent.parent / ".env")
API_KEY = os.getenv("GEMINI_API_KEY", "")

MODEL = "imagen-4.0-ultra-generate-001"
ASPECT_RATIO = "9:16"   # Shorts / TikTok vertical format (1080x1920)
QUALITY = 95
DELAY_BETWEEN = 5        # seconds between requests

# ─── PROMPTS ─────────────────────────────────────────────────────────────────
PROJECTS = {
    "dlh-fiber-gas": {
        "images": [
            {
                "filename": "img0.jpg",
                "prompt": (
                    "Massive dramatic nuclear mushroom cloud explosion filling the sky, "
                    "cinematic vertical 9:16 composition, deep orange and red tones, "
                    "dark dramatic atmosphere, powerful and overwhelming scale, "
                    "photorealistic, no people, no text."
                ),
            },
            {
                "filename": "img1.jpg",
                "prompt": (
                    "Vibrant colorful fresh vegetables and fruits overflowing from a wooden crate, "
                    "broccoli, apples, oats, kale, bright natural light, "
                    "clean white kitchen background, vertical 9:16 composition, "
                    "fresh and inviting food photography, no text."
                ),
            },
            {
                "filename": "img2.jpg",
                "prompt": (
                    "Dark dramatic close-up of fresh broccoli florets and fiber-rich vegetables, "
                    "deep green tones, moody studio lighting, "
                    "vertical 9:16 composition, cinematic food photography, "
                    "rich textures and shadows, no text."
                ),
            },
            {
                "filename": "img3.jpg",
                "prompt": (
                    "Single red apple resting on a kitchen counter, warm morning light, "
                    "soft natural shadows, minimal composition, "
                    "vertical 9:16 format, clean domestic setting, "
                    "inviting and simple, no text."
                ),
            },
            {
                "filename": "img4.jpg",
                "prompt": (
                    "Rustic bowl of oatmeal topped with fresh berries and honey, "
                    "warm morning light, wooden table surface, "
                    "vertical 9:16 composition, cozy breakfast photography, "
                    "soft warm tones, steam rising, no text."
                ),
            },
        ]
    },
    "dlh-fiber-japan": {
        "images": [
            {
                "filename": "img1.jpg",
                "prompt": (
                    "Fresh edamame soybeans in a dark ceramic bowl, steam rising, "
                    "chopsticks resting on the side, dark moody Japanese restaurant background, "
                    "dramatic vertical composition, cinematic food photography, "
                    "deep shadows with warm highlights, no text."
                ),
            },
            {
                "filename": "img2.jpg",
                "prompt": (
                    "Traditional Japanese natto fermented soybeans in a small wooden box, "
                    "chopsticks lifting sticky strands, dark slate background, "
                    "close-up vertical shot, moody atmospheric lighting, "
                    "authentic Japanese kitchen aesthetic, no text."
                ),
            },
            {
                "filename": "img3.jpg",
                "prompt": (
                    "Burdock root gobo stir-fry in a cast iron pan, sesame seeds garnish, "
                    "dark dramatic background, vertical composition, "
                    "rustic Japanese home cooking style, warm amber lighting, "
                    "cinematic food photography, no text."
                ),
            },
            {
                "filename": "img4.jpg",
                "prompt": (
                    "Elegant Japanese food spread on dark wood: edamame bowl, miso soup, "
                    "sashimi slices, vertical overhead shot, candlelight atmosphere, "
                    "minimal styling, deep rich colors, no text."
                ),
            },
        ]
    },
    "dlh-healthy-fats": {
        "images": [
            {
                "filename": "img0.jpg",
                "prompt": (
                    "Supermarket shelf with rows of low-fat processed packaged food products, "
                    "clinical cold fluorescent lighting, pale washed-out colors, "
                    "slightly ominous mood, vertical 9:16 composition, "
                    "documentary photography style, no people, no text."
                ),
            },
            {
                "filename": "img1.jpg",
                "prompt": (
                    "Ripe avocado halved on dark slate, rich green flesh exposed, "
                    "sea salt flakes scattered, drizzle of olive oil, vertical 9:16 composition, "
                    "dramatic moody food photography, deep shadows warm highlights, no text."
                ),
            },
            {
                "filename": "img2.jpg",
                "prompt": (
                    "Premium extra virgin olive oil being poured into dark ceramic bowl, "
                    "golden stream catching light, fresh herbs on dark marble surface, "
                    "vertical 9:16 composition, cinematic close-up food photography, "
                    "Mediterranean aesthetic, rich deep tones, no text."
                ),
            },
            {
                "filename": "img3.jpg",
                "prompt": (
                    "Assorted nuts in rustic wooden bowl: walnuts, almonds, pecans, "
                    "dark moody background, scattered seeds around bowl, vertical 9:16 composition, "
                    "dramatic studio lighting, rich textures close-up, no text."
                ),
            },
            {
                "filename": "img4.jpg",
                "prompt": (
                    "Fresh Atlantic salmon fillet on dark stone surface, skin crisped, "
                    "lemon slice and fresh dill garnish, vertical 9:16 composition, "
                    "cinematic restaurant food photography, moody dramatic lighting, "
                    "rich warm amber tones, no text."
                ),
            },
        ]
    }
}

# ─── API CALL ─────────────────────────────────────────────────────────────────
def generate_image(prompt: str, output_path: Path) -> bool:
    """Call Imagen 4 Ultra predict endpoint, save JPEG."""
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{MODEL}:predict?key={API_KEY}"
    )
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": ASPECT_RATIO,
            "outputMimeType": "image/jpeg",
        },
    }

    try:
        resp = requests.post(url, json=payload, timeout=120)
    except requests.RequestException as e:
        print(f"   ERROR Request: {e}")
        return False

    if resp.status_code == 200:
        data = resp.json()
        predictions = data.get("predictions", [])
        if predictions:
            b64 = predictions[0].get("bytesBase64Encoded", "")
            if b64:
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_bytes(base64.b64decode(b64))
                size_kb = output_path.stat().st_size // 1024
                print(f"   OK Saved {output_path.name} ({size_kb} KB)")
                return True
        print(f"   ERROR No image in response: {data}")
        return False
    elif resp.status_code == 429:
        print(f"   RATE LIMIT (429). Waiting 30s...")
        time.sleep(30)
        return False
    else:
        print(f"   ERROR HTTP {resp.status_code}: {resp.text[:300]}")
        return False


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    if not API_KEY:
        print("❌ GEMINI_API_KEY not found. Check .env file.")
        sys.exit(1)

    project_name = sys.argv[1] if len(sys.argv) > 1 else None
    if project_name and project_name not in PROJECTS:
        print(f"❌ Unknown project: {project_name}")
        print(f"   Available: {list(PROJECTS.keys())}")
        sys.exit(1)

    projects_to_run = {project_name: PROJECTS[project_name]} if project_name else PROJECTS
    base = Path(__file__).parent / "projects"

    for proj_name, proj_data in projects_to_run.items():
        print(f"\nProject: {proj_name}")
        images = proj_data["images"]
        for i, img in enumerate(images):
            out_path = base / proj_name / "images" / img["filename"]
            if out_path.exists():
                print(f"   SKIP  {img['filename']} already exists.")
                continue
            print(f"   Generating {img['filename']} ({i+1}/{len(images)})...")
            print(f"   Prompt: {img['prompt'][:80]}...")
            success = generate_image(img["prompt"], out_path)
            if not success:
                print(f"   FAILED to generate {img['filename']}")
            if i < len(images) - 1:
                print(f"   Waiting {DELAY_BETWEEN}s...")
                time.sleep(DELAY_BETWEEN)

    print("\nDone.")


if __name__ == "__main__":
    main()
