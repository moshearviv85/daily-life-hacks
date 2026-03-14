/**
 * Tracker / funnel analytics – read-only summary from funnel_events (D1).
 * Same auth as /api/stats: ?key=STATS_KEY
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
    const total = await env.DB.prepare("SELECT COUNT(*) as count FROM funnel_events").first();
    const byType = await env.DB.prepare(
      "SELECT event_type, COUNT(*) as count FROM funnel_events GROUP BY event_type ORDER BY count DESC"
    ).all();
    const byDay = await env.DB.prepare(
      "SELECT date(created_at) as day, COUNT(*) as count FROM funnel_events GROUP BY date(created_at) ORDER BY day DESC LIMIT 30"
    ).all();
    const byPage = await env.DB.prepare(
      "SELECT page, COUNT(*) as count FROM funnel_events WHERE page IS NOT NULL AND page != '' GROUP BY page ORDER BY count DESC LIMIT 50"
    ).all();
    const recent = await env.DB.prepare(
      "SELECT event_type, page, base_slug, variant_slug, category, source, created_at FROM funnel_events ORDER BY created_at DESC LIMIT 50"
    ).all();

    return new Response(
      JSON.stringify({
        total: total?.count ?? 0,
        by_event_type: byType?.results ?? [],
        by_day: byDay?.results ?? [],
        by_page: byPage?.results ?? [],
        recent: recent?.results ?? [],
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
