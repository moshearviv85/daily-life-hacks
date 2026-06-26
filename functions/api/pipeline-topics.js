/**
 * GET  /api/pipeline-topics?key=...                     — list topics
 * POST /api/pipeline-topics?key=...&action=approve      — approve topic(s)
 * POST /api/pipeline-topics?key=...&action=reject       — reject topic(s)
 * POST /api/pipeline-topics?key=...&action=add          — manually add a topic
 * POST /api/pipeline-topics?key=...&action=produced     — mark as produced
 * POST /api/pipeline-topics?key=...&action=reset        — clear topic bank
 * Auth: DASHBOARD_PASSWORD
 */

import { isDashboardAuthorized } from "./_dashboard-auth.js";

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
  return hostname === "www.daily-life-hacks.com" || hostname === "daily-life-hacks.com" || branch === "main";
}

async function proxyStagingTopics(request) {
  const source = new URL(request.url);
  const target = new URL("/api/pipeline-topics", STAGING_PIPELINE_BASE);
  target.search = source.search;
  const key = source.searchParams.get("key") || request.headers.get("x-api-key") || "";

  const init = {
    method: request.method,
    headers: { Accept: "application/json" },
  };
  if (key) init.headers["x-api-key"] = key;
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.headers["Content-Type"] = request.headers.get("Content-Type") || "application/json";
    init.body = await request.text();
  }

  const response = await fetch(target.toString(), init);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text || `Staging topics returned ${response.status}` };
  }
  return json({ ...payload, source: "staging" }, response.status);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || request.headers.get("x-api-key") || "";
  if (!(await isDashboardAuthorized(env, key, request))) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (isProductionRequest(request, env)) {
    return proxyStagingTopics(request);
  }

  const status = url.searchParams.get("status") || null;
  let query = "SELECT * FROM pipeline_topics";
  const params = [];
  if (status) {
    query += " WHERE status = ?";
    params.push(status);
  }
  query += " ORDER BY datetime(created_at) DESC, id DESC";
  query += " LIMIT 500";

  const rows = await env.DB.prepare(query).bind(...params).all();
  return json({ topics: rows?.results ?? [] });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || request.headers.get("x-api-key") || "";
  if (!(await isDashboardAuthorized(env, key, request))) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (isProductionRequest(request, env)) {
    return proxyStagingTopics(request);
  }

  const action = url.searchParams.get("action");
  const body = await request.json().catch(() => ({}));

  if (action === "queue") {
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ error: "ids array required" }, 400);
    }

    const placeholders = ids.map(() => "?").join(",");
    const rows = await env.DB.prepare(
      `SELECT id FROM pipeline_topics WHERE id IN (${placeholders}) AND status = 'approved'`
    ).bind(...ids).all();
    const queueableIds = (rows?.results ?? [])
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!queueableIds.length) {
      return json({ ok: true, action, count: 0, skipped: ids.length });
    }

    const queuePlaceholders = queueableIds.map(() => "?").join(",");
    await env.DB.prepare(
      `UPDATE pipeline_topics
          SET status = 'queued',
              reject_reason = COALESCE(?, reject_reason)
        WHERE id IN (${queuePlaceholders}) AND status = 'approved'`
    ).bind(body.reason || "queued by dashboard", ...queueableIds).run();

    return json({
      ok: true,
      action,
      count: queueableIds.length,
      skipped: ids.length - queueableIds.length,
    });
  }

  if (action === "approve" || action === "reject" || action === "produced") {
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ error: "ids array required" }, 400);
    }
    const placeholders = ids.map(() => "?").join(",");
    let rejectedSlugs = [];
    if (action === "reject") {
      const rows = await env.DB.prepare(
        `SELECT slug FROM pipeline_topics WHERE id IN (${placeholders})`
      ).bind(...ids).all();
      rejectedSlugs = (rows?.results ?? []).map((r) => r.slug).filter(Boolean);
    }
    const newStatus = action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : action === "queue"
          ? "queued"
          : "produced";
    const reason = action === "reject" ? (body.reason || "manual rejection") : null;

    await env.DB.prepare(
      `UPDATE pipeline_topics SET status = ?, reject_reason = COALESCE(?, reject_reason) WHERE id IN (${placeholders})`
    ).bind(newStatus, reason, ...ids).run();

    if (rejectedSlugs.length) {
      const slugPlaceholders = rejectedSlugs.map(() => "?").join(",");
      await env.DB.prepare(
        `DELETE FROM pipeline_pins WHERE article_slug IN (${slugPlaceholders})`
      ).bind(...rejectedSlugs).run();
      await env.DB.prepare(
        `DELETE FROM pipeline_articles WHERE slug IN (${slugPlaceholders})`
      ).bind(...rejectedSlugs).run();
    }

    return json({ ok: true, action, count: ids.length });
  }

  if (action === "delete") {
    const ids = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ error: "ids array required" }, 400);
    }
    if (ids.length > 500) {
      return json({ error: "cannot delete more than 500 topics at once" }, 400);
    }

    const cleanIds = ids
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0);
    if (!cleanIds.length) {
      return json({ error: "valid topic ids required" }, 400);
    }

    const placeholders = cleanIds.map(() => "?").join(",");
    const rows = await env.DB.prepare(
      `SELECT id FROM pipeline_topics
       WHERE id IN (${placeholders}) AND status = 'pending'`
    ).bind(...cleanIds).all();
    const deletableIds = (rows?.results ?? [])
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (!deletableIds.length) {
      return json({ ok: true, action, count: 0, skipped: cleanIds.length });
    }

    const deletePlaceholders = deletableIds.map(() => "?").join(",");
    await env.DB.prepare(
      `DELETE FROM pipeline_topics
       WHERE id IN (${deletePlaceholders}) AND status = 'pending'`
    ).bind(...deletableIds).run();

    return json({
      ok: true,
      action,
      count: deletableIds.length,
      skipped: cleanIds.length - deletableIds.length,
    });
  }

  if (action === "reset") {
    const confirm = String(body.confirm || "").trim();
    if (confirm !== "DELETE ALL TOPICS") {
      return json({ error: "confirmation text must be DELETE ALL TOPICS" }, 400);
    }

    const before = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM pipeline_topics"
    ).first();
    await env.DB.prepare("DELETE FROM pipeline_topics").run();
    const after = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM pipeline_topics"
    ).first();

    const beforeCount = Number(before?.count || 0);
    const remaining = Number(after?.count || 0);
    return json({
      ok: true,
      action,
      count: Math.max(0, beforeCount - remaining),
      remaining,
    });
  }

  if (action === "add") {
    const { topic, category, source } = body;
    if (!topic || !category) {
      return json({ error: "topic and category required" }, 400);
    }
    const status = ["pending", "approved"].includes(body.status) ? body.status : "approved";
    const slug = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
    try {
      await env.DB.prepare(
        `INSERT INTO pipeline_topics
          (topic, slug, category, source, status, impressions, ctr, avg_position, trend_score, dedup_score, reject_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        topic,
        slug,
        category,
        source || "manual",
        status,
        body.impressions ?? null,
        body.ctr ?? null,
        body.avg_position ?? null,
        body.trend_score ?? null,
        body.dedup_score ?? null,
        body.quality_reason ?? null,
      ).run();
      return json({ ok: true, slug });
    } catch (e) {
      return json({ error: e.message }, 400);
    }
  }

  return json({ error: "Unknown action. Use: approve, reject, queue, delete, reset, produced, add" }, 400);
}
