import assert from "node:assert/strict";
import test from "node:test";

import { onRequestGet, onRequestPost } from "../functions/api/pipeline-topics.js";

function makeDb() {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async all() {
              calls.push({ type: "all", sql, args });
              return { results: [{ slug: "bad-topic" }] };
            },
            async run() {
              calls.push({ type: "run", sql, args });
              return { success: true };
            },
          };
        },
      };
    },
  };
}

test("rejecting pipeline topics clears stale article and pin rows for their slugs", async () => {
  const db = makeDb();
  const response = await onRequestPost({
    request: new Request("https://staging.example.test/api/pipeline-topics?key=test-key&action=reject", {
      method: "POST",
      body: JSON.stringify({ ids: [137], reason: "quality check failed" }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", DB: db },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.ok(db.calls.some((call) => call.sql.includes("SELECT slug FROM pipeline_topics")));
  assert.ok(db.calls.some((call) => call.sql.includes("DELETE FROM pipeline_pins")));
  assert.ok(db.calls.some((call) => call.sql.includes("DELETE FROM pipeline_articles")));
});

test("production dashboard proxies pipeline topics to staging", async (t) => {
  const fetched = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    fetched.push({ url: String(url), method: init?.method || "GET" });
    return new Response(JSON.stringify({ topics: [{ id: 17, topic: "Staging Topic" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const response = await onRequestGet({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-topics?key=test-key&status=approved"),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      CF_PAGES_BRANCH: "main",
      DB: {
        prepare() {
          throw new Error("production DB should not be queried for pipeline topics");
        },
      },
    },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.source, "staging");
  assert.equal(data.topics[0].topic, "Staging Topic");
  assert.deepEqual(fetched, [{
    url: "https://staging.daily-life-hacks.pages.dev/api/pipeline-topics?key=test-key&status=approved",
    method: "GET",
  }]);
});
