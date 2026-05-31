/**
 * POST /api/pipeline-trigger
 * Dispatch a pipeline GitHub Actions workflow by action name.
 * Protected by DASHBOARD_PASSWORD.
 *
 * Body: { action: "discover" | "produce" | "publish" | "approve_article" | "regenerate_hero", count?: number, category?: string, topic_ids?: number[], slug?: string }
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
    outputBranch: "staging-d1",
    effect: "Adds approved topics to staging D1.",
  },
  produce: {
    workflow: "pipeline-produce.yml",
    dispatchRef: "main",
    outputBranch: "staging",
    effect: "Generates files into staging and updates staging D1 pipeline status.",
  },
  publish: {
    workflow: "publish-articles.yml",
    dispatchRef: "main",
    outputBranch: "main",
    effect: "Legacy publisher writes ready articles to production.",
  },
  approve_article: {
    workflow: "pipeline-article-assets.yml",
    dispatchRef: "main",
    outputBranch: "staging",
    effect: "Generates hero image and pin assets for an approved staging article.",
  },
  regenerate_hero: {
    workflow: "pipeline-article-assets.yml",
    dispatchRef: "staging",
    outputBranch: "staging",
    effect: "Regenerates only the staging hero image for an approved article.",
  },
};

const ASSET_READY_STAGES = new Set(["deployed"]);
const HERO_REGEN_READY_STAGES = new Set([
  "deployed",
  "hero_brief",
  "pins_brief",
  "hero_image",
  "pin_images",
  "published",
]);

async function getPipelineArticle(env, slug) {
  if (!env.DB) return null;
  return env.DB.prepare(`
    SELECT slug, stage, category
      FROM pipeline_articles
     WHERE slug = ?
     LIMIT 1
  `).bind(slug).first();
}

async function validateArticleAssetGate(env, action, slug) {
  const article = await getPipelineArticle(env, slug);
  if (!article) {
    return {
      ok: false,
      status: 404,
      error: `Article ${slug} was not found in pipeline_articles. Produce it to staging before approving assets.`,
    };
  }

  const allowed = action === "regenerate_hero" ? HERO_REGEN_READY_STAGES : ASSET_READY_STAGES;
  if (!allowed.has(article.stage)) {
    return {
      ok: false,
      status: 409,
      error: `Article ${slug} is not ready for asset generation. Current stage: ${article.stage}.`,
      article_stage: article.stage,
    };
  }

  return { ok: true, article_stage: article.stage };
}

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
    return json({ error: `Unknown action: ${action}. Use: discover, produce, publish, approve_article, regenerate_hero` }, 400);
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
  if (action === "approve_article" || action === "regenerate_hero") {
    const slug = String(body.slug || "").trim();
    if (!/^[a-z0-9-]{3,120}$/.test(slug)) {
      return json({ error: `valid slug is required for ${action}` }, 400);
    }
    inputs.slug = slug;
    if (action === "regenerate_hero") inputs.mode = "hero_only";

    const gate = await validateArticleAssetGate(env, action, slug);
    if (!gate.ok) {
      return json({ ok: false, error: gate.error, article_stage: gate.article_stage || null }, gate.status);
    }
  }
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
        actions_url: `https://github.com/moshearviv85/daily-life-hacks/actions/workflows/${actionConfig.workflow}`,
        dispatchRef: actionConfig.dispatchRef,
        outputBranch: actionConfig.outputBranch,
        effect: actionConfig.effect,
        topic_ids: inputs.topic_ids || "",
        slug: inputs.slug || "",
      });
    }
    const ghBody = await ghRes.text();
    return json({
      ok: false,
      error: summarizeGitHubError(ghBody) || `GitHub dispatch failed with status ${ghRes.status}`,
      gh_status: ghRes.status,
      gh_body: ghBody,
    }, 400);
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}

function summarizeGitHubError(body) {
  const text = String(body || "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    const parts = [
      parsed.message,
      Array.isArray(parsed.errors)
        ? parsed.errors.map((err) => err.message || err.field || JSON.stringify(err)).join("; ")
        : "",
    ].filter(Boolean);
    return parts.join(": ");
  } catch {
    return text.slice(0, 500);
  }
}
