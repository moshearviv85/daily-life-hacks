/**
 * GET /api/pins-status?key=SECRET
 * Returns schedule stats + upcoming pins list for the dashboard.
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const key = env.STATS_KEY;

  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";
  if (key && reqKey !== key) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: "D1 not bound" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().split("T")[0];

  const [counts, upcoming, recent] = await Promise.all([
    // Status counts
    db.prepare(`
      SELECT status, COUNT(*) as count FROM pins_schedule GROUP BY status
    `).all(),

    // Next 10 pending
    db.prepare(`
      SELECT row_id, pin_title, scheduled_date, board_id, image_url
      FROM pins_schedule
      WHERE status = 'PENDING'
      ORDER BY scheduled_date ASC
      LIMIT 10
    `).all(),

    // Last 5 posted
    db.prepare(`
      SELECT row_id, pin_title, pin_id, published_date, link
      FROM pins_schedule
      WHERE status = 'POSTED'
      ORDER BY published_date DESC
      LIMIT 5
    `).all(),
  ]);

  const statusMap = {};
  for (const row of counts.results) statusMap[row.status] = row.count;

  return new Response(JSON.stringify({
    today,
    total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    posted: statusMap.POSTED || 0,
    pending: statusMap.PENDING || 0,
    upcoming: upcoming.results,
    recent_posted: recent.results,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
