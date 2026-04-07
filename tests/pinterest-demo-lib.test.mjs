import test from "node:test";
import assert from "node:assert/strict";
import { buildPinCatalog, buildPinPayload, buildOauthAuthorizeUrl, pinterestScopes } from "../functions/api/pinterest-demo-lib.js";

test("buildPinPayload includes required fields", () => {
  const catalog = buildPinCatalog();
  const pin = catalog.herbs_v1;
  const payload = buildPinPayload(pin, "board_123");

  assert.equal(payload.board_id, "board_123");
  assert.ok(payload.title);
  assert.ok(payload.description);
  assert.ok(payload.link);
  assert.ok(payload.alt_text);
  assert.equal(payload.media_source.source_type, "image_url");
  assert.ok(payload.media_source.url.includes(".jpg"));
});

test("buildOauthAuthorizeUrl includes scope + state + redirect_uri", () => {
  const url = buildOauthAuthorizeUrl({
    clientId: "app_1",
    redirectUri: "https://example.com/api/pinterest-demo-callback",
    scope: pinterestScopes(),
    state: "abc123",
  });

  const u = new URL(url);
  assert.equal(u.pathname, "/oauth/");
  assert.equal(u.searchParams.get("client_id"), "app_1");
  assert.equal(u.searchParams.get("redirect_uri"), "https://example.com/api/pinterest-demo-callback");
  assert.equal(u.searchParams.get("state"), "abc123");
  assert.equal(u.searchParams.get("response_type"), "code");
  assert.ok(u.searchParams.get("scope").includes("pins:write"));
});

