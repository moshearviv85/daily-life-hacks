"""Pin-image model discovery: every pin in pin_briefs SQL across 5 FAL models.

Sends each pin's prompt verbatim (no Python templating) to each model. Output
is grouped per pin so visual comparison is one folder = one pin = N models.

CLI:
    python scripts/discover_pin_models.py
    python scripts/discover_pin_models.py --slug <article-slug>
    python scripts/discover_pin_models.py --dry-run
    python scripts/discover_pin_models.py --force
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
from scripts.lib import brief_store  # noqa: E402

DEFAULT_DB = REPO_ROOT / "pipeline-data" / "topic-research.sqlite"
OUT_ROOT = REPO_ROOT / "pipeline-data" / "pin-discovery"
ASPECT_RATIO = "3:4"
CONCURRENCY = 4

MODELS = [
    "gpt-image-2",
    "recraft-v4-pro",
    "imagen-4-ultra",
    "nano-banana-2",
    "ideogram-v3",
]


def load_pin_records(filter_slug: str | None, db_path: Path | str = DEFAULT_DB) -> list[dict]:
    """Read pin_briefs (status='ok') as records: [{article_slug, pins[...]}].
    Pins keep keys (slug, title, prompt, alt, description) for backward
    compatibility with the rest of this script."""
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


def out_path_for(pin_slug: str, model_id: str) -> Path:
    return OUT_ROOT / pin_slug / f"{model_id}.jpg"


def log_path_for(pin_slug: str) -> Path:
    return OUT_ROOT / pin_slug / "_log.jsonl"


def append_log(pin_slug: str, entry: dict) -> None:
    p = log_path_for(pin_slug)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def generate_one(
    article_slug: str,
    pin_slug: str,
    pin_title: str,
    prompt: str,
    model_id: str,
    *,
    force: bool,
    dry_run: bool,
) -> dict:
    out = out_path_for(pin_slug, model_id)
    if out.exists() and not force and not dry_run:
        return {"status": "skip", "model": model_id, "pin_slug": pin_slug, "path": str(out)}
    if dry_run:
        return {"status": "dry", "model": model_id, "pin_slug": pin_slug, "path": str(out)}
    t0 = time.time()
    try:
        res = fal_client.generate(
            model_id=model_id,
            prompt=prompt,
            aspect_ratio=ASPECT_RATIO,
            output_path=out,
        )
        dt = time.time() - t0
        size = out.stat().st_size if out.exists() else 0
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "article_slug": article_slug,
            "pin_slug": pin_slug,
            "pin_title": pin_title,
            "model": model_id,
            "status": "ok",
            "wall_s": round(dt, 2),
            "latency_ms": res.get("latency_ms"),
            "cost_usd": res.get("cost_usd"),
            "image_size_bytes": size,
        }
        append_log(pin_slug, entry)
        return {"status": "ok", "model": model_id, "pin_slug": pin_slug,
                "wall_s": round(dt, 2), "cost_usd": res.get("cost_usd"), "size": size}
    except Exception as exc:  # noqa: BLE001
        dt = time.time() - t0
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "article_slug": article_slug,
            "pin_slug": pin_slug,
            "pin_title": pin_title,
            "model": model_id,
            "status": "error",
            "wall_s": round(dt, 2),
            "error": f"{type(exc).__name__}: {exc}"[:400],
        }
        append_log(pin_slug, entry)
        return {"status": "error", "model": model_id, "pin_slug": pin_slug,
                "error": str(exc)[:200]}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--slug", help="filter to a single article_slug")
    ap.add_argument("--dry-run", action="store_true", help="print plan, no FAL")
    ap.add_argument("--force", action="store_true", help="overwrite existing files")
    args = ap.parse_args(argv)

    records = load_pin_records(args.slug)
    if not records:
        print(f"no records found in {PIN_JSONL.name}"
              + (f" for slug={args.slug!r}" if args.slug else ""), file=sys.stderr)
        return 2

    tasks: list[tuple[str, str, str, str, str]] = []
    for rec in records:
        a = rec["article_slug"]
        for pin in rec["pins"]:
            for m in MODELS:
                tasks.append((a, pin["slug"], pin["title"], pin["prompt"], m))

    pending = []
    skipped = 0
    for t in tasks:
        out = out_path_for(t[1], t[4])
        if out.exists() and not args.force and not args.dry_run:
            skipped += 1
        else:
            pending.append(t)

    print(f"Records: {len(records)} articles, {sum(len(r['pins']) for r in records)} pins, {len(MODELS)} models.")
    print(f"Tasks: {len(tasks)} total. Skip-if-exists: {skipped}. Pending: {len(pending)}.")

    if args.dry_run:
        for t in pending:
            print(f"  DRY  {t[1]:50s}  {t[4]}")
        return 0
    if not pending:
        print("Nothing to do.")
        return 0

    print(f"Generating {len(pending)} via concurrency={CONCURRENCY}...")
    started = time.time()
    n_ok = 0
    n_err = 0
    total_cost = 0.0

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = {
            ex.submit(generate_one, a, ps, pt, pr, m, force=args.force, dry_run=False): (a, ps, m)
            for (a, ps, pt, pr, m) in pending
        }
        for fut in as_completed(futs):
            r = fut.result()
            ps = r["pin_slug"]
            m = r["model"]
            if r["status"] == "ok":
                n_ok += 1
                total_cost += r.get("cost_usd") or 0
                print(f"  OK   {ps:50s}  {m:18s}  {r['wall_s']:.1f}s  ${r.get('cost_usd') or 0:.3f}  {r['size']:,}B")
            elif r["status"] == "error":
                n_err += 1
                print(f"  FAIL {ps:50s}  {m:18s}  {r.get('error','')[:80]}")
    wall = time.time() - started

    print()
    print(f"Final: ok={n_ok}  err={n_err}  skipped={skipped}  wall={wall:.1f}s  cost=${total_cost:.3f}")
    print(f"Output root: {OUT_ROOT}")
    return 0 if n_err == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
