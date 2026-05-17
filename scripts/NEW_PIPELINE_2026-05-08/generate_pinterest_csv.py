"""Generate a pins CSV for upload via /api/pins-upload (native format).

Reads all OK pins from topic-research.sqlite, deduplicates against D1
pins_schedule, verifies images exist on the live site, deploys any
uncommitted images, and writes a CSV to pipeline-data/.

The endpoint handles scheduling (6-8/day, append after last PENDING).
This script sends explicit row_id, image_url, and link values because the
new pipeline uses pin slugs, not article_slug_vN filenames.

CLI:
    python scripts/generate_pinterest_csv.py
    python scripts/generate_pinterest_csv.py --dry-run
    python scripts/generate_pinterest_csv.py --skip-image-check
"""
from __future__ import annotations

import argparse
import csv
import json
import sqlite3
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
REPO_ROOT = _SCRIPT_DIR.parent.parent

from lib.d1_csv import CATEGORY_TO_BOARD

SQLITE_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
OUTPUT_DIR = REPO_ROOT / "pipeline-data"
OUTPUT_PREFIX = "pinterest-bulk-upload"
SITE_BASE = "https://www.daily-life-hacks.com"
D1_DB_NAME = "dlh-subscriptions"

PIN_CSV_COLUMNS = [
    "row_id",
    "pin_title",
    "pin_description",
    "alt_text",
    "image_url",
    "board_id",
    "link",
    "scheduled_date",
    "status",
    "pin_id",
    "published_date",
    "pinterest_response",
]

BOARD_NAME_TO_ID = {
    "high-fiber-recipes": "1124140825679184032",
    "gut-health-nutrition-tips": "1124140825679184034",
    "Healthy Meal Prep & Kitchen Tips": "1124140825679184036",
}

ROUTER_MAPPING_PATH = REPO_ROOT / "pipeline-data" / "router-mapping.json"


def load_router_mapping(path: Path = ROUTER_MAPPING_PATH) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def next_output_path() -> Path:
    existing = sorted(OUTPUT_DIR.glob(f"{OUTPUT_PREFIX}-*.csv"))
    max_num = 0
    for p in existing:
        stem = p.stem
        suffix = stem[len(OUTPUT_PREFIX) + 1:]
        if suffix.isdigit():
            max_num = max(max_num, int(suffix))
    return OUTPUT_DIR / f"{OUTPUT_PREFIX}-{max_num + 1:03d}.csv"


def load_pins_from_sqlite(db_path: Path, *, limit: int | None = None) -> list[dict]:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    if limit:
        recent = conn.execute(
            """SELECT article_slug
               FROM pin_briefs WHERE status = 'ok'
               GROUP BY article_slug
               ORDER BY MAX(created_at) DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
        slugs = {r["article_slug"] for r in recent}
        rows = conn.execute(
            """
            SELECT pb.article_slug, pb.pin_index, pb.pin_slug, pb.title, pb.description,
                   pb.alt, wo.category
            FROM pin_briefs pb
            JOIN write_outputs wo ON pb.article_slug = wo.slug
            WHERE pb.status = 'ok'
            ORDER BY pb.article_slug, pb.pin_index
            """,
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows if r["article_slug"] in slugs]
    rows = conn.execute(
        """
        SELECT pb.article_slug, pb.pin_index, pb.pin_slug, pb.title, pb.description,
               pb.alt, wo.category
        FROM pin_briefs pb
        JOIN write_outputs wo ON pb.article_slug = wo.slug
        WHERE pb.status = 'ok'
        ORDER BY pb.article_slug, pb.pin_index
        """,
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def fetch_d1_existing_pins() -> set[str]:
    cmd = (
        f'npx wrangler d1 execute {D1_DB_NAME} --remote --json '
        f'--command "SELECT row_id FROM pins_schedule"'
    )
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        print(f"WARNING: D1 query failed (rc={result.returncode}): {result.stderr.strip()}", file=sys.stderr)
        print("Proceeding with empty D1 set — no dedup will happen.", file=sys.stderr)
        return set()
    try:
        data = json.loads(result.stdout)
        return {row["row_id"] for row in data[0]["results"]}
    except (json.JSONDecodeError, KeyError, IndexError) as exc:
        print(f"WARNING: Could not parse D1 output ({exc}). No dedup.", file=sys.stderr)
        return set()


USER_AGENT = "Mozilla/5.0 (compatible; DLH-PinCheck/1.0)"


def check_image_exists(url: str) -> bool:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception:
        return False


def make_row_id(pin_slug: str) -> str:
    return pin_slug


def make_image_url(pin_slug: str) -> str:
    return f"{SITE_BASE}/images/pins/{pin_slug}.jpg"


def local_image_path(pin_slug: str) -> Path:
    return REPO_ROOT / "public" / "images" / "pins" / f"{pin_slug}.jpg"


def pin_slug_for(pin: dict) -> str:
    pin_slug = (pin.get("pin_slug") or "").strip()
    if pin_slug:
        return pin_slug
    return f"{pin['article_slug']}_v{int(pin['pin_index']) + 1}"


def deploy_pin_images(pins: list[dict]) -> bool:
    to_add = []
    for pin in pins:
        img = local_image_path(pin_slug_for(pin))
        if img.exists():
            rel = img.relative_to(REPO_ROOT)
            to_add.append(str(rel).replace("\\", "/"))

    if not to_add:
        return False

    result = subprocess.run(
        ["git", "status", "--porcelain", "--"] + to_add,
        capture_output=True, text=True, cwd=str(REPO_ROOT),
    )
    untracked = [line.split()[-1] for line in result.stdout.strip().splitlines() if line.strip()]
    if not untracked:
        print("All pin images already committed.", file=sys.stderr)
        return False

    print(f"Adding {len(untracked)} pin images to git...", file=sys.stderr)
    subprocess.run(["git", "add", "--"] + to_add, cwd=str(REPO_ROOT), check=True)
    subprocess.run(
        ["git", "commit", "-m", "feat(images): deploy pin images for bulk upload"],
        cwd=str(REPO_ROOT), check=True,
    )
    print("Pushing to origin/main...", file=sys.stderr)
    subprocess.run(["git", "push"], cwd=str(REPO_ROOT), check=True)

    print("Waiting 90s for Cloudflare Pages deploy...", file=sys.stderr)
    time.sleep(90)
    return True


def _variant_destination_url(slug: str, pin_slug: str, router_mapping: dict) -> str:
    entry = router_mapping.get(slug, {}).get(pin_slug, {})
    url_slug = entry.get("url_slug", slug)
    return f"{SITE_BASE}/{url_slug}"


def generate_csv(
    pins: list[dict],
    d1_existing: set[str],
    skip_image_check: bool = False,
    router_mapping: dict | None = None,
) -> tuple[list[dict], dict]:
    stats = {
        "total": len(pins),
        "skipped_d1": 0,
        "skipped_404": 0,
        "written": 0,
        "boards": {},
    }
    rows = []
    for pin in pins:
        slug = pin["article_slug"]
        ps = pin_slug_for(pin)
        row_id = make_row_id(ps)

        if row_id in d1_existing:
            stats["skipped_d1"] += 1
            continue

        img_url = make_image_url(ps)
        if not skip_image_check and not check_image_exists(img_url):
            print(f"SKIP (404): {row_id} — {img_url}", file=sys.stderr)
            stats["skipped_404"] += 1
            continue

        category = pin["category"]
        board_name = CATEGORY_TO_BOARD.get(category)
        board_id = BOARD_NAME_TO_ID.get(board_name or "")
        if not board_id:
            print(f"SKIP (unknown category {category!r}): {row_id}", file=sys.stderr)
            continue

        dest_url = _variant_destination_url(slug, ps, router_mapping or {})
        rows.append({
            "row_id": row_id,
            "pin_title": pin["title"],
            "pin_description": pin["description"],
            "alt_text": pin.get("alt") or "",
            "image_url": img_url,
            "board_id": board_id,
            "link": dest_url,
            "scheduled_date": "",
            "status": "PENDING",
            "pin_id": "",
            "published_date": "",
            "pinterest_response": "",
        })
        stats["written"] += 1
        stats["boards"][board_name] = stats["boards"].get(board_name, 0) + 1

    return rows, stats


def write_csv(rows: list[dict], output_path: Path) -> None:
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=PIN_CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def print_summary(stats: dict) -> None:
    print(f"\n{'='*50}", file=sys.stderr)
    print(f"Total pins in SQLite:   {stats['total']}", file=sys.stderr)
    print(f"Skipped (in D1):        {stats['skipped_d1']}", file=sys.stderr)
    print(f"Skipped (image 404):    {stats['skipped_404']}", file=sys.stderr)
    print(f"Written to CSV:         {stats['written']}", file=sys.stderr)
    if stats["boards"]:
        print(f"\nPer board:", file=sys.stderr)
        for board, count in sorted(stats["boards"].items()):
            print(f"  {board}: {count}", file=sys.stderr)
    print(f"{'='*50}\n", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Pinterest bulk-upload CSV")
    parser.add_argument("--dry-run", action="store_true", help="Print summary without writing CSV")
    parser.add_argument("--skip-image-check", action="store_true", help="Skip HTTP HEAD checks for pin images")
    parser.add_argument("--limit", type=int, default=None, help="Only process the N most recent articles")
    parser.add_argument("--skip-d1", action="store_true", help="Skip D1 dedup check")
    args = parser.parse_args()

    print("Loading pins from SQLite...", file=sys.stderr)
    pins = load_pins_from_sqlite(SQLITE_DB, limit=args.limit)
    if not pins:
        print("No OK pins found in SQLite.", file=sys.stderr)
        sys.exit(1)

    if args.skip_d1:
        d1_existing = set()
        print("Skipping D1 dedup check.", file=sys.stderr)
    else:
        print("Fetching existing pins from D1...", file=sys.stderr)
        d1_existing = fetch_d1_existing_pins()
        print(f"Found {len(d1_existing)} existing pins in D1.", file=sys.stderr)

    new_pins = [
        p for p in pins
        if make_row_id(pin_slug_for(p)) not in d1_existing
    ]
    if new_pins and not args.dry_run:
        print(f"Checking deploy for {len(new_pins)} new pin images...", file=sys.stderr)
        deployed = deploy_pin_images(new_pins)
        if deployed:
            print("Deploy complete. Proceeding to image verification.", file=sys.stderr)

    mapping = load_router_mapping()
    print(f"Loaded router-mapping for {len(mapping)} article(s).", file=sys.stderr)

    rows, stats = generate_csv(pins, d1_existing, skip_image_check=args.skip_image_check, router_mapping=mapping)

    print_summary(stats)

    if args.dry_run:
        print("Dry run - no CSV written.", file=sys.stderr)
        return

    if not rows:
        print("No pins to write. CSV not created.", file=sys.stderr)
        return

    out_path = next_output_path()
    write_csv(rows, out_path)
    print(f"CSV written to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
