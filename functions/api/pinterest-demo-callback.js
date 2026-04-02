import {
  exchangeAuthCodeForToken,
  pinterestScopes,
  parseCookies,
  signCookieValue,
  verifySignedCookie,
} from "./pinterest-demo-lib.js";

function htmlPage(title, bodyHtml, status = 200) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px}
    .card{max-width:860px;border:1px solid #ddd;border-radius:12px;padding:18px}
    a{color:#F29B30;font-weight:800}
    code{background:#f5f5f5;padding:2px 6px;border-radius:6px;word-break:break-all}
  </style>
</head>
<body>
  <div class="card">
    ${bodyHtml}
  </div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return htmlPage("Pinterest OAuth Callback Error", `<h1>Missing code</h1><pre>${htmlEscape(url.href)}</pre>`, 400);
  }

  const redirectBase = "https://www.daily-life-hacks.com";

  const cookieSecret = env.PINTEREST_DEMO_COOKIE_SECRET;

  const cookies = parseCookies(request.headers.get("Cookie"));
  const signedState = cookies.pinterest_demo_state;
  const decodedState = cookieSecret && signedState ? await verifySignedCookie(cookieSecret, signedState) : null;
  const expectedState = decodedState ? decodedState.state : null;

  if (!expectedState || expectedState !== state) {
    return htmlPage("Pinterest OAuth Callback Error", `<h1>State mismatch</h1><p>Expected and received state differ.</p>`, 400);
  }

  const appId = env.PINTEREST_APP_ID;
  const appSecret = env.PINTEREST_APP_SECRET;
  const redirectUri = "https://www.daily-life-hacks.com/api/pinterest-demo-callback";
  const scope = env.PINTEREST_DEMO_SCOPES || pinterestScopes();

  if (!appId || !appSecret) {
    return htmlPage("Server Error", "<h1>Missing Pinterest env vars</h1>", 500);
  }

  const token = await exchangeAuthCodeForToken({
    appId,
    appSecret,
    redirectUri,
    code,
    scopes: scope,
  });

  if (!token) {
    return htmlPage("Pinterest OAuth Error", "<h1>Token exchange failed</h1><p>Check Pinterest app credentials, redirect URI, and scopes.</p>", 400);
  }

  // Signed token cookie.
  const tokenJson = JSON.stringify(token);
  const tokenB64 = btoa(tokenJson);
  const signedToken = cookieSecret ? await signCookieValue(cookieSecret, tokenB64) : tokenB64;

  const demoUrl = `${redirectBase}/api/pinterest-demo`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: demoUrl,
      "Set-Cookie": `pinterest_demo_token=${encodeURIComponent(signedToken)}; Domain=.daily-life-hacks.com; Path=/; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

function htmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

