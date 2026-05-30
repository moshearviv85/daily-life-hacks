/**
 * GET /api/pins-next?key=SECRET[&immediate=1]
 * Returns the next PENDING pin due now (UTC): scheduled_date < today,
 * OR scheduled_date = today AND scheduled_time <= current UTC time.
 *
 * With ?immediate=1: skips the schedule filter, but still honors the
 * minimum posting interval safety guard.
 *
 * Response 200: { row_id, pin_title, ... }
 * Response 204: no pins due (diagnostic headers only, no body)
 * Response 401: bad key
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const key = env.STATS_KEY;

  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";
  if (!key || reqKey !== key) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = env.DB;
  if (!db) {
    return Response.json({ error: "D1 not bound" }, { status: 500 });
  }

  const immediate = url.searchParams.get("immediate") === "1";
  const rowId = url.searchParams.get("row_id") || "";

  try {
    const cooldown = await enforcePostCooldown(db, env);
    if (cooldown) return cooldown;

    return await getNextPin(db, immediate, rowId);
  } catch (err) {
    return Response.json(
      { error: "pins-next crashed", message: err.message, stack: err.stack },
      { status: 500 },
    );
  }
}

function getMinPostIntervalMinutes(env) {
  const raw = String(env.PINS_MIN_POST_INTERVAL_MINUTES || "").trim();
  if (!raw) return 110;

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return 110;
  return Math.max(0, value);
}

function parsePublishedDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const normalized = raw.endsWith(" UTC")
    ? raw.replace(" UTC", "Z").replace(" ", "T")
    : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function enforcePostCooldown(db, env) {
  const intervalMinutes = getMinPostIntervalMinutes(env);
  if (intervalMinutes <= 0) return null;

  const latest = await db.prepare(`
    SELECT row_id, published_date
    FROM pins_schedule
    WHERE status = 'POSTED'
      AND published_date IS NOT NULL
      AND published_date != ''
    ORDER BY published_date DESC
    LIMIT 1
  `).first();

  const publishedAt = parsePublishedDate(latest?.published_date);
  if (!publishedAt) return null;

  const elapsedMinutes = (Date.now() - publishedAt.getTime()) / 60000;
  if (elapsedMinutes >= intervalMinutes) return null;

  return new Response(null, {
    status: 204,
    headers: {
      "X-Pins-Reason": "min_post_interval_not_elapsed",
      "X-Pins-Due": "0",
      "X-Pins-Last-Posted-Row": latest.row_id || "",
      "X-Pins-Last-Posted": latest.published_date || "",
      "X-Pins-Min-Interval-Minutes": String(intervalMinutes),
      "X-Pins-Minutes-Remaining": String(Math.ceil(intervalMinutes - elapsedMinutes)),
    },
  });
}

function slugFromLink(link) {
  try {
    return new URL(link).pathname.replace(/^\/+/, "").split("/")[0] || null;
  } catch {
    return null;
  }
}

async function getLatestPostedSlug(db) {
  const latest = await db.prepare(`
    SELECT row_id, link, published_date
    FROM pins_schedule
    WHERE status = 'POSTED'
      AND published_date IS NOT NULL
      AND published_date != ''
      AND link IS NOT NULL
      AND link != ''
    ORDER BY published_date DESC
    LIMIT 1
  `).first();

  return slugFromLink(latest?.link);
}

async function getNextPin(db, immediate = false, rowId = "") {
  let duePins;

  if (immediate && rowId) {
    ({ results: duePins } = await db.prepare(`
      SELECT row_id, pin_title, pin_description, alt_text,
             image_url, board_id, link, scheduled_date, scheduled_time
      FROM pins_schedule
      WHERE status = 'PENDING'
        AND row_id = ?
      LIMIT 1
    `).bind(rowId).all());
  } else if (immediate) {
    ({ results: duePins } = await db.prepare(`
      SELECT row_id, pin_title, pin_description, alt_text,
             image_url, board_id, link, scheduled_date, scheduled_time
      FROM pins_schedule
      WHERE status = 'PENDING'
      ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC
      LIMIT 50
    `).all());
  } else {
    const now     = new Date();
    const today   = now.toISOString().split("T")[0];
    const nowTime = now.toISOString().split("T")[1].slice(0, 5);

    ({ results: duePins } = await db.prepare(`
      SELECT row_id, pin_title, pin_description, alt_text,
             image_url, board_id, link, scheduled_date, scheduled_time
      FROM pins_schedule
      WHERE status = 'PENDING'
        AND (
          scheduled_date < ?
          OR (scheduled_date = ? AND COALESCE(scheduled_time, '00:00') <= ?)
        )
      ORDER BY scheduled_date ASC, COALESCE(scheduled_time, '00:00') ASC
      LIMIT 50
    `).bind(today, today, nowTime).all());
  }

  if (!duePins || duePins.length === 0) {
    return new Response(null, {
      status: 204,
      headers: { "X-Pins-Reason": "no_due_pins", "X-Pins-Due": "0" },
    });
  }

  const LIVE_STATUSES = new Set(['PUBLISHED', 'DUPLICATE']);
  const skipped = [];
  const latestPostedSlug = rowId ? null : await getLatestPostedSlug(db);

  for (const row of duePins) {
    const slug = slugFromLink(row.link);

    if (slug) {
      const article = await db.prepare(
        `SELECT status FROM articles_schedule WHERE slug = ?`
      ).bind(slug).first();

      if (article && !LIVE_STATUSES.has(article.status)) {
        await movePinToEnd(db, row, "article_not_live");
        skipped.push({
          row_id: row.row_id,
          slug,
          article_status: article.status,
          scheduled_date: row.scheduled_date,
        });
        continue;
      }
    }

    const duplicate = await findPostedDuplicate(db, row);
    if (duplicate) {
      skipped.push({
        row_id: row.row_id,
        reason: "duplicate_posted_copy",
        duplicate_row_id: duplicate.row_id,
        scheduled_date: row.scheduled_date,
      });
      continue;
    }

    const liveCheck = await checkPinTargets(row);
    if (!liveCheck.ok) {
      await movePinToEnd(db, row, liveCheck.reason);
      skipped.push({
        row_id: row.row_id,
        reason: liveCheck.reason,
        url: liveCheck.url,
        status: liveCheck.status,
        scheduled_date: row.scheduled_date,
      });
      continue;
    }

    if (latestPostedSlug && slug === latestPostedSlug) {
      await movePinToEnd(db, row, "same_article_as_latest_posted");
      skipped.push({
        row_id: row.row_id,
        reason: "same_article_as_latest_posted",
        slug,
        scheduled_date: row.scheduled_date,
      });
      continue;
    }

    return Response.json(row);
  }

  return new Response(null, {
    status: 204,
    headers: {
      "X-Pins-Reason": "all_due_pins_blocked_by_safety_checks",
      "X-Pins-Due": String(duePins.length),
      "X-Pins-Skipped": String(skipped.length),
      "X-Pins-Skip-Reasons": summarizeSkipReasons(skipped),
    },
  });
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatTime(d) {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

async function nextPendingSlot(db) {
  const latest = await db.prepare(`
    SELECT scheduled_date, COALESCE(scheduled_time, '00:00') AS scheduled_time
    FROM pins_schedule
    WHERE status = 'PENDING'
    ORDER BY scheduled_date DESC, COALESCE(scheduled_time, '00:00') DESC
    LIMIT 1
  `).first();

  const slot = latest?.scheduled_date
    ? new Date(`${latest.scheduled_date}T00:00:00Z`)
    : new Date();
  if (latest?.scheduled_time) {
    const [hour, minute] = String(latest.scheduled_time).split(":").map((n) => Number.parseInt(n, 10));
    slot.setUTCHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);
  }
  slot.setUTCHours(slot.getUTCHours() + 2);
  if (slot.getUTCHours() > 21) {
    slot.setUTCDate(slot.getUTCDate() + 1);
    slot.setUTCHours(6, 0, 0, 0);
  }
  return { scheduled_date: formatDate(slot), scheduled_time: formatTime(slot) };
}

async function movePinToEnd(db, row, reason) {
  const next = await nextPendingSlot(db);
  await db.prepare(`
    UPDATE pins_schedule
    SET scheduled_date = ?, scheduled_time = ?, pinterest_response = ?, updated_at = datetime('now')
    WHERE row_id = ? AND status = 'PENDING'
  `).bind(
    next.scheduled_date,
    next.scheduled_time,
    JSON.stringify({ moved_to_end_reason: reason, moved_at: new Date().toISOString() }),
    row.row_id,
  ).run();
}

function normalizeCopy(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function findPostedDuplicate(db, row) {
  const link = String(row.link || "").trim();
  const title = normalizeCopy(row.pin_title);
  const description = normalizeCopy(row.pin_description);

  if (!link || !title || !description) return null;

  return db.prepare(`
    SELECT row_id
    FROM pins_schedule
    WHERE status = 'POSTED'
      AND link = ?
      AND lower(trim(pin_title)) = ?
      AND lower(trim(pin_description)) = ?
    LIMIT 1
  `).bind(link, title, description).first();
}

async function checkUrlOk(url, reason) {
  if (!url) return { ok: false, reason, url, status: "missing" };

  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) return { ok: true };
    return { ok: false, reason, url, status: response.status };
  } catch (err) {
    return { ok: false, reason, url, status: err?.message || "fetch_failed" };
  }
}

async function checkPinTargets(row) {
  const linkCheck = await checkUrlOk(row.link, "pin_link_not_live");
  if (!linkCheck.ok) return linkCheck;

  const imageCheck = await checkUrlOk(row.image_url, "pin_image_not_live");
  if (!imageCheck.ok) return imageCheck;

  return { ok: true };
}

function summarizeSkipReasons(skipped) {
  const counts = new Map();
  for (const item of skipped) {
    counts.set(item.reason, (counts.get(item.reason) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([reason, count]) => `${reason}:${count}`)
    .join(",");
}
