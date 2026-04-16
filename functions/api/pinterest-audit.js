/**
 * GET /api/pinterest-audit?key=ACCESS_KEY
 *
 * Reads Pinterest OAuth token from cookie, fetches ALL published pins,
 * and returns a JSON report of published slugs.
 * Protected by PINTEREST_DEMO_ACCESS_KEY.
 */

import { parseCookies, verifySignedCookie, refreshAccessToken, pinterestScopes } from "./pinterest-demo-lib.js";

async function fetchAllPins(accessToken) {
  const allPins = [];
  let bookmark = null;
  let page = 0;

  while (true) {
    page++;
    const url = new URL("https://api.pinterest.com/v5/pins");
    url.searchParams.set("page_size", "250");
    if (bookmark) url.searchParams.set("bookmark", bookmark);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Pinterest API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const items = data.items || [];
    allPins.push(...items);

    bookmark = data.bookmark;
    if (!bookmark || items.length === 0 || page > 50) break;
  }

  return allPins;
}

function extractSlug(link) {
  if (!link) return null;
  try {
    const url = new URL(link);
    const path = url.pathname.replace(/^\//, "").replace(/\/$/, "");
    return path || null;
  } catch {
    return null;
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  const validKey = env.STATS_KEY || env.PINTEREST_DEMO_ACCESS_KEY;
  if (!validKey || key !== validKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieSecret = env.PINTEREST_DEMO_COOKIE_SECRET;
  if (!cookieSecret) {
    return Response.json({ error: "Missing PINTEREST_DEMO_COOKIE_SECRET" }, { status: 500 });
  }

  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const signedToken = cookies.pinterest_demo_token;

  if (!signedToken) {
    return Response.json({
      error: "No Pinterest token cookie. Go to /api/pinterest-demo first and connect your account.",
      fix: "Open https://www.daily-life-hacks.com/api/pinterest-demo in your browser, connect Pinterest, then revisit this URL in the same browser."
    }, { status: 401 });
  }

  let token = await verifySignedCookie(cookieSecret, signedToken);
  if (!token || !token.access_token) {
    return Response.json({
      error: "Invalid or expired token cookie. Re-authenticate at /api/pinterest-demo."
    }, { status: 401 });
  }

  // Refresh if expired
  if (token.expires_at && Date.now() > token.expires_at) {
    const refreshed = await refreshAccessToken({
      appId: env.PINTEREST_APP_ID,
      appSecret: env.PINTEREST_APP_SECRET,
      token,
      scopes: pinterestScopes(),
    });
    if (refreshed) {
      token = refreshed;
    } else {
      return Response.json({ error: "Token expired and refresh failed. Re-authenticate." }, { status: 401 });
    }
  }

  try {
    const pins = await fetchAllPins(token.access_token);

    const slugMap = {};
    for (const pin of pins) {
      const slug = extractSlug(pin.link);
      const displaySlug = slug || "(no link)";
      if (!slugMap[displaySlug]) {
        slugMap[displaySlug] = { count: 0, pins: [] };
      }
      slugMap[displaySlug].count++;
      slugMap[displaySlug].pins.push({
        pin_id: pin.id,
        title: pin.title || "",
        created_at: pin.created_at || "",
      });
    }

    const slugs = Object.keys(slugMap).sort();

    return Response.json({
      total_pins: pins.length,
      unique_slugs: slugs.length,
      slugs: slugMap,
      slug_list: slugs,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
