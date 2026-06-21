import assert from "node:assert/strict";
import test from "node:test";

import { onRequestGet } from "../functions/api/pins-next.js";

function scheduledAt(row) {
  return new Date(`${row.scheduled_date}T${row.scheduled_time || "00:00"}:00Z`);
}

function assertNonRoundTime(value) {
  const minute = Number.parseInt(String(value).split(":")[1] || "0", 10);
  assert.notEqual(minute % 15, 0);
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ") + " UTC";
}

function makeDb({ latestPosted = null, duePins = [], articleStatus = "PUBLISHED", latestPending = null, postedToday = 0 } = {}) {
  const queries = [];
  const updates = [];

  return {
    queries,
    updates,
    prepare(sql) {
      queries.push(sql);
      const statement = {
        args: [],
        bind(...args) {
          statement.args = args;
          return statement;
        },
        async first() {
          if (sql.includes("COUNT(*) AS count")) {
            return { count: postedToday };
          }
          if (sql.includes("FROM pins_schedule") && sql.includes("published_date")) {
            return latestPosted;
          }
          if (sql.includes("FROM articles_schedule")) {
            return { status: articleStatus };
          }
          if (sql.includes("ORDER BY scheduled_date DESC")) return latestPending;
          if (sql.includes("duplicate_posted_copy") || sql.includes("lower(trim(pin_title))")) {
            return null;
          }
          return null;
        },
        async all() {
          if (sql.includes("SELECT row_id, scheduled_date")) {
            return {
              results: [
                ...duePins,
                ...(latestPending ? [{ row_id: "latest-pending", ...latestPending }] : []),
              ],
            };
          }
          if (sql.includes("FROM pins_schedule") && sql.includes("status = 'PENDING'")) {
            return { results: duePins };
          }
          return { results: [] };
        },
        async run() {
          updates.push({ sql, args: statement.args });
          return { success: true };
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

test("pins-next blocks scheduled publishing after the daily post limit", async () => {
  const db = makeDb({
    postedToday: 9,
    latestPosted: { row_id: "previous-pin", published_date: minutesAgo(180) },
    duePins: [duePin],
  });

  const response = await onRequestGet({
    request: makeRequest("/api/pins-next?key=test-key"),
    env: { STATS_KEY: "test-key", DB: db, PINS_MIN_POST_INTERVAL_MINUTES: "110" },
  });

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("X-Pins-Reason"), "daily_scheduled_post_limit_reached");
  assert.equal(response.headers.get("X-Pins-Posted-Today"), "9");
  assert.equal(response.headers.get("X-Pins-Max-Scheduled-Posts-Per-Day"), "9");
  assert.equal(
    db.queries.some((sql) => sql.includes("status = 'PENDING'")),
    false,
  );
});

test("pins-next lets immediate publishing bypass the daily post limit", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const db = makeDb({
      postedToday: 3,
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

test("pins-next moves pins with unpublished articles to the end of the queue", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const db = makeDb({
      duePins: [duePin],
      articleStatus: "PENDING",
      latestPending: { scheduled_date: "2026-06-29", scheduled_time: "20:00" },
    });

    const response = await onRequestGet({
      request: makeRequest("/api/pins-next?key=test-key&immediate=1"),
      env: { STATS_KEY: "test-key", DB: db, PINS_MIN_POST_INTERVAL_MINUTES: "0" },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("X-Pins-Reason"), "all_due_pins_blocked_by_safety_checks");
    assert.equal(db.updates.length, 1);
    assert.match(db.updates[0].sql, /UPDATE pins_schedule/);
    assert.ok(scheduledAt({ scheduled_date: db.updates[0].args[0], scheduled_time: db.updates[0].args[1] }) > new Date("2026-06-29T20:00:00Z"));
    assertNonRoundTime(db.updates[0].args[1]);
    assert.match(db.updates[0].args[2], /article_not_live/);
    assert.equal(db.updates[0].args[3], "demo-pin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("pins-next prefers a different article than the last posted pin", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const sameArticlePin = {
      ...duePin,
      row_id: "meat-pin-2",
      link: "https://www.daily-life-hacks.com/high-protein-ground-beef-recipes/",
      image_url: "https://www.daily-life-hacks.com/images/pins/meat-pin-2.jpg",
    };
    const differentArticlePin = {
      ...duePin,
      row_id: "salad-pin-1",
      link: "https://www.daily-life-hacks.com/easy-meal-prep-salads/",
      image_url: "https://www.daily-life-hacks.com/images/pins/salad-pin-1.jpg",
    };

    const db = makeDb({
      latestPosted: {
        row_id: "meat-pin-1",
        link: "https://www.daily-life-hacks.com/high-protein-ground-beef-recipes/",
        published_date: minutesAgo(180),
      },
      duePins: [sameArticlePin, differentArticlePin],
    });

    const response = await onRequestGet({
      request: makeRequest("/api/pins-next?key=test-key&immediate=1"),
      env: { STATS_KEY: "test-key", DB: db, PINS_MIN_POST_INTERVAL_MINUTES: "110" },
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.row_id, "salad-pin-1");
    assert.equal(db.updates.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("pins-next allows same-article pin when no other valid pin is due", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 200 });

  try {
    const db = makeDb({
      latestPosted: {
        row_id: "meat-pin-1",
        link: "https://www.daily-life-hacks.com/high-protein-ground-beef-recipes/",
        published_date: minutesAgo(180),
      },
      latestPending: { scheduled_date: "2026-05-29", scheduled_time: "20:00" },
      duePins: [{
        ...duePin,
        row_id: "meat-pin-2",
        link: "https://www.daily-life-hacks.com/high-protein-ground-beef-recipes/",
      }],
    });

    const response = await onRequestGet({
      request: makeRequest("/api/pins-next?key=test-key&immediate=1"),
      env: { STATS_KEY: "test-key", DB: db, PINS_MIN_POST_INTERVAL_MINUTES: "110" },
    });

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.row_id, "meat-pin-2");
    assert.equal(db.updates.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
