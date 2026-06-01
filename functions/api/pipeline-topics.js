/**
 * GET  /api/pipeline-topics?key=...                     — list topics
 * POST /api/pipeline-topics?key=...&action=approve      — approve topic(s)
 * POST /api/pipeline-topics?key=...&action=reject       — reject topic(s)
 * POST /api/pipeline-topics?key=...&action=add          — manually add a topic
 * POST /api/pipeline-topics?key=...&action=produced     — mark as produced
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
  const key = url.searchParams.get("key") || "";
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
  query += " ORDER BY CASE source WHEN 'gsc' THEN 1 WHEN 'pinterest' THEN 2 WHEN 'autocomplete' THEN 3 ELSE 4 END, impressions DESC NULLS LAST, id DESC";
  query += " LIMIT 500";

  const rows = await env.DB.prepare(query).bind(...params).all();
  return json({ topics: rows?.results ?? [] });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!(await isDashboardAuthorized(env, key, request))) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (isProductionRequest(request, env)) {
    return proxyStagingTopics(request);
  }

  const action = url.searchParams.get("action");
  const body = await request.json().catch(() => ({}));

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
    const newStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "produced";
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

  if (action === "add") {
    const { topic, category, source } = body;
    if (!topic || !category) {
      return json({ error: "topic and category required" }, 400);
    }
    const slug = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
    try {
      await env.DB.prepare(
        `INSERT INTO pipeline_topics (topic, slug, category, source, status)
         VALUES (?, ?, ?, ?, 'approved')`
      ).bind(topic, slug, category, source || "manual").run();
      return json({ ok: true, slug });
    } catch (e) {
      return json({ error: e.message }, 400);
    }
  }

  return json({ error: "Unknown action. Use: approve, reject, produced, add" }, 400);
}
