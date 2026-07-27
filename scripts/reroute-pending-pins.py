#!/usr/bin/env python3
"""
Re-route the PENDING pin queue onto the rebuilt board set, and interleave it.

Two problems this fixes:

1. The queue was populated under the old routing, so none of its pins target
   the 13 narrow boards created 2026-07-27. Board choice is a distribution
   decision on Pinterest, not filing, so a stale board_id wastes the pin.

2. Ordering. The poster takes the next PENDING row by scheduled datetime. If
   the queue happens to hold a run of pins for one board, they publish
   back-to-back onto that board while every other board sits idle. At 8 pins a
   day that is a visible clump. This rewrites the order round-robin across
   boards so consecutive pins land on different boards.

Emits SQL. Run with --apply to execute it against D1, otherwise it only writes
the file and prints the before/after distribution.
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
OUT_SQL = Path("pipeline-data/reroute-pending.sql")
ID_TO_NAME = {}
for name, bid in BOARD_NAME_TO_ID.items():
    ID_TO_NAME.setdefault(bid, name)


def d1(sql: str) -> list:
    r = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, "--remote", "--command", sql],
        capture_output=True, text=True, shell=True,
        encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print(r.stderr[-800:])
        sys.exit(1)
    start = r.stdout.find("[")
    try:
        return json.loads(r.stdout[start:])[0]["results"]
    except Exception:
        print("could not parse wrangler output:\n", r.stdout[-800:])
        sys.exit(1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="execute the SQL against D1")
    args = ap.parse_args()

    rows = d1("SELECT row_id, pin_title, pin_description, alt_text, link, board_id, "
              "scheduled_date, scheduled_time FROM pins_schedule WHERE status='PENDING' "
              "ORDER BY scheduled_date ASC, scheduled_time ASC, row_id ASC")
    print(f"{len(rows)} PENDING pins\n")

    before = Counter(ID_TO_NAME.get(r["board_id"], r["board_id"]) for r in rows)

    # 1. Re-route each pin through the current rules.
    routed = []
    for r in rows:
        slug = (r.get("link") or "").rstrip("/").rsplit("/", 1)[-1]
        pin = {"title": r.get("pin_title") or "", "description": r.get("pin_description") or "",
               "alt": r.get("alt_text") or "", "article_slug": slug, "pin_slug": r["row_id"]}
        category = "recipes" if "recipe" in slug else "nutrition"
        name = board_for_pin(pin, category)
        routed.append({**r, "new_board": name, "new_board_id": board_name_to_id(name)})

    after = Counter(r["new_board"] for r in routed)

    # 2. Interleave: round-robin across boards so no board publishes twice in a row.
    buckets = defaultdict(deque)
    for r in routed:
        buckets[r["new_board"]].append(r)
    order = deque(sorted(buckets, key=lambda b: -len(buckets[b])))
    interleaved, last = [], None
    while any(buckets.values()):
        picked = None
        for _ in range(len(order)):
            b = order[0]
            order.rotate(-1)
            if buckets[b] and b != last:
                picked = b
                break
        if picked is None:  # only one board left with pins
            picked = next(b for b in buckets if buckets[b])
        interleaved.append(buckets[picked].popleft())
        last = picked

    # 3. Keep the existing schedule slots, reassign which pin occupies each.
    slots = [(r["scheduled_date"], r["scheduled_time"]) for r in rows]
    lines = []
    for pin, (d, t) in zip(interleaved, slots):
        lines.append(
            f"UPDATE pins_schedule SET board_id='{pin['new_board_id']}', "
            f"scheduled_date='{d}', scheduled_time='{t}' "
            f"WHERE row_id='{pin['row_id']}' AND status='PENDING';")

    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    OUT_SQL.write_text("\n".join(lines), encoding="utf-8")

    width = max(len(b) for b in set(before) | set(after))
    print(f"{'board':<{width}}  before  after")
    for b in sorted(set(before) | set(after), key=lambda x: -after.get(x, 0)):
        print(f"{b:<{width}}  {before.get(b,0):>6}  {after.get(b,0):>5}")
    top = max(after.values()) / len(routed) * 100
    print(f"\nboards used: {len(before)} -> {len(after)}")
    print(f"largest board share: {max(before.values())/len(rows)*100:.0f}% -> {top:.0f}%")

    runs = sum(1 for a, b in zip(interleaved, interleaved[1:]) if a["new_board"] == b["new_board"])
    print(f"consecutive same-board pairs after interleaving: {runs} of {len(interleaved)-1}")
    print(f"\nwrote {OUT_SQL} ({len(lines)} statements)")

    if not args.apply:
        print("DRY RUN. Re-run with --apply to execute against D1.")
        return 0

    r = subprocess.run(["npx", "wrangler", "d1", "execute", DB, "--remote",
                        "--file", str(OUT_SQL), "-y"],
                       capture_output=True, text=True, shell=True,
        encoding="utf-8", errors="replace")
    print(r.stdout[-600:] if r.returncode == 0 else r.stderr[-800:])
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
