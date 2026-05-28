import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/pipeline-topics.js";

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
