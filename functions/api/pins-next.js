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
    return new Response(JSON.stringify({ error: "D1 not bound" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now     = new Date();
  const today   = now.toISOString().split("T")[0]; // YYYY-MM-DD UTC
  const nowTime = now.toISOString().split("T")[1].slice(0, 5); // HH:MM UTC

  // Fetch up to 50 due pins — we loop to skip any whose article isn't live yet
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
    return new Response(null, { status: 204 });
  }

  for (const row of duePins) {
    // Extract slug from pin link (e.g. https://www.daily-life-hacks.com/some-slug?utm_content=v1)
    let slug = null;
    try {
      slug = new URL(row.link).pathname.replace(/^\/+/, '').split('/')[0];
    } catch {}

    if (slug) {
      const article = await db.prepare(
        `SELECT status FROM articles_schedule WHERE slug = ?`
      ).bind(slug).first();

      // Article is in the pipeline but not yet published → skip this pin silently
      if (article && article.status !== 'PUBLISHED') {
        console.log(`Skipping pin ${row.row_id}: article "${slug}" not yet live (status: ${article.status})`);
        continue;
      }
      // article is null → not in pipeline = one of the original articles, assumed live → proceed
    }

    return new Response(JSON.stringify(row), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // All due pins are waiting for their articles to be published
  return new Response(null, { status: 204 });
}
