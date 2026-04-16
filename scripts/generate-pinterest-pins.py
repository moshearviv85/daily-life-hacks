"""
Pinterest Pins Generation Script - Daily Life Hacks
Model: Nano Banana Pro (nano-banana-pro-preview) via :generateContent endpoint

Generates 5 PORTRAIT pins per article WITH text overlay:
  {slug}_v1.jpg … {slug}_v5.jpg   (3:4 portrait)

Key: imageConfig.aspectRatio:"3:4" is set in the payload AND the prompt
     strongly reinforces portrait orientation.
     Landscape results are auto-detected, moved to trash, and retried once.
"""
import os, json, requests, base64, io, time, csv, shutil, random
from datetime import datetime
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────
API_KEY    = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "nano-banana-pro-preview"
API_URL    = (
    f"https://generativelanguage.googleapis.com/v1beta/models"
    f"/{MODEL_NAME}:generateContent?key={API_KEY}"
)

PINS_PER_ARTICLE = 5
SITE_URL         = "https://www.daily-life-hacks.com"

PROJECT_DIR         = "."
CSV_PATH            = os.path.join(PROJECT_DIR, "pipeline-data", "production-sheet.csv")
SCENES_FILE         = os.path.join(PROJECT_DIR, "pipeline-data", "image-scenes.json")
ROUTER_MAPPING_FILE = os.path.join(PROJECT_DIR, "pipeline-data", "router-mapping.json")
ARTICLES_DIR        = os.path.join(PROJECT_DIR, "src", "data", "articles")
DRAFTS_DIR          = os.path.join(PROJECT_DIR, "pipeline-data", "drafts")
SAVE_DIR_PINS       = os.path.join(PROJECT_DIR, "public", "images", "pins")
TRASH_DIR           = os.path.join(PROJECT_DIR, "pipeline-data", "images-trash")
EXPORT_CSV          = os.path.join(PROJECT_DIR, "pipeline-data", "pins-export.csv")

LIMIT                  = 0    # 0 = all; N = first N (test runs)
SLEEP_BETWEEN_PINS     = 5    # seconds between pins
SLEEP_BETWEEN_ARTICLES = 8    # seconds between articles
RATE_LIMIT_WAIT        = 65   # seconds to pause on 429
MAX_RETRIES            = 3
# ────────────────────────────────────────────────────────────────────────────

# Five visual styles, one per variant
VARIANT_STYLES = [
    "bright, clean, white or light background",
    "dark, moody, warm dramatic lighting",
    "flat-lay overhead perspective, styled surface",
    "close-up macro of key ingredient or texture",
    "rustic cozy lifestyle setting with props",
]


def call_api(prompt: str, file_path: str) -> str:
    """
    Call Nano Banana Pro via :generateContent.
    Returns SUCCESS | QUOTA_LIMIT | ERROR.

    imageConfig.aspectRatio:"3:4" is included in generationConfig.
    responseModalities must include TEXT alongside IMAGE for imageConfig to work.
    """
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE", "TEXT"],
            "temperature": 2.0,
            "imageConfig": {"aspectRatio": "3:4"},
        },
    }
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(API_URL, json=payload, timeout=120)
            if r.status_code == 200:
                data = r.json()
                for candidate in data.get("candidates", []):
                    for part in candidate.get("content", {}).get("parts", []):
                        if "inlineData" in part:
                            b64 = part["inlineData"]["data"]
                            img = Image.open(io.BytesIO(base64.b64decode(b64)))
                            if img.mode == "RGBA":
                                img = img.convert("RGB")
                            img.save(file_path, quality=95)
                            return "SUCCESS"
                print(f"   No image in response: {json.dumps(data)[:300]}")
                return "ERROR"
            elif r.status_code == 429:
                if attempt < MAX_RETRIES - 1:
                    print(f"   Rate limit – waiting {RATE_LIMIT_WAIT}s…")
                    time.sleep(RATE_LIMIT_WAIT)
                else:
                    return "QUOTA_LIMIT"
            else:
                print(f"   API error {r.status_code}: {r.text[:200]}")
                return "ERROR"
        except Exception as e:
            print(f"   Exception: {e}")
            return "ERROR"
    return "QUOTA_LIMIT"


def is_portrait(path: str) -> bool:
    try:
        with Image.open(path) as im:
            return im.height >= im.width
    except Exception:
        return False


def build_prompt(title: str, scene: str, variant_num: int) -> str:
    style = VARIANT_STYLES[(variant_num - 1) % len(VARIANT_STYLES)]
    return (
        f"PORTRAIT 3:4 vertical pin. Tall not wide. "
        f"{title}. {scene}. {style}. Realistic food photography. "
        f'Print ONLY the title text "{title}" in a large bold font on the image. '
        "No other text, no logo, no watermark. "
        "Image must be taller than it is wide."
    )


def generate_pin(title: str, scene: str, variant_num: int, pin_path: str, label: str) -> str:
    """Generate one pin with up to one orientation-retry. Returns SUCCESS|QUOTA_LIMIT|ERROR."""
    prompt  = build_prompt(title, scene, variant_num)
    tmp     = pin_path + ".tmp.jpg"

    status = call_api(prompt, tmp)
    if status != "SUCCESS":
        return status

    if is_portrait(tmp):
        shutil.move(tmp, pin_path)
        return "SUCCESS"

    # Landscape → move to trash, retry with stronger prompt
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.move(tmp, os.path.join(TRASH_DIR, f"{label}-{ts}.landscape.jpg"))
    print(f"  -> Landscape detected – retrying with stronger portrait prompt…")

    retry_prompt = "STRICT PORTRAIT ORIENTATION ONLY. DO NOT generate a landscape image. " + prompt
    status = call_api(retry_prompt, tmp)
    if status != "SUCCESS":
        return status

    if is_portrait(tmp):
        shutil.move(tmp, pin_path)
        return "SUCCESS"

    # Still landscape
    shutil.move(tmp, os.path.join(TRASH_DIR, f"{label}-{ts}.landscape2.jpg"))
    print(f"  -> Still landscape after retry – skipping.")
    return "ERROR"


def has_markdown(slug: str) -> bool:
    return bool(slug) and (
        os.path.exists(os.path.join(ARTICLES_DIR, f"{slug}.md"))
        or os.path.exists(os.path.join(DRAFTS_DIR, f"{slug}.md"))
    )


def main():
    os.makedirs(SAVE_DIR_PINS, exist_ok=True)
    os.makedirs(TRASH_DIR, exist_ok=True)

    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        tracker = list(reader)
    with open(SCENES_FILE, "r", encoding="utf-8") as f:
        scenes = json.load(f)

    router_mapping = {}
    if os.path.exists(ROUTER_MAPPING_FILE):
        try:
            with open(ROUTER_MAPPING_FILE, "r", encoding="utf-8") as f:
                router_mapping = json.load(f)
        except json.JSONDecodeError:
            pass

    items = [i for i in tracker if has_markdown(i.get("slug", ""))]

    only = [s.strip() for s in os.getenv("GENERATE_IMAGES_ONLY", "").split(",") if s.strip()]
    if only:
        want = set(only)
        items = [i for i in items if i["slug"] in want]
    else:
        # Filter by missing/wrong-orientation pins only — NOT by status.
        def needs_pins(item):
            slug = item.get("slug", "")
            for v in range(1, PINS_PER_ARTICLE + 1):
                p = os.path.join(SAVE_DIR_PINS, f"{slug}_v{v}.jpg")
                if not os.path.exists(p) or not is_portrait(p):
                    return True
            return False
        items = [i for i in items if needs_pins(i)]

    if LIMIT > 0:
        items = items[:LIMIT]

    print(f"\n{'='*54}")
    print(f"  Pinterest Pins  |  {MODEL_NAME}")
    print(f"  {len(items)} articles  ·  up to {len(items) * PINS_PER_ARTICLE} pins")
    print(f"{'='*54}\n")

    quota_hit      = False
    generated      = 0
    pin_export_rows = []

    for item in items:
        if quota_hit:
            break

        slug        = item.get("slug", "")
        title       = item.get("pin_title") or item.get("title") or slug.replace("-", " ").title()
        description = item.get("description", "")
        alt_text    = item.get("alt_text", "")
        hashtags    = item.get("hashtags", [])
        category    = item.get("category", "")

        print(f"\n[{datetime.now().strftime('%H:%M:%S')}]  {slug}")

        pin_paths = []

        for v in range(1, PINS_PER_ARTICLE + 1):
            pin_filename = f"{slug}_v{v}.jpg"
            pin_path     = os.path.join(SAVE_DIR_PINS, pin_filename)

            # Per-variant title from router_mapping (if available)
            variant_key   = f"v{v}"
            variant_title = title
            if slug in router_mapping and variant_key in router_mapping[slug]:
                variant_title = router_mapping[slug][variant_key]

            if os.path.exists(pin_path) and is_portrait(pin_path):
                print(f"  -> Pin v{v}/{PINS_PER_ARTICLE}: OK (exists, portrait).")
                pin_paths.append(f"public/images/pins/{pin_filename}")
            else:
                if os.path.exists(pin_path):
                    # File exists but wrong orientation – delete and regen
                    print(f"  -> Pin v{v}/{PINS_PER_ARTICLE}: wrong orientation – regenerating.")
                    os.remove(pin_path)

                scene  = random.choice(scenes)
                label  = f"{slug}_v{v}"
                print(f"  -> Pin v{v}/{PINS_PER_ARTICLE} [{scene[:45]}]…")

                status = generate_pin(variant_title, scene, v, pin_path, label)

                if status == "QUOTA_LIMIT":
                    quota_hit = True
                    break
                elif status == "SUCCESS":
                    generated += 1
                    pin_paths.append(f"public/images/pins/{pin_filename}")

                time.sleep(SLEEP_BETWEEN_PINS)

            if os.path.exists(pin_path):
                hashtag_str = " ".join(f"#{h}" for h in hashtags) if isinstance(hashtags, list) else str(hashtags)
                board = (
                    "High Fiber Dinner and Gut Health Recipes"
                    if category == "recipes"
                    else "Gut Health Tips and Nutrition Charts"
                )
                pin_export_rows.append({
                    "image_filename":  pin_filename,
                    "image_url":       f"https://www.daily-life-hacks.com/images/pins/{pin_filename}",
                    "pin_title":       variant_title,
                    "description":     f"{description} {hashtag_str}".strip(),
                    "destination_url": f"{SITE_URL}/{slug}?utm_content={variant_key}",
                    "board":           board,
                    "alt_text":        alt_text,
                })

        if not quota_hit:
            item["image_pins"] = pin_paths
            item["status"]     = "IMAGES_READY"
            print(f"  DONE – {len(pin_paths)}/5 pins  ({slug})")

            # with open(TRACKER_FILE, "w", encoding="utf-8") as f:
            #    json.dump(tracker, f, indent=2, ensure_ascii=False)

        time.sleep(SLEEP_BETWEEN_ARTICLES)

    # Append to CSV (never overwrite history)
    if pin_export_rows:
        fieldnames = ["image_filename", "image_url", "pin_title", "description",
                      "destination_url", "board", "alt_text"]
        write_header = not os.path.exists(EXPORT_CSV)
        with open(EXPORT_CSV, "a", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            if write_header:
                w.writeheader()
            w.writerows(pin_export_rows)
        print(f"\nCSV: {EXPORT_CSV}  (+{len(pin_export_rows)} rows appended)")

    print(f"\n{'='*54}")
    print(f"  Generated {generated} new pins.")
    if quota_hit:
        print("  Quota hit – re-run to resume.")
    print(f"{'='*54}")


if __name__ == "__main__":
    main()
