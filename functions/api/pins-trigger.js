/**
 * POST /api/pins-trigger
 * Manually dispatch the GitHub Actions post-pins workflow.
 * Protected by STATS_KEY.
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.STATS_KEY;

  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") ||
    request.headers.get("x-api-key") || "";
  if (key && reqKey !== key) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!env.GH_PAT) {
    return json({ error: "GH_PAT not configured in Cloudflare environment" }, 500);
  }

  let ghStatus, ghBody;
  try {
    const ghRes = await fetch(
      "https://api.github.com/repos/moshearviv85/daily-life-hacks/actions/workflows/post-pins.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GH_PAT}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "daily-life-hacks-cloudflare",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );
    ghStatus = ghRes.status;
    ghBody   = await ghRes.text();

    if (ghRes.ok) {
      return json({ ok: true, message: "Workflow dispatched", gh_status: ghStatus });
    }
    return json({ ok: false, gh_status: ghStatus, gh_body: ghBody }, 400);

  } catch (err) {
    return json({ ok: false, error: String(err), gh_status: ghStatus ?? null }, 500);
  }
}
