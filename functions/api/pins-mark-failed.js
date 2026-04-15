/**
 * POST /api/pins-mark-failed?key=SECRET
 * Called by post-pins.py when Pinterest rejects a pin.
 * Increments fail_count. After 3 failures → status = 'FAILED'.
 *
 * Body: { row_id, error_message }
 * Response: { row_id, fail_count, status }
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

  const { row_id, error_message } = await request.json();
  if (!row_id) {
    return new Response(JSON.stringify({ error: "row_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Increment fail_count and store last error
  await db.prepare(`
    UPDATE pins_schedule
    SET fail_count = COALESCE(fail_count, 0) + 1,
        pinterest_response = ?,
        updated_at = datetime('now')
    WHERE row_id = ?
  `).bind(
    JSON.stringify({ error: error_message, failed_at: new Date().toUTCString() }),
    row_id
  ).run();

  const row = await db.prepare(
    "SELECT fail_count, status FROM pins_schedule WHERE row_id = ?"
  ).bind(row_id).first();

  const failCount = row?.fail_count ?? 1;

  if (failCount >= 3) {
    await db.prepare(`
      UPDATE pins_schedule
      SET status = 'FAILED', updated_at = datetime('now')
      WHERE row_id = ?
    `).bind(row_id).run();

    return new Response(JSON.stringify({ row_id, fail_count: failCount, status: "FAILED" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ row_id, fail_count: failCount, status: "PENDING" }), {
    headers: { "Content-Type": "application/json" },
  });
}
