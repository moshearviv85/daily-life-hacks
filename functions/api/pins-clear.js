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

  const result = await db.prepare(
    "DELETE FROM pins_schedule WHERE status = 'PENDING'"
  ).run();

  return json({
    ok: true,
    deleted: result.meta?.changes ?? 0,
  });
}
