import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/pipeline-pin-approve.js";

function makeDb() {
  const schedule = new Map();
  return {
    schedule,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes("FROM pipeline_pins")) {
                if (args[0] !== "demo-pin") return null;
                return {
                  article_slug: "demo-article",
                  pin_slug: "demo-pin",
                  pin_index: 0,
                  title: "Demo Pin Title",
                  description: "Demo pin description",
                  alt: "Demo alt text",
                  image_status: "done",
                  category: "tips",
                };
              }
              if (sql.includes("SELECT status FROM pins_schedule")) {
                return schedule.has(args[0]) ? { status: schedule.get(args[0]).status } : null;
              }
              throw new Error(`Unexpected first() query: ${sql}`);
            },
            async run() {
              if (!sql.includes("INSERT INTO pins_schedule")) {
                throw new Error(`Unexpected run() query: ${sql}`);
              }
              schedule.set(args[0], {
                row_id: args[0],
                title: args[1],
                description: args[2],
                alt: args[3],
                image_url: args[4],
                board_id: args[5],
                link: args[6],
                scheduled_date: args[7],
                scheduled_time: args[8],
                status: "PENDING",
              });
              return { success: true };
            },
          };
        },
      };
    },
  };
}

test("staging validates a pipeline pin without writing or dispatching", async (t) => {
  const db = makeDb();
  let fetchCalled = false;
  t.mock.method(globalThis, "fetch", async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  });

  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-pin-approve?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_slug: "demo-pin", publish_now: true }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", DB: db, CF_PAGES_BRANCH: "staging" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.dry_run, true);
  assert.equal(data.triggered, false);
  assert.equal(data.status, "STAGING_DRY_RUN");
  assert.equal(db.schedule.has("demo-pin"), false);
  assert.equal(fetchCalled, false);
});

test("production approves a pipeline pin and dispatches the exact row id", async (t) => {
  const db = makeDb();
  let dispatchBody = null;
  t.mock.method(globalThis, "fetch", async (_url, init) => {
    dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  });

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-pin-approve?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_slug: "demo-pin", publish_now: true }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", DB: db, CF_PAGES_BRANCH: "main" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.row_id, "demo-pin");
  assert.equal(data.triggered, true);
  assert.equal(db.schedule.get("demo-pin").status, "PENDING");
  assert.equal(db.schedule.get("demo-pin").link, "https://www.daily-life-hacks.com/demo-article/");
  assert.equal(db.schedule.get("demo-pin").image_url, "https://www.daily-life-hacks.com/images/pins/demo-pin.jpg");
  assert.equal(dispatchBody.inputs.immediate, "true");
  assert.equal(dispatchBody.inputs.row_id, "demo-pin");
});
