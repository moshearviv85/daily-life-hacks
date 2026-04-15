/**
 * POST /api/articles-set-status?key=STATS_KEY
 * Body: { slug, status, published_at? }
 * Updates article status in articles_schedule. Called by publish-articles.py.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reqKey = url.searchParams.get('key') || request.headers.get('x-api-key') || '';
  if (env.STATS_KEY && reqKey !== env.STATS_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.DB) return Response.json({ error: 'DB not bound' }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const { slug, status, published_at } = body;
  if (!slug || !status) {
    return Response.json({ error: 'slug and status required' }, { status: 400 });
  }

  const now = published_at || new Date().toISOString();
  await env.DB.prepare(
    `UPDATE articles_schedule
     SET status = ?, published_at = ?
     WHERE slug = ?`
  ).bind(status, now, slug).run();

  return Response.json({ ok: true, slug, status });
}
