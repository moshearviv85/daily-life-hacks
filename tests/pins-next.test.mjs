import assert from "node:assert/strict";
import test from "node:test";

import { onRequestGet } from "../functions/api/pins-next.js";

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ") + " UTC";
}

function makeDb({ latestPosted = null, duePins = [] } = {}) {
  const queries = [];

  return {
    queries,
    prepare(sql) {
      queries.push(sql);
      const statement = {
        bind() {
          return statement;
        },
        async first() {
          if (sql.includes("FROM pins_schedule") && sql.includes("published_date")) {
            return latestPosted;
          }
          if (sql.includes("FROM articles_schedule")) {
            return { status: "PUBLISHED" };
          }
          if (sql.includes("duplicate_posted_copy") || sql.includes("lower(trim(pin_title))")) {
            return null;
          }
          return null;
        },
        async all() {
          if (sql.includes("FROM pins_schedule") && sql.includes("status = 'PENDING'")) {
            return { results: duePins };
          }
          return { results: [] };
        },
      };
      return statement;
    },
  };
}

function makeRequest(path) {
  return new Request(`https://www.daily-life-hacks.com${path}`);
}

const duePin = {
  row_id: "demo-pin",
  pin_title: "Smart Budget Meal Ideas",
  pin_description: "Simple budget meal ideas for busy weeknights.",
  alt_text: "Budget meal prep containers on a kitchen counter",
  image_url: "https://www.daily-life-hacks.com/images/pins/demo-pin.jpg",
  board_id: "123",
  link: "https://www.daily-life-hacks.com/demo-article/",
  scheduled_date: "2026-05-29",
  scheduled_time: "10:00",
};

test("pins-next blocks immediate row publishing during the cooldown window", async () => {
  const db = makeDb({
    latestPosted: { row_id: "previous-pin", published_date: minutesAgo(30) },
    duePins: [duePin],
  });

  const response = await onRequestGet({
    request: makeRequest("/api/pins-next?key=test-key&immediate=1&row_id=demo-pin"),
    env: { STATS_KEY: "test-key", DB: db, PINS_MIN_POST_INTERVAL_MINUTES: "110" },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("X-Pins-Reason"), "min_post_interval_not_elapsed");
  assert.equal(response.headers.get("X-Pins-Last-Posted-Row"), "previous-pin");
  assert.equal(
    db.queries.some((sql) => sql.includes("status = 'PENDING'")),
    false,
  );
});

test("pins-next allows immediate row publishing after the cooldown window", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const db = makeDb({
      latestPosted: { row_id: "previous-pin", published_date: minutesAgo(180) },
      duePins: [duePin],
    });

    const response = await onRequestGet({
      request: makeRequest("/api/pins-next?key=test-key&immediate=1&row_id=demo-pin"),
      env: { STATS_KEY: "test-key", DB: db, PINS_MIN_POST_INTERVAL_MINUTES: "110" },
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.row_id, "demo-pin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
