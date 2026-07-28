#!/usr/bin/env python3
"""
Reorder the PENDING pin queue so the new, empty boards fill up first.

Thirteen narrow boards were created on 2026-07-27 and almost all still hold
zero pins. An empty board is dead weight: Pinterest has nothing to learn its
topic from, so it contributes nothing to the pins that later land on it. The
fastest way to make the new board structure real is to fill every one of them
before adding more pins to boards that already have hundreds.

So this pass:
  1. Reads the live pin count of every board.
  2. Splits the pending queue into pins destined for an under-filled board and
     pins destined for an established one.
  3. Puts the under-filled group first, round-robin across boards so they fill
     evenly rather than one board at a time.
  4. Leaves the established-board pins queued behind them, also interleaved.

A pin is never moved to a board its content does not match. Board routing still
comes from board_for_pin; this only changes the ORDER pins are published in, so
the fill rate is capped by how many pending pins each board legitimately claims.

Run with --apply to write to D1. Otherwise it only reports.
"""

import argparse
import json
import subprocess
import sys
from collections import Counter, defaultdict, deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib.d1_csv import board_for_pin, board_name_to_id, BOARD_NAME_TO_ID  # noqa: E402

DB = "dlh-subscriptions"
OUT_SQL = Path("pipeline-data/prioritize-empty-boards.sql")

# A board at or below this many live pins is treated as empty and needing fill.
# Default 2 catches the boards created 2026-07-27 that never received a pin.
DEFAULT_THRESHOLD = 2

ID_TO_NAME = {}
for name, bid in BOARD_NAME_TO_ID.items():
    ID_TO_NAME.setdefault(bid, name)


def run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True, text=True, shell=True,
                       encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print(r.stderr[-800:])
        sys.exit(1)
    return r.stdout


def d1(sql: str) -> list:
    out = run(["npx", "wrangler", "d1", "execute", DB, "--remote", "--command", sql])
    start = out.find("[")
    try:
        return json.loads(out[start:])[0]["results"]
    except Exception:
        print("could not parse wrangler output:\n", out[-800:])
        sys.exit(1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD)
    ap.add_argument("--live-counts", type=Path,
                    help="JSON {board_id: pin_count}. Without it, every board "
                         "the router can reach is treated as needing fill.")
    args = ap.parse_args()

    live_counts = {}
    if args.live_counts and args.live_counts.exists():
        live_counts = json.loads(args.live_counts.read_text(encoding="utf-8"))

    rows = d1("SELECT row_id, pin_title, pin_description, alt_text, link, board_id, "
              "scheduled_date, scheduled_time FROM pins_schedule WHERE status='PENDING' "
              "ORDER BY scheduled_date ASC, scheduled_time ASC, row_id ASC")
    print(f"{len(rows)} PENDING pins\n")

    routed = []
    for r in rows:
        slug = (r.get("link") or "").rstrip("/").rsplit("/", 1)[-1]
        pin = {"title": r.get("pin_title") or "", "description": r.get("pin_description") or "",
               "alt": r.get("alt_text") or "", "article_slug": slug, "pin_slug": r["row_id"]}
        name = board_for_pin(pin, "recipes" if "recipe" in slug else "nutrition")
        bid = board_name_to_id(name)
        routed.append({**r, "board": name, "new_board_id": bid,
                       "live": live_counts.get(bid, 0)})

    needs_fill = [r for r in routed if r["live"] <= args.threshold]
    established = [r for r in routed if r["live"] > args.threshold]

    def interleave(group):
        """Round-robin across boards so no board publishes twice in a row."""
        buckets = defaultdict(deque)
        for r in group:
            buckets[r["board"]].append(r)
        order = deque(sorted(buckets, key=lambda b: -len(buckets[b])))
        out, last = [], None
        while any(buckets.values()):
            picked = None
            for _ in range(len(order)):
                b = order[0]
                order.rotate(-1)
                if buckets[b] and b != last:
                    picked = b
                    break
            if picked is None:
                picked = next(b for b in buckets if buckets[b])
            out.append(buckets[picked].popleft())
            last = picked
        return out

    ordered = interleave(needs_fill) + interleave(established)

    fill_counts = Counter(r["board"] for r in needs_fill)
    print(f"PHASE 1 - fill the new boards: {len(needs_fill)} pins, "
          f"{len(fill_counts)} boards, ~{len(needs_fill) / 8:.0f} days at 8/day")
    for b, n in fill_counts.most_common():
        live = live_counts.get(board_name_to_id(b), 0)
        print(f"  {n:4d} queued  (live now: {live:3d})  {b}")

    est_counts = Counter(r["board"] for r in established)
    if est_counts:
        print(f"\nPHASE 2 - established boards: {len(established)} pins")
        for b, n in est_counts.most_common():
            print(f"  {n:4d} queued  (live now: {live_counts.get(board_name_to_id(b), 0):3d})  {b}")

    # Keep the existing slot times; only which pin occupies each slot changes.
    slots = [(r["scheduled_date"], r["scheduled_time"]) for r in rows]
    lines = [
        f"UPDATE pins_schedule SET board_id='{p['new_board_id']}', "
        f"scheduled_date='{d}', scheduled_time='{t}' "
        f"WHERE row_id='{p['row_id']}' AND status='PENDING';"
        for p, (d, t) in zip(ordered, slots)
    ]
    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    OUT_SQL.write_text("\n".join(lines), encoding="utf-8")

    runs = sum(1 for a, b in zip(ordered, ordered[1:]) if a["board"] == b["board"])
    print(f"\nconsecutive same-board pairs: {runs} of {len(ordered) - 1}")
    print(f"first 8 pins (day one):")
    for p in ordered[:8]:
        print(f"  {p['board']}")
    print(f"\nwrote {OUT_SQL} ({len(lines)} statements)")

    if not args.apply:
        print("DRY RUN. Re-run with --apply to execute against D1.")
        return 0

    out = run(["npx", "wrangler", "d1", "execute", DB, "--remote", "--file", str(OUT_SQL), "-y"])
    print(out[-400:])
    return 0


if __name__ == "__main__":
    sys.exit(main())
