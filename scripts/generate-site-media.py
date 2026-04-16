"""
Site Media Generation Script - Daily Life Hacks
Model: Imagen 4 Ultra (imagen-4.0-ultra-generate-001) via :predict endpoint

**Reads (no CSV writes):**
- ``pipeline-data/production-sheet.csv`` — ``slug``, ``title``, and
  **pre-filled** ``image_main_filename``, ``image_ingredients_filename``,
  ``image_video_filename`` (basenames only; used as output filenames).
- ``pipeline-data/image-scenes.json`` — random scene lines.

**Disk:** writes under ``public/images/``, ``public/images/ingredients/``,
``public/images/video/`` using the basename from the CSV column for each slot.

**Skip vs generate:** for each slot, if the file **already exists** on disk with
the correct orientation, the script **skips** (no API call). If the file is
missing or wrong orientation, it **generates** (same basename). Deleting a bad
image and re-running will recreate it.

Main + ingredients share one random scene per row; video uses its own scene.
Aspect ratios unchanged: 16:9 landscape (main, ingredients), 9:16 portrait (video).
"""
import csv
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
PRODUCTION_SHEET  = os.path.join(PROJECT_DIR, "pipeline-data", "production-sheet.csv")
SCENES_FILE       = os.path.join(PROJECT_DIR, "pipeline-data", "image-scenes.json")
SAVE_DIR_WEB      = os.path.join(PROJECT_DIR, "public", "images")
SAVE_DIR_ING      = os.path.join(PROJECT_DIR, "public", "images", "ingredients")
SAVE_DIR_VIDEO    = os.path.join(PROJECT_DIR, "public", "images", "video")

LIMIT                  = 0
SLEEP_BETWEEN_IMAGES   = 4
SLEEP_BETWEEN_ARTICLES = 8
RATE_LIMIT_WAIT        = 65
MAX_RETRIES            = 3
HTTP_TIMEOUT           = int(os.getenv("GENERATE_SITE_MEDIA_HTTP_TIMEOUT", "180"))
VIDEO_ONLY             = os.getenv("GENERATE_VIDEO_ONLY", "").strip().lower() in ("1", "true", "yes", "y")

REQUIRED_COLUMNS = (
    "slug",
    "title",
    "image_main_filename",
    "image_ingredients_filename",
    "image_video_filename",
)
# ────────────────────────────────────────────────────────────────────────────


def call_api(prompt: str, file_path: str, aspect_ratio: str = "16:9") -> str:
    """Call Imagen 4 :predict. Returns SUCCESS | QUOTA_LIMIT | ERROR."""
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": aspect_ratio},
    }
    for attempt in range(MAX_RETRIES):
        try:
            r = requests.post(API_URL, json=payload, timeout=HTTP_TIMEOUT)
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
    with Image.open(path) as im:
        return im.width > im.height


def image_is_portrait(path: str) -> bool:
    with Image.open(path) as im:
        return im.height > im.width


def need_regen(path: str, want_landscape: bool) -> bool:
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
        return True


def pad_row(row: list[str], width: int) -> None:
    while len(row) < width:
        row.append("")


def cell(row: list[str], col: int) -> str:
    if col >= len(row):
        return ""
    return row[col] if row[col] else ""


def slot_needs_api(basename_cell: str, save_dir: str, want_landscape: bool) -> bool:
    """True if this slot should run (non-empty basename in CSV and file missing or bad)."""
    raw = basename_cell.strip()
    if not raw:
        return False
    path = os.path.join(save_dir, os.path.basename(raw))
    return need_regen(path, want_landscape)


def process_image_slot(
    label: str,
    prompt: str,
    save_dir: str,
    basename_cell: str,
    aspect_ratio: str,
    want_landscape: bool,
    count_ref: list,
) -> bool:
    """
    Returns False only on QUOTA_LIMIT.
    Uses basename from CSV (column value); never writes CSV.
    """
    raw = basename_cell.strip()
    if not raw:
        print(f"  -> {label}: skip (empty filename in CSV).")
        return True

    base = os.path.basename(raw)
    file_path = os.path.join(save_dir, base)

    if not need_regen(file_path, want_landscape):
        print(f"  -> {label}: skip (exists on disk, OK orientation).")
        return True

    print(f"  -> {label} ({aspect_ratio}) -> {base}.")
    status = call_api(prompt, file_path, aspect_ratio)
    if status == "QUOTA_LIMIT":
        print("  QUOTA LIMIT – stopping.")
        return False
    if status == "SUCCESS":
        count_ref[0] += 1
    time.sleep(SLEEP_BETWEEN_IMAGES)
    return True


def load_sheet_and_indices() -> tuple[list[list[str]], dict[str, int]] | tuple[None, None]:
    if not os.path.exists(PRODUCTION_SHEET):
        print(f"ERROR: Missing {PRODUCTION_SHEET}")
        return None, None
    try:
        with open(PRODUCTION_SHEET, "r", encoding="utf-8", newline="") as f:
            rows = list(csv.reader(f))
    except OSError as e:
        print(f"ERROR: Cannot read production sheet: {e}")
        return None, None
    if len(rows) < 2:
        print("ERROR: production-sheet has no data rows.")
        return None, None
    header = rows[0]
    try:
        idx = {name: header.index(name) for name in REQUIRED_COLUMNS}
    except ValueError as e:
        print(f"ERROR: production-sheet.csv missing required column: {e}")
        return None, None
    return rows, idx


def row_needs_pass(row: list[str], idx: dict[str, int], header_len: int) -> bool:
    """True if at least one slot has a basename and needs generation."""
    pad_row(row, header_len)
    v = cell(row, idx["image_video_filename"])
    m = cell(row, idx["image_main_filename"])
    i = cell(row, idx["image_ingredients_filename"])
    if VIDEO_ONLY:
        return slot_needs_api(v, SAVE_DIR_VIDEO, False)
    return (
        slot_needs_api(v, SAVE_DIR_VIDEO, False)
        or slot_needs_api(m, SAVE_DIR_WEB, True)
        or slot_needs_api(i, SAVE_DIR_ING, True)
    )


def main():
    os.makedirs(SAVE_DIR_WEB, exist_ok=True)
    os.makedirs(SAVE_DIR_ING, exist_ok=True)
    os.makedirs(SAVE_DIR_VIDEO, exist_ok=True)

    all_rows, idx = load_sheet_and_indices()
    if all_rows is None or idx is None:
        return

    header = all_rows[0]
    hi = max(idx.values())

    with open(SCENES_FILE, "r", encoding="utf-8") as f:
        scenes = json.load(f)

    only = [s.strip() for s in os.getenv("GENERATE_IMAGES_ONLY", "").split(",") if s.strip()]
    want_only = set(only) if only else None

    work_indices: list[int] = []
    for r_idx in range(1, len(all_rows)):
        row = all_rows[r_idx]
        pad_row(row, len(header))
        if len(row) <= hi:
            continue
        slug = cell(row, idx["slug"]).strip()
        if not slug:
            continue
        if want_only is not None and slug not in want_only:
            continue
        if not row_needs_pass(row, idx, len(header)):
            continue
        work_indices.append(r_idx)

    if LIMIT > 0:
        work_indices = work_indices[:LIMIT]

    print(f"\n{'='*54}")
    print(f"  Site Media  |  {MODEL_NAME}")
    print(f"  Read CSV (no writes): {PRODUCTION_SHEET}")
    print(f"  Scenes (read only): {SCENES_FILE}")
    print(f"  HTTP timeout: {HTTP_TIMEOUT}s")
    print(f"  {len(work_indices)} row(s) with at least one missing/bad image")
    print(f"{'='*54}\n")

    quota_hit = False
    count = [0]

    for r_idx in work_indices:
        if quota_hit:
            break

        row = all_rows[r_idx]
        pad_row(row, len(header))
        slug = cell(row, idx["slug"]).strip()
        title = cell(row, idx["title"]).strip()
        if not title:
            title = slug.replace("-", " ").title()

        video_cell = cell(row, idx["image_video_filename"])
        main_cell = cell(row, idx["image_main_filename"])
        ing_cell = cell(row, idx["image_ingredients_filename"])

        print(f"\n[{datetime.now().strftime('%H:%M:%S')}]  {slug}")

        video_scene = random.choice(scenes)
        p_video = (
            f"{title}, {video_scene}. "
            "Vertical cinematic food photography for a short-form video background. "
            "Portrait orientation. "
            "No text, no words, no watermarks."
        )
        # DISABLED AS PER REQUEST
        # ok = process_image_slot(
        #     "video bg (9:16)",
        #     p_video,
        #     SAVE_DIR_VIDEO,
        #     video_cell,
        #     "9:16",
        #     False,
        #     count,
        # )
        # if not ok:
        #     quota_hit = True
        #     break

        if not VIDEO_ONLY:
            scene = random.choice(scenes)
            p_main = (
                f"{title}, {scene}. "
                "Realistic food photography, beautifully plated finished dish. "
                "No text, no words, no watermarks."
            )
            ok = process_image_slot(
                "main dish (16:9)",
                p_main,
                SAVE_DIR_WEB,
                main_cell,
                "16:9",
                True,
                count,
            )
            if not ok:
                quota_hit = True
                break

            p_ing = (
                f"Raw fresh ingredients for {title}, {scene}. "
                "Realistic food photography, overhead or slight-angle flat-lay, "
                "ingredients spread beautifully, no cooked food. "
                "No text, no words, no watermarks."
            )
            # DISABLED AS PER REQUEST
            # ok = process_image_slot(
            #     "ingredients (16:9)",
            #     p_ing,
            #     SAVE_DIR_ING,
            #     ing_cell,
            #     "16:9",
            #     True,
            #     count,
            # )
            # if not ok:
            #     quota_hit = True
            #     break

        if not quota_hit:
            print(f"  DONE pass for ({slug})")

        time.sleep(SLEEP_BETWEEN_ARTICLES)

    print(f"\n{'='*54}")
    print(f"  New images written this run: {count[0]}")
    if quota_hit:
        print("  Quota hit – re-run to resume.")
    print(f"{'='*54}")


if __name__ == "__main__":
    main()
