import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pipeline pin staging action queues into the staging lane", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /PENDING/);
  assert.match(dashboard, /GitHub Actions/);
  assert.match(dashboard, /publish_now: false/);
});

test("pipeline table can publish every unposted pin and hides posted pins", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.doesNotMatch(dashboard, /idx === 0/);
  assert.match(dashboard, /const publishButton = !publishStatus/);
  assert.match(dashboard, /publish_status/);
});

test("pipeline publish button queues pins instead of dispatching immediate publish", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /publish_now: false/);
  assert.doesNotMatch(dashboard, /publish_now: isProductionDashboard/);
});

test("dashboard exposes staging environment and queue state", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /id="env-badge"/);
  assert.match(dashboard, /STAGING/);
  assert.match(dashboard, /id="ps-queue-label"/);
  assert.match(dashboard, /Queue: \$\{queue\}/);
  assert.match(dashboard, /Legacy Publish חסום בסטייג׳ינג/);
  assert.match(dashboard, /Run Publisher חסום בסטייג׳ינג/);
  assert.match(dashboard, /Publish Now חסום בסטייג׳ינג/);
});

test("pipeline pin button is hidden once a pin has any queue status", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /const publishButton = !publishStatus/);
  assert.doesNotMatch(dashboard, /publishStatus !== 'POSTED'/);
});
