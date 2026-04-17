/**
 * GET /api/articles-due?key=STATS_KEY
 * Returns ALL PENDING articles ordered by row_num ASC (original CSV row order).
 * No date filter — publisher scans from the beginning each run and publishes
 * the first article whose image is present in GitHub.
 * Called by GitHub Actions publish-articles.py script.
 */

async function ensureRowNum(db) {
  // Adds row_num column if upgrading from older schema. Safe to run every call.
  try { await db.prepare(`ALTER TABLE articles_schedule ADD COLUMN row_num INTEGER DEFAULT 0`).run(); } catch(_) {}
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reqKey = url.searchParams.get('key') || request.headers.get('x-api-key') || '';
  if (env.STATS_KEY && reqKey !== env.STATS_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.DB) return Response.json({ error: 'DB not bound' }, { status: 500 });

  await ensureRowNum(env.DB);

  const today = new Date().toISOString().slice(0, 10);

  let results;
  try {
    const res = await env.DB.prepare(
      `SELECT slug, title, category, image_filename, markdown_content, row_num, created_at
       FROM articles_schedule
       WHERE status = 'PENDING'
         AND (publish_at IS NULL OR publish_at = '' OR publish_at <= ?)
       ORDER BY row_num ASC, created_at ASC`
    ).bind(today).all();
    results = res.results;
  } catch (e) {
    return Response.json({ error: 'DB query failed: ' + e.message }, { status: 500 });
  }

  return Response.json({ ok: true, articles: results, date: today });
}
