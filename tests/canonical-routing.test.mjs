import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/[[path]].js";
import {
  onRequestGet as onSubscribeGet,
  onRequestHead as onSubscribeHead,
  onRequestPost as onSubscribePost,
} from "../functions/api/subscribe.js";

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

function makeRequestContext(request, env = {}) {
  return {
    request,
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

test("legacy food URLs with close canonical matches redirect to the existing article", async () => {
  const assets = makeAssets(new Set());

  const response = await onRequest(
    makeContext("https://www.daily-life-hacks.com/how-to-quick-soak-dried-beans-same-day/", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://www.daily-life-hacks.com/how-to-cook-dried-beans-from-scratch/",
  );
  assert.deepEqual(assets.calls, []);
});

test("legacy redirects canonicalize non-www host in one hop", async () => {
  const assets = makeAssets(new Set());

  const response = await onRequest(
    makeContext("https://daily-life-hacks.com/keep-berries-fresh-longer-when-to-wash", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://www.daily-life-hacks.com/how-to-store-fruits-and-vegetables-properly/",
  );
  assert.deepEqual(assets.calls, []);
});

test("legacy removed and off-topic URLs return gone without hitting static assets", async () => {
  const assets = makeAssets(new Set());

  const response = await onRequest(
    makeContext("https://www.daily-life-hacks.com/usual-excuses-made-by-high-conflict-parents/", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 410);
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, follow");
  assert.deepEqual(assets.calls, []);
});

test("GSC impression article URLs pass through as live canonical pages", async () => {
  const assets = makeAssets(
    new Set([
      "/how-to-pack-salad-for-work-not-soggy/",
      "/prebiotic-foods-beyond-the-buzzwords/",
      "/savory-chia-seed-recipes-breakfast/",
      "/selenium-containing-foods-easy-ways/",
    ]),
  );

  for (const slug of [
    "how-to-pack-salad-for-work-not-soggy",
    "prebiotic-foods-beyond-the-buzzwords",
    "savory-chia-seed-recipes-breakfast",
    "selenium-containing-foods-easy-ways",
  ]) {
    const response = await onRequest(
      makeContext(`https://www.daily-life-hacks.com/${slug}/`, {
        ASSETS: assets,
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.notEqual(response.headers.get("x-robots-tag"), "noindex, follow");
  }
});

test("legacy impression tag and pagination URLs redirect instead of returning gone", async () => {
  const cases = [
    [
      "https://www.daily-life-hacks.com/tag/stuffedmushrooms/",
      "https://www.daily-life-hacks.com/stuffed-portobello-mushrooms-quinoa-spinach-feta/",
    ],
    [
      "https://www.daily-life-hacks.com/tag/homecooking/",
      "https://www.daily-life-hacks.com/recipes/",
    ],
    [
      "https://www.daily-life-hacks.com/tag/kitchenbasics/",
      "https://www.daily-life-hacks.com/tips/",
    ],
    [
      "https://www.daily-life-hacks.com/tips/1/",
      "https://www.daily-life-hacks.com/tips/",
    ],
  ];

  for (const [source, target] of cases) {
    const assets = makeAssets(new Set());
    const response = await onRequest(
      makeContext(source, {
        ASSETS: assets,
      }),
    );

    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), target);
    assert.deepEqual(assets.calls, []);
  }
});

test("legacy garbage and removed supplement-adjacent URLs return gone", async () => {
  const cases = [
    "https://www.daily-life-hacks.com/$%7Ba.slug%7D?preview=moshiko1985!",
    "https://www.daily-life-hacks.com/api/event",
    "https://www.daily-life-hacks.com/feed/",
    "https://www.daily-life-hacks.com/hello-world/",
    "https://www.daily-life-hacks.com/overnight-oats-without-protein-powder-3-ways/",
    "https://www.daily-life-hacks.com/sample-page/",
    "https://www.daily-life-hacks.com/sample-page/feed/",
    "https://www.daily-life-hacks.com/wp-admin/*",
  ];

  for (const source of cases) {
    const assets = makeAssets(new Set());
    const response = await onRequest(
      makeContext(source, {
        ASSETS: assets,
      }),
    );

    assert.equal(response.status, 410);
    assert.equal(response.headers.get("location"), null);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, follow");
    assert.deepEqual(assets.calls, []);
  }
});

test("search query garbage redirects to the homepage canonical URL", async () => {
  const assets = makeAssets(new Set());

  const response = await onRequest(
    makeContext("https://www.daily-life-hacks.com/?s=%7Bsearch_term_string%7D", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://www.daily-life-hacks.com/");
  assert.deepEqual(assets.calls, []);
});

test("newsletter subscribe GET and HEAD are crawl cleanup but POST handler remains available", async () => {
  const getResponse = await onSubscribeGet();
  assert.equal(getResponse.status, 410);
  assert.equal(getResponse.headers.get("x-robots-tag"), "noindex, follow");

  const headResponse = await onSubscribeHead();
  assert.equal(headResponse.status, 410);
  assert.equal(headResponse.headers.get("x-robots-tag"), "noindex, follow");

  const postResponse = await onSubscribePost(
    makeRequestContext(
      new Request("https://www.daily-life-hacks.com/api/subscribe", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      }),
      {},
    ),
  );

  assert.equal(postResponse.status, 400);
  assert.deepEqual(await postResponse.json(), { error: "Valid email required" });
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
