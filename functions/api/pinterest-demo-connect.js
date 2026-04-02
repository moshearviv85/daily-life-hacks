import { buildOauthAuthorizeUrl, generateState, pinterestScopes, parseCookies, signCookieValue, verifySignedCookie } from "./pinterest-demo-lib.js";

// This endpoint redirects the browser to Pinterest OAuth consent screen.
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const accessKeySecret = env.PINTEREST_DEMO_ACCESS_KEY;
  const appId = env.PINTEREST_APP_ID;
  if (!appId) {
    return new Response(JSON.stringify({ error: "Missing env PINTEREST_APP_ID" }), { status: 500 });
  }

  // Must match exactly the Redirect URI configured in the Pinterest Developer portal.
  const redirectUri = "https://www.daily-life-hacks.com/api/pinterest-demo-callback";

  const scope = env.PINTEREST_DEMO_SCOPES || pinterestScopes();

  const state = generateState();
  const cookieSecret = env.PINTEREST_DEMO_COOKIE_SECRET;
  if (!cookieSecret) {
    return new Response(JSON.stringify({ error: "Missing env PINTEREST_DEMO_COOKIE_SECRET" }), { status: 500 });
  }

  // Private demo access guard
  const cookies = parseCookies(request.headers.get("Cookie"));
  const signedAccess = cookies.pinterest_demo_access;
  const existingAccessPayload =
    accessKeySecret && signedAccess ? await verifySignedCookie(cookieSecret, signedAccess) : null;
  const hasAccess =
    !accessKeySecret ||
    (existingAccessPayload &&
      existingAccessPayload.ok === true &&
      Number(existingAccessPayload.exp_at || 0) > Date.now());

  const providedKey = (url.searchParams.get("key") || url.searchParams.get("accessKey") || "").trim();
  if (!hasAccess) {
    if (providedKey && accessKeySecret && providedKey === accessKeySecret) {
      const payload = { ok: true, exp_at: Date.now() + 24 * 60 * 60 * 1000 };
      const payloadB64 = btoa(JSON.stringify(payload));
      const signedAccessValue = await signCookieValue(cookieSecret, payloadB64);
      return new Response(null, {
        status: 302,
        headers: {
          "Set-Cookie": `pinterest_demo_access=${encodeURIComponent(signedAccessValue)}; Domain=.daily-life-hacks.com; Path=/; HttpOnly; Secure; SameSite=Lax`,
          // Reload the connect endpoint to proceed with OAuth redirect.
          Location: url.pathname + url.search,
        },
      });
    }

    return new Response(
      `<html><body><h1>Restricted demo</h1><p>Enter access key to continue.</p><form method="GET" action="${redirectUri}">
        <input name="key" type="password" /><button type="submit">Unlock</button></form></body></html>`,
      { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const payload = JSON.stringify({ state });
  const payloadB64 = btoa(payload);
  const stateCookie = await signCookieValue(cookieSecret, payloadB64);

  const oauthUrl = buildOauthAuthorizeUrl({
    clientId: appId,
    redirectUri,
    scope,
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: oauthUrl,
      "Set-Cookie": `pinterest_demo_state=${encodeURIComponent(stateCookie)}; Domain=.daily-life-hacks.com; Path=/; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

