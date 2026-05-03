/**
 * GET /api/pins-next?key=SECRET
 * Returns the next PENDING pin due now (UTC): scheduled_date < today,
 * OR scheduled_date = today AND scheduled_time <= current UTC time (or NULL).
 * Used by GitHub Actions post-pins.py script.
 *
 * Response 200: { row_id, pin_title, pin_description, alt_text, image_url, board_id, link, scheduled_date, scheduled_time }
 * Response 204: no pins due (empty body)
 * Response 401: bad key
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
    return Response.json({ error: "D1 not bound" }, { status: 500 });
  }

  try {
    return await getNextPin(db);
  } catch (err) {
    return Response.json(
      { error: "pins-next crashed", message: err.message, stack: err.stack },
      { status: 500 },
    );
  }
}

async function getNextPin(db) {
  const now     = new Date();
  const today   = now.toISOString().split("T")[0];
  const nowTime = now.toISOString().split("T")[1].slice(0, 5);

  const { results: duePins } = await db.prepare(`
    SELECT row_id, pin_title, pin_description, alt_text,
           image_url, board_id, link, scheduled_date, scheduled_time
    FROM pins_schedule
    WHERE status = 'PENDING'
      AND (
        scheduled_date < ?
        OR (scheduled_date = ? AND COALESCE(scheduled_time, '00:00') <= ?)
      )
    ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC
    LIMIT 50
  `).bind(today, today, nowTime).all();

  if (!duePins || duePins.length === 0) {
    return Response.json({ reason: "no_due_pins", due_count: 0 }, { status: 204 });
  }

  const LIVE_STATUSES = new Set(['PUBLISHED', 'DUPLICATE']);
  const skipped = [];

  for (const row of duePins) {
    let slug = null;
    try {
      slug = new URL(row.link).pathname.replace(/^\/+/, '').split('/')[0];
    } catch {}

    if (slug) {
      const article = await db.prepare(
        `SELECT status FROM articles_schedule WHERE slug = ?`
      ).bind(slug).first();

      if (article && !LIVE_STATUSES.has(article.status)) {
        skipped.push({
          row_id: row.row_id,
          slug,
          article_status: article.status,
          scheduled_date: row.scheduled_date,
        });
        continue;
      }
    }

    return Response.json(row);
  }

  return Response.json(
    {
      reason: "all_due_pins_blocked_by_pending_articles",
      due_count: duePins.length,
      skipped_count: skipped.length,
      sample: skipped.slice(0, 10),
    },
    { status: 204 },
  );
}
