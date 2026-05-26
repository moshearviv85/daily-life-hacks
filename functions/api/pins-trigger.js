/**
 * POST /api/pins-trigger
 * Manually dispatch the GitHub Actions post-pins workflow.
 * Protected by STATS_KEY.
 */

import { isDashboardAuthorized } from "./_dashboard-auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isProductionRequest(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const branch = String(env.CF_PAGES_BRANCH || "").toLowerCase();
  const productionHost = hostname === "www.daily-life-hacks.com" || hostname === "daily-life-hacks.com";
  return productionHost && branch === "main";
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") ||
    request.headers.get("x-api-key") || "";
  const authorized = await isDashboardAuthorized(env, reqKey, request);
  if (!authorized) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isProductionRequest(request, env)) {
    return json({
      ok: false,
      error: "Post Now is disabled in staging. Staging can queue pins, but cannot dispatch the real Pinterest publisher.",
      queue: "staging",
    }, 409);
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
        body: JSON.stringify({ ref: "main", inputs: { immediate: "true" } }),
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
