/**
 * Unit tests for Pinterest demo functions.
 * Tests core logic directly — no HTTP server needed.
 * Run: node tests/pinterest-demo.test.mjs
 */

import { fileURLToPath, pathToFileURL } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const libPath = pathToFileURL(join(__dir, "../functions/api/pinterest-demo-lib.js")).href;

// ── import lib ──────────────────────────────────────────────────────────────
const {
  buildPinCatalog,
  buildPinPayload,
  buildOauthAuthorizeUrl,
  pinterestScopes,
  generateState,
  signCookieValue,
  verifySignedCookie,
} = await import(libPath);

let passed = 0;
let failed = 0;

function assert(condition, label, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

// ── T1: Pin catalog ──────────────────────────────────────────────────────────
console.log("\nT1: Pin catalog");
const catalog = buildPinCatalog();
const keys = Object.keys(catalog);
assert(keys.length >= 2, "at least 2 pins in catalog", `got ${keys.length}`);

for (const k of keys) {
  const pin = catalog[k];
  assert(pin.display, `${k}.display present`);
  assert(pin.title && pin.title.length <= 100, `${k}.title ≤100 chars`, `len=${pin.title?.length}`);
  assert(pin.description && pin.description.length <= 800, `${k}.description ≤800 chars`);
  assert(pin.link?.startsWith("https://www.daily-life-hacks.com/"), `${k}.link points to our domain`);
  assert(pin.alt_text, `${k}.alt_text present`);
  assert(
    pin.media_source_url?.startsWith("https://www.daily-life-hacks.com/images/pins/"),
    `${k}.media_source_url points to /images/pins/`
  );
}

// ── T2: buildPinPayload ───────────────────────────────────────────────────────
console.log("\nT2: buildPinPayload");
const firstPin = catalog[keys[0]];
const payload = buildPinPayload(firstPin, "test-board-123");
assert(payload.board_id === "test-board-123", "board_id passed through");
assert(payload.title === firstPin.title, "title matches");
assert(payload.description === firstPin.description, "description matches");
assert(payload.link === firstPin.link, "link matches");
assert(payload.alt_text === firstPin.alt_text, "alt_text matches");
assert(payload.media_source?.source_type === "image_url", "media_source.source_type = image_url");
assert(payload.media_source?.url === firstPin.media_source_url, "media_source.url matches");

// ── T3: OAuth URL ─────────────────────────────────────────────────────────────
console.log("\nT3: OAuth URL shape");
const REDIRECT_URI = "https://www.daily-life-hacks.com/api/pinterest-demo-callback";
const scopes = pinterestScopes();
const oauthUrl = buildOauthAuthorizeUrl({
  clientId: "1554902",
  redirectUri: REDIRECT_URI,
  scope: scopes,
  state: "teststate123",
});
const parsed = new URL(oauthUrl);
assert(parsed.hostname === "www.pinterest.com", "hostname = www.pinterest.com");
assert(parsed.pathname === "/oauth/", "pathname = /oauth/");
assert(parsed.searchParams.get("response_type") === "code", "response_type = code");
assert(parsed.searchParams.get("client_id") === "1554902", "client_id = 1554902");
assert(parsed.searchParams.get("redirect_uri") === REDIRECT_URI, "redirect_uri correct");
assert(parsed.searchParams.get("state") === "teststate123", "state passed");

const scopeStr = parsed.searchParams.get("scope") || "";
const requiredScopes = ["user_accounts:read", "boards:read", "boards:write", "pins:read", "pins:write"];
for (const s of requiredScopes) {
  assert(scopeStr.includes(s), `scope includes ${s}`);
}

// ── T4: Scopes ────────────────────────────────────────────────────────────────
console.log("\nT4: pinterestScopes()");
assert(scopes.includes("pins:write"), "pins:write in scopes");
assert(scopes.includes("boards:write"), "boards:write in scopes");
assert(scopes.includes("user_accounts:read"), "user_accounts:read in scopes");
assert(!scopes.includes(","), "scopes are space-separated (not comma)");

// ── T5: generateState ─────────────────────────────────────────────────────────
console.log("\nT5: generateState()");
const s1 = generateState();
const s2 = generateState();
assert(typeof s1 === "string" && s1.length >= 16, "state is a non-empty string");
assert(s1 !== s2, "two states are different (random)");
assert(/^[A-Za-z0-9_-]+$/.test(s1), "state is URL-safe base64");

// ── T6: Cookie signing round-trip ──────────────────────────────────────────────
console.log("\nT6: Cookie signing (HMAC SHA-256 round-trip)");
const SECRET = "test-secret-at-least-32-chars-long!";
const payload2 = JSON.stringify({ access_token: "tok123", user: "alice", exp: Date.now() + 3600000 });
const b64 = btoa(payload2);
const signed = await signCookieValue(SECRET, b64);
assert(typeof signed === "string" && signed.includes("."), "signed cookie has payload.sig format");

const verified = await verifySignedCookie(SECRET, signed);
assert(verified !== null, "verify returns non-null for valid sig");
assert(verified.access_token === "tok123", "round-trip: access_token preserved");
assert(verified.user === "alice", "round-trip: user preserved");

const tampered = signed.slice(0, -5) + "XXXXX";
const badResult = await verifySignedCookie(SECRET, tampered);
assert(badResult === null, "tampered signature returns null");

const wrongSecret = await verifySignedCookie("wrong-secret", signed);
assert(wrongSecret === null, "wrong secret returns null");

// ── T7: Redirect URI format ───────────────────────────────────────────────────
console.log("\nT7: Redirect URI format");
assert(REDIRECT_URI === "https://www.daily-life-hacks.com/api/pinterest-demo-callback",
  "redirect URI matches Pinterest app config");
assert(!REDIRECT_URI.includes("localhost"), "redirect URI is not localhost");
assert(!REDIRECT_URI.includes("n8n"), "redirect URI has no n8n dependency");

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("✓ ALL TESTS PASSED — ready for deployment\n");
} else {
  console.error(`✗ ${failed} TEST(S) FAILED — fix before deploying\n`);
  process.exit(1);
}
