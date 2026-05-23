import { isDashboardAuthorized } from "./_dashboard-auth.js";

const SITE_BASE = "https://www.daily-life-hacks.com";

const CATEGORY_TO_BOARD_ID = {
  recipes: "1124140825679184032",
  nutrition: "1124140825679184034",
  tips: "1124140825679184034",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function tomorrowUtcDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function dispatchPostPin(env, rowId) {
  if (!env.GH_PAT) {
    return { triggered: false, error: "GH_PAT not configured" };
  }

  const ghRes = await fetch(
    "https://api.github.com/repos/moshearviv85/daily-life-hacks/actions/workflows/post-pins.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GH_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "daily-life-hacks-cloudflare",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { immediate: "true", row_id: rowId },
      }),
    },
  );

  if (ghRes.ok) return { triggered: true };
  return { triggered: false, error: await ghRes.text(), gh_status: ghRes.status };
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
  const publishNow = body.publish_now === true;
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
  const imageUrl = `${SITE_BASE}/images/pins/${pin.pin_slug}.jpg`;
  const link = `${SITE_BASE}/${pin.article_slug}/`;
  const scheduledDate = tomorrowUtcDate();

  const existing = await env.DB.prepare(
    "SELECT status FROM pins_schedule WHERE row_id = ?",
  ).bind(rowId).first();

  if (existing?.status === "POSTED") {
    return json({ error: "Pin is already posted", row_id: rowId }, 409);
  }

  await env.DB.prepare(`
    INSERT INTO pins_schedule
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
    "23:59",
  ).run();

  let dispatch = { triggered: false };
  if (publishNow) {
    dispatch = await dispatchPostPin(env, rowId);
  }

  return json({
    ok: true,
    row_id: rowId,
    pin_slug: pin.pin_slug,
    article_slug: pin.article_slug,
    title: pin.title,
    image_url: imageUrl,
    link,
    board_id: boardId,
    scheduled_date: scheduledDate,
    status: "PENDING",
    ...dispatch,
  });
}
