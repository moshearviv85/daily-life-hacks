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
    // Re-run to capture the actual error for debugging
    const debugResult = await debugTokenExchange({ appId, appSecret, redirectUri, code, scopes: scope });
    return htmlPage("Pinterest OAuth Error",
      `<h1>Token exchange failed</h1>
       <p>Pinterest returned an error. Details:</p>
       <pre style="background:#f5f5f5;padding:10px;border-radius:8px;white-space:pre-wrap;word-break:break-all">${htmlEscape(JSON.stringify(debugResult, null, 2))}</pre>
       <p style="margin-top:12px;color:#555;font-size:13px">
         Make sure <code>https://www.daily-life-hacks.com/api/pinterest-demo-callback</code>
         is added as a Redirect URI in your Pinterest app settings.
       </p>`,
      400
    );
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

async function debugTokenExchange({ appId, appSecret, redirectUri, code, scopes }) {
  const results = {};
  for (const base of ["https://api.pinterest.com", "https://api-sandbox.pinterest.com"]) {
    const tokenUrl = `${base}/oauth/token`;
    const basic = btoa(`${appId}:${appSecret}`);
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", redirectUri);
    if (scopes) body.set("scope", scopes);
    try {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const data = await res.json().catch(() => ({}));
      results[base] = { status: res.status, data };
    } catch (e) {
      results[base] = { error: String(e) };
    }
  }
  return results;
}

