import { getDashboardAuthKey, isDashboardAuthorized } from "./_dashboard-auth.js";

/**
 * GET /api/pinterest-trends
 * Auth: x-api-key header (preferred) or ?key=
 * Returns Pinterest trending keywords cached in D1.
 * Populated by GitHub Actions fetch-analytics.yml every 6h.
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

  const row = await env.DB.prepare(
    "SELECT data, cached_at FROM pinterest_trends_cache WHERE id = 1"
  ).first().catch(() => null);

  if (!row) {
    return Response.json({ trends: [], cachedAt: null, note: "No data yet — trigger a refresh from the dashboard." });
  }

  let trends = [];
  try { trends = JSON.parse(row.data); } catch {}

  return Response.json({ trends, cachedAt: row.cached_at, total: trends.length });
}
