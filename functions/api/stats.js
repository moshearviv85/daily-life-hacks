export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  // Auth: STATS_KEY must be in Variables and Secrets (runtime), not Build env vars
  if (!env.STATS_KEY || key !== env.STATS_KEY) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        hint: "STATS_KEY must be set for Functions: Workers & Pages → project → Settings → Variables and Secrets → Add (or Encrypt). Not in Build → Environment variables. Then redeploy. Call with ?key=YOUR_STATS_KEY",
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
    const total = await env.DB.prepare("SELECT COUNT(*) as count FROM subscriptions").first();
    const today = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM subscriptions WHERE date(created_at) = date('now')"
    ).first();
    const bySource = await env.DB.prepare(
      "SELECT source, COUNT(*) as count FROM subscriptions GROUP BY source"
    ).all();
    const byDay = await env.DB.prepare(
      "SELECT date(created_at) as day, COUNT(*) as count FROM subscriptions GROUP BY date(created_at) ORDER BY day DESC LIMIT 30"
    ).all();
    const recent = await env.DB.prepare(
      "SELECT email, source, page, status, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 20"
    ).all();

    return new Response(
      JSON.stringify({
        total: total?.count || 0,
        today: today?.count || 0,
        by_source: bySource?.results || [],
        by_day: byDay?.results || [],
        recent: recent?.results || [],
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
