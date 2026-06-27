import assert from "node:assert/strict";
import test from "node:test";

import { onRequestPost } from "../functions/api/pipeline-trigger.js";

function makePipelineArticleDb(stage = "deployed") {
  return {
    prepare(sql) {
      return {
        bind(slug) {
          return {
            async first() {
              if (!sql.includes("FROM pipeline_articles")) {
                throw new Error(`Unexpected query: ${sql}`);
              }
              if (slug !== "demo-article") return null;
              return { slug, stage, category: "tips" };
            },
          };
        },
      };
    },
  };
}

function makeTopicClaimDb(claimableIds = []) {
  return {
    calls: [],
    prepare(sql) {
      return {
        bind(...args) {
          this.calls?.push?.({ sql, args });
          return {
            async all() {
              if (!sql.includes("FROM pipeline_topics")) {
                throw new Error(`Unexpected query: ${sql}`);
              }
              return {
                results: args
                  .filter((id) => claimableIds.includes(Number(id)))
                  .map((id) => ({ id: Number(id) })),
              };
            },
            async run() {
              return { success: true, meta: { changes: args.length - 1 } };
            },
          };
        },
      };
    },
  };
}

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

test("production can dispatch staging promotion with explicit confirmation", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedWorkflow = "";
  let dispatchBody = null;
  globalThis.fetch = async (url, init) => {
    requestedWorkflow = String(url);
    dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "promote_staging" }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "main" },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.match(requestedWorkflow, /promote-staging\.yml/);
  assert.equal(dispatchBody.ref, "main");
  assert.equal(dispatchBody.inputs.confirm, "PROMOTE");
  assert.equal(data.outputBranch, "main");
});

test("staging blocks promotion before dispatching GitHub Actions", async (t) => {
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
      body: JSON.stringify({ action: "promote_staging" }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "staging" },
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.ok, false);
  assert.equal(data.queue, "staging");
  assert.equal(fetchCalled, false);
});

test("produce dispatch forwards selected topic ids to GitHub Actions", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedWorkflow = "";
  let dispatchBody = null;
  globalThis.fetch = async (url, init) => {
    requestedWorkflow = String(url);
    dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "produce", count: 4, topic_ids: [17, "23", 23, "bad", 42] }),
    }),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      GH_PAT: "gh-token",
      CF_PAGES_BRANCH: "staging",
      DB: makeTopicClaimDb([17, 23, 42]),
    },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.match(requestedWorkflow, /pipeline-produce\.yml/);
  assert.equal(dispatchBody.ref, "main");
  assert.equal(dispatchBody.inputs.count, "3");
  assert.equal(dispatchBody.inputs.topic_ids, "17,23,42");
  assert.equal(data.topic_ids, "17,23,42");
  assert.equal(data.dispatchRef, "main");
  assert.equal(data.outputBranch, "staging");
  assert.match(data.actions_url, /pipeline-produce\.yml/);
  assert.equal(data.topic_queue.body.count, 3);
});

test("produce dispatch stops when selected topics cannot be claimed", async (t) => {
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
      body: JSON.stringify({ action: "produce", count: 2, topic_ids: [17, 23] }),
    }),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      GH_PAT: "gh-token",
      CF_PAGES_BRANCH: "staging",
      DB: makeTopicClaimDb([17]),
    },
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.ok, false);
  assert.equal(data.queued_topic_count, 1);
  assert.equal(fetchCalled, false);
});

test("discover dispatch forwards bounded topic discovery inputs", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedWorkflow = "";
  let dispatchBody = null;
  globalThis.fetch = async (url, init) => {
    requestedWorkflow = String(url);
    dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "discover", limit: 12, category: "recipes" }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "staging" },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.match(requestedWorkflow, /pipeline-discover\.yml/);
  assert.equal(dispatchBody.ref, "main");
  assert.equal(dispatchBody.inputs.limit, "12");
  assert.equal(dispatchBody.inputs.category, "recipes");
  assert.equal(data.dispatchRef, "main");
  assert.equal(data.outputBranch, "staging-d1");
  assert.equal(data.limit, "12");
  assert.equal(data.category, "recipes");
});

test("discover rejects unsafe discovery batch sizes", async () => {
  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "discover", limit: 500 }),
    }),
    env: { DASHBOARD_PASSWORD: "test-key", GH_PAT: "gh-token", CF_PAGES_BRANCH: "staging" },
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.error, /limit/);
});

test("approve_article dispatches the asset workflow for one slug", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedWorkflow = "";
  let dispatchBody = null;
  globalThis.fetch = async (url, init) => {
    requestedWorkflow = String(url);
    dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "approve_article", slug: "demo-article" }),
    }),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      GH_PAT: "gh-token",
      CF_PAGES_BRANCH: "staging",
      DB: makePipelineArticleDb("deployed"),
    },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.match(requestedWorkflow, /pipeline-article-assets\.yml/);
  assert.equal(dispatchBody.ref, "main");
  assert.equal(dispatchBody.inputs.slug, "demo-article");
  assert.equal(data.dispatchRef, "main");
  assert.equal(data.outputBranch, "staging");
  assert.equal(data.slug, "demo-article");
});

test("production approve_article gates against staging pipeline state before dispatch", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const urls = [];
  let dispatchBody = null;
  globalThis.fetch = async (url, init) => {
    urls.push(String(url));
    if (String(url).startsWith("https://staging.daily-life-hacks.pages.dev/api/pipeline-status")) {
      return new Response(JSON.stringify({
        articles: [{ slug: "demo-article", stage: "deployed", category: "tips" }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://www.daily-life-hacks.com/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "approve_article", slug: "demo-article" }),
    }),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      GH_PAT: "gh-token",
      CF_PAGES_BRANCH: "main",
      DB: makePipelineArticleDb("written"),
    },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(dispatchBody.ref, "main");
  assert.equal(dispatchBody.inputs.slug, "demo-article");
  assert.match(urls[0], /^https:\/\/staging\.daily-life-hacks\.pages\.dev\/api\/pipeline-status\?key=test-key$/);
  assert.match(urls[1], /pipeline-article-assets\.yml/);
});

test("approve_article blocks asset generation for an article that is not ready for review", async (t) => {
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
      body: JSON.stringify({ action: "approve_article", slug: "demo-article" }),
    }),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      GH_PAT: "gh-token",
      CF_PAGES_BRANCH: "staging",
      DB: makePipelineArticleDb("written"),
    },
  });
  const data = await response.json();

  assert.equal(response.status, 409);
  assert.equal(data.ok, false);
  assert.match(data.error, /not ready for asset generation/);
  assert.equal(fetchCalled, false);
});

test("regenerate_hero dispatches hero-only asset workflow", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedWorkflow = "";
  let dispatchBody = null;
  globalThis.fetch = async (url, init) => {
    requestedWorkflow = String(url);
    dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "regenerate_hero", slug: "demo-article" }),
    }),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      GH_PAT: "gh-token",
      CF_PAGES_BRANCH: "staging",
      DB: makePipelineArticleDb("pin_images"),
    },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.match(requestedWorkflow, /pipeline-article-assets\.yml/);
  assert.equal(dispatchBody.ref, "main");
  assert.equal(dispatchBody.inputs.slug, "demo-article");
  assert.equal(dispatchBody.inputs.mode, "hero_only");
  assert.equal(data.slug, "demo-article");
  assert.equal(data.dispatchRef, "main");
  assert.equal(data.outputBranch, "staging");
});

test("regenerate_support dispatches support-only asset workflow", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedWorkflow = "";
  let dispatchBody = null;
  globalThis.fetch = async (url, init) => {
    requestedWorkflow = String(url);
    dispatchBody = JSON.parse(init.body);
    return new Response(null, { status: 204 });
  };

  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "regenerate_support", slug: "demo-article" }),
    }),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      GH_PAT: "gh-token",
      CF_PAGES_BRANCH: "staging",
      DB: makePipelineArticleDb("pin_images"),
    },
  });
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.match(requestedWorkflow, /pipeline-article-assets\.yml/);
  assert.equal(dispatchBody.ref, "main");
  assert.equal(dispatchBody.inputs.slug, "demo-article");
  assert.equal(dispatchBody.inputs.mode, "support_only");
  assert.equal(data.slug, "demo-article");
  assert.equal(data.dispatchRef, "main");
  assert.equal(data.outputBranch, "staging");
});

test("GitHub dispatch failures return a readable error", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => new Response(JSON.stringify({
    message: "Validation Failed",
    errors: [{ message: "Unexpected inputs provided: [mode]" }],
  }), { status: 422 });

  const response = await onRequestPost({
    request: new Request("https://staging.daily-life-hacks.pages.dev/api/pipeline-trigger?key=test-key", {
      method: "POST",
      body: JSON.stringify({ action: "regenerate_hero", slug: "demo-article" }),
    }),
    env: {
      DASHBOARD_PASSWORD: "test-key",
      GH_PAT: "gh-token",
      CF_PAGES_BRANCH: "staging",
      DB: makePipelineArticleDb("pin_images"),
    },
  });
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.equal(data.ok, false);
  assert.match(data.error, /Validation Failed/);
  assert.match(data.error, /Unexpected inputs/);
});
