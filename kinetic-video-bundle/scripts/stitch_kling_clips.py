"""
stitch_kling_clips.py
Stitch 4 Kling clips into one background video using FFmpeg.
Output: remotion-project/public/dlh-cabbage/images/bg-kling-full.mp4
"""

import os, sys, subprocess, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR  = os.path.join(BASE_DIR, "remotion-project", "public", "dlh-cabbage", "images")

CLIPS = [
    os.path.join(IMG_DIR, "bg-kling-1.mp4"),
    os.path.join(IMG_DIR, "bg-kling-2.mp4"),
    os.path.join(IMG_DIR, "bg-kling-3.mp4"),
    os.path.join(IMG_DIR, "bg-kling-4.mp4"),
]
OUTPUT = os.path.join(IMG_DIR, "bg-kling-full.mp4")

def main():
    # Check all clips exist
    for clip in CLIPS:
        if not os.path.exists(clip):
            sys.exit(f"Missing clip: {clip}")

    if os.path.exists(OUTPUT):
        print(f"Already exists: {OUTPUT}")
        return

    # Build concat list file
    list_path = os.path.join(IMG_DIR, "concat_list.txt")
    with open(list_path, "w") as f:
        for clip in CLIPS:
            # Use forward slashes for ffmpeg on Windows
            f.write(f"file '{clip.replace(chr(92), '/')}'\n")

    print(f"Stitching {len(CLIPS)} clips...")

    FFMPEG = r"C:\Users\offic\Desktop\dlh-fresh\kinetic-video-bundle\remotion-project\node_modules\@remotion\compositor-win32-x64-msvc\ffmpeg.exe"
    cmd = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_path,
        # Re-encode to ensure consistent format for Remotion
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-an",  # no audio
        OUTPUT,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"FFmpeg error:\n{result.stderr}")
        sys.exit(1)

    size_mb = os.path.getsize(OUTPUT) / 1024 / 1024
    print(f"Done: bg-kling-full.mp4 ({size_mb:.1f} MB)")

    # Cleanup
    os.remove(list_path)

if __name__ == "__main__":
    main()
