/**
 * GET /api/articles-export?key=STATS_KEY
 * Downloads articles_schedule as CSV with published_at dates.
 * Used by dashboard "Download CSV" button.
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
     ORDER BY created_at ASC`
  ).all();

  const cols = ['slug', 'title', 'category', 'image_filename', 'publish_at', 'status', 'published_at', 'duplicate_of', 'created_at'];

  function escapeCSV(val) {
    if (val == null) return '';
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  const lines = [cols.join(',')];
  for (const row of results) {
    lines.push(cols.map(c => escapeCSV(row[c])).join(','));
  }

  const csv = lines.join('\r\n');
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="articles-schedule-${date}.csv"`,
    },
  });
}
