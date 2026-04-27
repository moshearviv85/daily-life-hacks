"""Tests for scripts/lib/image_resize.py.

The helper takes raw bytes from FAL (PNG/webp/JPEG, often oversize), and emits
a JPEG of bounded dimensions and quality so the file size matches what the
site CDN can serve cheaply.
"""
from __future__ import annotations

import io

import pytest

try:
    from scripts.lib.image_resize import to_jpeg
    _IMPORT_OK = True
except ImportError:
    _IMPORT_OK = False

try:
    from PIL import Image
    _PIL_OK = True
except ImportError:
    _PIL_OK = False


def _make_png_bytes(w: int, h: int) -> bytes:
    img = Image.new("RGB", (w, h), color=(200, 100, 50))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def test_module_imports():
    assert _IMPORT_OK, "Could not import scripts.lib.image_resize"


@pytest.mark.skipif(not _PIL_OK, reason="Pillow not installed")
def test_to_jpeg_preserves_aspect_when_under_max():
    src = _make_png_bytes(800, 600)  # 4:3
    out = to_jpeg(src, max_width=1920, max_height=1080)
    img = Image.open(io.BytesIO(out))
    assert img.format == "JPEG"
    assert img.size == (800, 600)


@pytest.mark.skipif(not _PIL_OK, reason="Pillow not installed")
def test_to_jpeg_downscales_oversized_hero():
    src = _make_png_bytes(3072, 1536)  # actual Recraft v4 Pro hero size
    out = to_jpeg(src, max_width=1920, max_height=1080)
    img = Image.open(io.BytesIO(out))
    assert img.format == "JPEG"
    assert img.size[0] <= 1920
    assert img.size[1] <= 1080
    assert img.size == (1920, 960)  # 16:9 aspect preserved


@pytest.mark.skipif(not _PIL_OK, reason="Pillow not installed")
def test_to_jpeg_downscales_oversized_pin():
    src = _make_png_bytes(1500, 2250)  # 2:3 portrait, oversize
    out = to_jpeg(src, max_width=1000, max_height=1500)
    img = Image.open(io.BytesIO(out))
    assert img.size[0] <= 1000
    assert img.size[1] <= 1500
    assert img.size == (1000, 1500)  # exact 2:3 fit


@pytest.mark.skipif(not _PIL_OK, reason="Pillow not installed")
def test_to_jpeg_strips_alpha():
    src_img = Image.new("RGBA", (400, 400), color=(0, 200, 100, 128))
    buf = io.BytesIO()
    src_img.save(buf, format="PNG")
    out = to_jpeg(buf.getvalue(), max_width=1000, max_height=1000)
    img = Image.open(io.BytesIO(out))
    assert img.mode == "RGB"
    assert img.format == "JPEG"


@pytest.mark.skipif(not _PIL_OK, reason="Pillow not installed")
def test_to_jpeg_size_smaller_than_source_for_real_photo_proxy():
    """Solid-color images don't compress well as JPEG; use a noisy synthetic
    approximation of a photo to verify JPEG is meaningfully smaller than PNG."""
    import random
    random.seed(42)
    img = Image.new("RGB", (1024, 1024))
    pixels = img.load()
    for y in range(1024):
        for x in range(1024):
            pixels[x, y] = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    src = buf.getvalue()
    out = to_jpeg(src, max_width=1024, max_height=1024, quality=85)
    # JPEG with quality 85 of noise should still be smaller than PNG of noise.
    assert len(out) < len(src), f"JPEG ({len(out)}) not smaller than PNG ({len(src)})"
