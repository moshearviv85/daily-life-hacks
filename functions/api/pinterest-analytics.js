import { getDashboardAuthKey, isDashboardAuthorized } from "./_dashboard-auth.js";

/**
 * GET /api/pinterest-analytics
 * Auth: x-api-key header (preferred) or ?key=
 *
 * Reads the latest top-pin snapshot, refreshed every 6h by GitHub Actions.
 * No Pinterest API token needed here — GitHub Actions handles all the token logic.
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const key = getDashboardAuthKey(request);

  if (!(await isDashboardAuthorized(env, key, request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.DB) {
    return Response.json({ error: "DB not bound" }, { status: 500 });
  }

  const rows = await env.DB.prepare(
    `SELECT pin_id, pin_title, pin_url, pin_link, created_at,
            impressions, outbound_clicks, saves, cached_at
     FROM pinterest_analytics_cache
     WHERE cached_at = (SELECT MAX(cached_at) FROM pinterest_analytics_cache)
     ORDER BY impressions DESC`
  ).all();

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
  const now = context.data?.now instanceof Date ? context.data.now : new Date();
  const ageMs = cachedAt ? now - new Date(cachedAt) : null;
  const ownPins = pins.filter(p => {
    try { return ['daily-life-hacks.com', 'www.daily-life-hacks.com'].includes(new URL(p.pin_link).hostname); }
    catch { return false; }
  });

  return Response.json({
    pins,
    totals,
    total: pins.length,
    cachedAt,
    fromCache: true,
    stale: ageMs === null || ageMs > 12 * 60 * 60 * 1000,
    scope: 'Latest 90-day top-pin sample; not account totals. Older snapshots are excluded.',
    own_site: {
      pins: ownPins.length,
      impressions: ownPins.reduce((sum, p) => sum + (Number(p.impressions) || 0), 0),
      outbound_clicks: ownPins.reduce((sum, p) => sum + (Number(p.outbound_clicks) || 0), 0),
      saves: ownPins.reduce((sum, p) => sum + (Number(p.saves) || 0), 0),
    },
    note: pins.length === 0
      ? "No data yet. The analytics workflow runs every 6h."
      : null,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
