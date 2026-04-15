/**
 * GET /api/articles-list?key=STATS_KEY
 * Returns all articles from articles_schedule (without markdown content).
 * Used by dashboard to display article status table.
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reqKey = url.searchParams.get('key') || request.headers.get('x-api-key') || '';
  if (env.STATS_KEY && reqKey !== env.STATS_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.DB) return Response.json({ error: 'DB not bound' }, { status: 500 });

  const { results } = await env.DB.prepare(
    `SELECT slug, title, category, image_filename, publish_at, status, published_at, duplicate_of, created_at
     FROM articles_schedule
     ORDER BY publish_at ASC, created_at ASC`
  ).all();

  const stats = { total: 0, pending: 0, published: 0, duplicate: 0 };
  for (const r of results) {
    stats.total++;
    if (r.status === 'PENDING')    stats.pending++;
    else if (r.status === 'PUBLISHED') stats.published++;
    else if (r.status === 'DUPLICATE') stats.duplicate++;
  }

  return Response.json({ ok: true, articles: results, stats });
}
