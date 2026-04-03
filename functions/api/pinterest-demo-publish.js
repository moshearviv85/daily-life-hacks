import {
  buildPinCatalog,
  buildPinPayload,
  parseCookies,
  pinterestApiFetch,
  pinterestScopes,
  refreshAccessToken,
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
    .ok{background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:10px;color:#166534;margin-top:12px}
    .warn{background:#fff7ed;border:1px solid #fed7aa;padding:12px;border-radius:10px;color:#7c2d12;margin-top:12px}
    .btn{display:inline-block;margin-top:12px;background:#F29B30;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:800;border:0;cursor:pointer}
    code{background:#f5f5f5;padding:2px 6px;border-radius:6px;word-break:break-all}
    pre{white-space:pre-wrap;word-break:break-word;background:#f5f5f5;padding:10px;border-radius:10px;border:1px solid #eee}
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

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const redirectBase = "https://www.daily-life-hacks.com";
  const cookieSecret = env.PINTEREST_DEMO_COOKIE_SECRET;
  const accessKeySecret = env.PINTEREST_DEMO_ACCESS_KEY;

  if (!cookieSecret) {
    return new Response(htmlPage("Server Error", `<h1>Missing env</h1>`), { status: 500 });
  }

  const cookies = parseCookies(request.headers.get("Cookie"));
  const signedAccess = cookies.pinterest_demo_access;
  if (accessKeySecret) {
    const accessPayload = signedAccess ? await verifySignedCookie(cookieSecret, signedAccess) : null;
    const hasAccess = !!(
      accessPayload &&
      accessPayload.ok === true &&
      Number(accessPayload.exp_at || 0) > Date.now()
    );
    if (!hasAccess) {
      return htmlPage(
        "Restricted demo",
        `<div class="warn"><strong>Private demo.</strong><br/>No access.</div>
         <p style="margin-top:12px"><a class="btn" href="${redirectBase}/api/pinterest-demo">Back</a></p>`,
        401
      );
    }
  }

  const signedToken = cookies.pinterest_demo_token;
  const token = signedToken ? await verifySignedCookie(cookieSecret, signedToken) : null;

  if (!token || !token.access_token) {
    const back = `${redirectBase}/api/pinterest-demo`;
    return htmlPage("Not connected", `<div class="warn"><strong>No token found.</strong></div><p><a class="btn" href="${back}">Back</a></p>`, 401);
  }

  const form = await request.formData().catch(() => null);
  const pinKey = form ? String(form.get("pinKey") || "").trim() : "";

  const catalog = buildPinCatalog();
  if (!pinKey || !catalog[pinKey]) {
    return htmlPage("Bad Request", `<div class="warn">Unknown <code>pinKey</code>.</div>`, 400);
  }

  // Refresh token if needed.
  const expiresAt = Number(token.expires_at || 0);
  const needsRefresh = expiresAt && expiresAt < Date.now() + 60 * 1000;
  let activeToken = token;
  if (needsRefresh) {
    const refreshed = await refreshAccessToken({
      appId: env.PINTEREST_APP_ID,
      appSecret: env.PINTEREST_APP_SECRET,
      token: activeToken,
      scopes: env.PINTEREST_DEMO_SCOPES || pinterestScopes(),
    });
    if (!refreshed) {
      return htmlPage("Token refresh failed", `<div class="warn">Could not refresh access token.</div>`, 401);
    }
    activeToken = refreshed;
  }

  // Trial access requires sandbox API for write operations.
  const apiBase = "https://api-sandbox.pinterest.com/v5";

  // Get or create a sandbox board
  const boardsRes = await pinterestApiFetch({
    url: `${apiBase}/boards?page_size=10`,
    token: activeToken,
    method: "GET",
  });

  const items = boardsRes.data?.items || [];
  let boardId = Array.isArray(items) && items.length ? String(items[0].id) : "";

  // Sandbox has no boards — create one automatically
  if (!boardId) {
    const createBoardRes = await pinterestApiFetch({
      url: `${apiBase}/boards`,
      token: activeToken,
      method: "POST",
      bodyJson: { name: "Daily Life Hacks Demo", description: "Demo board for API approval", privacy: "PUBLIC" },
    });
    boardId = createBoardRes.data?.id ? String(createBoardRes.data.id) : "";
    if (!boardId) {
      return htmlPage(
        "Cannot publish",
        `<div class="warn"><strong>Could not create sandbox board.</strong><br/>
         HTTP ${createBoardRes.status}<br/>
         <pre style="font-size:11px;margin-top:8px">${escapeHtml(JSON.stringify(createBoardRes.data||{},null,2).slice(0,600))}</pre>
        </div>
        <p><a class="btn" href="${redirectBase}/api/pinterest-demo">Back</a></p>`,
        500
      );
    }
  }

  const apiPinsUrl = `${apiBase}/pins`;

  const pin = catalog[pinKey];
  const pinPayload = buildPinPayload(pin, boardId);

  const createRes = await pinterestApiFetch({
    url: apiPinsUrl,
    token: activeToken,
    method: "POST",
    bodyJson: pinPayload,
  });

  const ok = createRes.ok && createRes.data && (createRes.data.id || createRes.data.pin_id);
  const pinId = createRes.data?.id || createRes.data?.pin_id || "";
  const envLabel = "Sandbox";

  return htmlPage(
    ok ? "Pin published" : "Publish error",
    ok
      ? `<div class="ok">
           <strong>Pin created (${envLabel}).</strong><br/>
           Pin ID: <code>${escapeHtml(pinId)}</code><br/>
           Board ID: <code>${escapeHtml(boardId)}</code>
         </div>
         <p style="margin-top:12px;color:#444;font-size:14px">
           Created via <code>POST /v5/pins</code> &mdash; you manually selected <strong>${escapeHtml(catalog[pinKey]?.display || pinKey)}</strong>.
         </p>
         <p><a class="btn" href="${redirectBase}/api/pinterest-demo">Back to demo page</a></p>`
      : `<div class="warn"><strong>Publish failed.</strong><br/>HTTP ${createRes.status}</div>
         <pre>${escapeHtml(JSON.stringify(createRes.data || {}, null, 2).slice(0, 1800))}</pre>
         <p><a class="btn" href="${redirectBase}/api/pinterest-demo">Back to demo page</a></p>`,
    ok ? 200 : 400
  );
}

