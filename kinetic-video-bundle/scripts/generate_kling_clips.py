"""
generate_kling_clips.py
Generate 4 Kling video clips via fal.ai SDK
Output: remotion-project/public/{SLUG}/images/
"""

import os, sys, time, requests, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import fal_client

# ── Config ────────────────────────────────────────────────────────────────────
SLUG     = "dlh-cabbage"
MODEL    = "fal-ai/kling-video/v1.6/standard/text-to-video"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR  = os.path.join(BASE_DIR, "remotion-project", "public", SLUG, "images")

# ── Load FAL_KEY ──────────────────────────────────────────────────────────────
def load_fal_key():
    if os.environ.get("FAL_KEY"):
        return os.environ["FAL_KEY"]
    env_path = r"C:\Users\offic\Desktop\dlh-fresh\.env"
    if os.path.exists(env_path):
        for line in open(env_path).read().splitlines():
            if line.startswith("FAL_KEY="):
                return line.split("=", 1)[1].strip()
    sys.exit("FAL_KEY not found in .env")

# ── 4 prompts for dlh-cabbage ─────────────────────────────────────────────────
CLIPS = [
    {
        "name": "bg-kling-1.mp4",
        "prompt": "Fresh green cabbage head being sliced on a dark slate cutting board, knife cutting through crisp leaves, close-up food photography, cinematic moody warm lighting, slow motion, no text, no people",
    },
    {
        "name": "bg-kling-2.mp4",
        "prompt": "Purple and green cabbage caramelizing in a cast iron skillet, golden brown edges, olive oil sizzling, steam rising, overhead close-up shot, dark moody kitchen atmosphere, cinematic food photography, no text",
    },
    {
        "name": "bg-kling-3.mp4",
        "prompt": "Glass jar of sauerkraut with fermented cabbage, bubbles slowly rising through brine, rustic dark wood surface, warm side lighting, macro close-up, cinematic slow motion, no text, no labels",
    },
    {
        "name": "bg-kling-4.mp4",
        "prompt": "Close-up of raw cabbage leaves texture, water droplets on fresh leaves, vibrant green and white layers, dark background, macro food photography, slow gentle movement, cinematic lighting, no text",
    },
]

def on_queue_update(update):
    if hasattr(update, 'logs') and update.logs:
        for log in update.logs:
            print(f"  [{log.get('level','INFO')}] {log.get('message','')}")

def download_video(url: str, out_path: str):
    resp = requests.get(url, timeout=120, stream=True)
    resp.raise_for_status()
    with open(out_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

def main():
    fal_key = load_fal_key()
    os.environ["FAL_KEY"] = fal_key
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"\nGenerating {len(CLIPS)} Kling clips (5s each)")
    print(f"Output: {OUT_DIR}\n")

    for i, clip in enumerate(CLIPS, 1):
        out_path = os.path.join(OUT_DIR, clip["name"])

        if os.path.exists(out_path):
            size_mb = os.path.getsize(out_path) / 1024 / 1024
            print(f"[{i}/4] SKIP {clip['name']} (already exists, {size_mb:.1f} MB)")
            continue

        print(f"[{i}/4] Generating: {clip['name']}")
        print(f"      Prompt: {clip['prompt'][:80]}...")

        start = time.time()
        result = fal_client.subscribe(
            MODEL,
            arguments={
                "prompt": clip["prompt"],
                "duration": "5",
                "aspect_ratio": "9:16",
            },
            with_logs=True,
            on_queue_update=on_queue_update,
        )

        elapsed = int(time.time() - start)
        print(f"      Done in {elapsed}s")

        # find video URL
        video_url = (
            (result.get("video") or {}).get("url")
            or result.get("video_url")
            or ((result.get("videos") or [{}])[0] or {}).get("url")
        )
        if not video_url:
            sys.exit(f"No video URL in result: {result}")

        print(f"      Downloading from {video_url[:60]}...")
        download_video(video_url, out_path)
        size_mb = os.path.getsize(out_path) / 1024 / 1024
        print(f"      Saved: {clip['name']} ({size_mb:.1f} MB)\n")

    print("All clips downloaded!")
    print("\nFiles:")
    for clip in CLIPS:
        p = os.path.join(OUT_DIR, clip["name"])
        if os.path.exists(p):
            print(f"  OK {clip['name']} ({os.path.getsize(p)/1024/1024:.1f} MB)")

if __name__ == "__main__":
    main()
