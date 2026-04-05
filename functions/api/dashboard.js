/**
 * Dashboard API – returns all live data for the /dashboard page.
 * Auth: ?key=DASHBOARD_PASSWORD (env var set in Cloudflare Pages → Variables and Secrets)
 * Query params: days=7|30 (default 30)
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10), 1), 90);

  // Auth
  if (!env.DASHBOARD_PASSWORD || key !== env.DASHBOARD_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = { days };

  // ── 1. Newsletter subscriptions ──────────────────────────────────────────
  if (env.DB) {
    try {
      const [total, period, today, bySource, byDay, allSubscribers] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) as count FROM subscriptions").first(),
        env.DB.prepare(
          `SELECT COUNT(*) as count FROM subscriptions WHERE created_at >= datetime('now', '-${days} days')`
        ).first(),
        env.DB.prepare(
          "SELECT COUNT(*) as count FROM subscriptions WHERE date(created_at) = date('now')"
        ).first(),
        env.DB.prepare(
          "SELECT source, COUNT(*) as count FROM subscriptions GROUP BY source ORDER BY count DESC"
        ).all(),
        env.DB.prepare(
          `SELECT date(created_at) as day, COUNT(*) as count FROM subscriptions
           WHERE created_at >= datetime('now', '-${days} days')
           GROUP BY date(created_at) ORDER BY day ASC`
        ).all(),
        env.DB.prepare(
          "SELECT email, source, page, status, created_at FROM subscriptions ORDER BY created_at DESC LIMIT 500"
        ).all(),
      ]);

      result.subscriptions = {
        total: total?.count ?? 0,
        period: period?.count ?? 0,
        today: today?.count ?? 0,
        bySource: bySource?.results ?? [],
        byDay: byDay?.results ?? [],
        list: allSubscribers?.results ?? [],
      };
    } catch (e) {
      result.subscriptions = { error: e.message, total: 0, period: 0, today: 0, bySource: [], byDay: [] };
    }
  } else {
    result.subscriptions = { error: "DB not bound", total: 0, period: 0, today: 0, bySource: [], byDay: [] };
  }

  // ── 2. Funnel events / page views ────────────────────────────────────────
  if (env.DB) {
    try {
      const [totalEvents, byDay, topPages] = await Promise.all([
        env.DB.prepare(
          `SELECT COUNT(*) as count FROM funnel_events WHERE created_at >= datetime('now', '-${days} days')`
        ).first(),
        env.DB.prepare(
          `SELECT date(created_at) as day, COUNT(*) as count FROM funnel_events
           WHERE created_at >= datetime('now', '-${days} days')
           GROUP BY date(created_at) ORDER BY day ASC`
        ).all(),
        env.DB.prepare(
          `SELECT page, COUNT(*) as count FROM funnel_events
           WHERE page IS NOT NULL AND page != '' AND created_at >= datetime('now', '-${days} days')
           GROUP BY page ORDER BY count DESC LIMIT 10`
        ).all(),
      ]);

      result.funnelEvents = {
        total: totalEvents?.count ?? 0,
        byDay: byDay?.results ?? [],
        topPages: topPages?.results ?? [],
      };
    } catch (e) {
      result.funnelEvents = { error: e.message, total: 0, byDay: [], topPages: [] };
    }
  }

  // ── 3. Pinterest hits ────────────────────────────────────────────────────
  if (env.DB) {
    try {
      const [totalHits, byDay, topPins] = await Promise.all([
        env.DB.prepare(
          `SELECT COUNT(*) as count FROM pinterest_hits WHERE created_at >= datetime('now', '-${days} days')`
        ).first(),
        env.DB.prepare(
          `SELECT date(created_at) as day, COUNT(*) as count FROM pinterest_hits
           WHERE created_at >= datetime('now', '-${days} days')
           GROUP BY date(created_at) ORDER BY day ASC`
        ).all(),
        env.DB.prepare(
          `SELECT base_slug, COUNT(*) as count FROM pinterest_hits
           WHERE created_at >= datetime('now', '-${days} days')
           GROUP BY base_slug ORDER BY count DESC LIMIT 10`
        ).all(),
      ]);

      result.pinterestHits = {
        total: totalHits?.count ?? 0,
        byDay: byDay?.results ?? [],
        topPins: topPins?.results ?? [],
      };
    } catch (e) {
      result.pinterestHits = { error: e.message, total: 0, byDay: [], topPins: [] };
    }
  }

  // ── 4. Agent scan log ────────────────────────────────────────────────────
  if (env.DB) {
    try {
      const scans = await env.DB.prepare(
        "SELECT * FROM agent_scans ORDER BY scanned_at DESC LIMIT 20"
      ).all();
      result.agentScans = scans?.results ?? [];
    } catch {
      result.agentScans = [];
    }
  }

  // ── 5. Cloudflare Analytics (GraphQL) ────────────────────────────────────
  const cfToken = env.CF_API_TOKEN;
  const cfZone = env.CF_ZONE_ID;

  if (cfToken && cfZone) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split("T")[0];
      const untilStr = new Date().toISOString().split("T")[0];

      const query = `{
        viewer {
          zones(filter: {zoneTag: "${cfZone}"}) {
            httpRequests1dGroups(
              limit: 91
              filter: {date_geq: "${sinceStr}", date_leq: "${untilStr}"}
              orderBy: [date_ASC]
            ) {
              dimensions { date }
              sum { pageViews requests }
              uniq { uniques }
            }
          }
        }
      }`;

      const cfRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const cfJson = await cfRes.json();

      // Surface GraphQL-level permission/auth errors clearly
      if (cfJson?.errors?.length) {
        const msg = cfJson.errors[0]?.message ?? "Unknown GraphQL error";
        const isPermission = msg.includes("does not have permission") || msg.includes("authz");
        result.cloudflareAnalytics = {
          error: isPermission
            ? "Token missing Zone:Analytics:Read permission. Create a new token in Cloudflare Dashboard → My Profile → API Tokens → Create Token → Zone Analytics template."
            : msg,
          byDay: [],
          totals: { pageViews: 0, requests: 0, uniques: 0 },
        };
      } else {
        const groups = cfJson?.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
        result.cloudflareAnalytics = {
          byDay: groups.map((g) => ({
            day: g.dimensions.date,
            pageViews: g.sum.pageViews,
            requests: g.sum.requests,
            uniques: g.uniq.uniques,
          })),
          totals: {
            pageViews: groups.reduce((s, g) => s + (g.sum.pageViews || 0), 0),
            requests: groups.reduce((s, g) => s + (g.sum.requests || 0), 0),
            uniques: groups.reduce((s, g) => s + (g.uniq.uniques || 0), 0),
          },
          topCountries: [],
        };

        // Country breakdown (separate query, non-critical)
        try {
          const countryQuery = `{
            viewer {
              zones(filter: {zoneTag: "${cfZone}"}) {
                httpRequests1dByCountryGroups(
                  limit: 50
                  filter: {date_geq: "${sinceStr}", date_leq: "${untilStr}"}
                  orderBy: [sum_requests_DESC]
                ) {
                  dimensions { clientCountryName }
                  sum { pageViews requests }
                  uniq { uniques }
                }
              }
            }
          }`;
          const countryRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
            method: "POST",
            headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: countryQuery }),
          });
          const countryJson = await countryRes.json();
          if (!countryJson?.errors?.length) {
            const rows = countryJson?.data?.viewer?.zones?.[0]?.httpRequests1dByCountryGroups ?? [];
            result.cloudflareAnalytics.topCountries = rows.map((c) => ({
              country: c.dimensions.clientCountryName || "Unknown",
              pageViews: c.sum.pageViews || 0,
              uniques: c.uniq?.uniques ?? 0,
            }));
          }
        } catch { /* country data is optional */ }
      }
    } catch (e) {
      result.cloudflareAnalytics = { error: e.message, byDay: [], totals: { pageViews: 0, requests: 0, uniques: 0 }, topCountries: [] };
    }
  } else {
    result.cloudflareAnalytics = { error: "CF_API_TOKEN or CF_ZONE_ID not configured", byDay: [], totals: { pageViews: 0, requests: 0, uniques: 0 } };
  }

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
