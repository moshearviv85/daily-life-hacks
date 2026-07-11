import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  getDashboardAuthKey,
  isDashboardAuthorized,
} from "../functions/api/_dashboard-auth.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

test("validates staging keys against production via x-api-key header", async () => {
  const originalFetch = globalThis.fetch;
  let url = "";
  let headerKey = "";
  globalThis.fetch = async (input, init = {}) => {
    url = String(input);
    const headers = new Headers(init.headers || {});
    headerKey = headers.get("x-api-key") || "";
    return new Response("{}", { status: 200 });
  };

  try {
    const request = new Request("https://staging.daily-life-hacks.pages.dev/api/dashboard");
    const ok = await isDashboardAuthorized({}, "prod password", request);

    assert.equal(ok, true);
    assert.equal(url, "https://www.daily-life-hacks.com/api/dashboard?days=1&noClarity=1");
    assert.equal(headerKey, "prod password");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getDashboardAuthKey prefers x-api-key header over query", () => {
  const request = new Request("https://example.test/api/dashboard?key=query-key", {
    headers: { "x-api-key": "header-key" },
  });
  assert.equal(getDashboardAuthKey(request), "header-key");
});

test("getDashboardAuthKey falls back to query key", () => {
  const request = new Request("https://example.test/api/dashboard?key=query-key");
  assert.equal(getDashboardAuthKey(request), "query-key");
});

test("dashboard client uses DashApi header auth and external modules", () => {
  const dashboard = readFileSync(join(root, "src/pages/dashboard.astro"), "utf8");
  const apiJs = readFileSync(join(root, "public/js/dashboard/api.js"), "utf8");
  const tabsJs = readFileSync(join(root, "public/js/dashboard/tabs.js"), "utf8");

  assert.match(dashboard, /src="\/js\/dashboard\/api\.js"/);
  assert.match(dashboard, /src="\/js\/dashboard\/tabs\.js"/);
  assert.match(dashboard, /DashApi\.fetch\(`/);
  assert.match(dashboard, /DashApi\?\.setKey/);
  assert.match(dashboard, /DashApi\.download\(/);
  assert.match(dashboard, /DashApi\.openXhr\(/);
  assert.match(dashboard, /DashTabs\?\.initDashTabs/);
  assert.doesNotMatch(dashboard, /\?key=\$\{encodeURIComponent\(pw\)\}/);
  assert.match(apiJs, /x-api-key/);
  assert.match(tabsJs, /function switchDashTab/);
});

test("pins upload/reschedule workflows send x-api-key header", () => {
  const upload = readFileSync(join(root, ".github/workflows/pins-upload-csv.yml"), "utf8");
  const reschedule = readFileSync(join(root, ".github/workflows/pins-reschedule.yml"), "utf8");

  assert.match(upload, /x-api-key: \$\{STATS_KEY\}/);
  assert.doesNotMatch(upload, /pins-upload\?key=/);
  assert.match(reschedule, /x-api-key: \$\{STATS_KEY\}/);
  assert.doesNotMatch(reschedule, /pins-reschedule\?key=/);
});
