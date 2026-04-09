/**
 * GET /api/pinterest-analytics?key=DASHBOARD_PASSWORD[&refresh=1]
 *
 * Returns Pinterest top-pin analytics (impressions, outbound clicks, saves)
 * for the last 90 days, sorted by impressions descending.
 *
 * Uses D1 cache (6h TTL). Pass &refresh=1 to force a fresh pull from Pinterest.
 * Requires the pinterest_demo_token cookie (set via /api/pinterest-demo OAuth flow).
 *
 * Strategy: uses GET /user_account/analytics/top_pins (single API call, top 50 pins)
 * + GET /user_account/analytics (account-level totals).
 */

import { parseCookies, verifySignedCookie, refreshAccessToken } from "./pinterest-demo-lib.js";

const CACHE_TTL_HOURS = 6;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function today() {
  return new Date().toISOString().split("T")[0];
}

async function pullFromPinterest(accessToken) {
  const startDate = daysAgo(89); // Pinterest max = 90 days
  const endDate   = today();

  // ── 1. Top 50 pins by impression ─────────────────────────────────────────
  const topPinsUrl = new URL("https://api.pinterest.com/v5/user_account/analytics/top_pins");
  topPinsUrl.searchParams.set("start_date",    startDate);
  topPinsUrl.searchParams.set("end_date",      endDate);
  topPinsUrl.searchParams.set("sort_by",       "IMPRESSION");
  topPinsUrl.searchParams.set("metric_types",  "IMPRESSION,OUTBOUND_CLICK,SAVE,PIN_CLICK");
  topPinsUrl.searchParams.set("num_of_pins",   "50");

  const topPinsRes = await fetch(topPinsUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!topPinsRes.ok) {
    const errText = await topPinsRes.text().catch(() => "");
    throw new Error(`Pinterest top_pins API ${topPinsRes.status}: ${errText.slice(0, 200)}`);
  }

  const topPinsData = await topPinsRes.json();

  // ── 2. Account-level totals ───────────────────────────────────────────────
  const acctUrl = new URL("https://api.pinterest.com/v5/user_account/analytics");
  acctUrl.searchParams.set("start_date",   startDate);
  acctUrl.searchParams.set("end_date",     endDate);
  acctUrl.searchParams.set("metric_types", "IMPRESSION,OUTBOUND_CLICK,SAVE,PIN_CLICK");

  const acctRes = await fetch(acctUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const acctData = acctRes.ok ? await acctRes.json().catch(() => null) : null;

  // ── 3. Parse top pins ─────────────────────────────────────────────────────
  // Response shape: { pins_total_aggregate_counts: {...}, top_pins_results: [ {pin: {...}, metrics: {...}} ] }
  const pinsResults = topPinsData?.top_pins_results ?? topPinsData?.items ?? [];

  const pins = pinsResults.map((item) => {
    const pin     = item.pin     ?? item;
    const metrics = item.metrics ?? {};
    return {
      pin_id:         pin.id ?? "",
      pin_title:      pin.title || pin.description?.slice(0, 80) || pin.id || "—",
      pin_url:        `https://www.pinterest.com/pin/${pin.id}/`,
      pin_link:       pin.link || "",
      created_at:     pin.created_at || "",
      impressions:    metrics.IMPRESSION       ?? 0,
      outbound_clicks:metrics.OUTBOUND_CLICK   ?? 0,
      pin_clicks:     metrics.PIN_CLICK        ?? 0,
      saves:          metrics.SAVE             ?? 0,
    };
  }).sort((a, b) => b.impressions - a.impressions);

  // ── 4. Account totals (sum over date range) ───────────────────────────────
  let totals = { impressions: 0, outbound_clicks: 0, pin_clicks: 0, saves: 0 };
  if (acctData?.all?.daily_metrics) {
    for (const day of acctData.all.daily_metrics) {
      totals.impressions     += day.data_status === "READY" ? (day.metric?.IMPRESSION       ?? 0) : 0;
      totals.outbound_clicks += day.data_status === "READY" ? (day.metric?.OUTBOUND_CLICK   ?? 0) : 0;
      totals.pin_clicks      += day.data_status === "READY" ? (day.metric?.PIN_CLICK        ?? 0) : 0;
      totals.saves           += day.data_status === "READY" ? (day.metric?.SAVE             ?? 0) : 0;
    }
  } else if (Array.isArray(acctData)) {
    // Some responses are an array of daily records
    for (const day of acctData) {
      totals.impressions     += day.IMPRESSION       ?? 0;
      totals.outbound_clicks += day.OUTBOUND_CLICK   ?? 0;
      totals.pin_clicks      += day.PIN_CLICK        ?? 0;
      totals.saves           += day.SAVE             ?? 0;
    }
  }

  return { pins, totals, startDate, endDate };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url          = new URL(request.url);
  const key          = url.searchParams.get("key");
  const forceRefresh = url.searchParams.get("refresh") === "1";

  if (!env.DASHBOARD_PASSWORD || key !== env.DASHBOARD_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Serve from D1 cache if fresh ──────────────────────────────────────────
  if (!forceRefresh && env.DB) {
    const cached = await env.DB.prepare(
      `SELECT pin_id, pin_title, pin_url, pin_link, created_at,
              impressions, outbound_clicks, saves, cached_at
       FROM pinterest_analytics_cache
       WHERE cached_at >= datetime('now', '-${CACHE_TTL_HOURS} hours')
       ORDER BY impressions DESC`
    ).all().catch(() => null);

    if (cached?.results?.length > 0) {
      return Response.json({
        pins:      cached.results,
        total:     cached.results.length,
        fromCache: true,
        cachedAt:  cached.results[0]?.cached_at,
      });
    }
  }

  // ── Need live data — verify Pinterest cookie token ────────────────────────
  const cookieSecret = env.PINTEREST_DEMO_COOKIE_SECRET;
  if (!cookieSecret) {
    return Response.json({ error: "PINTEREST_DEMO_COOKIE_SECRET not set" }, { status: 500 });
  }

  const cookies     = parseCookies(request.headers.get("Cookie") || "");
  const signedToken = cookies.pinterest_demo_token;
  if (!signedToken) {
    return Response.json({
      error:   "no_token",
      message: "Pinterest not connected. Open /api/pinterest-demo to connect.",
    }, { status: 401 });
  }

  let token = await verifySignedCookie(cookieSecret, signedToken);
  if (!token?.access_token) {
    return Response.json({ error: "no_token", message: "Invalid Pinterest token." }, { status: 401 });
  }

  // Refresh if expiring soon
  if (token.expires_at && Date.now() > token.expires_at - 60_000) {
    token = await refreshAccessToken({
      appId: env.PINTEREST_APP_ID, appSecret: env.PINTEREST_APP_SECRET, token, scopes: [],
    }).catch(() => token);
  }

  try {
    const { pins, totals, startDate, endDate } = await pullFromPinterest(token.access_token);

    // Upsert into D1 cache
    if (env.DB && pins.length > 0) {
      const now = new Date().toISOString();
      for (const p of pins) {
        await env.DB.prepare(
          `INSERT INTO pinterest_analytics_cache
             (pin_id, pin_title, pin_url, pin_link, created_at, impressions, outbound_clicks, saves, cached_at)
           VALUES (?,?,?,?,?,?,?,?,?)
           ON CONFLICT(pin_id) DO UPDATE SET
             pin_title=excluded.pin_title, impressions=excluded.impressions,
             outbound_clicks=excluded.outbound_clicks, saves=excluded.saves, cached_at=excluded.cached_at`
        ).bind(p.pin_id, p.pin_title, p.pin_url, p.pin_link, p.created_at,
               p.impressions, p.outbound_clicks, p.saves, now).run().catch(() => null);
      }
    }

    return Response.json({ pins, totals, total: pins.length, fromCache: false,
      cachedAt: new Date().toISOString(), startDate, endDate });

  } catch (e) {
    // Try stale cache on error
    if (env.DB) {
      const stale = await env.DB.prepare(
        `SELECT pin_id, pin_title, pin_url, pin_link, created_at,
                impressions, outbound_clicks, saves, cached_at
         FROM pinterest_analytics_cache ORDER BY impressions DESC`
      ).all().catch(() => null);

      if (stale?.results?.length > 0) {
        return Response.json({
          pins: stale.results, total: stale.results.length,
          fromCache: true, stale: true,
          cachedAt: stale.results[0]?.cached_at, error: e.message,
        });
      }
    }
    return Response.json({ error: e.message }, { status: 500 });
  }
}
