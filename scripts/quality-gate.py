import csv
import json
import os
import sys


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY_PATH = os.path.join(BASE_DIR, "pipeline-data", "content-registry.json")
REPORT_PATH = os.path.join(BASE_DIR, "pipeline-data", "quality-gate-report.json")
FINAL_CSV_PATH = os.path.join(BASE_DIR, "pipeline-data", "pins-publer-final.csv")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp_path, path)


def load_csv_rows(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def clean_text(value):
    return " ".join((value or "").replace("\r", " ").replace("\n", " ").split())


def detect_scheduled_row_issues(row):
    text = " ".join(
        clean_text(row.get(field, "")).lower()
        for field in [
            "Text",
            "Link(s) - Separated by comma for FB carousels",
            "Title - For the video, pin, PDF ..",
            "Alt text(s) - Separated by ||",
        ]
    )
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
    return [issue for issue, patterns in rules.items() if any(pattern in text for pattern in patterns)]


def main():
    registry = load_json(REGISTRY_PATH)
    final_rows = load_csv_rows(FINAL_CSV_PATH)
    report = {
        "summary": {
            "articles": 0,
            "variants": 0,
            "publish_ready_variants": 0,
            "blocked_variants": 0,
            "final_csv_rows": len(final_rows),
            "risky_scheduled_rows": 0,
        },
        "issues": [],
    }

    for base_slug, article_wrapper in registry["articles"].items():
        report["summary"]["articles"] += 1
        article = article_wrapper["article"]
        variants = article_wrapper["variants"]

        if article["legal_risk_level"] == "high":
          report["issues"].append({
              "type": "article-risk",
              "base_slug": base_slug,
              "message": "Article marked high legal risk.",
          })

        for variant_id, variant in variants.items():
            report["summary"]["variants"] += 1
            if variant["publish_ready"]:
                report["summary"]["publish_ready_variants"] += 1
            else:
                report["summary"]["blocked_variants"] += 1
                report["issues"].append({
                    "type": "variant-blocked",
                    "base_slug": base_slug,
                    "variant_id": variant_id,
                    "blocked_reasons": variant["blocked_reasons"],
                })

            if not variant["description"]:
                report["issues"].append({
                    "type": "missing-description",
                    "base_slug": base_slug,
                    "variant_id": variant_id,
                    "message": "Variant is missing description text.",
                })

            if variant["scheduled_count"] == 0:
                report["issues"].append({
                    "type": "unscheduled-variant",
                    "base_slug": base_slug,
                    "variant_id": variant_id,
                    "message": "Variant exists in registry but is not scheduled in final Publer CSV.",
                })

    for row in final_rows:
        row_issues = detect_scheduled_row_issues(row)
        if not row_issues:
            continue
        report["summary"]["risky_scheduled_rows"] += 1
        report["issues"].append({
            "type": "scheduled-risky-row",
            "title": row.get("Title - For the video, pin, PDF ..", "").strip(),
            "link": row.get("Link(s) - Separated by comma for FB carousels", "").strip(),
            "issues": row_issues,
        })

    save_json(REPORT_PATH, report)

    print(f"articles={report['summary']['articles']}")
    print(f"variants={report['summary']['variants']}")
    print(f"publish_ready_variants={report['summary']['publish_ready_variants']}")
    print(f"blocked_variants={report['summary']['blocked_variants']}")
    print(f"final_csv_rows={report['summary']['final_csv_rows']}")
    print(f"risky_scheduled_rows={report['summary']['risky_scheduled_rows']}")
    print(f"issues={len(report['issues'])}")

    # Safety gate should fail only when risky content is actually scheduled.
    # `blocked_variants` can exist in the registry (publish_ready=false) even if they are not
    # present in `pins-publer-final.csv`. In that case, deploy should still be allowed.
    if report["summary"]["risky_scheduled_rows"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
