"""
Site Media Generation Script - Daily Life Hacks
Model: Imagen 4 Ultra (imagen-4.0-ultra-generate-001) via :predict endpoint

Generates 3 images per article, ALL without text:
  {slug}-main.jpg        16:9  finished dish, for blog post hero
  {slug}-ingredients.jpg 16:9  raw ingredients, same scene as main
  {slug}-video.jpg       9:16  vertical, for Kinetic Video background

Main + Ingredients share the same randomly selected scene (consistency hack).

Dimension validation: existing files are checked for correct orientation.
Wrong-orientation files are deleted and regenerated automatically.
"""
import os, json, requests, base64, io, time, random
from datetime import datetime
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────
API_KEY    = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = "imagen-4.0-ultra-generate-001"
API_URL    = (
    f"https://generativelanguage.googleapis.com/v1beta/models"
    f"/{MODEL_NAME}:predict?key={API_KEY}"
)

PROJECT_DIR       = "."
TRACKER_FILE      = os.path.join(PROJECT_DIR, "pipeline-data", "content-tracker.json")
SCENES_FILE       = os.path.join(PROJECT_DIR, "pipeline-data", "image-scenes.json")
ARTICLES_DIR      = os.path.join(PROJECT_DIR, "src", "data", "articles")
DRAFTS_DIR        = os.path.join(PROJECT_DIR, "pipeline-data", "drafts")
SAVE_DIR_WEB      = os.path.join(PROJECT_DIR, "public", "images")               # main dish
SAVE_DIR_ING      = os.path.join(PROJECT_DIR, "public", "images", "ingredients") # raw ingredients
SAVE_DIR_VIDEO    = os.path.join(PROJECT_DIR, "public", "images", "video")       # kinetic video bg

LIMIT                  = 0    # 0 = all; N = first N (test runs)
SLEEP_BETWEEN_IMAGES   = 4    # seconds between API calls
SLEEP_BETWEEN_ARTICLES = 8    # seconds between articles
RATE_LIMIT_WAIT        = 65   # seconds to pause on 429
MAX_RETRIES            = 3
# If set to "1"/"true", generate ONLY the 9:16 video background per slug.
VIDEO_ONLY             = os.getenv("GENERATE_VIDEO_ONLY", "").strip().lower() in ("1", "true", "yes", "y")
# ────────────────────────────────────────────────────────────────────────────


def call_api(prompt: str, file_path: str, aspect_ratio: str = "16:9") -> str:
    """Call Imagen 4 :predict. Returns SUCCESS | QUOTA_LIMIT | ERROR."""
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": aspect_ratio},
    }
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(API_URL, json=payload, timeout=120)
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
                    img.save(file_path, quality=95)
                    return "SUCCESS"
                print(f"   No image data in response: {json.dumps(data)[:200]}")
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


def image_is_landscape(path: str) -> bool:
    """True if image width > height (i.e. correct for 16:9 targets)."""
    with Image.open(path) as im:
        return im.width > im.height


def image_is_portrait(path: str) -> bool:
    """True if image height > width (i.e. correct for 9:16 target)."""
    with Image.open(path) as im:
        return im.height > im.width


def need_regen(path: str, want_landscape: bool) -> bool:
    """
    Returns True if the file doesn't exist, or exists but has the wrong
    orientation for what we want.
    """
    if not os.path.exists(path):
        return True
    try:
        if want_landscape:
            wrong = not image_is_landscape(path)
        else:
            wrong = not image_is_portrait(path)
        if wrong:
            print(f"   [!] {os.path.basename(path)} has wrong orientation – will regenerate.")
            os.remove(path)
        return wrong
    except Exception:
        return True   # can't read → regenerate


def generate_one(
    label: str,
    prompt: str,
    file_path: str,
    aspect_ratio: str,
    want_landscape: bool,
    count_ref: list,
) -> bool:
    """Generate one image. Returns False only on QUOTA_LIMIT."""
    if not need_regen(file_path, want_landscape):
        print(f"  -> {label}: OK (exists, correct orientation).")
        return True

    print(f"  -> {label} ({aspect_ratio})…")
    status = call_api(prompt, file_path, aspect_ratio)
    if status == "QUOTA_LIMIT":
        print("  QUOTA LIMIT – stopping.")
        return False
    if status == "SUCCESS":
        count_ref[0] += 1
    time.sleep(SLEEP_BETWEEN_IMAGES)
    return True


def has_markdown(slug: str) -> bool:
    return (
        bool(slug)
        and (
            os.path.exists(os.path.join(ARTICLES_DIR, f"{slug}.md"))
            or os.path.exists(os.path.join(DRAFTS_DIR, f"{slug}.md"))
        )
    )


def main():
    os.makedirs(SAVE_DIR_WEB,   exist_ok=True)
    os.makedirs(SAVE_DIR_ING,   exist_ok=True)
    os.makedirs(SAVE_DIR_VIDEO, exist_ok=True)

    with open(TRACKER_FILE, "r", encoding="utf-8") as f:
        tracker = json.load(f)
    with open(SCENES_FILE, "r", encoding="utf-8") as f:
        scenes = json.load(f)

    items = [i for i in tracker if has_markdown(i.get("slug", ""))]

    only = [s.strip() for s in os.getenv("GENERATE_IMAGES_ONLY", "").split(",") if s.strip()]
    if only:
        want = set(only)
        items = [i for i in items if i["slug"] in want]
    else:
        # Filter by missing images only — NOT by status.
        # This way published articles with missing video/ingredients are also caught.
        def needs_work(item):
            slug = item.get("slug", "")
            missing_main  = need_regen(os.path.join(SAVE_DIR_WEB,   f"{slug}-main.jpg"),        want_landscape=True)
            missing_ing   = need_regen(os.path.join(SAVE_DIR_ING,   f"{slug}-ingredients.jpg"), want_landscape=True)
            missing_video = need_regen(os.path.join(SAVE_DIR_VIDEO, f"{slug}-video.jpg"),        want_landscape=False)
            return missing_main or missing_ing or missing_video
        items = [i for i in items if needs_work(i)]

    if LIMIT > 0:
        items = items[:LIMIT]

    print(f"\n{'='*54}")
    print(f"  Site Media  |  {MODEL_NAME}")
    print(f"  {len(items)} articles need at least one image")
    print(f"{'='*54}\n")

    quota_hit = False
    count = [0]

    for item in items:
        if quota_hit:
            break

        slug  = item.get("slug", "")
        title = item.get("pin_title") or item.get("title") or slug.replace("-", " ").title()
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}]  {slug}")

        # ── Video background – 9:16 portrait ───────────────────────────────
        video_scene = random.choice(scenes)
        p_video = (
            f"{title}, {video_scene}. "
            "Vertical cinematic food photography for a short-form video background. "
            "Portrait orientation. "
            "No text, no words, no watermarks."
        )
        ok = generate_one(
            "video bg (9:16)",
            p_video,
            os.path.join(SAVE_DIR_VIDEO, f"{slug}-video.jpg"),
            "9:16",
            want_landscape=False,
            count_ref=count,
        )
        if not ok:
            quota_hit = True
            break
        item["image_video"] = f"/images/video/{slug}-video.jpg"

        if not VIDEO_ONLY:
            # Main dish and ingredients share ONE scene for visual consistency
            scene = random.choice(scenes)

            # ── Main dish – 16:9 landscape ─────────────────────────────────
            p_main = (
                f"{title}, {scene}. "
                "Realistic food photography, beautifully plated finished dish. "
                "No text, no words, no watermarks."
            )
            ok = generate_one(
                "main dish (16:9)",
                p_main,
                os.path.join(SAVE_DIR_WEB, f"{slug}-main.jpg"),
                "16:9",
                want_landscape=True,
                count_ref=count,
            )
            if not ok:
                quota_hit = True
                break
            item["image_web"] = f"/images/{slug}-main.jpg"

            # ── Raw ingredients – 16:9 landscape (same scene) ──────────────
            p_ing = (
                f"Raw fresh ingredients for {title}, {scene}. "
                "Realistic food photography, overhead or slight-angle flat-lay, "
                "ingredients spread beautifully, no cooked food. "
                "No text, no words, no watermarks."
            )
            ok = generate_one(
                "ingredients (16:9)",
                p_ing,
                os.path.join(SAVE_DIR_ING, f"{slug}-ingredients.jpg"),
                "16:9",
                want_landscape=True,
                count_ref=count,
            )
            if not ok:
                quota_hit = True
                break
            item["image_ingredients"] = f"/images/ingredients/{slug}-ingredients.jpg"

        if not quota_hit:
            item["status"] = "SITE_MEDIA_READY"
            done_count = 1 if VIDEO_ONLY else 3
            print(f"  DONE – {done_count} image{'s' if done_count != 1 else ''}  ({slug})")

        with open(TRACKER_FILE, "w", encoding="utf-8") as f:
            json.dump(tracker, f, indent=2, ensure_ascii=False)

        time.sleep(SLEEP_BETWEEN_ARTICLES)

    print(f"\n{'='*54}")
    print(f"  Generated {count[0]} new images.")
    if quota_hit:
        print("  Quota hit – re-run to resume (already-correct images are skipped).")
    print(f"{'='*54}")


if __name__ == "__main__":
    main()
