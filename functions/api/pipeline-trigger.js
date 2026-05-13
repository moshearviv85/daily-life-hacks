/**
 * POST /api/pipeline-trigger
 * Dispatch a pipeline GitHub Actions workflow by action name.
 * Protected by DASHBOARD_PASSWORD.
 *
 * Body: { action: "discover" | "produce" | "publish", count?: number, category?: string }
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const WORKFLOWS = {
  discover: "pipeline-discover.yml",
  produce: "pipeline-produce.yml",
  publish: "pipeline-publish.yml",
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!env.DASHBOARD_PASSWORD || key !== env.DASHBOARD_PASSWORD) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.GH_PAT) {
    return json({ error: "GH_PAT not configured" }, 500);
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const workflow = WORKFLOWS[action];
  if (!workflow) {
    return json({ error: `Unknown action: ${action}. Use: discover, produce, publish` }, 400);
  }

  const inputs = {};
  if (body.count) inputs.count = String(body.count);
  if (body.category) inputs.category = body.category;

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/moshearviv85/daily-life-hacks/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GH_PAT}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "daily-life-hacks-cloudflare",
        },
        body: JSON.stringify({ ref: "main", inputs }),
      }
    );

    if (ghRes.ok || ghRes.status === 204) {
      return json({ ok: true, message: `${action} workflow dispatched`, workflow });
    }
    const ghBody = await ghRes.text();
    return json({ ok: false, gh_status: ghRes.status, gh_body: ghBody }, 400);
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
