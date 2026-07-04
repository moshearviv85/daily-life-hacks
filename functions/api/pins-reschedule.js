import { isDashboardAuthorized } from "./_dashboard-auth.js";
import { formatDate, scheduleRowsByRandomDayCount } from "./_pin-schedule.js";

/**
 * POST /api/pins-reschedule?key=SECRET
 * Rebuilds the PENDING pin queue with 1-2 pins per UTC day and non-round times.
 *
 * Response: { ok, queue, rescheduled, schedule, start_date }
 */

function isProductionRequest(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const branch = String(env.CF_PAGES_BRANCH || "").toLowerCase();
  const productionHost = hostname === "www.daily-life-hacks.com" || hostname === "daily-life-hacks.com";
  return productionHost || branch === "main";
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

  const tableName = queueTableName(request, env);
  await ensureStagingQueue(db, tableName);

  const { results } = await db.prepare(`
    SELECT row_id, scheduled_date, COALESCE(scheduled_time, '00:00') AS scheduled_time
    FROM ${tableName}
    WHERE status = 'PENDING'
    ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC, row_id ASC
  `).all();

  if (!results.length) {
    return new Response(JSON.stringify({ ok: true, rescheduled: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const firstDate = results[0]?.scheduled_date
    ? new Date(`${results[0].scheduled_date}T00:00:00Z`)
    : today;
  const startDate = firstDate >= today ? firstDate : today;
  const toUpdate = scheduleRowsByRandomDayCount(results, { startDate });

  for (const row of toUpdate) {
    await db.prepare(`
      UPDATE ${tableName}
      SET scheduled_date = ?, scheduled_time = ?, updated_at = datetime('now')
      WHERE row_id = ?
    `).bind(row.scheduled_date, row.scheduled_time, row.row_id).run();
  }

  return new Response(JSON.stringify({
    ok: true,
    queue: tableName === "pins_schedule" ? "production" : "staging",
    rescheduled: toUpdate.length,
    schedule: "1-2 pins/day",
    start_date: formatDate(startDate),
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
