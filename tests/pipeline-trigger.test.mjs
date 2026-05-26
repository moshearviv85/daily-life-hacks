import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/pipeline-trigger.js";

test("staging blocks legacy publish before dispatching GitHub Actions", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "publish" }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "staging" },
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.ok, false);
  assert.equal(data.queue, "staging");
  assert.equal(fetchCalled, false);
});

test("production can dispatch legacy publish", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedWorkflow = "";
  globalThis.fetch = async (url) => {
    requestedWorkflow = String(url);
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "publish" }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "main" },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.match(requestedWorkflow, /publish-articles\.yml/);
});
