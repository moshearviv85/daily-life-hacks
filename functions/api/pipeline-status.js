import { isDashboardAuthorized } from "./_dashboard-auth.js";
import {
  boardForCategory,
  descriptionWithHashtags,
  formatHashtags,
  hashtagsForPin,
} from "./_pin-metadata.js";

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

const STAGING_PIPELINE_BASE = "https://staging.daily-life-hacks.pages.dev";

function isProductionRequest(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const branch = String(env.CF_PAGES_BRANCH || "").toLowerCase();
  const productionHost = hostname === "www.daily-life-hacks.com" || hostname === "daily-life-hacks.com";
  return productionHost || branch === "main";
}

async function proxyStagingStatus(request) {
  const url = new URL(request.url);
  const target = new URL("/api/pipeline-status", STAGING_PIPELINE_BASE);
  target.search = url.search;
  const key = url.searchParams.get("key") || request.headers.get("x-api-key") || "";
  const headers = { Accept: "application/json" };
  if (key) headers["x-api-key"] = key;
  const response = await fetch(target.toString(), {
    headers,
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text || `Staging status returned ${response.status}` };
  }
  return json({ ...payload, source: "staging" }, response.status);
}

async function getPinRows(env, stagingRequest) {
  const productionQuery = `
    SELECT pp.article_slug, pp.pin_slug, pp.pin_index, pp.title, pp.description,
            pp.alt, pp.model_id, pp.image_status, pa.category,
            ps.status AS publish_status, ps.pin_id
      FROM pipeline_pins pp
      JOIN pipeline_articles pa ON pa.slug = pp.article_slug
      LEFT JOIN pins_schedule ps ON ps.row_id = pp.pin_slug
      ORDER BY pp.article_slug ASC, pp.pin_index ASC
  `;
  const productionFallbackQuery = `
    SELECT pp.article_slug, pp.pin_slug, pp.pin_index, pp.title, pp.description,
            pp.alt, NULL AS model_id, pp.image_status, pa.category,
            ps.status AS publish_status, ps.pin_id
      FROM pipeline_pins pp
      JOIN pipeline_articles pa ON pa.slug = pp.article_slug
      LEFT JOIN pins_schedule ps ON ps.row_id = pp.pin_slug
      ORDER BY pp.article_slug ASC, pp.pin_index ASC
  `;

  if (!stagingRequest) {
    try {
      return await env.DB.prepare(productionQuery).all();
    } catch {
      return env.DB.prepare(productionFallbackQuery).all();
    }
  }

  try {
    return await env.DB.prepare(`
      SELECT pp.article_slug, pp.pin_slug, pp.pin_index, pp.title, pp.description,
              pp.alt, pp.model_id, pp.image_status, pa.category,
              COALESCE(ss.status, ps.status) AS publish_status,
              COALESCE(ss.pin_id, ps.pin_id) AS pin_id
        FROM pipeline_pins pp
        JOIN pipeline_articles pa ON pa.slug = pp.article_slug
        LEFT JOIN staging_pins_schedule ss ON ss.row_id = pp.pin_slug
        LEFT JOIN pins_schedule ps ON ps.row_id = pp.pin_slug
        ORDER BY pp.article_slug ASC, pp.pin_index ASC
    `).all();
  } catch {
    try {
      return await env.DB.prepare(`
        SELECT pp.article_slug, pp.pin_slug, pp.pin_index, pp.title, pp.description,
                pp.alt, NULL AS model_id, pp.image_status, pa.category,
                COALESCE(ss.status, ps.status) AS publish_status,
                COALESCE(ss.pin_id, ps.pin_id) AS pin_id
          FROM pipeline_pins pp
          JOIN pipeline_articles pa ON pa.slug = pp.article_slug
          LEFT JOIN staging_pins_schedule ss ON ss.row_id = pp.pin_slug
          LEFT JOIN pins_schedule ps ON ps.row_id = pp.pin_slug
          ORDER BY pp.article_slug ASC, pp.pin_index ASC
      `).all();
    } catch {
      try {
        return await env.DB.prepare(productionQuery).all();
      } catch {
        return env.DB.prepare(productionFallbackQuery).all();
      }
    }
  }
}

async function getArticles(env) {
  try {
    return await env.DB.prepare(
      `SELECT slug, topic, category, source, stage, error, error_stage,
              write_model, review_model, word_count, hero_model, hero_image_done,
              support_model, support_image_done, review_state, pin_count, pin_images_done,
              tokens_total, cost_usd, created_at, updated_at
       FROM pipeline_articles
       ORDER BY updated_at DESC
       LIMIT 200`
    ).all();
  } catch {
    return env.DB.prepare(
      `SELECT slug, topic, category, source, stage, error, error_stage,
              write_model, NULL AS review_model, word_count,
              NULL AS hero_model, 0 AS hero_image_done,
              NULL AS support_model, 0 AS support_image_done, NULL AS review_state,
              pin_count, pin_images_done, tokens_total, cost_usd, created_at, updated_at
       FROM pipeline_articles
       ORDER BY updated_at DESC
       LIMIT 200`
    ).all();
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
  if (isProductionRequest(request, env)) {
    return proxyStagingStatus(request);
  }
  if (!env.DB) {
    return json({ error: "DB not bound" }, 500);
  }
  const stagingRequest = !isProductionRequest(request, env);

  const [articles, byStage, byCategory, topicStats, pinStats, pinRows] = await Promise.all([
    getArticles(env),

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
    const board = boardForCategory(pin.category);
    const hashtags = hashtagsForPin(pin, pin.category);
    const enrichedPin = {
      ...pin,
      board_id: board?.id || null,
      board_name: board?.name || null,
      hashtags: formatHashtags(hashtags),
      description_with_hashtags: descriptionWithHashtags(pin.description, hashtags),
    };
    if (!pinsByArticle[pin.article_slug]) pinsByArticle[pin.article_slug] = [];
    pinsByArticle[pin.article_slug].push(enrichedPin);
  }

  const articleRows = (articles?.results ?? []).map((article) => {
    const pinCount = Number(article.pin_count || 0);
    const pinImagesDone = Number(article.pin_images_done || 0);
    const fullAssetsReady = article.stage === "deployed"
      && Number(article.hero_image_done || 0) >= 1
      && Number(article.support_image_done || 0) >= 1
      && pinCount >= 4
      && pinImagesDone >= pinCount;
    const displayStage = fullAssetsReady ? "staging_review" : (article.review_state || article.stage);
    return {
      ...article,
      display_stage: displayStage,
      full_assets_ready: fullAssetsReady ? 1 : 0,
      staging_url: `${STAGING_PIPELINE_BASE}/${article.slug}/`,
      hero_image_url: `${STAGING_PIPELINE_BASE}/images/${article.slug}-main.jpg`,
      support_image_url: `${STAGING_PIPELINE_BASE}/images/${article.slug}-ingredients.jpg`,
      pins: pinsByArticle[article.slug] ?? [],
    };
  });

  const displayStageMap = {};
  for (const article of articleRows) {
    const stage = article.display_stage || article.stage || "unknown";
    displayStageMap[stage] = (displayStageMap[stage] || 0) + 1;
  }

  return json({
    articles: articleRows,
    summary: {
      total: articleRows.length,
      by_stage: stageMap,
      by_display_stage: displayStageMap,
      by_category: catMap,
    },
    topics: topicMap,
    pins: pinMap,
    pin_rows: Object.values(pinsByArticle).flat(),
  });
}
