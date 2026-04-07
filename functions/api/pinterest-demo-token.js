/**
 * GET /api/pinterest-demo-token
 * One-time endpoint to extract the refresh_token from the OAuth cookie.
 * Protected by PINTEREST_DEMO_ACCESS_KEY.
 * Use this once to copy the refresh_token into GitHub Secrets.
 */
import { parseCookies, verifySignedCookie } from "./pinterest-demo-lib.js";

function htmlPage(body, status = 200) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
    <title>Pinterest Token</title>
    <style>body{font-family:ui-sans-serif,system-ui,-apple-system,Arial;margin:24px}
    .card{max-width:860px;border:1px solid #ddd;border-radius:12px;padding:20px}
    .ok{background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:10px;color:#166534;margin-top:12px}
    .warn{background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:10px;color:#7c2d12;margin-top:12px}
    code{background:#f5f5f5;padding:3px 8px;border-radius:6px;word-break:break-all;font-size:13px}
    pre{background:#1e1e1e;color:#d4d4d4;padding:14px;border-radius:10px;white-space:pre-wrap;word-break:break-all;font-size:12px}
    .btn{display:inline-block;margin-top:12px;background:#F29B30;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:800}
    </style></head><body><div class="card">${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const cookieSecret   = env.PINTEREST_DEMO_COOKIE_SECRET;
  const accessKey      = env.PINTEREST_DEMO_ACCESS_KEY;
  const url            = new URL(request.url);
  const cookies        = parseCookies(request.headers.get("Cookie") || "");

  // Access gate
  if (accessKey) {
    const signedAccess = cookies.pinterest_demo_access;
    const payload = cookieSecret && signedAccess ? await verifySignedCookie(cookieSecret, signedAccess) : null;
    const ok = payload && payload.ok === true && Number(payload.exp_at || 0) > Date.now();
    if (!ok) {
      return htmlPage(
        `<h1>Restricted</h1>
         <div class="warn">Access key required.
           <form method="GET" style="margin-top:10px">
             <input name="key" type="password" placeholder="Access key" style="padding:8px 12px;border-radius:8px;border:1px solid #ddd;width:260px"/>
             <button type="submit" class="btn" style="margin-top:0;margin-left:8px">Unlock</button>
           </form>
         </div>`,
        401
      );
    }
  }

  // Read token from cookie
  const signedToken = cookies.pinterest_demo_token;
  if (!signedToken || !cookieSecret) {
    return htmlPage(
      `<h1>No token found</h1>
       <div class="warn">Complete OAuth flow first at <a href="/api/pinterest-demo">/api/pinterest-demo</a>.</div>`,
      400
    );
  }

  const token = await verifySignedCookie(cookieSecret, signedToken);
  if (!token || !token.access_token) {
    return htmlPage(`<h1>Invalid token cookie</h1><div class="warn">Re-authenticate via <a href="/api/pinterest-demo">/api/pinterest-demo</a>.</div>`, 400);
  }

  const expiresAt = token.expires_at ? new Date(token.expires_at).toISOString() : "unknown";

  return htmlPage(
    `<h1 style="margin:0 0 16px;font-size:20px">Pinterest Token Extractor</h1>
     <div class="warn"><strong>Keep these tokens secret.</strong> Copy to GitHub Secrets immediately — do not share.</div>

     <h3 style="margin:20px 0 6px;font-size:15px">PINTEREST_REFRESH_TOKEN</h3>
     <p style="margin:0 0 6px;color:#555;font-size:13px">Save this as a GitHub Secret. Used by the auto-poster script.</p>
     <pre>${token.refresh_token || "(not present — re-authenticate)"}</pre>

     <h3 style="margin:20px 0 6px;font-size:15px">Access Token (current session only)</h3>
     <p style="margin:0 0 6px;color:#555;font-size:13px">Expires: <code>${expiresAt}</code></p>
     <pre>${token.access_token}</pre>

     <h3 style="margin:20px 0 6px;font-size:15px">Scopes</h3>
     <pre>${token.scope || "not returned"}</pre>

     <div class="ok" style="margin-top:20px">
       <strong>Next step:</strong><br/>
       1. Copy <strong>PINTEREST_REFRESH_TOKEN</strong> above<br/>
       2. Go to GitHub → repo → Settings → Secrets → Actions<br/>
       3. Add secrets: <code>PINTEREST_REFRESH_TOKEN</code>, <code>PINTEREST_APP_ID</code>, <code>PINTEREST_APP_SECRET</code>
     </div>

     <p style="margin-top:16px"><a class="btn" href="/api/pinterest-demo">Back to demo</a></p>`
  );
}
