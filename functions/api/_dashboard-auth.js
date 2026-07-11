/**
 * Shared dashboard / API auth helpers.
 *
 * Preferred client auth: `x-api-key` header.
 * Query `?key=` remains accepted for legacy GH Actions / scripts until they migrate.
 */

const PROD_DASHBOARD_AUTH_URL = "https://www.daily-life-hacks.com/api/dashboard?days=1&noClarity=1";

/** Read auth secret from header first, then ?key= query. */
export function getDashboardAuthKey(request) {
  const url = new URL(request.url);
  return (
    request.headers.get("x-api-key") ||
    url.searchParams.get("key") ||
    ""
  ).trim();
}

export async function isDashboardAuthorized(env, key, request) {
  const candidate = (key || "").trim();
  if (!candidate) return false;

  if ((env.DASHBOARD_PASSWORD && candidate === env.DASHBOARD_PASSWORD) ||
      (env.STATS_KEY && candidate === env.STATS_KEY)) {
    return true;
  }

  const host = new URL(request.url).hostname;
  if (host === "www.daily-life-hacks.com" || host === "daily-life-hacks.com") {
    return false;
  }

  try {
    const res = await fetch(PROD_DASHBOARD_AUTH_URL, {
      headers: { "x-api-key": candidate },
    });
    return res.ok;
  } catch {
    return false;
  }
}
