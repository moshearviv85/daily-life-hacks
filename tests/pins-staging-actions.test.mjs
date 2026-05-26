import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost as clearPins } from "../functions/api/pins-clear.js";
import { onRequestPost as reschedulePins } from "../functions/api/pins-reschedule.js";
import { onRequestPost as triggerPins } from "../functions/api/pins-trigger.js";

function makeDb() {
  const queries = [];
  return {
    queries,
    prepare(sql) {
      queries.push(sql);
      return {
        bind() {
          return {
            async run() {
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        },
        async all() {
          if (sql.includes("WHERE status = 'PENDING'")) {
            return { results: [{ row_id: "demo-pin", scheduled_date: "2026-05-27" }] };
          }
          return { results: [] };
        },
      };
    },
  };
}

test("staging post-now is blocked before dispatching GitHub Actions", async (t) => {
  let fetchCalled = false;
  t.mock.method(globalThis, "fetch", async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  });

  const response = await triggerPins({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pins-trigger?key=test-key", { method: "POST" }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "staging" },
  });

  assert.equal(response.status, 409);
  const data = await response.json();
  assert.equal(data.queue, "staging");
  assert.equal(fetchCalled, false);
});

test("staging clear pending deletes from the staging queue only", async () => {
  const db = makeDb();
  const response = await clearPins({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pins-clear?key=test-key", { method: "POST" }),
    env: { DASHBOARD_PASSWORD: "test-key", DB: db, CF_PAGES_BRANCH: "staging" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.queue, "staging");
  assert.equal(db.queries.some((q) => q.includes("DELETE FROM staging_pins_schedule")), true);
  assert.equal(db.queries.some((q) => q.includes("DELETE FROM pins_schedule")), false);
});

test("staging reschedule updates the staging queue only", async () => {
  const db = makeDb();
  const response = await reschedulePins({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pins-reschedule?key=test-key", { method: "POST" }),
    env: { DASHBOARD_PASSWORD: "test-key", DB: db, CF_PAGES_BRANCH: "staging" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.queue, "staging");
  assert.equal(data.rescheduled, 1);
  assert.equal(db.queries.some((q) => q.includes("UPDATE staging_pins_schedule")), true);
  assert.equal(db.queries.some((q) => q.includes("UPDATE pins_schedule")), false);
});
