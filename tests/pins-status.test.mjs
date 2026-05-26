import assert from "node:assert/strict";
import test from "node:test";

import { onRequestGet } from "../functions/api/pins-status.js";

function makeDb() {
  const queries = [];
  return {
    queries,
    prepare(sql) {
      queries.push(sql);
      return {
        async run() {
          return { success: true };
        },
        async all() {
          if (sql.includes("GROUP BY status")) {
            return { results: [{ status: "PENDING", count: 1 }] };
          }
          if (sql.includes("WHERE status = 'PENDING'")) {
            return {
              results: [{
                row_id: "demo-pin",
                pin_title: "Demo Pin",
                scheduled_date: "2026-05-27",
                board_id: "board",
                image_url: "https://example.test/pin.jpg",
              }],
            };
          }
          return { results: [] };
        },
      };
    },
  };
}

test("staging pins status reads from the staging queue", async () => {
  const db = makeDb();
  const response = await onRequestGet({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pins-status?key=test-key"),
    env: { DASHBOARD_PASSWORD: "test-key", DB: db, CF_PAGES_BRANCH: "staging" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.queue, "staging");
  assert.equal(data.pending, 1);
  assert.equal(data.upcoming[0].row_id, "demo-pin");
  assert.equal(db.queries.some((q) => q.includes("staging_pins_schedule")), true);
});

test("production pins status reads from the production queue", async () => {
  const db = makeDb();
  const response = await onRequestGet({
    request: new Request("https://www.daily-life-hacks.com/api/pins-status?key=test-key"),
    env: { DASHBOARD_PASSWORD: "test-key", DB: db, CF_PAGES_BRANCH: "main" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.queue, "production");
  assert.equal(data.pending, 1);
  assert.equal(db.queries.some((q) => q.includes("FROM pins_schedule")), true);
});
