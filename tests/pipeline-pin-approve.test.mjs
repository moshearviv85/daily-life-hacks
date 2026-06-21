import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/pipeline-pin-approve.js";

function scheduledAt(row) {
  return new Date(`${row.scheduled_date}T${row.scheduled_time || "00:00"}:00Z`);
}

function assertNonRoundTime(value) {
  const minute = Number.parseInt(String(value).split(":")[1] || "0", 10);
  assert.notEqual(minute % 15, 0);
}

function makeDb(pinOverrides = {}) {
  const schedule = new Map();
  const stagingSchedule = new Map();
  let latestPending = null;
  return {
    schedule,
    stagingSchedule,
    setLatestPending(row) {
      latestPending = row;
    },
    prepare(sql) {
      const targetSchedule = sql.includes("staging_pins_schedule") ? stagingSchedule : schedule;
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes("FROM pipeline_pins")) {
                if (pinOverrides === null) return null;
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
                  ...pinOverrides,
                };
              }
              if (sql.includes("FROM pins_schedule WHERE row_id")) {
                return schedule.has(args[0]) ? schedule.get(args[0]) : null;
              }
              if (sql.includes("FROM staging_pins_schedule WHERE row_id")) {
                return stagingSchedule.has(args[0]) ? stagingSchedule.get(args[0]) : null;
              }
              if (sql.includes("ORDER BY scheduled_date DESC")) {
                return latestPending;
              }
              throw new Error(`Unexpected first() query: ${sql}`);
            },
            async run() {
              if (!sql.includes("INSERT INTO pins_schedule") && !sql.includes("INSERT INTO staging_pins_schedule")) {
                throw new Error(`Unexpected run() query: ${sql}`);
              }
              targetSchedule.set(args[0], {
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
        async first() {
          if (sql.includes("ORDER BY scheduled_date DESC")) {
            return latestPending;
          }
          throw new Error(`Unexpected first() query: ${sql}`);
        },
        async all() {
          if (sql.includes("WHERE status = 'PENDING'")) {
            const rows = Array.from(targetSchedule.values()).filter((row) => row.status === "PENDING");
            if (latestPending) {
              rows.push({
                row_id: latestPending.row_id || "existing-pending-pin",
                status: "PENDING",
                link: latestPending.link || "https://www.daily-life-hacks.com/existing-article/",
                ...latestPending,
              });
            }
            return {
              results: rows,
            };
          }
          throw new Error(`Unexpected all() query: ${sql}`);
        },
        async run() {
          if (sql.includes("CREATE TABLE IF NOT EXISTS staging_pins_schedule")) {
            return { success: true };
          }
          throw new Error(`Unexpected run() query: ${sql}`);
        },
      };
    },
  };
}

test("staging queues a pipeline pin in the staging-only queue without dispatching", async (t) => {
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
  assert.equal(data.queued, true);
  assert.equal(data.staging, true);
  assert.equal(data.triggered, false);
  assert.equal(data.status, "PENDING");
  assert.equal(db.schedule.has("demo-pin"), false);
  assert.equal(db.stagingSchedule.get("demo-pin").status, "PENDING");
  assert.equal(db.stagingSchedule.get("demo-pin").link, "https://staging.daily-life-hacks.pages.dev/demo-article/");
  assert.equal(db.stagingSchedule.get("demo-pin").image_url, "https://staging.daily-life-hacks.pages.dev/images/pins/demo-pin.jpg");
  assert.equal(db.stagingSchedule.get("demo-pin").board_id, "1124140825679184034");
  assert.match(db.stagingSchedule.get("demo-pin").description, /#KitchenTips/);
  assert.match(db.stagingSchedule.get("demo-pin").description, /#DailyLifeHacks/);
  assert.equal(fetchCalled, false);
});

test("production queues a pipeline pin behind the latest pending pin without dispatching", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-06-01T08:00:00Z") });

  const db = makeDb();
  db.setLatestPending({ scheduled_date: "2026-06-05", scheduled_time: "08:30" });
  const checkedUrls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    checkedUrls.push({ url: String(url), method: init?.method || "GET" });
    return new Response(null, {
      status: 200,
      headers: { "Content-Type": String(url).endsWith(".jpg") ? "image/jpeg" : "text/html" },
    });
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
  assert.equal(data.queued, true);
  assert.equal(data.triggered, false);
  assert.equal(db.schedule.get("demo-pin").status, "PENDING");
  assert.equal(db.schedule.get("demo-pin").scheduled_date, "2026-06-05");
  assert.ok(scheduledAt(db.schedule.get("demo-pin")) > new Date("2026-06-05T08:30:00Z"));
  assertNonRoundTime(db.schedule.get("demo-pin").scheduled_time);
  assert.equal(db.schedule.get("demo-pin").link, "https://www.daily-life-hacks.com/demo-article/");
  assert.equal(db.schedule.get("demo-pin").image_url, "https://www.daily-life-hacks.com/images/pins/demo-pin.jpg");
  assert.match(db.schedule.get("demo-pin").description, /#KitchenTips/);
  assert.deepEqual(checkedUrls, [
    { url: "https://www.daily-life-hacks.com/demo-article/", method: "HEAD" },
    { url: "https://www.daily-life-hacks.com/images/pins/demo-pin.jpg", method: "HEAD" },
  ]);
});

test("production queues the first pending pin from the current UTC minute", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-06-20T08:19:45Z") });

  const db = makeDb();
  t.mock.method(globalThis, "fetch", async (url) => new Response(null, {
    status: 200,
    headers: { "Content-Type": String(url).endsWith(".jpg") ? "image/jpeg" : "text/html" },
  }));

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-pin-approve?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_slug: "demo-pin", publish_now: false }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", DB: db, CF_PAGES_BRANCH: "main" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.queued, true);
  assert.equal(db.schedule.get("demo-pin").scheduled_date, "2026-06-20");
  assert.equal(db.schedule.get("demo-pin").scheduled_time, "08:19");
});

test("production queues after now when the latest pending slot is stale", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-06-20T08:21:10Z") });

  const db = makeDb();
  db.setLatestPending({ scheduled_date: "2026-06-05", scheduled_time: "08:30" });
  t.mock.method(globalThis, "fetch", async (url) => new Response(null, {
    status: 200,
    headers: { "Content-Type": String(url).endsWith(".jpg") ? "image/jpeg" : "text/html" },
  }));

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-pin-approve?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_slug: "demo-pin", publish_now: false }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", DB: db, CF_PAGES_BRANCH: "main" },
  });

  assert.equal(response.status, 200);
  assert.equal(db.schedule.get("demo-pin").scheduled_date, "2026-06-20");
  assert.equal(db.schedule.get("demo-pin").scheduled_time, "08:21");
});

test("production approve can use staging pipeline metadata when production pipeline row is absent", async (t) => {
  const db = makeDb(null);
  const checkedUrls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    const href = String(url);
    checkedUrls.push({ url: href, method: init?.method || "GET" });
    if (href.startsWith("https://staging.daily-life-hacks.pages.dev/api/pipeline-status")) {
      return Response.json({
        pin_rows: [{
          article_slug: "demo-article",
          pin_slug: "demo-pin",
          pin_index: 0,
          title: "Demo Pin Title",
          description: "Demo pin description",
          alt: "Demo alt text",
          image_status: "done",
          category: "tips",
        }],
      });
    }
    return new Response(null, {
      status: 200,
      headers: { "Content-Type": href.endsWith(".jpg") ? "image/jpeg" : "text/html" },
    });
  });

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-pin-approve?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_slug: "demo-pin", publish_now: false }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", DB: db, CF_PAGES_BRANCH: "main" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.queued, true);
  assert.equal(data.staging, false);
  assert.equal(db.schedule.get("demo-pin").status, "PENDING");
  assert.equal(db.schedule.get("demo-pin").link, "https://www.daily-life-hacks.com/demo-article/");
  assert.deepEqual(checkedUrls, [
    { url: "https://staging.daily-life-hacks.pages.dev/api/pipeline-status?key=test-key", method: "GET" },
    { url: "https://www.daily-life-hacks.com/demo-article/", method: "HEAD" },
    { url: "https://www.daily-life-hacks.com/images/pins/demo-pin.jpg", method: "HEAD" },
  ]);
});

test("production blocks queueing when the production article or pin image is missing", async (t) => {
  const db = makeDb();
  const checkedUrls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    checkedUrls.push({ url: String(url), method: init?.method || "GET" });
    return new Response(null, { status: 404 });
  });

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-pin-approve?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_slug: "demo-pin", publish_now: true }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", DB: db, CF_PAGES_BRANCH: "main" },
  });

  assert.equal(response.status, 409);
  const data = await response.json();
  assert.equal(data.ok, false);
  assert.match(data.error, /Production target is not live/);
  assert.equal(db.schedule.has("demo-pin"), false);
  assert.deepEqual(checkedUrls, [
    { url: "https://www.daily-life-hacks.com/demo-article/", method: "HEAD" },
    { url: "https://www.daily-life-hacks.com/images/pins/demo-pin.jpg", method: "HEAD" },
  ]);
});

test("production approve is idempotent for an already queued pin", async () => {
  const db = makeDb();
  db.schedule.set("demo-pin", {
    row_id: "demo-pin",
    status: "PENDING",
    scheduled_date: "2026-05-29",
    scheduled_time: "12:00",
  });
  db.setLatestPending({ scheduled_date: "2026-05-30", scheduled_time: "20:00" });

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
  assert.equal(data.already_exists, true);
  assert.equal(data.status, "PENDING");
  assert.equal(data.scheduled_date, "2026-05-29");
  assert.equal(data.scheduled_time, "12:00");
  assert.equal(db.schedule.get("demo-pin").scheduled_date, "2026-05-29");
  assert.equal(db.schedule.get("demo-pin").scheduled_time, "12:00");
});

test("production approve reports an already posted pin without returning an error", async () => {
  const db = makeDb();
  db.schedule.set("demo-pin", {
    row_id: "demo-pin",
    status: "POSTED",
    scheduled_date: "2026-05-28",
    scheduled_time: "06:00",
    pin_id: "123",
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
  assert.equal(data.already_exists, true);
  assert.equal(data.status, "POSTED");
  assert.equal(data.pin_id, "123");
});

test("pin approval blocks incomplete pin metadata before queueing", async () => {
  const db = makeDb({ description: "" });

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-pin-approve?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin_slug: "demo-pin", publish_now: true }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", DB: db, CF_PAGES_BRANCH: "main" },
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.match(data.error, /Pin metadata is incomplete/);
  assert.equal(db.schedule.has("demo-pin"), false);
});
