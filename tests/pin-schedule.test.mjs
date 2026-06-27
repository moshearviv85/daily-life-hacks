import assert from "node:assert/strict";
import test from "node:test";

import {
  nextQueueSlotFromPending,
  pinsPerDayForDate,
  scheduleRowsByRandomDayCount,
  scheduledTimeForSlot,
} from "../functions/api/_pin-schedule.js";

function minuteOf(time) {
  return Number.parseInt(time.split(":")[1], 10);
}

test("pin schedule uses 6 to 9 pins per day with non-round minutes", () => {
  for (const date of ["2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24"]) {
    const count = pinsPerDayForDate(date);
    assert.ok(count >= 6 && count <= 9);

    for (let slot = 0; slot < count; slot += 1) {
      const time = scheduledTimeForSlot(date, slot);
      assert.notEqual(minuteOf(time) % 15, 0);
    }
  }
});

test("random batch scheduling can place 9 pins on a day", () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({ row_id: `pin-${index}` }));
  const scheduled = scheduleRowsByRandomDayCount(rows, {
    startDate: new Date("2026-06-21T00:00:00Z"),
    random: () => 0.99,
  });

  const firstDay = scheduled.filter((row) => row.scheduled_date === "2026-06-21");
  assert.equal(firstDay.length, 9);
  assert.equal(scheduled[9].scheduled_date, "2026-06-22");
  for (const row of scheduled) {
    assert.notEqual(minuteOf(row.scheduled_time) % 15, 0);
  }
});

test("next queue slot does not duplicate a pin already scheduled in the current minute", () => {
  const next = nextQueueSlotFromPending([
    { row_id: "pin-a", scheduled_date: "2026-06-27", scheduled_time: "08:07" },
  ], new Date("2026-06-27T08:07:42Z"));

  assert.equal(next.scheduled_date, "2026-06-27");
  assert.notEqual(next.scheduled_time, "08:07");
  assert.notEqual(minuteOf(next.scheduled_time) % 15, 0);
});
