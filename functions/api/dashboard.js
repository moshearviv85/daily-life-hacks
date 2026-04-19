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
  const noClarity = url.searchParams.get("noClarity") === "1";
  const clarityOnly = url.searchParams.get("clarityOnly") === "1";

  // Auth
  if (!env.DASHBOARD_PASSWORD || key !== env.DASHBOARD_PASSWORD) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = { days };

  if (!clarityOnly) {
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

  // ── 1b. Kit subscriber list (authoritative — replaces D1 list) ───────────
  const kitKey = env.KIT_API_KEY || env.KIT_API_SECRET;
  if (kitKey) {
    try {
      // Fetch up to 1000 subscribers from Kit (sorted newest first)
      const kitRes = await fetch(
        "https://api.kit.com/v4/subscribers?sort_order=desc&sort_field=created_at&per_page=1000",
        { headers: { "X-Kit-Api-Key": kitKey, "Content-Type": "application/json" } }
      );
      if (kitRes.ok) {
        const kitJson = await kitRes.json();
        const kitSubs = (kitJson.subscribers ?? []).map((s) => ({
          email: s.email_address,
          source: s.fields?.Source || "kit",
          page: s.fields?.Page || "",
          status: s.state,
          created_at: s.created_at,
        }));
        // Override list and total with Kit data; keep D1 byDay/bySource charts
        if (result.subscriptions) {
          result.subscriptions.list = kitSubs;
          result.subscriptions.kitTotal = kitSubs.length;
        } else {
          result.subscriptions = { total: kitSubs.length, kitTotal: kitSubs.length, period: 0, today: 0, bySource: [], byDay: [], list: kitSubs };
        }
      }
    } catch { /* Kit list is optional — don't break the rest */ }
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
            // uniques filled by separate period-aggregate query below (summing daily double-counts returning visitors)
            uniques: 0,
          },
          topCountries: [],
        };

        // Period-wide unique visitors — single aggregate row (matches Cloudflare Dashboard)
        try {
          const periodQuery = `{
            viewer {
              zones(filter: {zoneTag: "${cfZone}"}) {
                httpRequests1dGroups(
                  limit: 1
                  filter: {date_geq: "${sinceStr}", date_leq: "${untilStr}"}
                ) {
                  uniq { uniques }
                }
              }
            }
          }`;
          const periodRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
            method: "POST",
            headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: periodQuery }),
          });
          const periodJson = await periodRes.json();
          if (!periodJson?.errors?.length) {
            const row = periodJson?.data?.viewer?.zones?.[0]?.httpRequests1dGroups?.[0];
            if (row?.uniq?.uniques != null) {
              result.cloudflareAnalytics.totals.uniques = row.uniq.uniques;
            }
          }
        } catch { /* fall back to 0 if the period query fails */ }

        // Country breakdown via httpRequestsAdaptiveGroups — max 1d on free plan
        // Use UTC midnight-to-now to match Cloudflare Dashboard's "today" view
        try {
          const todayUTC = new Date();
          todayUTC.setUTCHours(0, 0, 0, 0); // midnight UTC = same as CF dashboard
          const sinceISO = todayUTC.toISOString().replace(/\.\d{3}Z$/, "Z");
          const untilISO = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
          const countryQuery = `{
            viewer {
              zones(filter: {zoneTag: "${cfZone}"}) {
                httpRequestsAdaptiveGroups(
                  limit: 50
                  filter: {datetime_geq: "${sinceISO}", datetime_lt: "${untilISO}"}
                  orderBy: [count_DESC]
                ) {
                  count
                  dimensions { clientCountryName }
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
            const rows = countryJson?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
            const countryMap = {};
            for (const r of rows) {
              const name = r.dimensions.clientCountryName || "Unknown";
              countryMap[name] = (countryMap[name] || 0) + (r.count || 0);
            }
            result.cloudflareAnalytics.topCountries = Object.entries(countryMap)
              .map(([country, requests]) => ({ country, requests }))
              .sort((a, b) => b.requests - a.requests);
            result.cloudflareAnalytics.countryNote = "Today UTC (matches Cloudflare Dashboard)";
          }
        } catch { /* country data is optional */ }
      }
    } catch (e) {
      result.cloudflareAnalytics = { error: e.message, byDay: [], totals: { pageViews: 0, requests: 0, uniques: 0 }, topCountries: [] };
    }
  } else {
    result.cloudflareAnalytics = { error: "CF_API_TOKEN or CF_ZONE_ID not configured", byDay: [], totals: { pageViews: 0, requests: 0, uniques: 0 } };
  }

  } // end !clarityOnly

  // ── 6. Microsoft Clarity Analytics (with D1 cache) ───────────────────────
  if (!noClarity) {
    const clarityToken = env.CLARITY_API_TOKEN;
    const CACHE_TTL_MINUTES = 60; // serve from cache if fresher than this

    if (clarityToken && env.DB) {
      try {
        // Check cache first
        const cached = await env.DB.prepare(
          `SELECT data, cached_at FROM clarity_cache WHERE id = 1
           AND cached_at >= datetime('now', '-${CACHE_TTL_MINUTES} minutes')`
        ).first();

        if (cached) {
          // Serve from cache
          const parsed = JSON.parse(cached.data);
          parsed.fromCache = true;
          parsed.cachedAt = cached.cached_at;
          result.clarity = parsed;
        } else {
          // Fetch fresh from Clarity
          const clarityRes = await fetch(
            "https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=Country%2FRegion",
            { headers: { Authorization: `Bearer ${clarityToken}`, "Content-Type": "application/json" } }
          );

          if (clarityRes.status === 429) {
            // Rate limited — try to return stale cache if available
            const stale = await env.DB.prepare("SELECT data, cached_at FROM clarity_cache WHERE id = 1").first();
            if (stale) {
              const parsed = JSON.parse(stale.data);
              parsed.fromCache = true;
              parsed.cachedAt = stale.cached_at;
              parsed.stale = true;
              result.clarity = parsed;
            } else {
              result.clarity = { error: "Clarity API rate limit reached (10/day). Try again tomorrow." };
            }
          } else if (!clarityRes.ok) {
            result.clarity = { error: `Clarity API ${clarityRes.status}` };
          } else {
            const data = await clarityRes.json();
            const find = (name) => data.find((m) => m.metricName === name);

            const traffic = find("Traffic")?.information?.[0] ?? {};
            const scroll = find("ScrollDepth")?.information?.[0] ?? {};
            const engagement = find("EngagementTime")?.information?.[0] ?? {};
            const countries = (find("Country")?.information ?? [])
              .map((c) => ({ country: c.name, sessions: parseInt(c.sessionsCount) || 0 }))
              .sort((a, b) => b.sessions - a.sessions);
            const pages = (find("PageTitle")?.information ?? [])
              .map((p) => ({ title: p.name.replace(" | Daily Life Hacks", ""), sessions: parseInt(p.sessionsCount) || 0 }));
            const devices = (find("Device")?.information ?? [])
              .map((d) => ({ name: d.name, sessions: parseInt(d.sessionsCount) || 0 }));
            const browsers = (find("Browser")?.information ?? [])
              .map((b) => ({ name: b.name, sessions: parseInt(b.sessionsCount) || 0 }));

            const fresh = {
              sessions: parseInt(traffic.totalSessionCount) || 0,
              botSessions: parseInt(traffic.totalBotSessionCount) || 0,
              users: parseInt(traffic.distinctUserCount) || 0,
              pagesPerSession: parseFloat(traffic.pagesPerSessionPercentage?.toFixed(2)) || 0,
              avgScrollDepth: parseFloat(scroll.averageScrollDepth?.toFixed(1)) || 0,
              totalEngagementSec: parseInt(engagement.totalTime) || 0,
              activeEngagementSec: parseInt(engagement.activeTime) || 0,
              countries,
              topPages: pages.slice(0, 10),
              devices,
              browsers,
            };

            // Save to cache
            await env.DB.prepare(
              `INSERT INTO clarity_cache (id, data, cached_at) VALUES (1, ?, datetime('now'))
               ON CONFLICT(id) DO UPDATE SET data = excluded.data, cached_at = excluded.cached_at`
            ).bind(JSON.stringify(fresh)).run();

            result.clarity = { ...fresh, fromCache: false };
          }
        }
      } catch (e) {
        result.clarity = { error: e.message };
      }
    } else if (!clarityToken) {
      result.clarity = { error: "CLARITY_API_TOKEN not configured" };
    } else {
      result.clarity = { error: "DB not bound" };
    }
  } // end !noClarity

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
