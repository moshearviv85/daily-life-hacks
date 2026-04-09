/**
 * GET /api/pins-posted?key=STATS_KEY
 * Returns all POSTED pins from pins_schedule (for analytics fetching).
 * Called by scripts/fetch-pinterest-analytics.py
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";

  if (env.STATS_KEY && reqKey !== env.STATS_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.DB) {
    return Response.json({ error: "DB not bound" }, { status: 500 });
  }

  const rows = await env.DB.prepare(
    `SELECT pin_id, pin_title, link, published_date
     FROM pins_schedule
     WHERE status = 'POSTED' AND pin_id IS NOT NULL AND pin_id != ''
     ORDER BY published_date DESC`
  ).all().catch(() => null);

  const pins = (rows?.results ?? []).map(p => ({
    pin_id:         p.pin_id,
    pin_title:      p.pin_title || "",
    link:           p.link || "",
    published_date: p.published_date || "",
    status:         "POSTED",
  }));

  return Response.json({ pins, total: pins.length });
}
