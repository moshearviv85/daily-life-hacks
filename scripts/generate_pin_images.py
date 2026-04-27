"""Generate pin images from pipeline-data/pin-briefs.jsonl via GPT Image 2.

For each article record, sends each pin's prompt verbatim to GPT Image 2 and
saves the result as public/images/pins/{article_slug}_v{1..4}.jpg, where the
variant number (1..4) is the position of the pin in the article's pins array.

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

REPO_ROOT = Path(__file__).resolve().parent.parent
DISCOVERY_SCRIPTS = REPO_ROOT / "experiments" / "pinterest-50" / "scripts"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(DISCOVERY_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(DISCOVERY_SCRIPTS))

from discovery import fal_client  # noqa: E402

from scripts.lib.image_resize import to_jpeg  # noqa: E402

PIN_JSONL = REPO_ROOT / "pipeline-data" / "pin-briefs.jsonl"
OUT_DIR = REPO_ROOT / "public" / "images" / "pins"
LOG_PATH = REPO_ROOT / "pipeline-data" / "pin-images.jsonl"
MODEL_ID = "gpt-image-2"
ASPECT_RATIO = "3:4"
CONCURRENCY = 4
MAX_WIDTH = 1000
MAX_HEIGHT = 1500
JPEG_QUALITY = 85


def load_pin_records(filter_slug: str | None) -> list[dict]:
    if not PIN_JSONL.exists():
        raise FileNotFoundError(f"missing brief file: {PIN_JSONL}")
    out: list[dict] = []
    for line in PIN_JSONL.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rec = json.loads(line)
        if filter_slug and rec["article_slug"] != filter_slug:
            continue
        out.append(rec)
    return out


def out_path_for(article_slug: str, variant: int) -> Path:
    return OUT_DIR / f"{article_slug}_v{variant}.jpg"


def append_log(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def generate_one(
    article_slug: str,
    variant: int,
    pin_slug: str,
    pin_title: str,
    prompt: str,
    *,
    force: bool,
    dry_run: bool,
) -> dict:
    out = out_path_for(article_slug, variant)
    if out.exists() and not force and not dry_run:
        return {"status": "skip", "article_slug": article_slug, "variant": variant}
    if dry_run:
        return {"status": "dry", "article_slug": article_slug, "variant": variant,
                "out": str(out)}
    t0 = time.time()
    try:
        res = fal_client.generate(
            model_id=MODEL_ID,
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
            "variant": variant,
            "pin_slug": pin_slug,
            "pin_title": pin_title,
            "model": MODEL_ID,
            "status": "ok",
            "wall_s": round(dt, 2),
            "latency_ms": res.get("latency_ms"),
            "cost_usd": res.get("cost_usd"),
            "image_size_bytes": size,
        }
        append_log(entry)
        return {"status": "ok", "article_slug": article_slug, "variant": variant,
                "wall_s": round(dt, 2), "cost_usd": res.get("cost_usd"), "size": size}
    except Exception as exc:  # noqa: BLE001
        dt = time.time() - t0
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "article_slug": article_slug,
            "variant": variant,
            "pin_slug": pin_slug,
            "pin_title": pin_title,
            "model": MODEL_ID,
            "status": "error",
            "wall_s": round(dt, 2),
            "error": f"{type(exc).__name__}: {exc}"[:400],
        }
        append_log(entry)
        return {"status": "error", "article_slug": article_slug, "variant": variant,
                "error": str(exc)[:200]}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--slug", help="single article_slug to generate")
    g.add_argument("--all", action="store_true", help="every article in pin-briefs.jsonl")
    ap.add_argument("--force", action="store_true", help="overwrite existing files")
    ap.add_argument("--dry-run", action="store_true", help="print plan, no FAL")
    args = ap.parse_args(argv)

    records = load_pin_records(args.slug)
    if not records:
        print(f"no records found in {PIN_JSONL.name}"
              + (f" for slug={args.slug!r}" if args.slug else ""), file=sys.stderr)
        return 2

    tasks: list[tuple[str, int, str, str, str]] = []
    for rec in records:
        a = rec["article_slug"]
        for i, pin in enumerate(rec["pins"], 1):
            tasks.append((a, i, pin["slug"], pin["title"], pin["prompt"]))

    pending = []
    skipped = 0
    for t in tasks:
        out = out_path_for(t[0], t[1])
        if out.exists() and not args.force and not args.dry_run:
            skipped += 1
        else:
            pending.append(t)

    print(f"Records: {len(records)} articles, {sum(len(r['pins']) for r in records)} pins.")
    print(f"Tasks: {len(tasks)} total. Skip-if-exists: {skipped}. Pending: {len(pending)}.")

    if args.dry_run:
        for t in pending:
            print(f"  DRY  {t[0]}  v{t[1]}  -> {out_path_for(t[0], t[1]).name}")
        return 0
    if not pending:
        print("Nothing to do.")
        return 0

    print(f"Generating {len(pending)} via {MODEL_ID} concurrency={CONCURRENCY}...")
    started = time.time()
    n_ok = 0
    n_err = 0
    total_cost = 0.0

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = {
            ex.submit(generate_one, a, v, ps, pt, pr, force=args.force, dry_run=False): (a, v)
            for (a, v, ps, pt, pr) in pending
        }
        for fut in as_completed(futs):
            r = fut.result()
            a = r["article_slug"]
            v = r["variant"]
            if r["status"] == "ok":
                n_ok += 1
                total_cost += r.get("cost_usd") or 0
                print(f"  OK   {a}  v{v}  {r['wall_s']:.1f}s  ${r.get('cost_usd') or 0:.3f}  {r['size']:,}B")
            elif r["status"] == "error":
                n_err += 1
                print(f"  FAIL {a}  v{v}  {r.get('error','')[:80]}")
    wall = time.time() - started

    print()
    print(f"Final: ok={n_ok}  err={n_err}  skipped={skipped}  wall={wall:.1f}s  cost=${total_cost:.3f}")
    return 0 if n_err == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
