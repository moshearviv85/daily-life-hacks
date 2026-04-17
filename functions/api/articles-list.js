/**
 * GET /api/articles-list?key=STATS_KEY
 * Returns all articles from articles_schedule (without markdown content).
 * Used by dashboard to display article status table.
 */
async function ensureRowNum(db) {
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

  let results;
  try {
    const res = await env.DB.prepare(
      `SELECT slug, title, category, image_filename, publish_at, row_num, status, published_at, created_at
       FROM articles_schedule
       ORDER BY row_num ASC, created_at ASC`
    ).all();
    results = res.results;
  } catch (e) {
    return Response.json({ error: 'DB query failed: ' + e.message }, { status: 500 });
  }

  const stats = { total: 0, pending: 0, published: 0, duplicate: 0 };
  for (const r of results) {
    stats.total++;
    if (r.status === 'PENDING')         stats.pending++;
    else if (r.status === 'PUBLISHED')  stats.published++;
    else if (r.status === 'DUPLICATE')  stats.duplicate++;
  }

  return Response.json({ ok: true, articles: results, stats });
}
