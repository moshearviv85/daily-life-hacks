import { isDashboardAuthorized } from "./_dashboard-auth.js";
import { nextQueueSlotFromPending } from "./_pin-schedule.js";
import {
  boardForPin,
  descriptionWithHashtags,
  formatHashtags,
  hashtagsForPin,
} from "./_pin-metadata.js";

const SITE_BASE = "https://www.daily-life-hacks.com";
const STAGING_PIPELINE_BASE = "https://staging.daily-life-hacks.pages.dev";

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

function articleSlugFromLink(link) {
  try {
    return new URL(link).pathname.replace(/^\/+/, "").split("/")[0] || "";
  } catch {
    return "";
  }
}

function interleaveRowsByArticle(rows) {
  const buckets = new Map();
  const bucketOrder = [];

  for (const row of rows) {
    const articleSlug = articleSlugFromLink(row.link) || row.row_id;
    if (!buckets.has(articleSlug)) {
      buckets.set(articleSlug, []);
      bucketOrder.push(articleSlug);
    }
    buckets.get(articleSlug).push(row);
  }

  const ordered = [];
  let lastArticle = "";

  while (buckets.size) {
    const candidates = bucketOrder
      .filter((articleSlug) => buckets.has(articleSlug))
      .map((articleSlug) => ({
        articleSlug,
        next: buckets.get(articleSlug)[0],
      }))
      .sort((a, b) => {
        const sameA = a.articleSlug === lastArticle ? 1 : 0;
        const sameB = b.articleSlug === lastArticle ? 1 : 0;
        if (sameA !== sameB) return sameA - sameB;
        return a.next.__slotIndex - b.next.__slotIndex;
      });

    const chosen = candidates[0];
    const bucket = buckets.get(chosen.articleSlug);
    ordered.push(bucket.shift());
    lastArticle = chosen.articleSlug;
    if (!bucket.length) buckets.delete(chosen.articleSlug);
  }

  return ordered;
}

async function rebalancePendingQueue(db, tableName) {
  const { results } = await db.prepare(`
    SELECT row_id, link, scheduled_date, COALESCE(scheduled_time, '00:00') AS scheduled_time, created_at
      FROM ${tableName}
     WHERE status = 'PENDING'
     ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC, created_at ASC, row_id ASC
  `).all();

  const rows = (results || []).map((row, index) => ({ ...row, __slotIndex: index }));
  if (rows.length < 2) return;

  const slots = rows.map((row) => ({
    scheduled_date: row.scheduled_date,
    scheduled_time: row.scheduled_time,
  }));
  const ordered = interleaveRowsByArticle(rows);

  const updates = ordered
    .map((row, index) => ({ row_id: row.row_id, ...slots[index] }))
    .filter((next) => {
      const current = rows.find((row) => row.row_id === next.row_id);
      return current
        && (current.scheduled_date !== next.scheduled_date || current.scheduled_time !== next.scheduled_time);
    });

  for (const update of updates) {
    await db.prepare(`
      UPDATE ${tableName}
         SET scheduled_date = ?, scheduled_time = ?, updated_at = datetime('now')
       WHERE row_id = ? AND status = 'PENDING'
    `).bind(update.scheduled_date, update.scheduled_time, update.row_id).run();
  }
}

function queueTableName(productionRequest) {
  return productionRequest ? "pins_schedule" : "staging_pins_schedule";
}

function targetSiteBase(request, productionRequest) {
  if (productionRequest) return SITE_BASE;
  return new URL(request.url).origin;
}

function missingPinFields(pin) {
  const missing = [];
  if (!String(pin.title || "").trim()) missing.push("title");
  if (!String(pin.description || "").trim()) missing.push("description");
  if (!String(pin.alt || "").trim()) missing.push("alt");
  if (!String(pin.category || "").trim()) missing.push("category");
  return missing;
}

async function probeUrl(url, expectedType) {
  const checks = [
    { method: "HEAD" },
    { method: "GET" },
  ];

  let last = { ok: false, status: 0, contentType: "" };
  for (const init of checks) {
    const response = await fetch(url, init);
    const contentType = response.headers.get("Content-Type") || "";
    last = { ok: response.ok, status: response.status, contentType };
    if (response.ok) {
      const matchesType = expectedType === "image"
        ? contentType.toLowerCase().startsWith("image/")
        : contentType.toLowerCase().includes("text/html");
      if (matchesType) return { ...last, ok: true };
      if (init.method === "GET") return { ...last, ok: false };
    }
    if (response.status !== 405 && response.status !== 501) break;
  }
  return last;
}

async function validateProductionTarget(link, imageUrl) {
  const [article, image] = await Promise.all([
    probeUrl(link, "html"),
    probeUrl(imageUrl, "image"),
  ]);

  if (article.ok && image.ok) {
    return { ok: true, article, image };
  }

  return {
    ok: false,
    article,
    image,
    error: "Production target is not live. The article page and pin image must both return production 200 before this pin can be queued.",
  };
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

async function findPinInStagingStatus(request, reqKey, pinSlug) {
  const target = new URL("/api/pipeline-status", STAGING_PIPELINE_BASE);
  if (reqKey) target.searchParams.set("key", reqKey);

  const headers = { Accept: "application/json" };
  if (reqKey) headers["x-api-key"] = reqKey;

  const response = await fetch(target.toString(), { headers });
  if (!response.ok) return null;

  let payload;
  try {
    payload = await response.json();
  } catch {
    return null;
  }

  const pinRows = Array.isArray(payload.pin_rows)
    ? payload.pin_rows
    : (Array.isArray(payload.articles)
        ? payload.articles.flatMap((article) => Array.isArray(article.pins) ? article.pins : [])
        : []);

  return pinRows.find((pin) => String(pin.pin_slug || "").trim() === pinSlug) || null;
}

async function nextQueueSlot(db, tableName) {
  const { results } = await db.prepare(`
    SELECT row_id, scheduled_date, COALESCE(scheduled_time, '00:00') AS scheduled_time
      FROM ${tableName}
     WHERE status = 'PENDING'
     ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC, created_at ASC, row_id ASC
  `).all();

  return nextQueueSlotFromPending(results || []);
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

  const productionRequest = isProductionRequest(request, env);
  let pin = await env.DB.prepare(`
    SELECT pp.article_slug, pp.pin_slug, pp.pin_index, pp.title, pp.description,
           pp.alt, pp.image_status, pa.category
      FROM pipeline_pins pp
      JOIN pipeline_articles pa ON pa.slug = pp.article_slug
     WHERE pp.pin_slug = ?
     LIMIT 1
  `).bind(pinSlug).first();

  if (!pin && productionRequest) {
    pin = await findPinInStagingStatus(request, reqKey, pinSlug);
  }

  if (!pin) return json({ error: "Pipeline pin not found" }, 404);
  if (pin.image_status !== "done") return json({ error: "Pin image is not ready" }, 409);
  const missingFields = missingPinFields(pin);
  if (missingFields.length) {
    return json({
      error: `Pin metadata is incomplete: missing ${missingFields.join(", ")}`,
      missing_fields: missingFields,
    }, 409);
  }

  const board = boardForPin(pin, pin.category);
  if (!board?.id) return json({ error: `Unknown article category: ${pin.category}` }, 400);
  const hashtags = hashtagsForPin(pin, pin.category);
  const fullDescription = descriptionWithHashtags(pin.description, hashtags);

  const rowId = pin.pin_slug;
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
      description: fullDescription,
      hashtags: formatHashtags(hashtags),
      image_url: imageUrl,
      link,
      board_id: board.id,
      board_name: board.name,
      scheduled_date: existing.scheduled_date || null,
      scheduled_time: existing.scheduled_time || null,
      pin_id: existing.pin_id || null,
      status: existing.status,
      message: existing.status === "POSTED"
        ? "Pin is already posted."
        : "Pin is already queued for automatic Pinterest posting.",
    });
  }

  if (productionRequest) {
    const liveTarget = await validateProductionTarget(link, imageUrl);
    if (!liveTarget.ok) {
      return json({
        ok: false,
        error: liveTarget.error,
        article_url: link,
        image_url: imageUrl,
        article_status: liveTarget.article.status,
        article_content_type: liveTarget.article.contentType,
        image_status_code: liveTarget.image.status,
        image_content_type: liveTarget.image.contentType,
      }, 409);
    }
  }

  const nextSlot = await nextQueueSlot(env.DB, tableName);
  const scheduledDate = nextSlot.scheduled_date;
  const scheduledTime = nextSlot.scheduled_time;

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
    fullDescription,
    pin.alt || "",
    imageUrl,
    board.id,
    link,
    scheduledDate,
    scheduledTime,
  ).run();

  await rebalancePendingQueue(env.DB, tableName);
  const scheduled = await env.DB.prepare(
    `SELECT scheduled_date, scheduled_time FROM ${tableName} WHERE row_id = ?`,
  ).bind(rowId).first();

  return json({
    ok: true,
    queued: true,
    staging: !productionRequest,
    triggered: false,
    row_id: rowId,
    pin_slug: pin.pin_slug,
    article_slug: pin.article_slug,
    title: pin.title,
    description: fullDescription,
    hashtags: formatHashtags(hashtags),
    image_url: imageUrl,
    link,
    board_id: board.id,
    board_name: board.name,
    scheduled_date: scheduled?.scheduled_date || scheduledDate,
    scheduled_time: scheduled?.scheduled_time || scheduledTime,
    status: "PENDING",
    message: productionRequest
      ? "Queued for automatic Pinterest posting."
      : "Queued in the staging-only queue. No GitHub Actions workflow was dispatched and no Pinterest post will be created.",
  });
}
