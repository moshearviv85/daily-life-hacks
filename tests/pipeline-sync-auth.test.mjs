import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/pipeline-sync.js";

function makeDb(calls = []) {
  return {
    prepare(sql) {
      return {
        bind(...params) {
          calls.push({ sql, params });
          return {
            async run() {
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

test("pipeline sync accepts dashboard auth for staging GitHub Actions", async () => {
  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-sync?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles: [], pins: [] }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", DB: makeDb(), CF_PAGES_BRANCH: "staging" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
});

test("pipeline sync clears stale pins and preserves explicit zero counts", async () => {
  const calls = [];
  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-sync?key=test-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articles: [{
          slug: "hero-only-article",
          topic: "Hero Only Article",
          category: "recipes",
          stage: "deployed",
          pin_count: 0,
          pin_images_done: 0,
        }],
        pins: [],
      }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", DB: makeDb(calls), CF_PAGES_BRANCH: "staging" },
  });

  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.pins_deleted, 1);

  const articleCall = calls.find((call) => /INSERT INTO pipeline_articles/.test(call.sql));
  assert.ok(articleCall, "article upsert should run");
  assert.equal(articleCall.params[12], 0);
  assert.equal(articleCall.params[13], 0);

  const deleteCall = calls.find((call) => /DELETE FROM pipeline_pins/.test(call.sql));
  assert.ok(deleteCall, "stale pins for the synced article should be cleared");
  assert.deepEqual(deleteCall.params, ["hero-only-article"]);
});

test("pipeline sync still rejects unauthenticated requests", async () => {
  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-sync?key=bad", {
      method: "POST",
      body: JSON.stringify({ articles: [], pins: [] }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", DB: makeDb(), CF_PAGES_BRANCH: "staging" },
  });

  assert.equal(response.status, 401);
});
