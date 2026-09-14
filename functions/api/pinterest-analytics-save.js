/**
 * POST /api/pinterest-analytics-save?key=STATS_KEY
 * Called by post-pins.py (GitHub Actions) after fetching analytics from Pinterest.
 * Saves/updates analytics data in D1 pinterest_analytics_cache table.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const statsKey = env.STATS_KEY;
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";

  if (!statsKey || reqKey !== statsKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!env.DB) {
    return Response.json({ error: "DB not bound" }, { status: 500 });
  }

  const { pins } = await request.json().catch(() => ({}));
  if (!Array.isArray(pins) || !pins.length || pins.length > 150 || pins.some(p => !p || !p.pin_id)) {
    return Response.json({ error: "No pins data" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const statements = pins.map(p => env.DB.prepare(
      `INSERT INTO pinterest_analytics_cache
         (pin_id, pin_title, pin_url, pin_link, created_at, impressions, outbound_clicks, saves, cached_at)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON CONFLICT(pin_id) DO UPDATE SET
         pin_title=CASE WHEN excluded.pin_title!='' THEN excluded.pin_title ELSE pin_title END,
         pin_link=CASE WHEN excluded.pin_link!='' THEN excluded.pin_link ELSE pin_link END,
         created_at=CASE WHEN excluded.created_at!='' THEN excluded.created_at ELSE created_at END,
         impressions=excluded.impressions,
         outbound_clicks=excluded.outbound_clicks,
         saves=excluded.saves,
         cached_at=excluded.cached_at`
    ).bind(
      p.pin_id, p.pin_title || "", p.pin_url || "",
      p.pin_link || "", p.created_at || "",
      p.impressions || 0, p.outbound_clicks || 0, p.saves || 0, now
    ));

  // Publish a whole snapshot or fail; never report swallowed write errors as success.
  try {
    await env.DB.batch(statements);
  } catch {
    return Response.json({ error: 'Snapshot was not saved' }, { status: 500 });
  }

  return Response.json({ ok: true, saved: statements.length });
}
