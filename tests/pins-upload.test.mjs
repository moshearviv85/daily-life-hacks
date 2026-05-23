import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/pins-upload.js";

function makeRequest(body) {
  return new Request("https://example.test/api/pins-upload?key=test-key", {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body,
  });
}

function makeDb() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes("MAX(scheduled_date)")) {
                return { max_date: null };
              }
              if (sql.includes("SELECT status FROM pins_schedule WHERE row_id")) {
                const row = rows.get(args[0]);
                return row ? { status: row.status } : null;
              }
              if (sql.includes("SELECT row_id, status FROM pins_schedule WHERE row_id")) {
                const row = rows.get(args[0]);
                return row ? { row_id: args[0], status: row.status } : null;
              }
              throw new Error(`Unexpected first() query: ${sql}`);
            },
            async run() {
              if (sql.includes("INSERT INTO pins_schedule")) {
                rows.set(args[0], {
                  row_id: args[0],
                  pin_title: args[1],
                  image_url: args[4],
                  board_id: args[5],
                  link: args[6],
                  scheduled_date: args[7],
                  scheduled_time: args[8],
                  status: args[9],
                });
                return { success: true };
              }
              if (sql.includes("UPDATE pins_schedule SET")) {
                const rowId = args[9];
                rows.set(rowId, {
                  ...(rows.get(rowId) || {}),
                  row_id: rowId,
                  pin_title: args[0],
                  image_url: args[3],
                  board_id: args[4],
                  link: args[5],
                  scheduled_date: args[6],
                  scheduled_time: args[7],
                  status: args[8],
                });
                return { success: true };
              }
              throw new Error(`Unexpected run() query: ${sql}`);
            },
          };
        },
      };
    },
  };
}

test("Agent-format pin uploads default to REVIEW and do not trigger posting", async (t) => {
  const db = makeDb();
  let fetchCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    fetchCalls++;
    return new Response(null, { status: 204 });
  });

  const csv = [
    "slug,variant,pin_title,description,alt_text,board",
    "demo,1,Demo Pin,Useful pin copy,A helpful alt text,High Fiber Dinner and Gut Health Recipes",
  ].join("\n");

  const response = await onRequestPost({
    request: makeRequest(csv),
    env: { STATS_KEY: "test-key", DB: db, GH_PAT: "gh-token" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.inserted, 1);
  assert.equal(data.triggered, false);
  assert.equal(fetchCalls, 0);
  assert.equal(db.rows.get("demo_v1").status, "REVIEW");
});

test("Explicit PENDING pin uploads may trigger posting", async (t) => {
  const db = makeDb();
  let fetchCalls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    fetchCalls++;
    return new Response(null, { status: 204 });
  });

  const csv = [
    "row_id,pin_title,pin_description,alt_text,image_url,board_id,link,scheduled_date,status,pin_id,published_date,pinterest_response",
    "demo-pin,Demo Pin,Useful pin copy,A helpful alt text,https://example.test/pin.jpg,board,https://example.test/demo/,2026-05-23,PENDING,,,",
  ].join("\n");

  const response = await onRequestPost({
    request: makeRequest(csv),
    env: { STATS_KEY: "test-key", DB: db, GH_PAT: "gh-token" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.inserted, 1);
  assert.equal(data.triggered, true);
  assert.equal(fetchCalls, 1);
  assert.equal(db.rows.get("demo-pin").status, "PENDING");
});
