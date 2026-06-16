// functions/api/pipeline-sync.js
/**
 * POST /api/pipeline-sync
 * Receives pipeline results from GitHub Actions and upserts into D1.
 * Auth: ?key=STATS_KEY or DASHBOARD_PASSWORD
 *
 * Body JSON: {
 *   articles: [{ slug, topic, category, source, stage, error, error_stage,
 *                write_model, review_model, word_count, hero_prompt, hero_alt,
 *                hero_model, hero_image_done, support_model, support_image_done,
 *                review_state, pin_count, pin_images_done, tokens_total, cost_usd }],
 *   pins: [{ article_slug, pin_slug, pin_index, title, description,
 *            prompt, alt, model_id, image_status }]
 * }
 */

import { isDashboardAuthorized } from "./_dashboard-auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function nullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

async function ensureOptionalColumns(env) {
  const statements = [
    "ALTER TABLE pipeline_articles ADD COLUMN hero_model TEXT",
    "ALTER TABLE pipeline_articles ADD COLUMN hero_image_done INTEGER DEFAULT 0",
    "ALTER TABLE pipeline_articles ADD COLUMN support_model TEXT",
    "ALTER TABLE pipeline_articles ADD COLUMN support_image_done INTEGER DEFAULT 0",
    "ALTER TABLE pipeline_articles ADD COLUMN review_state TEXT",
    "ALTER TABLE pipeline_pins ADD COLUMN model_id TEXT",
  ];
  for (const sql of statements) {
    try {
      await env.DB.prepare(sql).run();
    } catch {
      // Existing D1 databases already have some columns; duplicate-column errors are expected.
    }
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || request.headers.get("x-api-key") || "";

  if (!(await isDashboardAuthorized(env, key, request))) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) {
    return json({ error: "DB not bound" }, 500);
  }
  await ensureOptionalColumns(env);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const results = { articles_upserted: 0, pins_deleted: 0, pins_upserted: 0, errors: [] };
  const syncedArticleSlugs = new Set(
    Array.isArray(body.articles)
      ? body.articles.map((article) => String(article?.slug || "").trim()).filter(Boolean)
      : []
  );

  if (Array.isArray(body.articles)) {
    for (const a of body.articles) {
      try {
        await env.DB.prepare(`
          INSERT INTO pipeline_articles
            (slug, topic, category, source, stage, error, error_stage,
             write_model, review_model, word_count, hero_prompt, hero_alt,
             hero_model, hero_image_done, support_model, support_image_done, review_state,
             pin_count, pin_images_done, tokens_total, cost_usd, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(slug) DO UPDATE SET
            stage = excluded.stage,
            error = excluded.error,
            error_stage = excluded.error_stage,
            write_model = COALESCE(excluded.write_model, pipeline_articles.write_model),
            review_model = COALESCE(excluded.review_model, pipeline_articles.review_model),
            word_count = COALESCE(excluded.word_count, pipeline_articles.word_count),
            hero_prompt = COALESCE(excluded.hero_prompt, pipeline_articles.hero_prompt),
            hero_alt = COALESCE(excluded.hero_alt, pipeline_articles.hero_alt),
            hero_model = COALESCE(excluded.hero_model, pipeline_articles.hero_model),
            hero_image_done = COALESCE(excluded.hero_image_done, pipeline_articles.hero_image_done),
            support_model = COALESCE(excluded.support_model, pipeline_articles.support_model),
            support_image_done = COALESCE(excluded.support_image_done, pipeline_articles.support_image_done),
            review_state = COALESCE(excluded.review_state, pipeline_articles.review_state),
            pin_count = COALESCE(excluded.pin_count, pipeline_articles.pin_count),
            pin_images_done = COALESCE(excluded.pin_images_done, pipeline_articles.pin_images_done),
            tokens_total = pipeline_articles.tokens_total + COALESCE(excluded.tokens_total, 0),
            cost_usd = pipeline_articles.cost_usd + COALESCE(excluded.cost_usd, 0),
            updated_at = datetime('now')
        `).bind(
          a.slug, a.topic, a.category, a.source || "manual", a.stage,
          nullable(a.error), nullable(a.error_stage),
          nullable(a.write_model), nullable(a.review_model),
          nullable(a.word_count), nullable(a.hero_prompt), nullable(a.hero_alt),
          nullable(a.hero_model), nullable(a.hero_image_done),
          nullable(a.support_model), nullable(a.support_image_done),
          nullable(a.review_state),
          nullable(a.pin_count), nullable(a.pin_images_done),
          a.tokens_total || 0, a.cost_usd || 0,
        ).run();
        results.articles_upserted++;
      } catch (e) {
        results.errors.push({ type: "article", slug: a.slug, error: e.message });
      }
    }
  }

  if (Array.isArray(body.pins)) {
    for (const slug of syncedArticleSlugs) {
      try {
        const deleted = await env.DB.prepare(
          "DELETE FROM pipeline_pins WHERE article_slug = ?"
        ).bind(slug).run();
        results.pins_deleted += deleted.meta?.changes || 0;
      } catch (e) {
        results.errors.push({ type: "pin_delete", slug, error: e.message });
      }
    }

    for (const p of body.pins) {
      try {
        await env.DB.prepare(`
          INSERT INTO pipeline_pins
            (article_slug, pin_slug, pin_index, title, description, prompt, alt, model_id, image_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(pin_slug) DO UPDATE SET
            article_slug = excluded.article_slug,
            pin_index = excluded.pin_index,
            title = COALESCE(excluded.title, pipeline_pins.title),
            description = COALESCE(excluded.description, pipeline_pins.description),
            prompt = COALESCE(excluded.prompt, pipeline_pins.prompt),
            alt = COALESCE(excluded.alt, pipeline_pins.alt),
            model_id = COALESCE(excluded.model_id, pipeline_pins.model_id),
            image_status = excluded.image_status
        `).bind(
          p.article_slug, p.pin_slug, p.pin_index,
          nullable(p.title), nullable(p.description),
          nullable(p.prompt), nullable(p.alt), nullable(p.model_id),
          p.image_status || "pending",
        ).run();
        results.pins_upserted++;
      } catch (e) {
        results.errors.push({ type: "pin", pin_slug: p.pin_slug, error: e.message });
      }
    }
  }

  return json({ ok: true, ...results });
}
