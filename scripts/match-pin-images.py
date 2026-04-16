"""
Match renamed / duplicate pin images to canonical files in public/images/pins/
using perceptual hashing (does NOT rely on filenames).

Also can find duplicate groups within a folder (e.g. Publer double-upload bug).

Usage:
  pip install Pillow ImageHash   # if needed

  # Map every image in a folder to our best-matching pin file
  python scripts/match-pin-images.py scan --folder "D:/publer_images" --out pipeline-data/publer-image-match.csv

  # Only find duplicate pairs within a folder (same image twice, different names)
  python scripts/match-pin-images.py duplicates --folder "D:/publer_images" --out pipeline-data/publer-dupes.txt

  # Stricter matching (default max Hamming distance 14)
  python scripts/match-pin-images.py scan --folder "..." --max-dist 12
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

try:
    import imagehash
    from PIL import Image
except ImportError:
    print("Install: pip install Pillow ImageHash", file=sys.stderr)
    sys.exit(1)

BASE = Path(__file__).resolve().parent.parent
DEFAULT_REF = BASE / "public" / "images" / "pins"


def is_image(p: Path) -> bool:
    return p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def load_reference_index(ref_dir: Path) -> tuple[list[tuple[str, Path, imagehash.ImageHash]], list[tuple[str, Path, imagehash.ImageHash]]]:
    """Return (phash list, dhash list) for each canonical pin file."""
    ph_rows: list[tuple[str, Path, imagehash.ImageHash]] = []
    dh_rows: list[tuple[str, Path, imagehash.ImageHash]] = []
    for f in sorted(ref_dir.glob("*")):
        if not f.is_file() or not is_image(f):
            continue
        if "_v" not in f.stem:
            continue
        try:
            img = Image.open(f).convert("RGB")
        except Exception as e:
            print(f"Skip ref (unreadable): {f} ({e})", file=sys.stderr)
            continue
        key = f.name  # e.g. slug_v1.jpg
        ph_rows.append((key, f, imagehash.phash(img)))
        dh_rows.append((key, f, imagehash.dhash(img)))
    return ph_rows, dh_rows


def best_match(
    img_path: Path,
    ph_ref: list[tuple[str, Path, imagehash.ImageHash]],
    dh_ref: list[tuple[str, Path, imagehash.ImageHash]],
    max_dist: int,
) -> tuple[str | None, int, int]:
    """Return (canonical_filename, best_combined_score, ph_dist) or None if no match under threshold."""
    try:
        img = Image.open(img_path).convert("RGB")
    except Exception:
        return None, 999, 999
    h_p = imagehash.phash(img)
    h_d = imagehash.dhash(img)

    best_key = None
    best_score = 9999
    best_ph = 999

    for key, _refp, ref_hp in ph_ref:
        d_p = h_p - ref_hp
        # find corresponding dhash row (same key)
        ref_hd = next((r[2] for r in dh_ref if r[0] == key), None)
        if ref_hd is None:
            continue
        d_d = h_d - ref_hd
        # combined: weighted average (pHash better for photos)
        score = int(d_p * 0.6 + d_d * 0.4)
        if score < best_score:
            best_score = score
            best_ph = d_p
            best_key = key

    # Also accept if pHash alone is very strong
    if best_key is not None and best_score <= max_dist:
        return best_key, best_score, best_ph

    # Fallback: pure pHash threshold
    best_key2 = None
    best_ph2 = 999
    for key, _refp, ref_hp in ph_ref:
        d_p = h_p - ref_hp
        if d_p < best_ph2:
            best_ph2 = d_p
            best_key2 = key
    if best_key2 is not None and best_ph2 <= max_dist + 2:
        return best_key2, best_ph2, best_ph2

    return None, best_score, best_ph


def cmd_scan(args: argparse.Namespace) -> None:
    ref_dir = Path(args.reference)
    folder = Path(args.folder)
    if not ref_dir.is_dir() or not folder.is_dir():
        print("Invalid --reference or --folder", file=sys.stderr)
        sys.exit(1)

    print("Indexing reference pins (this may take a minute)...")
    ph_ref, dh_ref = load_reference_index(ref_dir)
    print(f"  Reference images: {len(ph_ref)}")

    rows: list[dict] = []
    files = [p for p in folder.rglob("*") if p.is_file() and is_image(p)]
    print(f"Scanning: {folder} ({len(files)} images)")

    for i, f in enumerate(files):
        if i and i % 50 == 0:
            print(f"  ... {i}/{len(files)}")
        key, score, ph_d = best_match(f, ph_ref, dh_ref, args.max_dist)
        rows.append({
            "local_path": str(f.resolve()),
            "matched_canonical": key or "",
            "combined_score": score if key else "",
            "phash_distance": ph_d if key else "",
            "confidence": "high" if key and score <= 10 else ("medium" if key and score <= args.max_dist else ("low" if key else "none")),
        })

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as fp:
        w = csv.DictWriter(fp, fieldnames=list(rows[0].keys()) if rows else ["local_path", "matched_canonical", "combined_score", "phash_distance", "confidence"])
        w.writeheader()
        w.writerows(rows)

    matched = sum(1 for r in rows if r["matched_canonical"])
    print(f"\nWrote {out}")
    print(f"Matched: {matched}/{len(rows)} (max_dist={args.max_dist})")
    print("Review rows with confidence=medium or combined_score > 10 manually.")


def cmd_duplicates(args: argparse.Namespace) -> None:
    """Find pairs/groups of images in folder that are likely the same file (Publer double bug)."""
    folder = Path(args.folder)
    if not folder.is_dir():
        sys.exit(1)

    files = [p for p in folder.rglob("*") if p.is_file() and is_image(p)]
    print(f"Hashing {len(files)} images...")
    hashes: list[tuple[Path, imagehash.ImageHash]] = []
    for f in files:
        try:
            img = Image.open(f).convert("RGB")
            hashes.append((f, imagehash.phash(img)))
        except Exception as e:
            print(f"Skip {f}: {e}", file=sys.stderr)

    threshold = args.duplicate_threshold
    groups: list[list[Path]] = []
    used = set()

    for i, (p1, h1) in enumerate(hashes):
        if p1 in used:
            continue
        grp = [p1]
        for p2, h2 in hashes[i + 1 :]:
            if p2 in used:
                continue
            if h1 - h2 <= threshold:
                grp.append(p2)
        if len(grp) > 1:
            for p in grp:
                used.add(p)
            groups.append(grp)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = []
    for g in groups:
        lines.append("--- same image (likely) ---")
        for p in g:
            lines.append(f"  {p}")
        lines.append("")

    text = "\n".join(lines)
    out.write_text(text, encoding="utf-8")
    print(f"Found {len(groups)} duplicate groups. Wrote {out}")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("scan", help="Match unknown images to canonical pins")
    s.add_argument("--folder", required=True, help="Folder with renamed Publer images")
    s.add_argument("--reference", default=str(DEFAULT_REF), help="Canonical pins directory")
    s.add_argument("--out", default="pipeline-data/publer-image-match.csv")
    s.add_argument("--max-dist", type=int, default=14, help="Max combined hash distance (lower=stricter)")

    d = sub.add_parser("duplicates", help="Find duplicate images inside a folder")
    d.add_argument("--folder", required=True)
    d.add_argument("--out", default="pipeline-data/publer-dupes.txt")
    d.add_argument("--duplicate-threshold", type=int, default=8, help="pHash Hamming distance for 'same image'")

    args = ap.parse_args()
    if args.cmd == "scan":
        cmd_scan(args)
    else:
        cmd_duplicates(args)


if __name__ == "__main__":
    main()
