import { isDashboardAuthorized } from "./_dashboard-auth.js";

// functions/api/pipeline-status.js
/**
 * GET /api/pipeline-status
 * Returns pipeline state for the dashboard.
 * Auth: ?key=DASHBOARD_PASSWORD
 */

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

async function getPinRows(env, stagingRequest) {
  const productionQuery = `
    SELECT pp.article_slug, pp.pin_slug, pp.pin_index, pp.title, pp.description,
            pp.alt, pp.image_status, ps.status AS publish_status, ps.pin_id
      FROM pipeline_pins pp
      LEFT JOIN pins_schedule ps ON ps.row_id = pp.pin_slug
      ORDER BY pp.article_slug ASC, pp.pin_index ASC
  `;

  if (!stagingRequest) {
    return env.DB.prepare(productionQuery).all();
  }

  try {
    return await env.DB.prepare(`
      SELECT pp.article_slug, pp.pin_slug, pp.pin_index, pp.title, pp.description,
              pp.alt, pp.image_status,
              COALESCE(ss.status, ps.status) AS publish_status,
              COALESCE(ss.pin_id, ps.pin_id) AS pin_id
        FROM pipeline_pins pp
        LEFT JOIN staging_pins_schedule ss ON ss.row_id = pp.pin_slug
        LEFT JOIN pins_schedule ps ON ps.row_id = pp.pin_slug
        ORDER BY pp.article_slug ASC, pp.pin_index ASC
    `).all();
  } catch {
    return env.DB.prepare(productionQuery).all();
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";

  const authorized = await isDashboardAuthorized(env, key, request);
  if (!authorized) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) {
    return json({ error: "DB not bound" }, 500);
  }
  const stagingRequest = !isProductionRequest(request, env);

  const [articles, byStage, byCategory, topicStats, pinStats, pinRows] = await Promise.all([
    env.DB.prepare(
      `SELECT slug, topic, category, source, stage, error, error_stage,
              write_model, word_count, pin_count, pin_images_done,
              tokens_total, cost_usd, created_at, updated_at
       FROM pipeline_articles
       ORDER BY updated_at DESC
       LIMIT 200`
    ).all(),

    env.DB.prepare(
      `SELECT stage, COUNT(*) as cnt FROM pipeline_articles GROUP BY stage`
    ).all(),

    env.DB.prepare(
      `SELECT category, stage, COUNT(*) as cnt FROM pipeline_articles
       GROUP BY category, stage`
    ).all(),

    env.DB.prepare(
      `SELECT status, COUNT(*) as cnt FROM pipeline_topics GROUP BY status`
    ).all(),

    env.DB.prepare(
      `SELECT image_status, COUNT(*) as cnt FROM pipeline_pins GROUP BY image_status`
    ).all(),

    getPinRows(env, stagingRequest),
  ]);

  const stageMap = {};
  for (const r of byStage?.results ?? []) stageMap[r.stage] = r.cnt;

  const catMap = {};
  for (const r of byCategory?.results ?? []) {
    if (!catMap[r.category]) catMap[r.category] = {};
    catMap[r.category][r.stage] = r.cnt;
  }

  const topicMap = {};
  for (const r of topicStats?.results ?? []) topicMap[r.status] = r.cnt;

  const pinMap = {};
  for (const r of pinStats?.results ?? []) pinMap[r.image_status] = r.cnt;

  const pins = pinRows?.results ?? [];
  const pinsByArticle = {};
  for (const pin of pins) {
    if (!pinsByArticle[pin.article_slug]) pinsByArticle[pin.article_slug] = [];
    pinsByArticle[pin.article_slug].push(pin);
  }

  const articleRows = (articles?.results ?? []).map((article) => ({
    ...article,
    pins: pinsByArticle[article.slug] ?? [],
  }));

  return json({
    articles: articleRows,
    summary: {
      total: articleRows.length,
      by_stage: stageMap,
      by_category: catMap,
    },
    topics: topicMap,
    pins: pinMap,
    pin_rows: pins,
  });
}
