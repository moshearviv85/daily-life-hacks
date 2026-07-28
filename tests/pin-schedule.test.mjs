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

test("pin schedule uses exactly 8 pins per day with safe, non-round UTC slots", () => {
  for (const date of ["2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24"]) {
    const count = pinsPerDayForDate(date);
    assert.equal(count, 8);

    const times = [];
    for (let slot = 0; slot < count; slot += 1) {
      const time = scheduledTimeForSlot(date, slot);
      times.push(time);
      assert.notEqual(minuteOf(time) % 15, 0);
    }
    assert.equal(new Set(times).size, 8);
    assert.ok(times[0] >= "12:00" && times[0] <= "12:09");
    assert.ok(times[1] >= "14:00" && times[1] <= "14:09");
    assert.ok(times[2] >= "16:00" && times[2] <= "16:09");
    assert.ok(times[3] >= "18:00" && times[3] <= "18:09");
    assert.ok(times[4] >= "20:00" && times[4] <= "20:09");
    assert.ok(times[5] >= "22:00" && times[5] <= "22:09");
    assert.ok(times[6] >= "00:00" && times[6] <= "00:09");
    assert.ok(times[7] >= "02:00" && times[7] <= "02:09");
  }
});

test("batch scheduling places exactly 8 pins on each full day", () => {
  const rows = Array.from({ length: 18 }, (_, index) => ({ row_id: `pin-${index}` }));
  const scheduled = scheduleRowsByRandomDayCount(rows, {
    startDate: new Date("2026-06-21T00:00:00Z"),
    random: () => 0.99,
  });

  const firstDay = scheduled.filter((row) => row.scheduled_date === "2026-06-21");
  assert.equal(firstDay.length, 8);
  assert.equal(scheduled[17].scheduled_date, "2026-06-23");
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
