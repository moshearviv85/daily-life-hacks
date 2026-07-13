import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PAGE_VIEWS_BY_DAY_SQL,
  fillUtcDaySeries,
  lastCompleteUtcDaysWindow,
  onRequestGet,
} from "../functions/api/analytics.js";

const fixtureUrl = new URL("./fixtures/analytics-events-page-views.json", import.meta.url);
const events = JSON.parse(await readFile(fixtureUrl, "utf8"));
const fixedNow = new Date("2026-07-13T15:45:00.000Z");

function sqliteTimestampToMs(value) {
  return Date.parse(value.replace(" ", "T") + "Z");
}

function fakeDb(eventRows) {
  return {
    prepare(sql) {
      if (sql === PAGE_VIEWS_BY_DAY_SQL) {
        return {
          bind(start, endExclusive) {
            return {
              async all() {
                assert.match(sql, /event_type\s*=\s*'page_view'/);
                assert.match(sql, /datetime\(created_at\)\s*>=\s*datetime\(\?1\)/);
                assert.match(sql, /datetime\(created_at\)\s*<\s*datetime\(\?2\)/);
                const startMs = Date.parse(start);
                const endMs = Date.parse(endExclusive);
                const counts = new Map();
                for (const row of eventRows) {
                  const timestamp = sqliteTimestampToMs(row.created_at);
                  if (
                    row.event_type === "page_view" &&
                    timestamp >= startMs &&
                    timestamp < endMs
                  ) {
                    const day = row.created_at.slice(0, 10);
                    counts.set(day, (counts.get(day) || 0) + 1);
                  }
                }
                return {
                  results: [...counts].map(([day, count]) => ({ day, count })),
                };
              },
            };
          },
        };
      }

      return {
        async first() {
          return { count: eventRows.length };
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
}

test("lastCompleteUtcDaysWindow returns seven completed days, never eight", () => {
  const window = lastCompleteUtcDaysWindow(fixedNow, 7);
  assert.equal(window.start.toISOString(), "2026-07-06T00:00:00.000Z");
  assert.equal(window.endExclusive.toISOString(), "2026-07-13T00:00:00.000Z");
  assert.equal((window.endExclusive - window.start) / 86_400_000, 7);
  assert.equal(fillUtcDaySeries([], window).length, 7);
});

test("analytics API excludes other event types and both out-of-window boundaries", async () => {
  const response = await onRequestGet({
    request: new Request("https://example.test/api/analytics?key=test-key"),
    env: { STATS_KEY: "test-key", DB: fakeDb(events) },
    data: { now: fixedNow },
  });
  assert.equal(response.status, 200);
  const body = await response.json();

  assert.equal(body.page_views_window.event_type, "page_view");
  assert.equal(body.page_views_window.days, 7);
  assert.equal(body.page_views_by_day.length, 7);
  assert.deepEqual(body.page_views_by_day, [
    { day: "2026-07-06", count: 1 },
    { day: "2026-07-07", count: 0 },
    { day: "2026-07-08", count: 0 },
    { day: "2026-07-09", count: 0 },
    { day: "2026-07-10", count: 1 },
    { day: "2026-07-11", count: 0 },
    { day: "2026-07-12", count: 1 },
  ]);
  assert.equal(body.page_views_by_day.reduce((sum, row) => sum + row.count, 0), 3);
});
