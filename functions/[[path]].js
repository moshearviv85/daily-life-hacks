function detectTrafficSource(request, url) {
  const utmSource = (url.searchParams.get("utm_source") || "").toLowerCase();
  const referrer = (request.headers.get("Referer") || "").toLowerCase();

  const combined = `${utmSource} ${referrer}`;
  if (combined.includes("pinterest")) return "pinterest";
  if (combined.includes("google")) return "google";
  if (combined.includes("bing")) return "bing";
  if (combined.includes("facebook") || combined.includes("instagram")) return "meta";
  if (combined.includes("youtube") || combined.includes("tiktok")) return "social";
  if (combined.includes("newsletter") || combined.includes("email")) return "email";
  if (referrer) return "referral";
  return "direct";
}

const PROXY_ROBOTS = "noindex, follow";
const CANONICAL_ORIGIN = "https://www.daily-life-hacks.com";

const LEGACY_PERMANENT_REDIRECTS = new Map([
  ["protein-per-serving-beans-chicken-tofu-compared", "/best-low-cost-protein-sources-large-families/"],
  ["how-to-quick-soak-dried-beans-same-day", "/how-to-cook-dried-beans-from-scratch/"],
  ["keep-berries-fresh-longer-when-to-wash", "/how-to-store-fruits-and-vegetables-properly/"],
  ["how-to-pack-lunch-crisp-sandwiches-salads", "/how-to-keep-sandwiches-from-getting-soggy/"],
  ["plan-week-of-dinners-fewer-grocery-runs", "/batch-cooking-for-beginners-weekly-guide/"],
]);

const LEGACY_GONE_PATHS = new Set([
  "most-very-important-guidance-skill-set",
  "usual-excuses-made-by-high-conflict-parents",
  "how-to-preheat-skillet-even-browning",
  "savory-chia-seed-recipes-breakfast",
  "how-to-pack-salad-for-work-not-soggy",
  "tag/homeorganization",
  "tag/reducefoodwaste",
  "tag/quickmeals",
  "tag/homecooking",
  "tag/crockpot-meals",
  "tag/stuffedmushrooms",
  "tag/kitchenbasics",
  "tips/1",
]);

function normalizeLegacyPath(pathname) {
  return pathname.replace(/^\/+/, "").replace(/\/+$/, "");
}

function buildCanonicalUrl(targetPath, search = "") {
  const targetUrl = new URL(targetPath, CANONICAL_ORIGIN);
  targetUrl.search = search;
  return targetUrl.toString();
}

async function applyProxyRobotsPolicy(proxyResponse, request) {
  const headers = new Headers(proxyResponse.headers);
  headers.set("X-Robots-Tag", PROXY_ROBOTS);

  const response = new Response(proxyResponse.body, {
    status: proxyResponse.status,
    statusText: proxyResponse.statusText,
    headers,
  });

  if (request.method === "HEAD") return response;

  const contentType = headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  if (typeof HTMLRewriter !== "undefined") {
    return new HTMLRewriter()
      .on('meta[name="robots"]', {
        element(element) {
          element.setAttribute("content", PROXY_ROBOTS);
        },
      })
      .transform(response);
  }

  const html = await response.text();
  const rewritten = html.replace(
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${PROXY_ROBOTS}">`,
  );

  return new Response(rewritten, {
    status: proxyResponse.status,
    statusText: proxyResponse.statusText,
    headers,
  });
}

/**
 * Pinterest Smart Router - Catch-all Cloudflare Pages Function
 *
 * Intercepts keyword URLs and versioned URLs from Pinterest pins.
 * Routes to internal article content or external affiliate links based on KV config.
 * Logs every hit to D1 for analytics.
 */
export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  const originalPathname = url.pathname;
  const path = url.pathname.replace(/\/$/, "") || "/";

  // --- 1. GUARD: Skip static assets and API routes ---
  const skipPatterns = [
    /^\/(api|_astro|_image)\//,
    /\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|xml|json|txt|webmanifest)$/,
  ];
  const shouldSkipRouting = skipPatterns.some((pattern) => pattern.test(path));

  if (!shouldSkipRouting && (request.method === "GET" || request.method === "HEAD")) {
    const legacyPath = normalizeLegacyPath(originalPathname);
    const legacyTarget = LEGACY_PERMANENT_REDIRECTS.get(legacyPath);

    if (legacyTarget) {
      return Response.redirect(buildCanonicalUrl(legacyTarget, url.search), 301);
    }

    if (LEGACY_GONE_PATHS.has(legacyPath)) {
      return new Response(null, {
        status: 410,
        headers: {
          "X-Robots-Tag": PROXY_ROBOTS,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  if (url.hostname === "daily-life-hacks.com") {
    url.hostname = "www.daily-life-hacks.com";
    url.protocol = "https:";

    if (
      !shouldSkipRouting &&
      (request.method === "GET" || request.method === "HEAD") &&
      originalPathname !== "/" &&
      !originalPathname.endsWith("/")
    ) {
      const canonicalUrl = new URL(`${path}/`, url.origin);
      canonicalUrl.search = url.search;
      const canonicalReq = new Request(canonicalUrl.toString(), {
        method: request.method,
        headers: request.headers,
      });
      const canonicalAsset = await env.ASSETS.fetch(canonicalReq);

      if (
        canonicalAsset.status !== 404 &&
        canonicalAsset.headers.get("x-astro-reroute") !== "no"
      ) {
        return Response.redirect(canonicalUrl.toString(), 301);
      }
    }

    return Response.redirect(url.toString(), 301);
  }

  if (shouldSkipRouting) {
    return env.ASSETS.fetch(request);
  }

  const fullPathSlug = path.slice(1); // Remove leading slash
  let routeConfig = null;
  let version = null;
  let baseSlug = null;
  let isKvMatch = false;

  // --- 2. KV LOOKUP (runs for ALL paths) ---
  if (env.ROUTES_KV && fullPathSlug) {
    try {
      const raw = await env.ROUTES_KV.get(fullPathSlug);
      if (raw) {
        routeConfig = JSON.parse(raw);
        // Only treat as a match if the payload is actually usable.
        // Bad/partial KV entries must not hijack normal static routing.
        const candidateType = routeConfig?.type;
        const candidateBase = typeof routeConfig?.base_slug === "string"
          ? routeConfig.base_slug.trim()
          : "";
        const candidateExternal = typeof routeConfig?.external_url === "string"
          ? routeConfig.external_url.trim()
          : "";

        const isValidExternal = candidateType === "external" && Boolean(candidateExternal);
        const isValidInternal =
          (candidateType === "internal" || !candidateType) && Boolean(candidateBase);

        if (isValidExternal || isValidInternal) {
          isKvMatch = true;
          baseSlug = candidateBase;
          if (candidateType) routeConfig.type = candidateType;
          if (candidateExternal) routeConfig.external_url = candidateExternal;
          routeConfig.base_slug = candidateBase;
        } else {
          // Ignore unusable KV values and let static files handle the request.
          routeConfig = null;
          isKvMatch = false;
          baseSlug = null;
        }
      }
    } catch (e) {
      // KV parsing error
    }
  }

  // A few legacy KV entries map a canonical slug to itself. Those must behave
  // like normal article pages so search engines can index the canonical URL.
  if (isKvMatch && routeConfig?.type !== "external" && baseSlug === fullPathSlug) {
    routeConfig = null;
    isKvMatch = false;
    baseSlug = null;
  }

  // --- 3. FALLBACK: -v{n} PATTERN (backward compat) ---
  if (!isKvMatch) {
    const versionMatch = path.match(/^(.+)-v(\d+)$/);
    if (versionMatch) {
      baseSlug = versionMatch[1].slice(1); // "/slug" -> "slug"
      version = versionMatch[2];
      routeConfig = { type: "internal", base_slug: baseSlug };
    } else {
      // --- 4. PASS THROUGH: log page_view to funnel_events (server-side, no JS needed) ---
      if (
        (request.method === "GET" || request.method === "HEAD") &&
        originalPathname !== "/" &&
        !originalPathname.endsWith("/")
      ) {
        const canonicalUrl = new URL(`${path}/`, url.origin);
        canonicalUrl.search = url.search;
        const canonicalReq = new Request(canonicalUrl.toString(), {
          method: request.method,
          headers: request.headers,
        });
        const canonicalAsset = await env.ASSETS.fetch(canonicalReq);

        if (
          canonicalAsset.status !== 404 &&
          canonicalAsset.headers.get("x-astro-reroute") !== "no"
        ) {
          return Response.redirect(canonicalUrl.toString(), 301);
        }
      }

      if (env.DB && request.method === "GET") {
        const pagePath = path || "/";
        const metadata = JSON.stringify({
          referrer: request.headers.get("Referer") || null,
          user_agent: request.headers.get("User-Agent") || null,
          country: request.headers.get("CF-IPCountry") || null,
          query_params: url.search || null,
        });
        const pageViewPromise = env.DB.prepare(
          `INSERT INTO funnel_events (event_type, page, source, metadata) VALUES (?, ?, ?, ?)`
        )
          .bind("page_view", pagePath, detectTrafficSource(request, url), metadata)
          .run();
        waitUntil(pageViewPromise.catch(() => {}));
      }
      const assetUrl = new URL(path === "/" ? "/" : `${path}/`, url.origin);
      assetUrl.search = url.search;
      const assetReq = new Request(assetUrl.toString(), {
        method: request.method,
        headers: request.headers,
      });
      const assetResponse = await env.ASSETS.fetch(assetReq);

      if (assetResponse.status === 404 || assetResponse.headers.get("x-astro-reroute") === "no") {
        const notFoundUrl = new URL("/404.html", url.origin);
        const notFoundReq = new Request(notFoundUrl.toString(), { headers: request.headers });
        const notFoundPage = await env.ASSETS.fetch(notFoundReq);
        return new Response(notFoundPage.body, {
          status: 404,
          headers: notFoundPage.headers,
        });
      }

      return assetResponse;
    }
  }

  // --- 5. ANALYTICS LOGGING (non-blocking) ---
  if (env.DB) {
    const logPromise = env.DB
      .prepare(
        `INSERT INTO pinterest_hits
         (versioned_slug, base_slug, route_type, version, query_params, referrer, user_agent, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        fullPathSlug,
        baseSlug,
        routeConfig?.type || "internal",
        version, // null if it's a keyword URL, or the number if fallback
        url.search || null,
        request.headers.get("Referer") || null,
        request.headers.get("User-Agent") || null,
        request.headers.get("CF-IPCountry") || null
      )
      .run();

    waitUntil(logPromise.catch(() => { }));
  }

  // --- 6. ROUTING DECISION ---
  if (routeConfig?.type === "external" && routeConfig.external_url) {
    return new Response(null, {
      status: 302,
      headers: { Location: routeConfig.external_url },
    });
  }

  // Internal proxy: serve the base article page (trailing slash avoids redirect)
  const targetSlug = routeConfig?.base_slug || baseSlug;
  const internalUrl = new URL(`/${targetSlug}/`, url.origin);
  const proxyRequest = new Request(internalUrl.toString(), {
    method: request.method,
    headers: request.headers,
  });

  const proxyResponse = await env.ASSETS.fetch(proxyRequest);

  if (proxyResponse.status === 404 || proxyResponse.headers.get("x-astro-reroute") === "no") {
    const notFoundUrl = new URL("/404.html", url.origin);
    const notFoundReq = new Request(notFoundUrl.toString(), { headers: request.headers });
    const notFoundPage = await env.ASSETS.fetch(notFoundReq);
    return new Response(notFoundPage.body, {
      status: 404,
      headers: notFoundPage.headers,
    });
  }

  return applyProxyRobotsPolicy(proxyResponse, request);
}
