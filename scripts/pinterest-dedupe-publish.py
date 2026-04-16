"""
Fetch all Pinterest pins, extract:
  (1) pin image filenames if URLs contain *_vN.jpg (usually empty — Pinterest uses CDN)
  (2) canonical article slugs that already have a pin (any link path -> router-mapping)

Skip scheduling an article if its canonical slug is in (2): avoids duplicate pins when
keyword URLs already point to that article.

(3) If pipeline-data/publer-published-match.csv exists (from scripts/match-pin-images.py on
    the "publer published" folder), merge those canonical filenames into the used-image set.
    That blocks re-scheduling the exact pin image files Publer already shipped.

Usage:
  set PINTEREST_ACCESS_TOKEN=pina_...
  python scripts/pinterest-dedupe-publish.py

Or:
  python scripts/pinterest-dedupe-publish.py pina_...

Requires: network. No LLM. Typical runtime: a few seconds.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = Path(__file__).resolve().parent.parent

PIN_FILENAME_RE = re.compile(r"([\w-]+_v\d+\.jpg)", re.I)


def fetch_all_pins(token: str) -> list:
    all_pins = []
    bookmark = None
    page = 0
    while True:
        page += 1
        url = "https://api.pinterest.com/v5/pins?page_size=250"
        if bookmark:
            url += f"&bookmark={bookmark}"
        req = Request(url, headers={"Authorization": f"Bearer {token}"})
        with urlopen(req) as resp:
            data = json.loads(resp.read().decode())
        items = data.get("items", [])
        all_pins.extend(items)
        print(f"  API page {page}: +{len(items)} pins (total {len(all_pins)})")
        bookmark = data.get("bookmark")
        if not bookmark or not items or page > 50:
            break
    return all_pins


def load_router_reverse(path: Path) -> dict[str, str]:
    """Map URL path segment (keyword or base slug) -> canonical article slug."""
    rev: dict[str, str] = {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    for base_slug, variants in raw.items():
        if not isinstance(variants, dict):
            continue
        rev[base_slug] = base_slug
        for _vk, vv in variants.items():
            if isinstance(vv, dict) and vv.get("url_slug"):
                rev[str(vv["url_slug"]).strip()] = base_slug
    return rev


def path_from_site_link(link: str) -> str | None:
    if not link or "daily-life-hacks.com" not in link:
        return None
    try:
        from urllib.parse import urlparse

        p = urlparse(link)
        seg = p.path.strip("/").split("/")[0] if p.path.strip("/") else ""
        return seg.split("?")[0] or None
    except Exception:
        return None


def extract_image_filenames_from_pin(pin: dict) -> set[str]:
    """Normalize to lowercase basename for stable compare."""
    found: set[str] = set()
    media = pin.get("media") or {}
    images = media.get("images") or {}
    for _k, img in images.items():
        if isinstance(img, dict) and img.get("url"):
            for m in PIN_FILENAME_RE.finditer(img["url"]):
                found.add(m.group(1).lower())
    for key in ("image_url",):
        v = pin.get(key)
        if isinstance(v, str):
            for m in PIN_FILENAME_RE.finditer(v):
                found.add(m.group(1).lower())
    # Catch any *_vN.jpg buried in media JSON (Pinterest shapes vary)
    media_blob = json.dumps(media)
    for m in PIN_FILENAME_RE.finditer(media_blob):
        found.add(m.group(1).lower())
    return found


def collect_used_images_and_slugs(
    pins: list, router_rev: dict[str, str], article_slugs: set[str]
) -> tuple[set[str], set[str]]:
    """
    Returns:
      used_image_files: lowercase 'slug_v1.jpg' seen on any pin media
      linked_base_slugs: canonical article slugs that already have at least one pin link
    """
    used_images: set[str] = set()
    linked_bases: set[str] = set()

    for pin in pins:
        used_images |= extract_image_filenames_from_pin(pin)
        link = pin.get("link") or ""
        seg = path_from_site_link(link)
        if not seg:
            continue
        base = router_rev.get(seg, seg)
        if base in article_slugs:
            linked_bases.add(base)

    return used_images, linked_bases


def load_publer_matched_canonical_files(match_csv: Path) -> set[str]:
    """Lowercase basenames like slug_v1.jpg from publer-published-match.csv."""
    if not match_csv.is_file():
        return set()
    out: set[str] = set()
    with open(match_csv, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("matched_canonical") or "").strip().lower()
            if name.endswith(".jpg"):
                out.add(name)
    return out


def main() -> None:
    token = os.environ.get("PINTEREST_ACCESS_TOKEN", "").strip()
    if len(sys.argv) > 1 and sys.argv[1].startswith("pina_"):
        token = sys.argv[1].strip()

    if not token:
        print("Set PINTEREST_ACCESS_TOKEN or pass access token as first argument.")
        sys.exit(1)

    router_path = BASE / "pipeline-data" / "router-mapping.json"
    router_rev = load_router_reverse(router_path) if router_path.exists() else {}

    articles_dir = BASE / "src" / "data" / "articles"
    article_slugs = {p.stem for p in articles_dir.glob("*.md")}

    audit_path = BASE / "pipeline-data" / "pinterest-clean-audit.json"
    if not audit_path.exists():
        print(f"Missing {audit_path} — run the clean-audit pipeline first.")
        sys.exit(1)

    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    candidates = sorted(audit.get("not_on_pinterest_with_images", []))

    pins_json_data = json.loads((BASE / "pipeline-data" / "pins.json").read_text(encoding="utf-8"))
    pins_by_slug = {p["slug"]: p for p in pins_json_data}

    pins_dir = BASE / "public" / "images" / "pins"

    print("Fetching pins from Pinterest API...")
    try:
        raw_pins = fetch_all_pins(token)
    except HTTPError as e:
        print(f"HTTP error: {e.code} {e.reason}")
        sys.exit(1)
    except URLError as e:
        print(f"Network error: {e}")
        sys.exit(1)

    used_images, linked_bases = collect_used_images_and_slugs(
        raw_pins, router_rev, article_slugs
    )

    publer_match_csv = BASE / "pipeline-data" / "publer-published-match.csv"
    publer_used = load_publer_matched_canonical_files(publer_match_csv)
    api_image_hits = len(used_images)
    used_images |= publer_used
    print(
        f"Merged Publer-export hash map: +{len(publer_used)} canonical pin files "
        f"(from {publer_match_csv.name})"
    )

    report = {
        "generated_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_pins_fetched": len(raw_pins),
        "used_pin_image_files_from_api_only": api_image_hits,
        "used_pin_image_files_from_publer_folder": len(publer_used),
        "used_pin_image_files_merged_count": len(used_images),
        "used_pin_image_files_sample": sorted(used_images)[:60],
        "linked_base_slugs_count": len(linked_bases),
        "linked_base_slugs_sample": sorted(linked_bases)[:30],
        "rules": {
            "skip_row_if_image_file_in_used_set": True,
            "skip_article_if_canonical_slug_in_linked_bases": True,
            "publer_folder_match_csv": str(publer_match_csv.relative_to(BASE)),
            "note": "API image URLs rarely contain our filenames; publer-published-match.csv (perceptual hash) supplies used pin files with high confidence.",
        },
    }

    # --- Build rows (same copy logic as build-pinterest-publish-csv.py) ---

    def get_frontmatter(slug: str) -> dict:
        path = articles_dir / f"{slug}.md"
        if not path.exists():
            return {}
        text = path.read_text(encoding="utf-8")
        fm: dict = {}
        in_fm = False
        for line in text.split("\n"):
            if line.strip() == "---":
                if in_fm:
                    break
                in_fm = True
                continue
            if in_fm and ":" in line:
                key = line.split(":")[0].strip()
                val = line.split(":", 1)[1].strip().strip('"').strip("'")
                fm[key] = val
        return fm

    def get_variants(slug: str) -> list[int]:
        out = []
        for f in sorted(pins_dir.glob(f"{slug}_v*.jpg")):
            m = re.match(r".+_v(\d+)\.jpg", f.name)
            if m:
                out.append(int(m.group(1)))
        return out

    BOARD_MAP = {
        "recipes": "High Fiber Dinner and Gut Health Recipes",
        "nutrition": "Gut Health Tips and Nutrition Charts",
        "tips": "Healthy Breakfast, Smoothies and Snacks",
    }

    skipped_image: list[str] = []
    skipped_already_linked: list[str] = []
    pin_rows: list[dict] = []

    for slug in candidates:
        if slug in linked_bases:
            skipped_already_linked.append(slug)
            continue

        variants = get_variants(slug)
        if not variants:
            continue

        pin_data = pins_by_slug.get(slug)
        fm = get_frontmatter(slug)
        title = fm.get("title", slug.replace("-", " ").title())
        excerpt = fm.get("excerpt", "")
        category = fm.get("category", "tips")
        board = BOARD_MAP.get(category, "Healthy Breakfast, Smoothies and Snacks")
        alt_base = fm.get("imageAlt", f"{title} - healthy food photo")

        for v in variants:
            fname = f"{slug}_v{v}.jpg".lower()
            if fname in used_images:
                skipped_image.append(f"{slug} v{v} ({fname})")
                continue

            if pin_data and v == 1:
                pt = pin_data.get("pin_title", title)
                desc = pin_data.get("description", excerpt)
                alt = pin_data.get("alt_text", alt_base)
            else:
                pt = title
                if excerpt:
                    cat_tags = {
                        "recipes": "#HealthyRecipes #EasyMeals #MealPrep #HealthyEating",
                        "nutrition": "#NutritionTips #HealthyEating #WellnessJourney #FoodFacts",
                        "tips": "#KitchenHacks #CookingTips #FoodStorage #KitchenTips",
                    }
                    tags = (
                        pin_data.get("hashtags", cat_tags.get(category, ""))
                        if pin_data
                        else cat_tags.get(category, "")
                    )
                    desc = f"{excerpt} {tags}"
                else:
                    desc = f"{title}. Find out more on Daily Life Hacks."
                alt = alt_base

            image_url = f"https://www.daily-life-hacks.com/images/pins/{slug}_v{v}.jpg"
            link = f"https://www.daily-life-hacks.com/{slug}"

            pin_rows.append({
                "slug": slug,
                "variant": v,
                "title": pt,
                "text": desc,
                "link": link,
                "media_url": image_url,
                "alt_text": alt,
                "board": board,
            })

    report["skipped_variants_image_already_on_pinterest"] = skipped_image
    report["skipped_articles_already_have_pin_via_link_router"] = skipped_already_linked
    report["info_articles_with_any_site_link"] = sorted(linked_bases)
    report["rows_scheduled"] = len(pin_rows)
    report["articles_in_csv"] = sorted({r["slug"] for r in pin_rows})

    out_json = BASE / "pipeline-data" / "pinterest-dedupe-report.json"
    out_json.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {out_json}")

    # Schedule: 5/day, US times, start today
    US_TIMES = ["08:15", "10:45", "13:15", "16:00", "19:30"]
    start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    day_offset = 0
    slot = 0
    for row in pin_rows:
        date = start_date + timedelta(days=day_offset)
        row["date"] = f"{date.strftime('%Y-%m-%d')} {US_TIMES[slot]}"
        slot += 1
        if slot >= 5:
            slot = 0
            day_offset += 1

    headers = [
        "Date - Intl. format or prompt",
        "Text",
        "Link(s) - Separated by comma for FB carousels",
        "Media URL(s) - Separated by comma",
        "Title - For the video, pin, PDF ..",
        "Label(s) - Separated by comma",
        "Alt text(s) - Separated by ||",
        "Comment(s) - Separated by ||",
        "Pin board, FB album, or Google category",
        "Post subtype - I.e. story, reel, PDF ..",
        "CTA - For Facebook links or Google",
        "Reminder - For stories, reels, shorts, and TikToks",
    ]

    csv_path = BASE / "pipeline-data" / "pinterest-publish-queue.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, quoting=csv.QUOTE_ALL)
        w.writerow(headers)
        for row in pin_rows:
            w.writerow([
                row["date"],
                row["text"],
                row["link"],
                row["media_url"],
                row["title"],
                "",
                row["alt_text"],
                "",
                row["board"],
                "",
                "",
                "",
            ])

    print(f"Wrote {csv_path} ({len(pin_rows)} rows)")
    print(f"Skipped articles (already have pin -> same article via router): {len(skipped_already_linked)}")
    print(f"Skipped variants (image filename in API response): {len(skipped_image)}")
    if skipped_already_linked:
        print("  Skipped slugs:", ", ".join(skipped_already_linked[:20]), "..." if len(skipped_already_linked) > 20 else "")
    if skipped_image:
        print("  Sample skipped variants:", skipped_image[:10])


if __name__ == "__main__":
    main()
