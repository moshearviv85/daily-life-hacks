"""Image resize + JPEG re-encode helper for the FAL → public/images pipeline.

FAL returns PNG (Recraft) or PNG-default (GPT Image 2) at full resolution. The
website CDN and Pinterest both want web-friendly JPEGs. This helper takes raw
bytes from any of those sources, downscales to fit a bounding box (preserving
aspect), and re-encodes as JPEG at a controlled quality.

Used by scripts/generate_images.py (hero) and scripts/generate_pin_images.py.
"""
from __future__ import annotations

import io

from PIL import Image


def to_jpeg(
    image_bytes: bytes,
    *,
    max_width: int,
    max_height: int,
    quality: int = 85,
) -> bytes:
    """Decode bytes (any Pillow-readable format), downscale to fit max_width x
    max_height while preserving aspect, drop alpha, and re-encode as JPEG.

    Returns the encoded JPEG bytes. Caller is responsible for writing to disk.
    """
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")
    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=quality, optimize=True)
    return out.getvalue()
