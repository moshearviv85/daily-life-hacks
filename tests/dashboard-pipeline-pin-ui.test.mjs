import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pipeline pin staging dry run shows an explicit success alert", () => {
  const dashboard = readFileSync(new URL("../src/pages/dashboard.astro", import.meta.url), "utf8");

  assert.match(dashboard, /data\.dry_run/);
  assert.match(dashboard, /alert\(`בדיקת סטייג'ינג הצליחה/);
  assert.match(dashboard, /לא נכתב תור, לא הופעל GitHub Actions ולא בוצע פרסום בפינטרסט/);
});
