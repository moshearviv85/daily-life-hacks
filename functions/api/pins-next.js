/**
 * GET /api/pins-next?key=SECRET[&immediate=1]
 * Returns the next PENDING pin due now (UTC): scheduled_date < today,
 * OR scheduled_date = today AND scheduled_time <= current UTC time.
 *
 * With ?immediate=1: skips the schedule filter and returns the first
 * PENDING pin regardless of date/time. Used by "publish now" button.
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

  try {
    return await getNextPin(db, immediate);
  } catch (err) {
    return Response.json(
      { error: "pins-next crashed", message: err.message, stack: err.stack },
      { status: 500 },
    );
  }
}

async function getNextPin(db, immediate = false) {
  let duePins;

  if (immediate) {
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

  for (const row of duePins) {
    let slug = null;
    try {
      slug = new URL(row.link).pathname.replace(/^\/+/, '').split('/')[0];
    } catch {}

    if (slug) {
      const article = await db.prepare(
        `SELECT status FROM articles_schedule WHERE slug = ?`
      ).bind(slug).first();

      if (article && !LIVE_STATUSES.has(article.status)) {
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
      skipped.push({
        row_id: row.row_id,
        reason: liveCheck.reason,
        url: liveCheck.url,
        status: liveCheck.status,
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
