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

import { refreshAccessToken } from "./pinterest-demo-lib.js";

const CACHE_TTL_HOURS = 6;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function today() {
  return new Date().toISOString().split("T")[0];
}

async function fetchPinAnalytics(accessToken, pinId, startDate, endDate) {
  const url = new URL(`https://api.pinterest.com/v5/pins/${pinId}/analytics`);
  url.searchParams.set("start_date",   startDate);
  url.searchParams.set("end_date",     endDate);
  url.searchParams.set("metric_types", "IMPRESSION,OUTBOUND_CLICK,SAVE,PIN_CLICK");
  url.searchParams.set("app_types",    "ALL");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();

  // Prefer lifetime_metrics; fall back to summing daily_metrics
  const lifetime = data?.all?.lifetime_metrics;
  if (lifetime) {
    return {
      impressions:     lifetime.IMPRESSION       || 0,
      outbound_clicks: lifetime.OUTBOUND_CLICK   || 0,
      pin_clicks:      lifetime.PIN_CLICK        || 0,
      saves:           lifetime.SAVE             || 0,
    };
  }
  return (data?.all?.daily_metrics || []).reduce(
    (acc, d) => {
      if (d.data_status !== "READY") return acc;
      acc.impressions     += d.metric?.IMPRESSION       || 0;
      acc.outbound_clicks += d.metric?.OUTBOUND_CLICK   || 0;
      acc.pin_clicks      += d.metric?.PIN_CLICK        || 0;
      acc.saves           += d.metric?.SAVE             || 0;
      return acc;
    },
    { impressions: 0, outbound_clicks: 0, pin_clicks: 0, saves: 0 }
  );
}

async function pullFromPinterest(accessToken, db) {
  const startDate = daysAgo(89);
  const endDate   = today();

  // ── 1. Load our posted pins from D1 pins_schedule ────────────────────────
  const posted = db
    ? await db.prepare(
        `SELECT row_id, pin_title, pin_id, link, published_date
         FROM pins_schedule WHERE status='POSTED' AND pin_id IS NOT NULL
         ORDER BY published_date DESC`
      ).all().catch(() => null)
    : null;

  const dbPins = posted?.results ?? [];

  // ── 2. Fetch analytics per pin in batches of 5 ───────────────────────────
  const pins = [];
  const BATCH = 5;
  for (let i = 0; i < dbPins.length; i += BATCH) {
    const batch = dbPins.slice(i, i + BATCH);
    const stats = await Promise.all(
      batch.map(p => fetchPinAnalytics(accessToken, p.pin_id, startDate, endDate).catch(() => null))
    );
    for (let j = 0; j < batch.length; j++) {
      const p = batch[j];
      const s = stats[j] || { impressions: 0, outbound_clicks: 0, pin_clicks: 0, saves: 0 };
      pins.push({
        pin_id:          p.pin_id,
        pin_title:       p.pin_title || p.row_id,
        pin_url:         `https://www.pinterest.com/pin/${p.pin_id}/`,
        pin_link:        p.link || "",
        created_at:      p.published_date || "",
        impressions:     s.impressions,
        outbound_clicks: s.outbound_clicks,
        pin_clicks:      s.pin_clicks,
        saves:           s.saves,
      });
    }
    if (i + BATCH < dbPins.length) await new Promise(r => setTimeout(r, 200));
  }

  pins.sort((a, b) => b.impressions - a.impressions);

  const totals = pins.reduce(
    (acc, p) => {
      acc.impressions     += p.impressions;
      acc.outbound_clicks += p.outbound_clicks;
      acc.saves           += p.saves;
      return acc;
    },
    { impressions: 0, outbound_clicks: 0, saves: 0 }
  );

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

  // ── Load token: D1 first, fallback to env var ────────────────────────────
  const storedToken = env.DB
    ? await env.DB.prepare(
        "SELECT access_token, refresh_token, expires_at FROM pinterest_token WHERE id = 1"
      ).first().catch(() => null)
    : null;

  // Build token object — prefer D1, fall back to env.PINTEREST_REFRESH_TOKEN
  let token = storedToken?.access_token
    ? { access_token: storedToken.access_token, refresh_token: storedToken.refresh_token, expires_at: storedToken.expires_at }
    : storedToken?.refresh_token || env.PINTEREST_REFRESH_TOKEN
      ? { access_token: null, refresh_token: storedToken?.refresh_token || env.PINTEREST_REFRESH_TOKEN, expires_at: 0 }
      : null;

  if (!token) {
    return Response.json({
      error: "no_token",
      message: "No Pinterest token found. Either add PINTEREST_REFRESH_TOKEN to Cloudflare env vars, or open /api/pinterest-save-token?key=PASSWORD from the OAuth browser.",
    }, { status: 401 });
  }

  // Get a fresh access_token if missing or expiring soon
  if (!token.access_token || (token.expires_at && Date.now() > token.expires_at - 60_000)) {
    try {
      token = await refreshAccessToken({
        appId: env.PINTEREST_APP_ID, appSecret: env.PINTEREST_APP_SECRET, token, scopes: [],
      });
      // Persist refreshed token to D1
      if (env.DB) {
        await env.DB.prepare(
          `INSERT INTO pinterest_token (id, access_token, refresh_token, expires_at, updated_at)
           VALUES (1,?,?,?,datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             access_token=excluded.access_token, refresh_token=excluded.refresh_token,
             expires_at=excluded.expires_at, updated_at=excluded.updated_at`
        ).bind(token.access_token, token.refresh_token || null, token.expires_at || null).run().catch(() => null);
      }
    } catch (e) {
      return Response.json({ error: "Token refresh failed: " + e.message }, { status: 401 });
    }
  }

  try {
    const { pins, totals, startDate, endDate } = await pullFromPinterest(token.access_token, env.DB);

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
