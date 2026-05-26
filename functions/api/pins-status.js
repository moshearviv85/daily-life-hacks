/**
 * GET /api/pins-status?key=SECRET
 * Returns schedule stats + upcoming pins list for the dashboard.
 */

import { isDashboardAuthorized } from "./_dashboard-auth.js";

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

export async function onRequestGet(context) {
  const { request, env } = context;

  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";
  const authorized = await isDashboardAuthorized(env, reqKey, request);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: "D1 not bound" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().split("T")[0];
  const tableName = queueTableName(request, env);
  await ensureStagingQueue(db, tableName);

  const [counts, upcoming, recent, failed] = await Promise.all([
    // Status counts
    db.prepare(`
      SELECT status, COUNT(*) as count FROM ${tableName} GROUP BY status
    `).all(),

    // Next 10 pending
    db.prepare(`
      SELECT row_id, pin_title, scheduled_date, scheduled_time, board_id, image_url, link
      FROM ${tableName}
      WHERE status = 'PENDING'
      ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC
      LIMIT 10
    `).all(),

    // Last 5 posted
    db.prepare(`
      SELECT row_id, pin_title, pin_id, published_date, link
      FROM ${tableName}
      WHERE status = 'POSTED'
      ORDER BY published_date DESC
      LIMIT 5
    `).all(),

    // Failed pins (permanent failures after 3 attempts)
    db.prepare(`
      SELECT row_id, pin_title, fail_count, pinterest_response, image_url
      FROM ${tableName}
      WHERE status = 'FAILED'
      ORDER BY updated_at DESC
      LIMIT 10
    `).all(),
  ]);

  const statusMap = {};
  for (const row of counts.results) statusMap[row.status] = row.count;

  return new Response(JSON.stringify({
    today,
    queue: tableName === "pins_schedule" ? "production" : "staging",
    total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    posted: statusMap.POSTED || 0,
    pending: statusMap.PENDING || 0,
    failed: statusMap.FAILED || 0,
    upcoming: upcoming.results,
    recent_posted: recent.results,
    failed_pins: failed.results,
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
