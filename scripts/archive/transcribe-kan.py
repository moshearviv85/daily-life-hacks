#!/usr/bin/env python3
"""
transcribe-kan.py
Downloads audio from a Kan (kan.org.il) program page and transcribes it with Whisper.

Usage:
  python scripts/transcribe-kan.py <URL>

Example:
  python scripts/transcribe-kan.py "https://www.kan.org.il/content/kan/kan-tarbut/p-9326/"

Requirements (install once):
  pip install yt-dlp openai-whisper
  # On Windows you also need ffmpeg: https://ffmpeg.org/download.html
"""

import sys
import os
import subprocess
import tempfile
import re

def check_deps():
    missing = []
    try:
        import yt_dlp
    except ImportError:
        missing.append("yt-dlp")
    try:
        import whisper
    except ImportError:
        missing.append("openai-whisper")
    if missing:
        print(f"[ERROR] Missing packages: {', '.join(missing)}")
        print(f"        Run: pip install {' '.join(missing)}")
        sys.exit(1)

def download_audio(url: str, out_dir: str) -> str:
    """Download audio from the given URL using yt-dlp. Returns path to downloaded file."""
    import yt_dlp

    out_template = os.path.join(out_dir, "kan_audio.%(ext)s")
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": out_template,
        "quiet": False,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "128",
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    # Find the downloaded file
    for f in os.listdir(out_dir):
        if f.startswith("kan_audio"):
            return os.path.join(out_dir, f)

    raise FileNotFoundError("Audio file not found after download.")

def transcribe(audio_path: str, language: str = "he") -> str:
    """Transcribe audio file with Whisper. Returns transcript text."""
    import whisper

    print(f"\n[INFO] Loading Whisper model 'medium' (downloads once ~1.5GB)...")
    model = whisper.load_model("medium")

    print(f"[INFO] Transcribing {audio_path} ...")
    result = model.transcribe(audio_path, language=language, verbose=True)
    return result["text"]

def save_transcript(text: str, audio_path: str) -> str:
    """Save transcript next to the audio file."""
    base = os.path.splitext(audio_path)[0]
    out_path = base + "_transcript.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    return out_path

def main():
    if len(sys.argv) < 2:
        url = "https://www.kan.org.il/content/kan/kan-tarbut/p-9326/"
        print(f"[INFO] No URL given, using default:\n  {url}")
    else:
        url = sys.argv[1]

    check_deps()

    with tempfile.TemporaryDirectory() as tmp:
        print(f"\n[STEP 1] Downloading audio from:\n  {url}")
        audio_path = download_audio(url, tmp)
        print(f"[OK] Audio saved: {audio_path}")

        print(f"\n[STEP 2] Transcribing...")
        transcript = transcribe(audio_path)

        # Move audio out of temp dir so it survives
        final_audio = os.path.join(os.getcwd(), "kan_audio.mp3")
        import shutil
        shutil.copy(audio_path, final_audio)

    # Save transcript
    transcript_path = os.path.join(os.getcwd(), "kan_transcript.txt")
    with open(transcript_path, "w", encoding="utf-8") as f:
        f.write(transcript)

    print(f"\n[DONE]")
    print(f"  Audio:      {final_audio}")
    print(f"  Transcript: {transcript_path}")
    print(f"\n--- TRANSCRIPT PREVIEW ---")
    print(transcript[:1000])
    print("..." if len(transcript) > 1000 else "")

if __name__ == "__main__":
    main()
