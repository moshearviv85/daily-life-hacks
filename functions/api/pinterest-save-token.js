/**
 * GET /api/pinterest-save-token?key=DASHBOARD_PASSWORD
 *
 * One-time operation: reads the Pinterest OAuth token from the browser cookie
 * (set via the /api/pinterest-demo OAuth flow) and saves it to D1.
 * After this runs once, the analytics endpoint works from any browser/device.
 */

import { parseCookies, verifySignedCookie } from "./pinterest-demo-lib.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.DASHBOARD_PASSWORD || key !== env.DASHBOARD_PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cookieSecret = env.PINTEREST_DEMO_COOKIE_SECRET;
  if (!cookieSecret) {
    return Response.json({ error: "PINTEREST_DEMO_COOKIE_SECRET not set" }, { status: 500 });
  }

  const cookies     = parseCookies(request.headers.get("Cookie") || "");
  const signedToken = cookies.pinterest_demo_token;

  if (!signedToken) {
    return new Response(`
      <h2>No Pinterest cookie found</h2>
      <p>You need to open this URL from the same browser where you connected Pinterest via
      <a href="/api/pinterest-demo">/api/pinterest-demo</a>.</p>
    `, { status: 400, headers: { "Content-Type": "text/html" } });
  }

  const token = await verifySignedCookie(cookieSecret, signedToken);
  if (!token?.access_token) {
    return Response.json({ error: "Invalid or expired cookie token" }, { status: 400 });
  }

  if (!env.DB) {
    return Response.json({ error: "DB not bound" }, { status: 500 });
  }

  await env.DB.prepare(
    `INSERT INTO pinterest_token (id, access_token, refresh_token, expires_at, scopes, updated_at)
     VALUES (1, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       access_token=excluded.access_token,
       refresh_token=excluded.refresh_token,
       expires_at=excluded.expires_at,
       scopes=excluded.scopes,
       updated_at=excluded.updated_at`
  ).bind(
    token.access_token,
    token.refresh_token || null,
    token.expires_at    || null,
    JSON.stringify(token.scopes || [])
  ).run();

  const expiresStr = token.expires_at
    ? new Date(token.expires_at).toLocaleString()
    : "unknown";

  return new Response(`
    <!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:3rem auto;padding:1rem">
    <h2 style="color:#16a34a">✅ Token saved to D1</h2>
    <p>Pinterest token has been stored in the database. Analytics will now work from any browser or device.</p>
    <p style="color:#666;font-size:.9rem">Expires: ${expiresStr}</p>
    <p><a href="/dashboard">← Back to Dashboard</a></p>
    </body></html>
  `, { headers: { "Content-Type": "text/html" } });
}
