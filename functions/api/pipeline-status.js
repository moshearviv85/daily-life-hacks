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

    env.DB.prepare(
      `SELECT article_slug, pin_slug, pin_index, title, description, alt, image_status
       FROM pipeline_pins
       ORDER BY article_slug ASC, pin_index ASC`
    ).all(),
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
