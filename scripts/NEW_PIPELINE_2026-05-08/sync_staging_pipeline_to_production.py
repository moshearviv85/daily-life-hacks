"""Copy staging pipeline metadata into the production dashboard D1.

This does not queue or publish pins. It only mirrors pipeline_articles and
pipeline_pins metadata after staging has been promoted to production.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = REPO_ROOT / ".env"

DEFAULT_STAGING_BASE_URL = "https://staging.daily-life-hacks.pages.dev"
DEFAULT_PRODUCTION_BASE_URL = "https://www.daily-life-hacks.com"

ARTICLE_KEYS = {
    "slug",
    "topic",
    "category",
    "source",
    "stage",
    "error",
    "error_stage",
    "write_model",
    "review_model",
    "word_count",
    "hero_prompt",
    "hero_alt",
    "hero_model",
    "hero_image_done",
    "support_model",
    "support_image_done",
    "review_state",
    "pin_count",
    "pin_images_done",
    "tokens_total",
    "cost_usd",
}

PIN_KEYS = {
    "article_slug",
    "pin_slug",
    "pin_index",
    "title",
    "description",
    "prompt",
    "alt",
    "model_id",
    "image_status",
}


def load_env() -> None:
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def api_url(base_url: str, path: str, key: str) -> str:
    base = base_url.rstrip("/")
    query = urllib.parse.urlencode({"key": key})
    return f"{base}{path}?{query}"


def get_json(url: str) -> dict[str, Any]:
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "DLH-Pipeline-Sync/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GET {url} failed with {exc.code}: {body[:500]}") from exc


def post_json(url: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "DLH-Pipeline-Sync/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body or "{}")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"POST {url} failed with {exc.code}: {body[:500]}") from exc


def clean_record(row: dict[str, Any], allowed: set[str]) -> dict[str, Any]:
    return {key: row.get(key) for key in allowed if key in row}


def parse_slug_filter(raw: str) -> set[str]:
    return {part.strip() for part in raw.split(",") if part.strip()}


def slugs_from_topics_file(path: str) -> set[str]:
    if not path:
        return set()
    topic_path = Path(path)
    if not topic_path.exists():
        return set()
    rows = json.loads(topic_path.read_text(encoding="utf-8-sig"))
    if not isinstance(rows, list):
        return set()
    return {str(row.get("slug") or "").strip() for row in rows if row.get("slug")}


def build_payload(status: dict[str, Any], slugs: set[str]) -> dict[str, Any]:
    articles = [
        clean_record(row, ARTICLE_KEYS)
        for row in status.get("articles", [])
        if isinstance(row, dict) and row.get("slug") and (not slugs or row.get("slug") in slugs)
    ]
    allowed_article_slugs = {row["slug"] for row in articles}
    pins = [
        clean_record(row, PIN_KEYS)
        for row in status.get("pin_rows", [])
        if isinstance(row, dict)
        and row.get("pin_slug")
        and row.get("article_slug") in allowed_article_slugs
    ]
    return {"articles": articles, "pins": pins}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Mirror staging pipeline metadata to production D1.",
    )
    parser.add_argument("--staging-base-url", default=DEFAULT_STAGING_BASE_URL)
    parser.add_argument("--production-base-url", default=DEFAULT_PRODUCTION_BASE_URL)
    parser.add_argument("--key", default="")
    parser.add_argument("--slugs", default="", help="Optional comma-separated slug filter.")
    parser.add_argument(
        "--topics-file",
        default="",
        help="Optional selected/produced topics JSON file used as an additional slug filter.",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    load_env()
    key = args.key or os.environ.get("DASHBOARD_PASSWORD") or os.environ.get("STATS_KEY") or ""
    if not key:
        print("ERROR: DASHBOARD_PASSWORD or STATS_KEY is required", file=sys.stderr)
        return 1

    slug_filter = parse_slug_filter(args.slugs) | slugs_from_topics_file(args.topics_file)
    status = get_json(api_url(args.staging_base_url, "/api/pipeline-status", key))
    payload = build_payload(status, slug_filter)

    article_count = len(payload["articles"])
    pin_count = len(payload["pins"])
    print(f"Prepared production sync payload: articles={article_count}, pins={pin_count}", file=sys.stderr)
    if article_count == 0:
        print("ERROR: no pipeline articles found to sync", file=sys.stderr)
        return 1

    if args.dry_run:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    sync_url = api_url(args.production_base_url, "/api/pipeline-sync", key)
    status_code, body = post_json(sync_url, payload)
    print(f"POST /api/pipeline-sync -> {status_code}", file=sys.stderr)
    print(json.dumps(body, ensure_ascii=False), file=sys.stderr)
    if status_code != 200 or body.get("ok") is not True or body.get("errors"):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
