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
  // Manual-intent catalog for the API approval demo.
  // All pins link to real published articles on daily-life-hacks.com.
  return {
    energy_balls_v1: {
      display: "No-Bake High Fiber Energy Balls Recipe",
      title: "No-Bake High Fiber Energy Balls Recipe",
      description:
        "These no-bake energy balls take about 10 minutes to put together and keep well in the fridge all week. A genuinely easy high fiber snack. #HighFiber #HealthySnacks #MealPrep",
      link: "https://www.daily-life-hacks.com/no-bake-high-fiber-energy-balls-recipe",
      alt_text: "No-bake high fiber energy balls rolled in oats and seeds arranged on a wooden board",
      media_source_url:
        "https://www.daily-life-hacks.com/images/pins/no-bake-high-fiber-energy-balls-recipe_v1.jpg",
    },
    chickpeas_v1: {
      display: "Crispy Roasted Chickpeas High Fiber Snack",
      title: "Crispy Roasted Chickpeas — the Best High Fiber Snack",
      description:
        "Roasted chickpeas are crunchy, filling, and pack around 6g of fiber per half cup. Here's how to get them actually crispy. #HighFiber #HealthySnacks #PlantBased",
      link: "https://www.daily-life-hacks.com/crispy-roasted-chickpeas-high-fiber-snack",
      alt_text: "Crispy golden roasted chickpeas in a small bowl with seasoning on a light background",
      media_source_url:
        "https://www.daily-life-hacks.com/images/pins/crispy-roasted-chickpeas-high-fiber-snack_v1.jpg",
    },
    avocado_toast_v1: {
      display: "High Fiber Avocado Toast Variations",
      title: "High Fiber Avocado Toast Variations Worth Trying",
      description:
        "Avocado toast is already a solid breakfast, but the right toppings push it into genuinely high fiber territory. Here are a few variations we keep coming back to. #AvocadoToast #HighFiber #HealthyBreakfast",
      link: "https://www.daily-life-hacks.com/high-fiber-avocado-toast-variations",
      alt_text: "Avocado toast on whole grain bread topped with seeds eggs and microgreens on a white plate",
      media_source_url:
        "https://www.daily-life-hacks.com/images/pins/high-fiber-avocado-toast-variations_v1.jpg",
    },
    smoothies_v1: {
      display: "Gut-Friendly High Fiber Smoothies for Daily Wellness",
      title: "Gut-Friendly High Fiber Smoothies for Daily Wellness",
      description:
        "These smoothies use whole fruits, flax, and oats to get real fiber into your morning without tasting like a health supplement. #GutHealth #HighFiber #SmoothieRecipes",
      link: "https://www.daily-life-hacks.com/gut-friendly-high-fiber-smoothies-for-daily-wellness",
      alt_text: "Two tall glasses of colorful high fiber smoothies with berries and seeds on a bright kitchen counter",
      media_source_url:
        "https://www.daily-life-hacks.com/images/pins/gut-friendly-high-fiber-smoothies-for-daily-wellness_v1.jpg",
    },
    meal_prep_v1: {
      display: "High Fiber Meal Prep Ideas for Busy Weeks",
      title: "High Fiber Meal Prep Ideas for Busy Weeks (2026)",
      description:
        "A full week of high fiber meals you can prep on Sunday. Covers breakfast, lunch, and dinner with realistic times and portion sizes. #MealPrep #HighFiber #HealthyEating",
      link: "https://www.daily-life-hacks.com/high-fiber-meal-prep-ideas-for-busy-weeks-2026",
      alt_text: "Meal prep containers filled with high fiber grains vegetables and proteins arranged neatly on a counter",
      media_source_url:
        "https://www.daily-life-hacks.com/images/pins/high-fiber-meal-prep-ideas-for-busy-weeks-2026_v1.jpg",
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
  const tokenUrl = `${tokenBase}/v5/oauth/token`;
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
  // Standard access — use production API only.
  const prod = await tryTokenExchange({
    appId,
    appSecret,
    redirectUri,
    code,
    scopes,
    tokenBase: "https://api.pinterest.com",
  });
  if (prod.ok) return { ...prod.token, _env: "production" };

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

  const refreshUrls = ["https://api.pinterest.com/v5/oauth/token"];
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

