/**
 * GET /api/pinterest-demo-test
 * Self-test page — verifies all 5 checks before the demo recording.
 * Tests: env vars, redirect URI, OAuth URL shape, pin catalog, image URLs.
 */
import { buildPinCatalog, buildOauthAuthorizeUrl, pinterestScopes, parseCookies, verifySignedCookie } from "./pinterest-demo-lib.js";

function badge(ok, label, detail) {
  const cls = ok ? "ok" : "fail";
  const icon = ok ? "✓" : "✗";
  return `<div class="${cls}"><strong>${icon} ${label}</strong>${detail ? `<br/><span style="font-size:12px;opacity:.8">${detail}</span>` : ""}</div>`;
}

function htmlPage(title, bodyHtml) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px;background:#fafafa}
    .card{max-width:720px;background:#fff;border:1px solid #ddd;border-radius:12px;padding:20px}
    h1{margin:0 0 16px;font-size:20px}
    .ok{background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 14px;border-radius:10px;color:#166534;margin-top:10px}
    .fail{background:#fef2f2;border:1px solid #fecaca;padding:10px 14px;border-radius:10px;color:#991b1b;margin-top:10px}
    .warn{background:#fff7ed;border:1px solid #fed7aa;padding:10px 14px;border-radius:10px;color:#7c2d12;margin-top:10px}
    .btn{display:inline-block;margin-top:16px;background:#F29B30;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:800}
    code{background:#f5f5f5;padding:2px 6px;border-radius:6px;font-size:12px;word-break:break-all}
    h2{margin:20px 0 6px;font-size:15px;color:#555}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
    td,th{padding:6px 10px;border:1px solid #e5e7eb;text-align:left}
    th{background:#f9fafb;font-weight:700}
    tr.pass td{background:#f0fdf4}
    tr.fail td{background:#fef2f2}
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

  const appId     = env.PINTEREST_APP_ID     || "";
  const appSecret = env.PINTEREST_APP_SECRET || "";
  const cookieSecret  = env.PINTEREST_DEMO_COOKIE_SECRET || "";
  const accessKey = env.PINTEREST_DEMO_ACCESS_KEY || "";

  const redirectUri = "https://www.daily-life-hacks.com/api/pinterest-demo-callback";
  const scopes      = pinterestScopes();
  const catalog     = buildPinCatalog();
  const pinKeys     = Object.keys(catalog);

  // ── T1: env vars present ──
  const t1 = !!(appId && appSecret && cookieSecret);
  const t1_detail = [
    appId      ? "PINTEREST_APP_ID ✓"      : "PINTEREST_APP_ID ✗ (missing)",
    appSecret  ? "PINTEREST_APP_SECRET ✓"  : "PINTEREST_APP_SECRET ✗ (missing)",
    cookieSecret ? "PINTEREST_DEMO_COOKIE_SECRET ✓" : "PINTEREST_DEMO_COOKIE_SECRET ✗ (missing)",
    accessKey  ? "PINTEREST_DEMO_ACCESS_KEY ✓ (optional gate set)" : "PINTEREST_DEMO_ACCESS_KEY — not set (open access)",
  ].join(" &nbsp;|&nbsp; ");

  // ── T2: OAuth URL shape ──
  let t2 = false, t2_url = "", t2_detail = "";
  try {
    t2_url = buildOauthAuthorizeUrl({ clientId: appId || "TEST_ID", redirectUri, scope: scopes, state: "teststate" });
    const parsed = new URL(t2_url);
    t2 = parsed.hostname === "www.pinterest.com" && parsed.pathname === "/oauth/" &&
         parsed.searchParams.get("redirect_uri") === redirectUri &&
         parsed.searchParams.get("scope") === scopes;
    t2_detail = `redirect_uri = <code>${redirectUri}</code> &nbsp;|&nbsp; scopes = <code>${scopes}</code>`;
  } catch (e) {
    t2_detail = "Failed to build OAuth URL: " + String(e);
  }

  // ── T3: pin catalog (2 pins, each has required fields) ──
  const requiredFields = ["display","title","description","link","alt_text","media_source_url"];
  const catalogErrors = [];
  for (const k of pinKeys) {
    const pin = catalog[k];
    for (const f of requiredFields) {
      if (!pin[f]) catalogErrors.push(`${k}.${f} is empty`);
    }
    // Check link points to our domain
    if (pin.link && !pin.link.startsWith("https://www.daily-life-hacks.com/")) {
      catalogErrors.push(`${k}.link does not point to daily-life-hacks.com`);
    }
    // Check image URL points to our domain
    if (pin.media_source_url && !pin.media_source_url.startsWith("https://www.daily-life-hacks.com/images/pins/")) {
      catalogErrors.push(`${k}.media_source_url wrong path`);
    }
  }
  const t3 = pinKeys.length >= 2 && catalogErrors.length === 0;
  const t3_detail = t3
    ? `${pinKeys.length} pins: ${pinKeys.map(k => `<code>${k}</code>`).join(", ")}`
    : catalogErrors.map(e => `<code>${e}</code>`).join(", ");

  // ── T4: cookie signing round-trip ──
  let t4 = false, t4_detail = "";
  if (cookieSecret) {
    try {
      const { signCookieValue, verifySignedCookie: verify } = await import("./pinterest-demo-lib.js");
      const payload = JSON.stringify({ test: true, ts: Date.now() });
      const b64 = btoa(payload);
      const signed = await signCookieValue(cookieSecret, b64);
      const back = await verify(cookieSecret, signed);
      t4 = !!(back && back.test === true);
      t4_detail = t4 ? "HMAC sign → verify round-trip OK" : "Round-trip failed";
    } catch (e) {
      t4_detail = String(e);
    }
  } else {
    t4_detail = "Skipped (PINTEREST_DEMO_COOKIE_SECRET not set)";
  }

  // ── T5: token present check (just reads cookie) ──
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const signedToken = cookies.pinterest_demo_token;
  let t5 = false, t5_detail = "";
  if (signedToken && cookieSecret) {
    const tok = await verifySignedCookie(cookieSecret, signedToken);
    t5 = !!(tok && tok.access_token);
    t5_detail = t5 ? `access_token present (expires ${tok.expires_at ? new Date(tok.expires_at).toISOString() : "unknown"})` : "Cookie present but invalid/no access_token";
  } else {
    t5 = false;
    t5_detail = "No OAuth token cookie yet — complete OAuth flow first";
  }

  const allPass = t1 && t2 && t3 && t4;
  const readyForVideo = allPass && t5;

  const tableRows = [
    { id:"T1", label:"Env vars set",         pass: t1, detail: t1_detail },
    { id:"T2", label:"OAuth URL shape",       pass: t2, detail: t2_detail },
    { id:"T3", label:"Pin catalog (2 pins)",  pass: t3, detail: t3_detail },
    { id:"T4", label:"Cookie signing",        pass: t4, detail: t4_detail },
    { id:"T5", label:"OAuth token in browser",pass: t5, detail: t5_detail },
  ];

  const tableHtml = `
<table>
  <thead><tr><th>#</th><th>Test</th><th>Status</th><th>Detail</th></tr></thead>
  <tbody>
    ${tableRows.map(r => `
    <tr class="${r.pass ? "pass" : "fail"}">
      <td>${r.id}</td>
      <td>${r.label}</td>
      <td>${r.pass ? "✓ PASS" : "✗ FAIL"}</td>
      <td style="font-size:12px">${r.detail}</td>
    </tr>`).join("")}
  </tbody>
</table>`;

  const statusBlock = readyForVideo
    ? `<div class="ok" style="font-size:15px"><strong>All checks passed. Ready to record.</strong></div>`
    : allPass
    ? `<div class="warn"><strong>Config OK — complete OAuth flow to get token (T5).</strong><br/>
       <a href="/api/pinterest-demo" style="color:#92400e;font-weight:800">→ Go to demo page</a></div>`
    : `<div class="fail"><strong>Fix failing checks before recording.</strong></div>`;

  const setupBlock = `
<h2>Setup checklist (before first run)</h2>
<table>
  <thead><tr><th>Step</th><th>Where</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>1. Add redirect URI</td><td>Pinterest Developer Portal → App → Redirect URIs</td><td><code>${redirectUri}</code></td></tr>
    <tr><td>2. PINTEREST_APP_ID</td><td>Cloudflare Pages → Settings → Env vars</td><td><code>${appId || "(your app ID)"}</code></td></tr>
    <tr><td>3. PINTEREST_APP_SECRET</td><td>Cloudflare Pages → Settings → Env vars</td><td><code>(secret)</code></td></tr>
    <tr><td>4. PINTEREST_DEMO_COOKIE_SECRET</td><td>Cloudflare Pages → Settings → Env vars</td><td>Any random 32-char string</td></tr>
    <tr><td>5. PINTEREST_DEMO_ACCESS_KEY (optional)</td><td>Cloudflare Pages → Settings → Env vars</td><td>Password to lock the demo page</td></tr>
  </tbody>
</table>`;

  const demoFlow = `
<h2>Demo flow (for video recording)</h2>
<ol style="line-height:1.8;font-size:14px">
  <li>Open AdsPower → start profile 77 → verify US IP at <a href="https://ip2location.com" target="_blank">ip2location.com</a> (fraud score 0)</li>
  <li>Navigate to <code>https://www.daily-life-hacks.com/api/pinterest-demo${accessKey ? "?key=[ACCESS_KEY]" : ""}</code></li>
  <li>Click <strong>Connect Pinterest OAuth</strong> → Pinterest consent screen appears</li>
  <li>Click <strong>Allow access</strong> → returns to demo with "OAuth OK. User: [username]"</li>
  <li>Select one pin from dropdown → click <strong>Publish selected Pin</strong></li>
  <li>Success page shows Pin ID from <code>POST /v5/pins</code></li>
</ol>`;

  return new Response(
    htmlPage("Pinterest Demo — Self-Test",
      `<h1>Pinterest Demo — Self-Test</h1>
       ${statusBlock}
       ${tableHtml}
       ${setupBlock}
       ${demoFlow}
       <div style="margin-top:20px">
         <a class="btn" href="/api/pinterest-demo">→ Open Demo App</a>
       </div>`
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
