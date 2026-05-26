/**
 * POST /api/pins-clear
 * Deletes all PENDING pins from D1 (does NOT touch POSTED pins).
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

function queueTableName(request, env) {
  return isProductionRequest(request, env) ? "pins_schedule" : "staging_pins_schedule";
}

async function ensureStagingQueue(db, tableName) {
  if (tableName !== "staging_pins_schedule") return;
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS staging_pins_schedule (
      row_id TEXT PRIMARY KEY,
      pin_title TEXT NOT NULL,
      pin_description TEXT,
      alt_text TEXT,
      image_url TEXT,
      board_id TEXT,
      link TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      status TEXT DEFAULT 'PENDING',
      pin_id TEXT,
      published_date TEXT,
      pinterest_response TEXT,
      fail_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
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

  const db = env.DB;
  if (!db) return json({ error: "D1 database not bound" }, 500);
  const tableName = queueTableName(request, env);
  await ensureStagingQueue(db, tableName);

  const result = await db.prepare(
    `DELETE FROM ${tableName} WHERE status = 'PENDING'`
  ).run();

  return json({
    ok: true,
    queue: tableName === "pins_schedule" ? "production" : "staging",
    deleted: result.meta?.changes ?? 0,
  });
}
