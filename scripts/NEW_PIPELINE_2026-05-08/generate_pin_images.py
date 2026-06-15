"""Generate pin images from pin_briefs SQL table via the configured pin rotation.

For each article, sends each pin's prompt verbatim to the model assigned to
that pin slot and saves the result as public/images/pins/{pin_slug}.jpg,
where pin_slug is the unique per-pin slug from pin_briefs.

CLI:
    python scripts/generate_pin_images.py --slug <article-slug>
    python scripts/generate_pin_images.py --all
    python scripts/generate_pin_images.py --slug <slug> --force
    python scripts/generate_pin_images.py --all --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
REPO_ROOT = _SCRIPT_DIR.parent.parent
DISCOVERY_SCRIPTS = REPO_ROOT / "experiments" / "pinterest-50" / "scripts"
if str(DISCOVERY_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(DISCOVERY_SCRIPTS))

from discovery import fal_client  # noqa: E402

from lib.image_resize import to_jpeg  # noqa: E402
from lib import brief_store  # noqa: E402
from lib.image_models import model_for_pin_slot, pin_rotation_summary  # noqa: E402

DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
OUT_DIR = REPO_ROOT / "public" / "images" / "pins"
LOG_PATH = REPO_ROOT / "pipeline-data" / "pin-images.jsonl"
ASPECT_RATIO = "2:3"
CONCURRENCY = 4
MAX_WIDTH = 1000
MAX_HEIGHT = 1500
JPEG_QUALITY = 85


def load_pin_records(filter_slug: str | None, db_path: Path | str = DEFAULT_DB) -> list[dict]:
    """Read pin_briefs (status='ok') as records of the legacy shape:
    [{article_slug, pins: [{slug, title, prompt, alt, description}, ...]}]."""
    con = brief_store.connect(db_path)
    try:
        if filter_slug:
            slugs = [filter_slug]
        else:
            rows = con.execute(
                "SELECT DISTINCT article_slug FROM pin_briefs WHERE status='ok' ORDER BY article_slug"
            ).fetchall()
            slugs = [r["article_slug"] for r in rows]
        out: list[dict] = []
        for s in slugs:
            pins = brief_store.list_pin_briefs(con, s, only_ok=True)
            if not pins:
                continue
            out.append({
                "article_slug": s,
                "pins": [
                    {
                        "slug": p["pin_slug"],
                        "title": p["title"],
                        "prompt": p["prompt"],
                        "alt": p["alt"],
                        "description": p["description"],
                    }
                    for p in pins
                ],
            })
        return out
    finally:
        con.close()


def out_path_for(pin_slug: str) -> Path:
    return OUT_DIR / f"{pin_slug}.jpg"


def append_log(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def generate_one(
    article_slug: str,
    variant: int,
    model_id: str,
    pin_slug: str,
    pin_title: str,
    prompt: str,
    *,
    force: bool,
    dry_run: bool,
) -> dict:
    out = out_path_for(pin_slug)
    if out.exists() and not force and not dry_run:
        return {
            "status": "skip",
            "article_slug": article_slug,
            "pin_slug": pin_slug,
            "model": model_id,
        }
    if dry_run:
        return {
            "status": "dry",
            "article_slug": article_slug,
            "pin_slug": pin_slug,
            "model": model_id,
            "out": str(out),
        }
    t0 = time.time()
    try:
        res = fal_client.generate(
            model_id=model_id,
            prompt=prompt,
            aspect_ratio=ASPECT_RATIO,
        )
        jpeg_bytes = to_jpeg(
            res["image_bytes"],
            max_width=MAX_WIDTH,
            max_height=MAX_HEIGHT,
            quality=JPEG_QUALITY,
        )
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(jpeg_bytes)
        dt = time.time() - t0
        size = out.stat().st_size if out.exists() else 0
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "article_slug": article_slug,
            "pin_slug": pin_slug,
            "pin_title": pin_title,
            "pin_slot": variant,
            "model": model_id,
            "status": "ok",
            "wall_s": round(dt, 2),
            "latency_ms": res.get("latency_ms"),
            "cost_usd": res.get("cost_usd"),
            "image_size_bytes": size,
        }
        append_log(entry)
        return {"status": "ok", "article_slug": article_slug, "pin_slug": pin_slug,
                "model": model_id, "wall_s": round(dt, 2),
                "cost_usd": res.get("cost_usd"), "size": size}
    except Exception as exc:  # noqa: BLE001
        dt = time.time() - t0
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "article_slug": article_slug,
            "pin_slug": pin_slug,
            "pin_title": pin_title,
            "pin_slot": variant,
            "model": model_id,
            "status": "error",
            "wall_s": round(dt, 2),
            "error": f"{type(exc).__name__}: {exc}"[:400],
        }
        append_log(entry)
        return {"status": "error", "article_slug": article_slug, "pin_slug": pin_slug,
                "model": model_id, "error": str(exc)[:200]}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--slug", help="single article_slug to generate")
    g.add_argument("--all", action="store_true", help="every article with pin_briefs in SQL")
    ap.add_argument("--force", action="store_true", help="overwrite existing files")
    ap.add_argument("--dry-run", action="store_true", help="print plan, no FAL")
    args = ap.parse_args(argv)

    records = load_pin_records(args.slug)
    if not records:
        print("no pin_briefs rows found"
              + (f" for slug={args.slug!r}" if args.slug else ""), file=sys.stderr)
        return 2

    tasks: list[tuple[str, int, str, str, str, str]] = []
    for rec in records:
        a = rec["article_slug"]
        for i, pin in enumerate(rec["pins"], 1):
            tasks.append((a, i, model_for_pin_slot(i), pin["slug"], pin["title"], pin["prompt"]))

    pending = []
    skipped = 0
    for t in tasks:
        out = out_path_for(t[3])
        if out.exists() and not args.force and not args.dry_run:
            skipped += 1
        else:
            pending.append(t)

    print(f"Records: {len(records)} articles, {sum(len(r['pins']) for r in records)} pins.")
    print(f"Tasks: {len(tasks)} total. Skip-if-exists: {skipped}. Pending: {len(pending)}.")

    if args.dry_run:
        for t in pending:
            print(f"  DRY  {t[0]}  slot={t[1]}  model={t[2]}  {t[3]}  -> {out_path_for(t[3]).name}")
        return 0
    if not pending:
        print("Nothing to do.")
        return 0

    print(f"Model rotation: {pin_rotation_summary()}")
    print(f"Generating {len(pending)} via configured pin rotation concurrency={CONCURRENCY}...")
    started = time.time()
    n_ok = 0
    n_err = 0
    total_cost = 0.0

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = {
            ex.submit(generate_one, a, v, mid, ps, pt, pr, force=args.force, dry_run=False): ps
            for (a, v, mid, ps, pt, pr) in pending
        }
        for fut in as_completed(futs):
            r = fut.result()
            a = r["article_slug"]
            ps = r["pin_slug"]
            if r["status"] == "ok":
                n_ok += 1
                total_cost += r.get("cost_usd") or 0
                print(
                    f"  OK   {a}  {ps}  model={r.get('model')}  "
                    f"{r['wall_s']:.1f}s  ${r.get('cost_usd') or 0:.3f}  {r['size']:,}B"
                )
            elif r["status"] == "error":
                n_err += 1
                print(f"  FAIL {a}  {ps}  model={r.get('model')}  {r.get('error','')[:80]}")
    wall = time.time() - started

    print()
    print(f"Final: ok={n_ok}  err={n_err}  skipped={skipped}  wall={wall:.1f}s  cost=${total_cost:.3f}")
    return 0 if n_err == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
