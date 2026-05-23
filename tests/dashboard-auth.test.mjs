import assert from "node:assert/strict";
import test from "node:test";

import { isDashboardAuthorized } from "../functions/api/_dashboard-auth.js";

test("accepts the local dashboard password", async () => {
  const request = new Request("https://staging.daily-life-hacks.pages.dev/api/dashboard");

  const ok = await isDashboardAuthorized(
    { DASHBOARD_PASSWORD: "local-dashboard", STATS_KEY: "legacy-stats" },
    "local-dashboard",
    request
  );

  assert.equal(ok, true);
});

test("does not proxy failed production auth back into production", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("{}", { status: 200 });
  };

  try {
    const request = new Request("https://www.daily-life-hacks.com/api/dashboard");
    const ok = await isDashboardAuthorized({}, "candidate", request);

    assert.equal(ok, false);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("validates staging keys against the production dashboard", async () => {
  const originalFetch = globalThis.fetch;
  let url = "";
  globalThis.fetch = async (input) => {
    url = String(input);
    return new Response("{}", { status: 200 });
  };

  try {
    const request = new Request("https://staging.daily-life-hacks.pages.dev/api/dashboard");
    const ok = await isDashboardAuthorized({}, "prod password", request);

    assert.equal(ok, true);
    assert.match(url, /^https:\/\/www\.daily-life-hacks\.com\/api\/dashboard\?days=1&noClarity=1&key=/);
    assert.equal(url.endsWith("prod%20password"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
