"""Push pipeline lifecycle data from local SQLite to D1 via /api/pipeline-sync."""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
DEFAULT_BASE_URL = "https://www.daily-life-hacks.com"
PIN_IMG_DIR = REPO_ROOT / "public" / "images" / "pins"
HERO_IMG_DIR = REPO_ROOT / "public" / "images"
ARTICLE_DIR = REPO_ROOT / "src" / "data" / "articles"


def _load_env() -> None:
    env_path = REPO_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))


def collect_articles_from_sqlite(db_path: str) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    articles = {}

    for r in conn.execute(
        "SELECT slug, topic, category, model_id, markdown, "
        "tokens_in, tokens_out, cost_usd, status FROM write_outputs"
    ).fetchall():
        word_count = len(r["markdown"].split()) if r["markdown"] else 0
        articles[r["slug"]] = {
            "slug": r["slug"], "topic": r["topic"], "category": r["category"],
            "source": "manual", "stage": "written", "write_model": r["model_id"],
            "word_count": word_count,
            "tokens_total": (r["tokens_in"] or 0) + (r["tokens_out"] or 0),
            "cost_usd": r["cost_usd"] or 0,
        }

    for r in conn.execute(
        "SELECT slug, review_model, tokens_in, tokens_out, cost_usd "
        "FROM review_outputs WHERE status = 'ok'"
    ).fetchall():
        if r["slug"] in articles:
            a = articles[r["slug"]]
            a["stage"] = "reviewed"
            a["review_model"] = r["review_model"]
            a["tokens_total"] += (r["tokens_in"] or 0) + (r["tokens_out"] or 0)
            a["cost_usd"] += r["cost_usd"] or 0

    for r in conn.execute(
        "SELECT article_slug, prompt, alt FROM hero_briefs WHERE status = 'ok'"
    ).fetchall():
        if r["article_slug"] in articles:
            a = articles[r["article_slug"]]
            a["hero_prompt"] = r["prompt"]
            a["hero_alt"] = r["alt"]
            if a["stage"] == "reviewed":
                a["stage"] = "hero_brief"

    pin_counts = {}
    for r in conn.execute(
        "SELECT article_slug, COUNT(*) as cnt FROM pin_briefs "
        "WHERE status = 'ok' GROUP BY article_slug"
    ).fetchall():
        pin_counts[r["article_slug"]] = r["cnt"]
    for slug, cnt in pin_counts.items():
        if slug in articles:
            articles[slug]["pin_count"] = cnt
            if articles[slug]["stage"] == "hero_brief":
                articles[slug]["stage"] = "pins_brief"

    for slug, a in articles.items():
        if (HERO_IMG_DIR / f"{slug}-main.jpg").exists():
            if a["stage"] in ("pins_brief", "hero_brief"):
                a["stage"] = "hero_image"

    pin_imgs = set()
    if PIN_IMG_DIR.exists():
        pin_imgs = {f.stem for f in PIN_IMG_DIR.iterdir() if f.suffix == ".jpg"}
    for r in conn.execute(
        "SELECT article_slug, pin_slug FROM pin_briefs WHERE status = 'ok'"
    ).fetchall():
        slug = r["article_slug"]
        if slug in articles and r["pin_slug"] in pin_imgs:
            articles[slug].setdefault("pin_images_done", 0)
            articles[slug]["pin_images_done"] += 1
    for slug, a in articles.items():
        done = a.get("pin_images_done", 0)
        total = a.get("pin_count", 0)
        if done > 0 and done >= total and a["stage"] in ("hero_image", "pins_brief"):
            a["stage"] = "pin_images"

    for slug, a in articles.items():
        if (ARTICLE_DIR / f"{slug}.md").exists():
            a["stage"] = "deployed"

    conn.close()
    return list(articles.values())


def collect_pins_from_sqlite(db_path: str) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT article_slug, pin_slug, pin_index, title, description, prompt, alt "
        "FROM pin_briefs WHERE status = 'ok'"
    ).fetchall()
    conn.close()

    pin_imgs = set()
    if PIN_IMG_DIR.exists():
        pin_imgs = {f.stem for f in PIN_IMG_DIR.iterdir() if f.suffix == ".jpg"}

    return [
        {
            "article_slug": r["article_slug"], "pin_slug": r["pin_slug"],
            "pin_index": r["pin_index"], "title": r["title"],
            "description": r["description"], "prompt": r["prompt"], "alt": r["alt"],
            "image_status": "done" if r["pin_slug"] in pin_imgs else "pending",
        }
        for r in rows
    ]


def build_payload(articles: list[dict], pins: list[dict]) -> dict:
    return {"articles": articles, "pins": pins}


def post_to_d1(base_url: str, key: str, payload: dict) -> tuple[int, str]:
    url = f"{base_url}/api/pipeline-sync?key={key}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; DLH-Pipeline/1.0)",
        })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sync pipeline status to D1")
    parser.add_argument("--db", default=str(DEFAULT_DB))
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--key", default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    _load_env()
    key = args.key or os.environ.get("STATS_KEY", "")
    if not key and not args.dry_run:
        print("ERROR: STATS_KEY not set", file=sys.stderr)
        return 1

    articles = collect_articles_from_sqlite(args.db)
    pins = collect_pins_from_sqlite(args.db)
    payload = build_payload(articles, pins)
    print(f"Collected {len(articles)} article(s), {len(pins)} pin(s)", file=sys.stderr)

    if args.dry_run:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    status, body = post_to_d1(args.base_url, key, payload)
    print(f"POST /api/pipeline-sync -> {status}", file=sys.stderr)
    print(body, file=sys.stderr)
    return 0 if status == 200 else 1


if __name__ == "__main__":
    sys.exit(main())
