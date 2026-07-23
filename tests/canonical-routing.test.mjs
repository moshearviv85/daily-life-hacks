import assert from "node:assert/strict";
import test from "node:test";

import { onRequest } from "../functions/[[path]].js";
import {
  onRequestGet as onSubscribeGet,
  onRequestHead as onSubscribeHead,
  onRequestPost as onSubscribePost,
} from "../functions/api/subscribe.js";

function makeAssets(existingPaths = new Set(), { pinDestinations = {} } = {}) {
  const calls = [];
  return {
    calls,
    async fetch(request) {
      const url = new URL(request.url);

      // Registry lookup used by Checkpoint 2 pin → 301 routing.
      if (url.pathname === "/data/pin-destinations-flat.json") {
        return new Response(JSON.stringify(pinDestinations), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

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
  // Avoid cross-test pollution from the worker's in-memory destination cache.
  globalThis.__PIN_DEST_MAP = null;
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
    makeContext("https://www.daily-life-hacks.com/artichoke-recipes-for-gut-health-guide/", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://www.daily-life-hacks.com/artichoke-recipes-for-gut-health/",
  );
  assert.deepEqual(assets.calls, []);
});

test("legacy redirects canonicalize non-www host in one hop", async () => {
  const assets = makeAssets(new Set());

  const response = await onRequest(
    makeContext("https://daily-life-hacks.com/simple-snack-portioning-guide", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://www.daily-life-hacks.com/grab-and-go-fridge-snack-drawer/",
  );
  assert.deepEqual(assets.calls, []);
});

test("high-impression aliases redirect to canonical articles", async () => {
  const cases = [
    [
      "https://www.daily-life-hacks.com/sourdough-discard-nutrition-facts-health-benefits/",
      "https://www.daily-life-hacks.com/easy-sourdough-discard-recipes-beginners/",
    ],
    [
      "https://www.daily-life-hacks.com/rotisserie-chicken-nutrition-facts-sodium-content/",
      "https://www.daily-life-hacks.com/costco-rotisserie-chicken-meal-ideas-dinner/",
    ],
    [
      "https://www.daily-life-hacks.com/oatmeal-vs-grits-fiber-content-guide/",
      "https://www.daily-life-hacks.com/oatmeal-vs-grits-fiber-content/",
    ],
  ];

  for (const [source, target] of cases) {
    const response = await onRequest(
      makeContext(source, {
        ASSETS: makeAssets(new Set()),
      }),
    );

    assert.equal(response.status, 301);
    assert.equal(response.headers.get("location"), target);
  }
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
      "/protein-per-serving-beans-chicken-tofu-compared/",
      "/how-to-quick-soak-dried-beans-same-day/",
      "/how-to-preheat-skillet-even-browning/",
      "/keep-berries-fresh-longer-when-to-wash/",
      "/how-to-pack-lunch-crisp-sandwiches-salads/",
      "/plan-week-of-dinners-fewer-grocery-runs/",
    ]),
  );

  for (const slug of [
    "how-to-pack-salad-for-work-not-soggy",
    "prebiotic-foods-beyond-the-buzzwords",
    "savory-chia-seed-recipes-breakfast",
    "selenium-containing-foods-easy-ways",
    "protein-per-serving-beans-chicken-tofu-compared",
    "how-to-quick-soak-dried-beans-same-day",
    "how-to-preheat-skillet-even-browning",
    "keep-berries-fresh-longer-when-to-wash",
    "how-to-pack-lunch-crisp-sandwiches-salads",
    "plan-week-of-dinners-fewer-grocery-runs",
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
    "https://www.daily-life-hacks.com/$%7Ba.slug%7D",
    "https://www.daily-life-hacks.com/api/event",
    "https://www.daily-life-hacks.com/feed/",
    "https://www.daily-life-hacks.com/hello-world/",
    "https://www.daily-life-hacks.com/nuclear-electricity-benefits-and-negatives-really/",
    "https://www.daily-life-hacks.com/overnight-oats-without-protein-powder-3-ways/",
    "https://www.daily-life-hacks.com/reheat-pizza-crust-stays-crisp/",
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

test("pin destinations from Git registry 301 to canonical before KV/static", async () => {
  // Reset module cache between tests if previous empty map was cached.
  globalThis.__PIN_DEST_MAP = null;

  const assets = makeAssets(new Set(["/demo-article/"]), {
    pinDestinations: { "pin-variant": "demo-article" },
  });

  const response = await onRequest(
    makeContext("https://www.daily-life-hacks.com/pin-variant/", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://www.daily-life-hacks.com/demo-article/",
  );
  assert.deepEqual(assets.calls, []);
});

test("legacy KV internal pin routes 301 to canonical instead of noindex proxy", async () => {
  globalThis.__PIN_DEST_MAP = null;

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

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://www.daily-life-hacks.com/demo-article/",
  );
  assert.equal(response.headers.get("x-robots-tag"), null);
});

test("versioned -vN pin URLs 301 to canonical article", async () => {
  globalThis.__PIN_DEST_MAP = null;

  const assets = makeAssets(new Set(["/demo-article/"]));
  const response = await onRequest(
    makeContext("https://www.daily-life-hacks.com/demo-article-v2/", {
      ASSETS: assets,
    }),
  );

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://www.daily-life-hacks.com/demo-article/",
  );
});
