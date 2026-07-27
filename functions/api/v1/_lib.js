/**
 * Shared plumbing for the public food-value API (/api/v1/*).
 *
 * HOW THE DATA IS LOADED, AND WHY
 * -------------------------------
 * The 22 source CSVs live in public/data/. A Pages Function has no filesystem,
 * so reading them "live" would mean 22 asset fetches plus 22 CSV parses on
 * every request: 22 of the 50 allowed subrequests burned on data that changes
 * about once a quarter.
 *
 * Instead `scripts/build-api-index.mjs` parses everything once per deploy into
 * public/data/api-index-v1.json (~270 KB, 474 rows, typed and pre-joined to the
 * study URLs). This module fetches that one asset through the ASSETS binding,
 * which is an in-colo lookup rather than a network round trip, and then keeps
 * the parsed object on the module scope so every later request served by the
 * same isolate costs zero fetches. functions/[[path]].js already uses this
 * pattern for the pin-destination map.
 *
 * Embedding the JSON in the bundle was the other option. It removes even the
 * first fetch, but it puts 270 KB of data into every Function bundle, and the
 * file would have to be generated into functions/ where it is easy to forget.
 * One asset + a module cache is the cheaper trade.
 *
 * RATE LIMITING
 * -------------
 * There is none in code, on purpose. This API exists to be used by strangers,
 * so a per-IP counter is a false-positive machine, and doing it properly needs
 * KV or a Durable Object: paid writes on every request to protect a free static
 * dataset. Cloudflare already gives us better tools for free:
 *   - responses are cacheable (see CACHE_CONTROL), so repeat traffic is served
 *     from the edge cache and never reaches the Function at all;
 *   - the free plan includes one WAF rate limiting rule (block action, 10s or
 *     1min period) which can be pointed at /api/v1/* from the dashboard in two
 *     minutes if anyone ever abuses it;
 *   - Pages Functions have a daily request ceiling that fails closed anyway.
 * The only limit enforced here is MAX_LIMIT on page size, which caps the work a
 * single request can ask for.
 */

const INDEX_PATH = "/data/api-index-v1.json";

/**
 * Wide open, unlike functions/api/rating.js which is locked to our own origins.
 * That endpoint writes to D1; this one is a public read-only dataset and the
 * whole point is that other people's sites can call it from the browser.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Quarterly data. An hour in the browser, a day at the edge. */
export const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

export const MAX_LIMIT = 500;
export const DEFAULT_LIMIT = 50;

/** Module-scope cache: survives between requests inside a warm isolate. */
let cachedIndex = null;

export async function loadIndex(env, requestUrl) {
  if (cachedIndex) return cachedIndex;

  const assetUrl = new URL(INDEX_PATH, requestUrl).toString();
  const assetRequest = new Request(assetUrl, { method: "GET" });

  const response = env?.ASSETS
    ? await env.ASSETS.fetch(assetRequest)
    : await fetch(assetRequest);

  if (!response.ok) {
    throw new Error(`index asset returned ${response.status}`);
  }

  cachedIndex = await response.json();
  return cachedIndex;
}

export function json(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 ? CACHE_CONTROL : "no-store",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

/** Error shape matches the rest of functions/api/: { error, hint? }. */
export function fail(status, message, hint) {
  const body = { error: message };
  if (hint) body.hint = hint;
  return json(body, { status });
}

export function preflight() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS_HEADERS, "Cache-Control": CACHE_CONTROL },
  });
}

/** Shared attribution block. Every response carries it; that is the whole ask. */
export function baseMeta(index) {
  return {
    api_version: index.api_version,
    data_version: index.data_version,
    data_published: index.data_created,
    index_generated_at: index.generated_at,
    source: {
      name: index.title,
      publisher: "Daily Life Hacks",
      url: index.homepage,
      datapackage_url: index.datapackage_url,
      upstream: index.sources,
    },
    methodology_url: index.methodology_url,
    terms_url: index.terms_url,
    docs_url: index.docs_url,
    openapi_url: index.openapi_url,
    attribution: index.attribution,
    attribution_html: index.attribution_html,
  };
}

/** Method guard shared by both endpoints. HEAD is handled by the platform. */
export function methodGuard(request) {
  if (request.method === "OPTIONS") return preflight();
  if (request.method !== "GET" && request.method !== "HEAD") {
    return fail(405, "Method not allowed", "This API is read-only. Use GET.");
  }
  return null;
}
