import { isDashboardAuthorized } from "./_dashboard-auth.js";

const SITE_BASE = "https://www.daily-life-hacks.com";

const CATEGORY_TO_BOARD_ID = {
  recipes: "1124140825679184032",
  nutrition: "1124140825679184034",
  tips: "1124140825679184034",
};

function isProductionRequest(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  const branch = String(env.CF_PAGES_BRANCH || "").toLowerCase();
  const productionHost = hostname === "www.daily-life-hacks.com" || hostname === "daily-life-hacks.com";
  return productionHost || branch === "main";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatTime(d) {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function queueTableName(productionRequest) {
  return productionRequest ? "pins_schedule" : "staging_pins_schedule";
}

function targetSiteBase(request, productionRequest) {
  if (productionRequest) return SITE_BASE;
  return new URL(request.url).origin;
}

async function ensureStagingQueue(db) {
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

async function nextQueueSlot(db, tableName) {
  const latest = await db.prepare(`
    SELECT scheduled_date, COALESCE(scheduled_time, '00:00') AS scheduled_time
      FROM ${tableName}
     WHERE status = 'PENDING'
     ORDER BY scheduled_date DESC, COALESCE(scheduled_time, '00:00') DESC
     LIMIT 1
  `).first();

  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  if (!latest?.scheduled_date) {
    const first = new Date(today);
    first.setUTCDate(first.getUTCDate() + 1);
    first.setUTCHours(6, 0, 0, 0);
    return { scheduledDate: formatDate(first), scheduledTime: formatTime(first) };
  }

  const [hour, minute] = String(latest.scheduled_time || "00:00").split(":").map((n) => parseInt(n, 10));
  const latestSlot = new Date(`${latest.scheduled_date}T00:00:00Z`);
  latestSlot.setUTCHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);

  if (latestSlot < today) {
    latestSlot.setTime(today.getTime());
    latestSlot.setUTCDate(latestSlot.getUTCDate() + 1);
    latestSlot.setUTCHours(6, 0, 0, 0);
  } else {
    latestSlot.setUTCHours(latestSlot.getUTCHours() + 2);
    if (latestSlot.getUTCHours() > 21) {
      latestSlot.setUTCDate(latestSlot.getUTCDate() + 1);
      latestSlot.setUTCHours(6, 0, 0, 0);
    }
  }

  return { scheduledDate: formatDate(latestSlot), scheduledTime: formatTime(latestSlot) };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";

  const authorized = await isDashboardAuthorized(env, reqKey, request);
  if (!authorized) return json({ error: "Unauthorized" }, 401);
  if (!env.DB) return json({ error: "D1 database not bound" }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const pinSlug = String(body.pin_slug || "").trim();
  if (!pinSlug) return json({ error: "pin_slug is required" }, 400);

  const pin = await env.DB.prepare(`
    SELECT pp.article_slug, pp.pin_slug, pp.pin_index, pp.title, pp.description,
           pp.alt, pp.image_status, pa.category
      FROM pipeline_pins pp
      JOIN pipeline_articles pa ON pa.slug = pp.article_slug
     WHERE pp.pin_slug = ?
     LIMIT 1
  `).bind(pinSlug).first();

  if (!pin) return json({ error: "Pipeline pin not found" }, 404);
  if (pin.image_status !== "done") return json({ error: "Pin image is not ready" }, 409);

  const boardId = CATEGORY_TO_BOARD_ID[pin.category];
  if (!boardId) return json({ error: `Unknown article category: ${pin.category}` }, 400);

  const rowId = pin.pin_slug;
  const productionRequest = isProductionRequest(request, env);
  const siteBase = targetSiteBase(request, productionRequest);
  const imageUrl = `${siteBase}/images/pins/${pin.pin_slug}.jpg`;
  const link = `${siteBase}/${pin.article_slug}/`;
  const tableName = queueTableName(productionRequest);

  if (!productionRequest) {
    await ensureStagingQueue(env.DB);
  }

  const existing = await env.DB.prepare(
    `SELECT status, scheduled_date, scheduled_time, pin_id FROM ${tableName} WHERE row_id = ?`,
  ).bind(rowId).first();

  if (existing?.status === "POSTED" || existing?.status === "PENDING") {
    return json({
      ok: true,
      queued: existing.status === "PENDING",
      already_exists: true,
      staging: !productionRequest,
      triggered: false,
      row_id: rowId,
      pin_slug: pin.pin_slug,
      article_slug: pin.article_slug,
      title: pin.title,
      image_url: imageUrl,
      link,
      board_id: boardId,
      scheduled_date: existing.scheduled_date || null,
      scheduled_time: existing.scheduled_time || null,
      pin_id: existing.pin_id || null,
      status: existing.status,
      message: existing.status === "POSTED"
        ? "Pin is already posted."
        : "Pin is already queued for automatic Pinterest posting.",
    });
  }

  const { scheduledDate, scheduledTime } = await nextQueueSlot(env.DB, tableName);

  await env.DB.prepare(`
    INSERT INTO ${tableName}
      (row_id, pin_title, pin_description, alt_text, image_url, board_id,
       link, scheduled_date, scheduled_time, status, pin_id, published_date,
       pinterest_response, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, NULL, NULL, datetime('now'))
    ON CONFLICT(row_id) DO UPDATE SET
      pin_title = excluded.pin_title,
      pin_description = excluded.pin_description,
      alt_text = excluded.alt_text,
      image_url = excluded.image_url,
      board_id = excluded.board_id,
      link = excluded.link,
      scheduled_date = excluded.scheduled_date,
      scheduled_time = excluded.scheduled_time,
      status = 'PENDING',
      updated_at = datetime('now')
  `).bind(
    rowId,
    pin.title || "",
    pin.description || "",
    pin.alt || "",
    imageUrl,
    boardId,
    link,
    scheduledDate,
    scheduledTime,
  ).run();

  return json({
    ok: true,
    queued: true,
    staging: !productionRequest,
    triggered: false,
    row_id: rowId,
    pin_slug: pin.pin_slug,
    article_slug: pin.article_slug,
    title: pin.title,
    image_url: imageUrl,
    link,
    board_id: boardId,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    status: "PENDING",
    message: productionRequest
      ? "Queued for automatic Pinterest posting."
      : "Queued in the staging-only queue. No GitHub Actions workflow was dispatched and no Pinterest post will be created.",
  });
}
