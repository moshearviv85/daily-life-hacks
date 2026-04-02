import {
  buildPinCatalog,
  parseCookies,
  pinterestApiFetch,
  pinterestScopes,
  signCookieValue,
  verifySignedCookie,
} from "./pinterest-demo-lib.js";

function htmlPage(title, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px}
    .card{max-width:860px;border:1px solid #ddd;border-radius:12px;padding:18px}
    .ok{background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:10px;color:#166534;margin-top:12px}
    .warn{background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:10px;color:#7c2d12;margin-top:12px}
    .btn{display:inline-block;margin-top:12px;background:#F29B30;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:800;border:0;cursor:pointer}
    code{background:#f5f5f5;padding:2px 6px;border-radius:6px;word-break:break-all}
    select{margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid #ddd;min-width:320px}
  </style>
</head>
<body>
  <div class="card">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const redirectBase = "https://www.daily-life-hacks.com";
  const cookieSecret = env.PINTEREST_DEMO_COOKIE_SECRET;
  const accessKeySecret = env.PINTEREST_DEMO_ACCESS_KEY;

  const catalog = buildPinCatalog();
  const pinKeys = Object.keys(catalog);

  const cookies = parseCookies(request.headers.get("Cookie"));
  const signedToken = cookies.pinterest_demo_token;
  const signedAccess = cookies.pinterest_demo_access;

  const url = new URL(request.url);
  const providedKey = (url.searchParams.get("key") || url.searchParams.get("accessKey") || "").trim();

  let hasAccess = false;
  if (cookieSecret && signedAccess) {
    const accessPayload = await verifySignedCookie(cookieSecret, signedAccess);
    hasAccess = !!(accessPayload && accessPayload.ok === true && Number(accessPayload.exp_at || 0) > Date.now());
  }

  // Unlock: /api/pinterest-demo?key=YOUR_KEY
  if (!hasAccess && accessKeySecret && providedKey && providedKey === accessKeySecret) {
    const payload = { ok: true, exp_at: Date.now() + 24 * 60 * 60 * 1000 };
    const payloadB64 = btoa(JSON.stringify(payload));
    const signedAccessValue = await signCookieValue(cookieSecret, payloadB64);
    const target = `${redirectBase}/api/pinterest-demo`;
    return new Response(
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access granted</title>
  <meta http-equiv="refresh" content="0; url=${target}" />
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px}
    .card{max-width:860px;border:1px solid #ddd;border-radius:12px;padding:18px}
    .ok{background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:10px;color:#166534;margin-top:12px}
    .btn{display:inline-block;margin-top:12px;background:#F29B30;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:800;border:0;cursor:pointer}
    code{background:#f5f5f5;padding:2px 6px;border-radius:6px;word-break:break-all}
  </style>
</head>
<body>
  <div class="card">
    <div class="ok">
      Access granted.
      <div style="margin-top:10px">Redirecting to <code>${target}</code>...</div>
    </div>
    <div style="margin-top:12px">
      <a class="btn" href="${target}">Continue</a>
    </div>
  </div>
</body>
</html>`,
      {
        status: 200,
        headers: {
          "Set-Cookie": `pinterest_demo_access=${encodeURIComponent(signedAccessValue)}; Domain=.daily-life-hacks.com; Path=/; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "Pragma": "no-cache",
        },
      }
    );
  }

  if (!cookieSecret) {
    return new Response(htmlPage("Pinterest Demo Error", `<h1>Server env missing</h1><p>Need <code>PINTEREST_DEMO_COOKIE_SECRET</code>.</p>`), {
      status: 500,
    });
  }

  if (accessKeySecret && !hasAccess) {
    return new Response(
      htmlPage(
        "Restricted demo",
        `<h1 style="margin:0 0 10px;font-size:20px">Restricted demo</h1>
         <div class="warn">This demo is private. Enter the access key.</div>
         <form method="GET" action="${redirectBase}/api/pinterest-demo" style="margin-top:12px">
           <label style="display:block;color:#333;font-weight:700">Access key</label>
           <input name="key" type="password" style="margin-top:6px;width:100%;padding:10px 12px;border-radius:10px;border:1px solid #ddd" />
           <button class="btn" type="submit" style="display:inline-block;margin-top:10px">Unlock</button>
         </form>`
      ),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "Pragma": "no-cache",
        },
      }
    );
  }

  let token = null;
  if (signedToken) {
    token = await verifySignedCookie(cookieSecret, signedToken);
  }

  if (!token || !token.access_token) {
    const connectUrl = `${redirectBase}/api/pinterest-demo-connect`;
    return new Response(
      htmlPage(
        "Pinterest OAuth Demo",
        `<h1 style="margin:0 0 10px;font-size:20px">Pinterest OAuth Demo</h1>
         <p style="margin:0 0 12px;color:#444;line-height:1.4">This demo shows the full OAuth consent flow and then lets you publish exactly one selected Pin via the API.</p>
         <div class="warn"><strong>Not connected.</strong><br/>Click connect to see Pinterest consent, then come back.</div>
         <a class="btn" href="${connectUrl}">Connect Pinterest OAuth</a>`
      ),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          "Pragma": "no-cache",
        },
      }
    );
  }

  // Token exists; try to verify it by reading user_account (sandbox + production).
  const sandboxRes = await pinterestApiFetch({
    url: "https://api-sandbox.pinterest.com/v5/user_account",
    token,
    method: "GET",
  });
  const prodRes = await pinterestApiFetch({
    url: "https://api.pinterest.com/v5/user_account",
    token,
    method: "GET",
  });

  const showJson = (r) =>
    r && r.data ? `<pre style="white-space:pre-wrap;word-break:break-word;background:#f5f5f5;padding:10px;border-radius:10px;border:1px solid #eee">${JSON.stringify(r.data, null, 2).slice(0, 1500)}</pre>` : "";

  const sandboxOk = sandboxRes.ok;
  const prodOk = prodRes.ok;

  const who = sandboxOk
    ? (sandboxRes.data.username || sandboxRes.data.id || "connected")
    : prodOk
    ? (prodRes.data.username || prodRes.data.id || "connected")
    : "(unknown)";

  const statusBadge = sandboxOk
    ? `<div class="ok"><strong>OAuth OK.</strong><br/>Sandbox user: <code>${who}</code></div>`
    : prodOk
    ? `<div class="ok"><strong>OAuth OK.</strong><br/>Production user: <code>${who}</code></div>`
    : `<div class="warn"><strong>Token exists but API rejected it.</strong><br/>Sandbox: HTTP ${sandboxRes.status}; Production: HTTP ${prodRes.status}</div>`;

  const connectScopes = pinterestScopes();
  const publishUrl = `${redirectBase}/api/pinterest-demo-publish`;

  return new Response(
    htmlPage(
      "Pinterest Demo - Connected",
      `<h1 style="margin:0 0 10px;font-size:20px">Pinterest is connected</h1>
       <p style="margin:0 0 12px;color:#444;line-height:1.4">Choose exactly one demo Pin from the dropdown, then publish it. This manual selection is intentional.</p>
       ${statusBadge}
       <form method="POST" action="${publishUrl}">
         <label style="display:block;color:#333;font-weight:700">Select 1 demo Pin</label>
         <select name="pinKey" required>
           ${pinKeys
             .map((k) => `<option value="${k}">${catalog[k].display}</option>`)
             .join("")}
         </select>
         <button class="btn" type="submit">Publish selected Pin</button>
       </form>
       <p style="margin-top:12px;color:#666;font-size:12px">Requested scopes: <code>${connectScopes}</code></p>
       <div style="margin-top:12px">
         <details>
           <summary>Debug (optional)</summary>
           <h3 style="margin:8px 0 4px;font-size:14px">Sandbox /user_account</h3>
           ${showJson(sandboxRes)}
           <h3 style="margin:12px 0 4px;font-size:14px">Production /user_account</h3>
           ${showJson(prodRes)}
         </details>
       </div>`
    ),
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
      },
    }
  );
}

