/**
 * Pinterest Smart Router - Catch-all Cloudflare Pages Function
 *
 * Intercepts versioned URLs (e.g., /slug-v1, /slug-v2) from Pinterest pins.
 * Routes to internal article content or external affiliate links based on KV config.
 * Logs every hit to D1 for analytics.
 */
export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  // --- GUARD: Skip static assets and API routes ---
  const skipPatterns = [
    /^\/(api|_astro|_image)\//,
    /\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|eot|xml|json|txt|webmanifest)$/,
  ];

  for (const pattern of skipPatterns) {
    if (pattern.test(path)) {
      return env.ASSETS.fetch(request);
    }
  }

  // --- VERSION DETECTION ---
  const versionMatch = path.match(/^(.+)-v(\d+)$/);

  if (!versionMatch) {
    return env.ASSETS.fetch(request);
  }

  const fullVersionedSlug = path.slice(1); // "/slug-v1" -> "slug-v1"
  const baseSlug = versionMatch[1].slice(1); // "/slug" -> "slug"
  const version = versionMatch[2];

  // --- KV LOOKUP ---
  let routeConfig = null;
  if (env.ROUTES_KV) {
    try {
      const raw = await env.ROUTES_KV.get(fullVersionedSlug);
      if (raw) {
        routeConfig = JSON.parse(raw);
      }
    } catch (e) {
      // KV failure - fall through to default internal proxy
    }
  }

  // --- ANALYTICS LOGGING (non-blocking) ---
  if (env.DB) {
    const logPromise = env.DB
      .prepare(
        `INSERT INTO pinterest_hits
         (versioned_slug, base_slug, route_type, version, query_params, referrer, user_agent, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        fullVersionedSlug,
        routeConfig?.base_slug || baseSlug,
        routeConfig?.type || "internal",
        version,
        url.search || null,
        request.headers.get("Referer") || null,
        request.headers.get("User-Agent") || null,
        request.headers.get("CF-IPCountry") || null
      )
      .run();

    waitUntil(logPromise.catch(() => {}));
  }

  // --- ROUTING DECISION ---
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
