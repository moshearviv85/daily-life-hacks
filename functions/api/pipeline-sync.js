// functions/api/pipeline-sync.js
/**
 * POST /api/pipeline-sync
 * Receives pipeline results from GitHub Actions and upserts into D1.
 * Auth: ?key=STATS_KEY
 *
 * Body JSON: {
 *   articles: [{ slug, topic, category, source, stage, error, error_stage,
 *                write_model, review_model, word_count, hero_prompt, hero_alt,
 *                pin_count, pin_images_done, tokens_total, cost_usd }],
 *   pins: [{ article_slug, pin_slug, pin_index, title, description,
 *            prompt, alt, image_status }]
 * }
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || request.headers.get("x-api-key") || "";

  if (env.STATS_KEY && key !== env.STATS_KEY) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!env.DB) {
    return json({ error: "DB not bound" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const results = { articles_upserted: 0, pins_upserted: 0, errors: [] };

  if (Array.isArray(body.articles)) {
    for (const a of body.articles) {
      try {
        await env.DB.prepare(`
          INSERT INTO pipeline_articles
            (slug, topic, category, source, stage, error, error_stage,
             write_model, review_model, word_count, hero_prompt, hero_alt,
             pin_count, pin_images_done, tokens_total, cost_usd, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(slug) DO UPDATE SET
            stage = excluded.stage,
            error = excluded.error,
            error_stage = excluded.error_stage,
            write_model = COALESCE(excluded.write_model, pipeline_articles.write_model),
            review_model = COALESCE(excluded.review_model, pipeline_articles.review_model),
            word_count = COALESCE(excluded.word_count, pipeline_articles.word_count),
            hero_prompt = COALESCE(excluded.hero_prompt, pipeline_articles.hero_prompt),
            hero_alt = COALESCE(excluded.hero_alt, pipeline_articles.hero_alt),
            pin_count = COALESCE(excluded.pin_count, pipeline_articles.pin_count),
            pin_images_done = COALESCE(excluded.pin_images_done, pipeline_articles.pin_images_done),
            tokens_total = pipeline_articles.tokens_total + COALESCE(excluded.tokens_total, 0),
            cost_usd = pipeline_articles.cost_usd + COALESCE(excluded.cost_usd, 0),
            updated_at = datetime('now')
        `).bind(
          a.slug, a.topic, a.category, a.source || "manual", a.stage,
          a.error || null, a.error_stage || null,
          a.write_model || null, a.review_model || null,
          a.word_count || null, a.hero_prompt || null, a.hero_alt || null,
          a.pin_count || null, a.pin_images_done || null,
          a.tokens_total || 0, a.cost_usd || 0,
        ).run();
        results.articles_upserted++;
      } catch (e) {
        results.errors.push({ type: "article", slug: a.slug, error: e.message });
      }
    }
  }

  if (Array.isArray(body.pins)) {
    for (const p of body.pins) {
      try {
        await env.DB.prepare(`
          INSERT INTO pipeline_pins
            (article_slug, pin_slug, pin_index, title, description, prompt, alt, image_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(pin_slug) DO UPDATE SET
            title = COALESCE(excluded.title, pipeline_pins.title),
            description = COALESCE(excluded.description, pipeline_pins.description),
            prompt = COALESCE(excluded.prompt, pipeline_pins.prompt),
            alt = COALESCE(excluded.alt, pipeline_pins.alt),
            image_status = excluded.image_status
        `).bind(
          p.article_slug, p.pin_slug, p.pin_index,
          p.title || null, p.description || null,
          p.prompt || null, p.alt || null,
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
