/**
 * Pinterest Smart Routing - Analytics Endpoint
 * GET /api/pinterest-stats?key=SECRET
 *
 * Returns tracking data for Pinterest versioned URL hits.
 * Uses the same STATS_KEY auth as /api/stats.
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.STATS_KEY || key !== env.STATS_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const total = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM pinterest_hits"
    ).first();

    const today = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM pinterest_hits WHERE date(created_at) = date('now')"
    ).first();

    const bySlug = await env.DB.prepare(
      "SELECT base_slug, COUNT(*) as count FROM pinterest_hits GROUP BY base_slug ORDER BY count DESC LIMIT 20"
    ).all();

    const byVersion = await env.DB.prepare(
      "SELECT versioned_slug, route_type, COUNT(*) as count FROM pinterest_hits GROUP BY versioned_slug ORDER BY count DESC LIMIT 30"
    ).all();

    const byDay = await env.DB.prepare(
      "SELECT date(created_at) as day, COUNT(*) as count FROM pinterest_hits GROUP BY date(created_at) ORDER BY day DESC LIMIT 30"
    ).all();

    const byCountry = await env.DB.prepare(
      "SELECT country, COUNT(*) as count FROM pinterest_hits GROUP BY country ORDER BY count DESC LIMIT 10"
    ).all();

    const byRouteType = await env.DB.prepare(
      "SELECT route_type, COUNT(*) as count FROM pinterest_hits GROUP BY route_type"
    ).all();

    return new Response(
      JSON.stringify({
        total: total?.count || 0,
        today: today?.count || 0,
        by_slug: bySlug?.results || [],
        by_version: byVersion?.results || [],
        by_day: byDay?.results || [],
        by_country: byCountry?.results || [],
        by_route_type: byRouteType?.results || [],
      }, null, 2),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
