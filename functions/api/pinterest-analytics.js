/**
 * GET /api/pinterest-analytics?key=DASHBOARD_PASSWORD
 *
 * Reads Pinterest analytics from D1 (populated every 3h by post-pins.py via GitHub Actions).
 * No Pinterest API token needed here — GitHub Actions handles all the token logic.
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.DASHBOARD_PASSWORD || key !== env.DASHBOARD_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.DB) {
    return Response.json({ error: "DB not bound" }, { status: 500 });
  }

  const rows = await env.DB.prepare(
    `SELECT pin_id, pin_title, pin_url, pin_link, created_at,
            impressions, outbound_clicks, saves, cached_at
     FROM pinterest_analytics_cache
     ORDER BY impressions DESC`
  ).all().catch(() => null);

  const pins = rows?.results ?? [];

  const totals = pins.reduce(
    (acc, p) => {
      acc.impressions     += p.impressions     || 0;
      acc.outbound_clicks += p.outbound_clicks || 0;
      acc.saves           += p.saves           || 0;
      return acc;
    },
    { impressions: 0, outbound_clicks: 0, saves: 0 }
  );

  const cachedAt = pins[0]?.cached_at ?? null;

  return Response.json({
    pins,
    totals,
    total: pins.length,
    cachedAt,
    note: pins.length === 0
      ? "No data yet — GitHub Actions will populate this on the next run (every 3h)."
      : null,
  });
}
