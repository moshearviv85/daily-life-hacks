// Minimal Pinterest OAuth + Sandbox Pin publish helpers for the demo.
// Works with Cloudflare Pages Functions runtime (fetch, crypto.subtle, etc).

const textEncoder = new TextEncoder();

function base64UrlEncode(bytes) {
  // bytes: Uint8Array
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generateState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, textEncoder.encode(data));
  const u8 = new Uint8Array(sig);
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signCookieValue(secret, payloadB64) {
  const sigHex = await hmacHex(secret, payloadB64);
  return `${payloadB64}.${sigHex}`;
}

export async function verifySignedCookie(secret, signedValue) {
  if (!signedValue || !secret) return null;
  const parts = String(signedValue).split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigHex] = parts;
  const expected = await hmacHex(secret, payloadB64);
  if (expected !== sigHex) return null;

  try {
    const jsonStr = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function getSignedCookiePayload(cookie, cookieName) {
  if (!cookie) return null;
  const m = String(cookie).match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}


export function buildPinCatalog() {
  // Important: For the approval demo we keep pins "manual intent" by requiring
  // user selection before we publish. The pin content is a small static catalog
  // using real published articles from daily-life-hacks.com.
  return {
    fiber_fruits_v1: {
      display: "Best High Fiber Fruits for Weight Loss (v1)",
      title: "Best High Fiber Fruits for Weight Loss",
      description:
        "Some fruits pack way more fiber than you'd think. Here's a quick list of the best high fiber fruits that could support your weight loss goals. #HighFiber #WeightLoss #HealthyEating",
      link: "https://www.daily-life-hacks.com/best-high-fiber-fruits-for-weight-loss-list",
      alt_text: "Assortment of high fiber fruits including berries pears and apples arranged on a white surface",
      media_source_url:
        "https://www.daily-life-hacks.com/images/pins/best-high-fiber-fruits-for-weight-loss-list_v1.jpg",
    },
    quinoa_salad_v1: {
      display: "High Fiber Quinoa Salad for Lunch Prep (v1)",
      title: "High Fiber Quinoa Salad for Lunch Prep",
      description:
        "This quinoa salad comes together fast and holds up well in the fridge all week. Great for high fiber lunch prep that doesn't get soggy. #MealPrep #QuinoaSalad #HighFiber",
      link: "https://www.daily-life-hacks.com/high-fiber-quinoa-salad-for-lunch-prep",
      alt_text: "High fiber quinoa salad with chickpeas cucumber tomatoes and fresh herbs in a glass bowl",
      media_source_url:
        "https://www.daily-life-hacks.com/images/pins/high-fiber-quinoa-salad-for-lunch-prep_v1.jpg",
    },
  };
}

export function buildPinPayload(pin, board_id) {
  return {
    title: pin.title,
    description: pin.description,
    link: pin.link,
    alt_text: pin.alt_text,
    board_id,
    media_source: { source_type: "image_url", url: pin.media_source_url },
  };
}

export function buildOauthAuthorizeUrl({ clientId, redirectUri, scope, state }) {
  const url = new URL("https://www.pinterest.com/oauth/");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  return url.toString();
}

export function pinterestScopes() {
  // Keep it explicit: approvals/rejections are often scope-related.
  // Use space-separated values (typical OAuth style).
  return [
    "user_accounts:read",
    "boards:read",
    "boards:write",
    "pins:read",
    "pins:write",
  ].join(" ");
}

async function tryTokenExchange({ appId, appSecret, redirectUri, code, scopes, tokenBase }) {
  // tokenBase is the host base, for example: https://api.pinterest.com
  const tokenUrl = `${tokenBase}/oauth/token`;
  const basic = btoa(`${appId}:${appSecret}`);

  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", redirectUri);
  // Some providers accept scope again; harmless.
  if (scopes) body.set("scope", scopes);

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, data };
  }

  const expiresIn = Number(data.expires_in || 0);
  const expiresAt = Date.now() + expiresIn * 1000;
  return {
    ok: true,
    token: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      scope: data.scope,
      expires_at: expiresAt,
    },
  };
}

export async function exchangeAuthCodeForToken({
  appId,
  appSecret,
  redirectUri,
  code,
  scopes,
}) {
  // First try production token endpoint; if it fails in edge cases, fallback to sandbox.
  const primary = await tryTokenExchange({
    appId,
    appSecret,
    redirectUri,
    code,
    scopes,
    tokenBase: "https://api.pinterest.com",
  });
  if (primary.ok) return primary.token;

  const fallback = await tryTokenExchange({
    appId,
    appSecret,
    redirectUri,
    code,
    scopes,
    tokenBase: "https://api-sandbox.pinterest.com",
  });
  if (fallback.ok) return fallback.token;

  return null;
}

export async function refreshAccessToken({ appId, appSecret, token, scopes }) {
  const redirectUriIgnored = ""; // refresh typically doesn't require redirect_uri
  const basic = btoa(`${appId}:${appSecret}`);
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", token.refresh_token);
  if (scopes) body.set("scope", scopes);
  if (redirectUriIgnored) body.set("redirect_uri", redirectUriIgnored);

  const refreshUrls = ["https://api.pinterest.com/oauth/token", "https://api-sandbox.pinterest.com/oauth/token"];
  for (const url of refreshUrls) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) continue;

    const expiresIn = Number(data.expires_in || 0);
    const expiresAt = Date.now() + expiresIn * 1000;
    return {
      ...token,
      access_token: data.access_token,
      refresh_token: data.refresh_token || token.refresh_token,
      scope: data.scope || token.scope,
      expires_at: expiresAt,
    };
  }
  return null;
}

export async function pinterestApiFetch({ url, token, method = "GET", bodyJson }) {
  const headers = {
    Authorization: `Bearer ${token.access_token}`,
  };
  if (bodyJson) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: bodyJson ? JSON.stringify(bodyJson) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

