import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/pipeline-sync.js";

function makeDb() {
  return {
    prepare() {
      return {
        bind() {
          return {
            async run() {
              return { success: true };
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
