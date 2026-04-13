/**
 * POST /api/pinterest-trends-save?key=STATS_KEY
 * Called by GitHub Actions to save trending keywords to D1.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const statsKey = env.STATS_KEY;
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";

  if (statsKey && reqKey !== statsKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.DB) {
    return Response.json({ error: "DB not bound" }, { status: 500 });
  }

  const { trends } = await request.json().catch(() => ({}));
  if (!trends?.length) {
    return Response.json({ error: "No trends data" }, { status: 400 });
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO pinterest_trends_cache (id, data, cached_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data=excluded.data, cached_at=excluded.cached_at`
  ).bind(JSON.stringify(trends), now).run();

  return Response.json({ ok: true, saved: trends.length });
}
