#!/usr/bin/env python3
"""Generate text-first data pins programmatically (no AI image model).

Born from the 2026-07-13 Reddit validation: the data headline IS the creative.
Rendered with PIL so spelling is always perfect, fonts/colors are house style,
and cost per pin is zero. Output: 1000x1500 portrait JPG in public/images/pins/.

Usage:
  py -3 generate_text_pins.py --spec pins.json          # batch from a JSON spec
  py -3 generate_text_pins.py --demo                     # built-in demo batch

Spec format (list of objects):
  {
    "pin_slug": "beans-98g-text-v1",
    "headline": "Beans: 98g of Protein Per Dollar.",
    "sub": "Chicken legs: 50g. Eggs: 34g. Bacon: 9.",
    "kicker": "WE PRICED 49 PROTEIN SOURCES",       # small eyebrow line (optional)
    "big_number": "98g",                             # optional hero number
    "footer": "USDA data + real store prices, July 2026",
    "style": "cream" | "dark" | "orange"
  }
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1000, 1500
MARGIN = 90

BRAND_ORANGE = (242, 155, 48)     # #F29B30
INK = (36, 42, 51)                # near-black slate
CREAM = (250, 247, 241)
DARK_BG = (30, 36, 44)
SITE = "daily-life-hacks.com"

FONT_DIR = Path("C:/Windows/Fonts")
F_BLACK = FONT_DIR / "arialbd.ttf"
F_SERIF = FONT_DIR / "georgiab.ttf"
F_REG = FONT_DIR / "segoeui.ttf"

STYLES = {
    "cream":  {"bg": CREAM, "ink": INK, "accent": BRAND_ORANGE, "footer_ink": (120, 116, 108)},
    "dark":   {"bg": DARK_BG, "ink": (248, 246, 240), "accent": BRAND_ORANGE, "footer_ink": (150, 155, 162)},
    "orange": {"bg": BRAND_ORANGE, "ink": (28, 24, 18), "accent": (255, 255, 255), "footer_ink": (90, 60, 20)},
}


def _font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _fit_font(draw, text: str, path: Path, max_w: int, start: int, min_size: int = 44) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    """Shrink font until the wrapped block is at most 5 lines and every line fits."""
    size = start
    while size > min_size:
        font = _font(path, size)
        lines = _wrap(draw, text, font, max_w)
        if len(lines) <= 5 and all(draw.textlength(ln, font=font) <= max_w for ln in lines):
            return font, lines
        size -= 6
    font = _font(path, min_size)
    return font, _wrap(draw, text, font, max_w)


def render_pin(spec: dict, out_dir: Path) -> Path:
    style = STYLES[spec.get("style", "cream")]
    img = Image.new("RGB", (W, H), style["bg"])
    d = ImageDraw.Draw(img)
    inner_w = W - 2 * MARGIN
    y = 150

    # kicker (eyebrow)
    kicker = spec.get("kicker")
    if kicker:
        kf = _font(F_BLACK, 34)
        # letter-spaced kicker
        kick = " ".join(kicker.upper())
        while d.textlength(kick, font=kf) > inner_w and kf.size > 24:
            kf = _font(F_BLACK, kf.size - 2)
        d.text((W / 2, y), kick, font=kf, fill=style["accent"], anchor="ma")
        y += kf.size + 46
        # small rule
        d.rectangle([W / 2 - 40, y, W / 2 + 40, y + 6], fill=style["accent"])
        y += 60

    # headline
    hf, hlines = _fit_font(d, spec["headline"], F_BLACK, inner_w, 108)
    lh = int(hf.size * 1.16)
    for ln in hlines:
        d.text((W / 2, y), ln, font=hf, fill=style["ink"], anchor="ma")
        y += lh
    y += 40

    # hero number
    big = spec.get("big_number")
    if big:
        bf = _font(F_BLACK, 330)
        while d.textlength(big, font=bf) > inner_w:
            bf = _font(F_BLACK, bf.size - 10)
        d.text((W / 2, y), big, font=bf, fill=style["accent"], anchor="ma")
        y += bf.size + 60
    else:
        y += 20

    # sub line
    sub = spec.get("sub")
    if sub:
        sf, slines = _fit_font(d, sub, F_SERIF, inner_w, 60, min_size=40)
        slh = int(sf.size * 1.3)
        for ln in slines:
            d.text((W / 2, y), ln, font=sf, fill=style["ink"], anchor="ma")
            y += slh

    # footer block (anchored to bottom)
    fy = H - 150
    d.rectangle([MARGIN, fy - 40, W - MARGIN, fy - 34], fill=style["accent"])
    ff = _font(F_REG, 34)
    footer = spec.get("footer", "")
    if footer:
        d.text((W / 2, fy), footer, font=ff, fill=style["footer_ink"], anchor="ma")
        fy += 48
    d.text((W / 2, fy), SITE, font=_font(F_BLACK, 38), fill=style["ink"], anchor="ma")

    out = out_dir / f"{spec['pin_slug']}.jpg"
    img.save(out, "JPEG", quality=90)
    return out


DEMO = [
    {
        "pin_slug": "text-beans-98g-v1",
        "kicker": "We priced 49 protein sources",
        "headline": "Beans: 98g of Protein Per Dollar.",
        "big_number": "98g",
        "sub": "Chicken legs: 50g. Eggs: 34g. Bacon: 9. Same store, same month.",
        "footer": "USDA data + real store prices, July 2026",
        "style": "cream",
    },
    {
        "pin_slug": "text-protein-day-82c-v1",
        "kicker": "We priced 5 full days of protein",
        "headline": "50g of Protein a Day:",
        "big_number": "82¢",
        "sub": "From the dry goods aisle. The same 50g from the drive-thru: $9.97.",
        "footer": "USDA data + real store prices, July 2026",
        "style": "dark",
    },
    {
        "pin_slug": "text-fiber-day-62c-v1",
        "kicker": "The daily fiber target, priced",
        "headline": "30 Grams of Fiber Costs",
        "big_number": "62¢",
        "sub": "A restaurant day with the same fiber: $14.42. We priced every meal.",
        "footer": "USDA data + real menus, July 2026",
        "style": "cream",
    },
    {
        "pin_slug": "text-fiber-flour-78g-v1",
        "kicker": "We priced 53 high-fiber foods",
        "headline": "The Cheapest Fiber in the Store Isn't What You Think.",
        "big_number": None,
        "sub": "Whole wheat flour: 78g of fiber per dollar. Split peas: 71. Pinto beans: 71.",
        "footer": "USDA data + real store prices, 2026",
        "style": "orange",
    },
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", help="JSON file with a list of pin specs")
    ap.add_argument("--demo", action="store_true", help="render the built-in demo batch")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parents[2] / "public" / "images" / "pins"))
    args = ap.parse_args()

    specs = DEMO if args.demo else json.loads(Path(args.spec).read_text(encoding="utf-8"))
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    for spec in specs:
        p = render_pin(spec, out_dir)
        print(f"OK {p.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
