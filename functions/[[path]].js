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
  const path = url.pathname.replace(/\/$/, "") || "/";

  // --- 1. GUARD: Skip static assets and API routes ---
  const skipPatterns = [
    /^\/(api|_astro|_image)\//,
    /\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|xml|json|txt|webmanifest)$/,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(path)) {
      return env.ASSETS.fetch(request);
    }
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

  // --- 3. FALLBACK: -v{n} PATTERN (backward compat) ---
  if (!isKvMatch) {
    const versionMatch = path.match(/^(.+)-v(\d+)$/);
    if (versionMatch) {
      baseSlug = versionMatch[1].slice(1); // "/slug" -> "slug"
      version = versionMatch[2];
      routeConfig = { type: "internal", base_slug: baseSlug };
    } else {
      // --- 4. PASS THROUGH: log page_view to funnel_events (server-side, no JS needed) ---
      if (env.DB && request.method === "GET") {
        const pagePath = path || "/";
        const pageViewPromise = env.DB.prepare(
          `INSERT INTO funnel_events (event_type, page, source) VALUES (?, ?, ?)`
        )
          .bind("page_view", pagePath, "website")
          .run();
        waitUntil(pageViewPromise.catch(() => {}));
      }
      return env.ASSETS.fetch(request);
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

  // Internal proxy: serve the base article page
  const targetSlug = routeConfig?.base_slug || baseSlug;
  const internalUrl = new URL(`/${targetSlug}`, url.origin);
  const proxyRequest = new Request(internalUrl.toString(), {
    method: request.method,
    headers: request.headers,
  });

  return env.ASSETS.fetch(proxyRequest);
}
