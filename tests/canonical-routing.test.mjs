import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/[[path]].js";

function makeAssets(existingPaths = new Set()) {
  const calls = [];
  return {
    calls,
    async fetch(request) {
      const url = new URL(request.url);
      calls.push({ url: url.toString(), method: request.method });
      if (existingPaths.has(url.pathname)) {
        return new Response(
          `<html><head><meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"></head><body>${url.pathname}</body></html>`,
          {
          status: 200,
          headers: { "content-type": "text/html" },
          },
        );
      }
      if (url.pathname === "/404.html") {
        return new Response("<html>not found</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return new Response("missing", { status: 404 });
    },
  };
}

function makeContext(url, env = {}) {
  return {
    request: new Request(url),
    env,
    waitUntil() {},
  };
}

test("www article URLs without trailing slash redirect to canonical slash URL", async () => {
  const assets = makeAssets(new Set(["/demo-article/"]));

  const response = await onRequest(
    makeContext("https://www.daily-life-hacks.com/demo-article", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://www.daily-life-hacks.com/demo-article/");
  assert.deepEqual(assets.calls, [
    { url: "https://www.daily-life-hacks.com/demo-article/", method: "GET" },
  ]);
});

test("non-www article URLs redirect directly to canonical host and slash", async () => {
  const assets = makeAssets(new Set(["/demo-article/"]));

  const response = await onRequest(
    makeContext("https://daily-life-hacks.com/demo-article", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://www.daily-life-hacks.com/demo-article/");
});

test("missing no-slash paths do not redirect to fake canonical pages", async () => {
  const assets = makeAssets(new Set());

  const response = await onRequest(
    makeContext("https://www.daily-life-hacks.com/not-a-real-page", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 404);
  assert.equal(response.headers.get("location"), null);
});

test("static assets on non-www only redirect host and do not append a slash", async () => {
  const assets = makeAssets(new Set());

  const response = await onRequest(
    makeContext("https://daily-life-hacks.com/images/demo.jpg", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://www.daily-life-hacks.com/images/demo.jpg");
  assert.deepEqual(assets.calls, []);
});

test("router variants remain noindex proxy pages instead of canonical redirects", async () => {
  const assets = makeAssets(new Set(["/demo-article/"]));
  const routesKv = {
    async get(key) {
      assert.equal(key, "pin-variant");
      return JSON.stringify({ type: "internal", base_slug: "demo-article" });
    },
  };

  const response = await onRequest(
    makeContext("https://www.daily-life-hacks.com/pin-variant", {
      ASSETS: assets,
      ROUTES_KV: routesKv,
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, follow");
  assert.equal(response.headers.get("location"), null);
  assert.match(await response.text(), /<meta name="robots" content="noindex, follow">/);
  assert.deepEqual(assets.calls, [
    { url: "https://www.daily-life-hacks.com/demo-article/", method: "GET" },
  ]);
});
