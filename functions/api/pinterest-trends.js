/**
 * GET /api/pinterest-trends?key=DASHBOARD_PASSWORD
 * Returns Pinterest trending keywords cached in D1.
 * Populated by GitHub Actions fetch-analytics.yml every 6h.
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
