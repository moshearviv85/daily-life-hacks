/**
 * GET /api/articles-due?key=STATS_KEY
 * Returns ALL PENDING articles ordered by created_at ASC (row order from CSV upload).
 * No date filter — the publisher scans from the beginning every run and publishes
 * the first article whose image is present in GitHub.
 * Called by GitHub Actions publish-articles.py script.
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reqKey = url.searchParams.get('key') || request.headers.get('x-api-key') || '';
  if (env.STATS_KEY && reqKey !== env.STATS_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.DB) return Response.json({ error: 'DB not bound' }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { results } = await env.DB.prepare(
    `SELECT slug, title, category, image_filename, markdown_content, created_at
     FROM articles_schedule
     WHERE status = 'PENDING'
     ORDER BY created_at ASC`
  ).all();

  return Response.json({ ok: true, articles: results, date: today });
}
