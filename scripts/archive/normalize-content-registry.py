import csv
import json
import os
from datetime import datetime, UTC


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "pipeline-data")
PUBLIC_DATA_DIR = os.path.join(BASE_DIR, "public", "data")
ARTICLES_DIR = os.path.join(BASE_DIR, "src", "data", "articles")
PIN_IMAGES_DIR = os.path.join(BASE_DIR, "public", "images", "pins")

TRACKER_PATH = os.path.join(DATA_DIR, "content-tracker.json")
ROUTER_PATH = os.path.join(DATA_DIR, "router-mapping.json")
PINS_PATH = os.path.join(DATA_DIR, "pins.json")
OFFERS_PATH = os.path.join(DATA_DIR, "offers.json")
FINAL_CSV_PATH = os.path.join(DATA_DIR, "pins-publer-final.csv")
REGISTRY_PATH = os.path.join(DATA_DIR, "content-registry.json")
PUBLIC_REGISTRY_PATH = os.path.join(PUBLIC_DATA_DIR, "content-registry.json")
REPORT_PATH = os.path.join(DATA_DIR, "normalization-report.json")


def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp_path, path)


def load_csv_rows(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def get_article_frontmatter(path):
    with open(path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    data = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"')
    return data


def infer_board(category):
    if category == "recipes":
        return "High Fiber Recipes"
    if category == "tips":
        return "Healthy Meal Prep & Kitchen Tips"
    return "Gut Health & Nutrition Tips"


def infer_offer_id(category):
    if category == "recipes":
        return "recipe-pack"
    if category == "tips":
        return "kitchen-checklist"
    return "fiber-guide"


def infer_email_segment(category, variant_title):
    title = variant_title.lower()
    if category == "recipes":
        if any(term in title for term in ["breakfast", "smoothie", "parfait", "oat", "chia"]):
            return "recipes-breakfast"
        return "recipes-main"
    if category == "tips":
        if any(term in title for term in ["store", "freeze", "fresh", "mold"]):
            return "tips-storage"
        return "tips-systems"
    if any(term in title for term in ["vs", "comparison", "better", "what is"]):
        return "nutrition-comparisons"
    return "nutrition-foundations"


def infer_search_intent(title):
    title = title.lower()
    if any(term in title for term in ["how", "what", "best", "guide", "tips"]):
        return "problem-solving"
    if "vs" in title or "comparison" in title:
        return "comparison"
    return "discovery"


def infer_angle(category, title):
    title = title.lower()
    if category == "tips":
        return "save-time-and-money"
    if category == "recipes":
        if any(term in title for term in ["breakfast", "parfait", "chia", "smoothie"]):
            return "easy-breakfast"
        return "easy-meal"
    if any(term in title for term in ["vs", "better", "what is"]):
        return "clarity-and-confidence"
    return "healthy-eating-basics"


def build_intro(title, category, angle):
    if category == "tips":
        return f"{title} is one of those practical wins that can make everyday cooking feel simpler, less wasteful, and easier to repeat."
    if category == "recipes":
        return f"{title} is built for real life, with simple ingredients, a clear payoff, and enough flavor to make it worth repeating."
    return f"{title} answers the question clearly, strips out the noise, and helps readers make a more confident everyday food decision."


def clean_text(value):
    return " ".join((value or "").replace("\r", " ").replace("\n", " ").split())


def canonicalize_variant_key(value):
    cleaned = clean_text(value)
    cleaned = cleaned.replace("https://www.daily-life-hacks.com/", "")
    cleaned = cleaned.split("?", 1)[0]
    return cleaned.strip().strip("/")


def detect_blockers(*values):
    blockers = []
    text = " ".join(clean_text(v).lower() for v in values)
    rules = {
        "risky-detox-language": ["detox", "cleanse", "body cleanse"],
        "risky-weight-loss-language": ["fat burning", "fat-burning", "weight loss"],
        "risky-medical-angle": [
            "constipation",
            "constipation relief",
            "severe constipation",
            "bloating remedy",
            "cholesterol",
        ],
        "risky-kids-angle": ["toddlers", "kid friendly", "kids"],
        "risky-hype-language": ["gut glow guaranteed", " guaranteed!"],
    }
    for blocker, patterns in rules.items():
        if any(pattern in text for pattern in patterns):
            blockers.append(blocker)
    return blockers


def main():
    tracker = load_json(TRACKER_PATH, [])
    router = load_json(ROUTER_PATH, {})
    pins = load_json(PINS_PATH, [])
    offers = load_json(OFFERS_PATH, {})
    final_rows = load_csv_rows(FINAL_CSV_PATH)

    tracker_by_slug = {item.get("slug"): item for item in tracker if item.get("slug")}
    pins_by_slug = {item.get("slug"): item for item in pins if item.get("slug")}

    csv_variant_lookup = {}
    for row in final_rows:
        link = canonicalize_variant_key(row["Link(s) - Separated by comma for FB carousels"])
        csv_variant_lookup.setdefault(link, []).append(row)

    articles = {}
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "articles_total": 0,
        "variants_total": 0,
        "blocked_variants": 0,
        "article_conflicts": [],
    }

    for base_slug, variants in router.items():
        article_path = os.path.join(ARTICLES_DIR, f"{base_slug}.md")
        frontmatter = get_article_frontmatter(article_path) if os.path.exists(article_path) else {}
        tracker_item = tracker_by_slug.get(base_slug, {})
        pins_item = pins_by_slug.get(base_slug, {})
        category = frontmatter.get("category") or tracker_item.get("category") or pins_item.get("category") or "nutrition"
        offer_id = infer_offer_id(category)

        article_entry = {
            "base_slug": base_slug,
            "category": category,
            "canonical_url": f"https://www.daily-life-hacks.com/{base_slug}",
            "content_path": f"src/data/articles/{base_slug}.md",
            "image": frontmatter.get("image") or tracker_item.get("image_web") or f"/images/{base_slug}-main.jpg",
            "image_alt": frontmatter.get("imageAlt") or pins_item.get("alt_text") or "",
            "title": frontmatter.get("title") or tracker_item.get("pin_title") or base_slug,
            "excerpt": frontmatter.get("excerpt") or tracker_item.get("description") or pins_item.get("description") or "",
            "status": tracker_item.get("status", "unknown"),
            "legal_risk_level": "high" if detect_blockers(base_slug, frontmatter.get("title", ""), frontmatter.get("excerpt", "")) else "normal",
            "offer_id": offer_id,
        }

        variant_entries = {}
        for variant_id, variant_data in variants.items():
            url_slug = variant_data.get("url_slug")
            title = variant_data.get("title", base_slug)
            matching_rows = csv_variant_lookup.get(canonicalize_variant_key(url_slug), [])
            csv_row = matching_rows[0] if matching_rows else None
            description_source = ""
            if csv_row:
                description_source = csv_row.get("Text", "")
            elif pins_item.get("description"):
                description_source = pins_item["description"]
            elif tracker_item.get("description"):
                description_source = tracker_item["description"]

            board = csv_row.get("Pin board, FB album, or Google category", "").strip() if csv_row else infer_board(category)
            media_url = csv_row.get("Media URL(s) - Separated by comma", "").strip() if csv_row else f"https://www.daily-life-hacks.com/images/pins/{base_slug}_{variant_id}.jpg"
            pin_image_name = media_url.split("/")[-1] if media_url else f"{base_slug}_{variant_id}.jpg"
            pin_image_path = os.path.join(PIN_IMAGES_DIR, pin_image_name)
            title_from_csv = csv_row.get("Title - For the video, pin, PDF ..", "").strip() if csv_row else ""

            blockers = detect_blockers(url_slug, title, description_source, title_from_csv)
            if not os.path.exists(pin_image_path):
                blockers.append("missing-pin-image")
            if not os.path.exists(article_path):
                blockers.append("missing-article")

            audience_angle = infer_angle(category, title)
            variant_entries[variant_id] = {
                "variant_id": variant_id,
                "url_slug": url_slug,
                "title": title,
                "description": clean_text(description_source),
                "intro_paragraph": build_intro(title, category, audience_angle),
                "search_intent": infer_search_intent(title),
                "audience_angle": audience_angle,
                "cta_variant": offers.get(offer_id, {}).get("cta_headline", "Get the guide"),
                "email_segment": infer_email_segment(category, title),
                "board": board or infer_board(category),
                "pin_image": f"/images/pins/{pin_image_name}",
                "destination_url": f"https://www.daily-life-hacks.com/{url_slug}",
                "scheduled_count": len(matching_rows),
                "publish_ready": len(blockers) == 0,
                "blocked_reasons": blockers,
            }

            report["variants_total"] += 1
            if blockers:
                report["blocked_variants"] += 1

        articles[base_slug] = {
            "article": article_entry,
            "variants": variant_entries,
        }
        report["articles_total"] += 1

        tracker_slug = tracker_item.get("slug")
        if tracker_slug and tracker_slug != base_slug:
            report["article_conflicts"].append(
                {
                    "base_slug": base_slug,
                    "tracker_slug": tracker_slug,
                    "issue": "tracker-router-slug-mismatch",
                }
            )

    registry = {
        "generated_at": datetime.now(UTC).isoformat(),
        "offers": offers,
        "articles": articles,
    }

    save_json(REGISTRY_PATH, registry)
    save_json(PUBLIC_REGISTRY_PATH, registry)
    save_json(REPORT_PATH, report)

    print(f"articles={report['articles_total']}")
    print(f"variants={report['variants_total']}")
    print(f"blocked_variants={report['blocked_variants']}")
    print(f"conflicts={len(report['article_conflicts'])}")


if __name__ == "__main__":
    main()
