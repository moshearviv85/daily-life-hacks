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

test("pin schedule uses exactly 3 pins per day with safe, non-round UTC slots", () => {
  for (const date of ["2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24"]) {
    const count = pinsPerDayForDate(date);
    assert.equal(count, 3);

    const times = [];
    for (let slot = 0; slot < count; slot += 1) {
      const time = scheduledTimeForSlot(date, slot);
      times.push(time);
      assert.notEqual(minuteOf(time) % 15, 0);
    }
    assert.equal(new Set(times).size, 3);
    assert.ok(times[0] >= "14:00" && times[0] <= "15:59");
    assert.ok(times[1] >= "18:00" && times[1] <= "19:59");
    assert.ok(times[2] >= "22:00" && times[2] <= "23:59");
  }
});

test("batch scheduling places exactly 3 pins on each full day", () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({ row_id: `pin-${index}` }));
  const scheduled = scheduleRowsByRandomDayCount(rows, {
    startDate: new Date("2026-06-21T00:00:00Z"),
    random: () => 0.99,
  });

  const firstDay = scheduled.filter((row) => row.scheduled_date === "2026-06-21");
  assert.equal(firstDay.length, 3);
  assert.equal(scheduled[9].scheduled_date, "2026-06-24");
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
