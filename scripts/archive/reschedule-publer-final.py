import argparse
import csv
import os
import random
from datetime import datetime, timedelta


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "pipeline-data", "pins-publer-final.csv")

WINDOWS = [
    ((9, 5), (10, 20)),
    ((10, 45), (12, 0)),
    ((12, 30), (13, 50)),
    ((14, 20), (15, 45)),
    ((16, 10), (17, 40)),
]


def load_rows(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)


def save_rows(path, headers, rows):
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)
    os.replace(tmp_path, path)


def random_daily_slots(day_seed):
    rng = random.Random(day_seed)
    slots = []
    for start, end in WINDOWS:
        start_minutes = (start[0] * 60) + start[1]
        end_minutes = (end[0] * 60) + end[1]
        minute_of_day = rng.randint(start_minutes, end_minutes)
        slots.append(f"{minute_of_day // 60:02d}:{minute_of_day % 60:02d}")
    return sorted(slots)


def schedule_rows(rows, start_date):
    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    scheduled = []
    day_offset = 0
    slot_index = 0
    daily_slots = random_daily_slots(f"{start_date}:{day_offset}")

    for row in rows:
        timestamp = (current_date + timedelta(days=day_offset)).strftime(
            f"%Y-%m-%d {daily_slots[slot_index]}"
        )
        updated = dict(row)
        updated["Date - Intl. format or prompt"] = timestamp
        scheduled.append(updated)

        slot_index += 1
        if slot_index >= len(daily_slots):
            slot_index = 0
            day_offset += 1
            daily_slots = random_daily_slots(f"{start_date}:{day_offset}")

    return scheduled


def main():
    default_start = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-date", default=default_start)
    args = parser.parse_args()

    headers, rows = load_rows(CSV_PATH)
    scheduled_rows = schedule_rows(rows, args.start_date)
    save_rows(CSV_PATH, headers, scheduled_rows)

    print(f"rows={len(scheduled_rows)}")
    print(f"start_date={args.start_date}")
    if scheduled_rows:
        print(f"first_slot={scheduled_rows[0]['Date - Intl. format or prompt']}")
        print(f"last_slot={scheduled_rows[-1]['Date - Intl. format or prompt']}")


if __name__ == "__main__":
    main()
