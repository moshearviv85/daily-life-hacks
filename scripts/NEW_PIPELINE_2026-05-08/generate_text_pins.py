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

    # everything below the headline must end above the footer zone
    footer_top = H - 240
    sub = spec.get("sub")
    big = spec.get("big_number")

    # measure the sub block first (bottom-anchored above the footer)
    sf, slines, s_h = None, [], 0
    if sub:
        sf, slines = _fit_font(d, sub, F_SERIF, inner_w, 56, min_size=36)
        s_h = int(sf.size * 1.3) * len(slines)

    if big:
        gap = footer_top - y - s_h - 50
        size = min(300, max(120, int(gap * 0.62)))
        bf = _font(F_BLACK, size)
        while d.textlength(big, font=bf) > inner_w:
            bf = _font(F_BLACK, bf.size - 10)
        d.text((W / 2, y + max(0, (gap - bf.size) // 2)), big, font=bf,
               fill=style["accent"], anchor="ma")

    if sub:
        sy = footer_top - s_h - 20
        slh = int(sf.size * 1.3)
        for ln in slines:
            d.text((W / 2, sy), ln, font=sf, fill=style["ink"], anchor="ma")
            sy += slh

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




def render_hero_pin(spec: dict, out_dir: Path) -> Path:
    """v2 layout after owner feedback 2026-07-13: pins are scanned in half a
    second on a small feed card. ONE message: tiny kicker, one HUGE number,
    a 1-3 word title, a single short tagline line. Nothing else."""
    style = STYLES[spec.get("style", "cream")]
    img = Image.new("RGB", (W, H), style["bg"])
    d = ImageDraw.Draw(img)
    inner_w = W - 2 * MARGIN

    # tiny kicker at top
    kicker = spec.get("kicker", "")
    if kicker:
        kf = _font(F_BLACK, 36)
        kick = " ".join(kicker.upper())
        while d.textlength(kick, font=kf) > inner_w and kf.size > 24:
            kf = _font(F_BLACK, kf.size - 2)
        d.text((W / 2, 130), kick, font=kf, fill=style["accent"], anchor="ma")

    # the number: as big as the canvas allows
    number = spec["number"]
    bf = _font(F_BLACK, 460)
    while d.textlength(number, font=bf) > inner_w and bf.size > 120:
        bf = _font(F_BLACK, bf.size - 10)
    num_y = 380
    d.text((W / 2, num_y), number, font=bf, fill=style["accent"], anchor="ma")

    # title: 1-3 words, huge, max 2 lines
    title = spec.get("title", "")
    ty = num_y + bf.size + 70
    if title:
        tf, tlines = _fit_font(d, title, F_BLACK, inner_w, 130, min_size=80)
        tlh = int(tf.size * 1.1)
        for ln in tlines[:2]:
            d.text((W / 2, ty), ln, font=tf, fill=style["ink"], anchor="ma")
            ty += tlh

    # tagline: ONE line, forced to fit
    tag = spec.get("tagline", "")
    if tag:
        gf = _font(F_SERIF, 54)
        while d.textlength(tag, font=gf) > inner_w and gf.size > 34:
            gf = _font(F_SERIF, gf.size - 2)
        d.text((W / 2, ty + 40), tag, font=gf, fill=style["ink"], anchor="ma")

    # minimal footer
    fy = H - 130
    d.rectangle([W / 2 - 40, fy - 36, W / 2 + 40, fy - 30], fill=style["accent"])
    d.text((W / 2, fy), SITE, font=_font(F_BLACK, 40), fill=style["ink"], anchor="ma")
    small = spec.get("footer", "")
    if small:
        d.text((W / 2, fy + 54), small, font=_font(F_REG, 28), fill=style["footer_ink"], anchor="ma")

    out = out_dir / f"{spec['pin_slug']}.jpg"
    img.save(out, "JPEG", quality=90)
    return out




def render_claim_pin(spec: dict, out_dir: Path) -> Path:
    """v3 layout after owner feedback: a pin is ONE complete claim that tells a
    story (like a great Reddit title), big and readable, plus one support line
    that says what the article holds. Fields: kicker, claim, support, footer."""
    style = STYLES[spec.get("style", "cream")]
    img = Image.new("RGB", (W, H), style["bg"])
    d = ImageDraw.Draw(img)
    inner_w = W - 2 * MARGIN

    kicker = spec.get("kicker", "")
    if kicker:
        kf = _font(F_BLACK, 34)
        kick = " ".join(kicker.upper())
        while d.textlength(kick, font=kf) > inner_w and kf.size > 22:
            kf = _font(F_BLACK, kf.size - 2)
        d.text((W / 2, 120), kick, font=kf, fill=style["accent"], anchor="ma")
        d.rectangle([W / 2 - 40, 190, W / 2 + 40, 196], fill=style["accent"])

    # the claim: complete sentence(s), as big as fits in the middle band
    claim = spec["claim"]
    size = 96
    while size > 56:
        cf = _font(F_BLACK, size)
        lines = _wrap(d, claim, cf, inner_w)
        block_h = int(size * 1.22) * len(lines)
        if block_h <= 760 and all(d.textlength(ln, font=cf) <= inner_w for ln in lines):
            break
        size -= 4
    lh = int(size * 1.22)
    y = 300 + max(0, (760 - lh * len(lines)) // 2)
    for ln in lines:
        d.text((W / 2, y), ln, font=cf, fill=style["ink"], anchor="ma")
        y += lh

    # support line: why click (one line, forced fit)
    support = spec.get("support", "")
    if support:
        gf = _font(F_SERIF, 46)
        while d.textlength(support, font=gf) > inner_w and gf.size > 32:
            gf = _font(F_SERIF, gf.size - 2)
        d.text((W / 2, 1160), support, font=gf, fill=style["accent"], anchor="ma")

    fy = H - 130
    d.rectangle([W / 2 - 40, fy - 36, W / 2 + 40, fy - 30], fill=style["accent"])
    d.text((W / 2, fy), SITE, font=_font(F_BLACK, 40), fill=style["ink"], anchor="ma")
    small = spec.get("footer", "")
    if small:
        d.text((W / 2, fy + 54), small, font=_font(F_REG, 28), fill=style["footer_ink"], anchor="ma")

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
