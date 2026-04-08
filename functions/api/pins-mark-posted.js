/**
 * POST /api/pins-mark-posted?key=SECRET
 * Body: { row_id, pin_id, published_date, pinterest_response }
 * Marks a pin as POSTED in D1.
 *
 * Response 200: { ok: true }
 * Response 404: row_id not found
 * Response 401: bad key
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.STATS_KEY;

  const url = new URL(request.url);
  const reqKey = url.searchParams.get("key") || request.headers.get("x-api-key") || "";
  if (key && reqKey !== key) {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { row_id, pin_id, published_date, pinterest_response } = body;
  if (!row_id) {
    return new Response(JSON.stringify({ error: "row_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const existing = await db.prepare(
    "SELECT row_id FROM pins_schedule WHERE row_id = ?"
  ).bind(row_id).first();

  if (!existing) {
    return new Response(JSON.stringify({ error: `row_id '${row_id}' not found` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await db.prepare(`
    UPDATE pins_schedule SET
      status = 'POSTED',
      pin_id = ?,
      published_date = ?,
      pinterest_response = ?,
      updated_at = datetime('now')
    WHERE row_id = ?
  `).bind(
    pin_id || null,
    published_date || new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
    pinterest_response ? JSON.stringify(pinterest_response) : null,
    row_id
  ).run();

  return new Response(JSON.stringify({ ok: true, row_id, pin_id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
