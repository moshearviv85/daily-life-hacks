import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost as publishArticle } from "../functions/api/articles-publish.js";
import { onRequestPost as triggerArticles } from "../functions/api/articles-trigger.js";
import { onRequestPost as uploadArticles } from "../functions/api/articles-upload.js";

test("staging blocks article publish before DB or GitHub side effects", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  };

  const response = await publishArticle({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/articles-publish?key=test-key", {
      method: "POST",
      body: JSON.stringify({ slug: "demo" }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "staging" },
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.queue, "staging");
  assert.equal(fetchCalled, false);
});

test("staging blocks article publisher workflow dispatch", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  };

  const response = await triggerArticles({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/articles-trigger?key=test-key", {
      method: "POST",
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "staging" },
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.queue, "staging");
  assert.equal(fetchCalled, false);
});

test("staging blocks article schedule upload before shared DB mutation", async () => {
  const response = await uploadArticles({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/articles-upload?key=test-key", {
      method: "POST",
      body: "slug,title,article_markdown\nstaging-demo,Demo,Body",
    }),
    env: { DASHBOARD_PASSWORD: "test-key", CF_PAGES_BRANCH: "staging" },
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.queue, "staging");
});
