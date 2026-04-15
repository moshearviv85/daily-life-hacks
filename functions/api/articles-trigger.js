/**
 * POST /api/articles-trigger?key=STATS_KEY
 * Manually dispatches the GitHub Actions publish-articles workflow.
 * Protected by STATS_KEY. Requires GH_PAT env var.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reqKey = url.searchParams.get('key') || request.headers.get('x-api-key') || '';
  if (env.STATS_KEY && reqKey !== env.STATS_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.GH_PAT) {
    return Response.json({ error: 'GH_PAT not configured' }, { status: 500 });
  }

  const ghRes = await fetch(
    'https://api.github.com/repos/moshearviv85/daily-life-hacks/actions/workflows/publish-articles.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GH_PAT}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'daily-life-hacks-cloudflare',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (ghRes.status === 204 || ghRes.ok) {
    return Response.json({ ok: true, message: 'Publisher workflow dispatched' });
  }
  const body = await ghRes.text();
  return Response.json({ ok: false, gh_status: ghRes.status, gh_body: body }, { status: 400 });
}
