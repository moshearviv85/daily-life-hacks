/**
 * Tracker / funnel analytics – read-only summary from funnel_events (D1).
 * Same auth as /api/stats: ?key=STATS_KEY
 */
export const PAGE_VIEWS_BY_DAY_SQL = `
  SELECT date(created_at) as day, COUNT(*) as count
  FROM funnel_events
  WHERE event_type = 'page_view'
    AND datetime(created_at) >= datetime(?1)
    AND datetime(created_at) < datetime(?2)
  GROUP BY date(created_at)
  ORDER BY day ASC
`;

const DAY_MS = 24 * 60 * 60 * 1000;

export function lastCompleteUtcDaysWindow(now = new Date(), days = 7) {
  if (!Number.isInteger(days) || days < 1 || days > 31) {
    throw new RangeError("days must be an integer between 1 and 31");
  }
  const endExclusive = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  const start = new Date(endExclusive.getTime() - days * DAY_MS);
  return { start, endExclusive, days };
}

export function fillUtcDaySeries(rows, window) {
  const counts = new Map(
    (rows || []).map((row) => [String(row.day), Number(row.count) || 0])
  );
  return Array.from({ length: window.days }, (_, index) => {
    const day = new Date(window.start.getTime() + index * DAY_MS)
      .toISOString()
      .slice(0, 10);
    return { day, count: counts.get(day) || 0 };
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  const keyIsSet = typeof env.STATS_KEY === "string" && env.STATS_KEY.length > 0;
  if (!keyIsSet || key !== env.STATS_KEY) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        hint: "STATS_KEY must be set for Functions runtime: Workers & Pages → your project → Settings → Variables and Secrets → Add (or Encrypt for secret). Name: STATS_KEY. Not in Build → Environment variables. Then redeploy. Call with ?key=YOUR_STATS_KEY",
        debug: "STATS_KEY_available_at_runtime: " + keyIsSet,
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
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
    const pageViewWindow = lastCompleteUtcDaysWindow(
      context.data?.now instanceof Date ? context.data.now : new Date(),
      7
    );
    const pageViews = await env.DB.prepare(PAGE_VIEWS_BY_DAY_SQL)
      .bind(pageViewWindow.start.toISOString(), pageViewWindow.endExclusive.toISOString())
      .all();
    const pageViewsByDay = fillUtcDaySeries(pageViews?.results, pageViewWindow);
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
        page_views_by_day: pageViewsByDay,
        page_views_window: {
          event_type: "page_view",
          timezone: "UTC",
          start: pageViewWindow.start.toISOString(),
          end_exclusive: pageViewWindow.endExclusive.toISOString(),
          days: pageViewWindow.days,
          complete_days: true,
        },
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
