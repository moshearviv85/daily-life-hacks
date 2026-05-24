import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pipeline pin staging dry run shows an explicit success alert", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /data\.dry_run/);
  assert.match(dashboard, /alert\(`בדיקת סטייג'ינג הצליחה/);
  assert.match(dashboard, /לא נכתב תור, לא הופעל GitHub Actions ולא בוצע פרסום בפינטרסט/);
});

test("pipeline table can publish every unposted pin and hides posted pins", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.doesNotMatch(dashboard, /idx === 0/);
  assert.match(dashboard, /publishStatus !== 'POSTED'/);
  assert.match(dashboard, /publish_status/);
});
