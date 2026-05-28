/**
 * POST /api/pipeline-trigger
 * Dispatch a pipeline GitHub Actions workflow by action name.
 * Protected by DASHBOARD_PASSWORD.
 *
 * Body: { action: "discover" | "produce" | "publish", count?: number, category?: string, topic_ids?: number[] }
 *
 * Note: workflows are dispatched from the default production branch so GitHub can
 * find the workflow files. Content-generation workflows push their generated
 * files to staging from inside the workflow.
 */

import { isDashboardAuthorized } from "./_dashboard-auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isProductionRequest(env, request) {
  const host = new URL(request.url).hostname;
  return env.CF_PAGES_BRANCH === "main"
    || host === "www.daily-life-hacks.com"
    || host === "daily-life-hacks.com";
}

const ACTIONS = {
  discover: {
    workflow: "pipeline-discover.yml",
    dispatchRef: "main",
    outputBranch: "production-d1",
    effect: "Adds approved topics to production D1.",
  },
  produce: {
    workflow: "pipeline-produce.yml",
    dispatchRef: "main",
    outputBranch: "staging",
    effect: "Generates files into staging; may update production D1 pipeline status.",
  },
  publish: {
    workflow: "publish-articles.yml",
    dispatchRef: "main",
    outputBranch: "main",
    effect: "Legacy publisher writes ready articles to production.",
  },
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!(await isDashboardAuthorized(env, key, request))) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.GH_PAT) {
    return json({ error: "GH_PAT not configured" }, 500);
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const actionConfig = ACTIONS[action];
  if (!actionConfig) {
    return json({ error: `Unknown action: ${action}. Use: discover, produce, publish` }, 400);
  }
  if (action === "publish" && !isProductionRequest(env, request)) {
    return json({
      ok: false,
      error: "Legacy Publish is disabled in staging because it can publish to production.",
      queue: "staging",
    }, 409);
  }

  const inputs = {};
  if (body.count) inputs.count = String(body.count);
  if (body.category) inputs.category = body.category;
  if (action === "produce" && Array.isArray(body.topic_ids) && body.topic_ids.length) {
    const topicIds = body.topic_ids
      .map((id) => Number.parseInt(String(id), 10))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (topicIds.length === 0) {
      return json({ error: "topic_ids must contain positive integers" }, 400);
    }
    inputs.topic_ids = topicIds.join(",");
  }

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/moshearviv85/daily-life-hacks/actions/workflows/${actionConfig.workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GH_PAT}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "daily-life-hacks-cloudflare",
        },
        body: JSON.stringify({ ref: actionConfig.dispatchRef, inputs }),
      }
    );

    if (ghRes.ok || ghRes.status === 204) {
      return json({
        ok: true,
        message: `${action} workflow dispatched`,
        action,
        workflow: actionConfig.workflow,
        dispatchRef: actionConfig.dispatchRef,
        outputBranch: actionConfig.outputBranch,
        effect: actionConfig.effect,
        topic_ids: inputs.topic_ids || "",
      });
    }
    const ghBody = await ghRes.text();
    return json({ ok: false, gh_status: ghRes.status, gh_body: ghBody }, 400);
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}
