import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const layout = read("src/layouts/BaseLayout.astro");

test("every interactive tool root is covered by the shared funnel tracker", () => {
  for (const root of [
    "fpd-app",
    "bean-tool",
    "research-week-planner",
    "trip-calculator",
    "price-benchmark-app",
    "unit-price-app",
    "recipe-cost-app",
    "recipe-finder-app",
    "shopping-list-builder-app",
  ]) {
    assert.match(layout, new RegExp(`'#${root}'`), root);
  }
});

test("tool funnel uses consistent start, completion, and result-share events", () => {
  assert.match(layout, /send\('tool_start'/);
  assert.match(layout, /send\('tool_complete'/);
  assert.match(layout, /send\('result_share'/);
  assert.match(layout, /tool_name: toolName\(\)/);
  assert.match(layout, /tool_variant: root\.id/);
  assert.match(layout, /source_page: location\.pathname/);
  assert.match(layout, /share_method: share\.getAttribute\('data-result-share'\)/);
  assert.match(layout, /var initialResults = new WeakMap\(\)/);
  assert.match(layout, /if \(!initialResults\.has\(root\)\)/);
  assert.match(layout, /currentResult === initialResults\.get\(root\)/);
  assert.match(layout, /initialResults\.set\(root, resultFingerprint\(root\)\)/);
});

test("tool funnel never sends form values, labels, or rendered result text", () => {
  const sendFunction =
    layout.match(/function send\(eventName, root, details\) \{[\s\S]*?\n        \}/)?.[0] ?? "";
  assert.ok(sendFunction);
  assert.doesNotMatch(sendFunction, /\.value|textContent|innerText|innerHTML|FormData|searchParams/);
  assert.doesNotMatch(layout, /input_value|entered_price|recipe_name|ingredient_name|search_term/);
});

test("share telemetry is attached only to real result export controls", () => {
  const beans = read("src/pages/tools/dried-beans-to-canned-converter/index.astro");
  const shopping = read("src/pages/tools/shopping-list-builder/index.astro");

  assert.match(beans, /id="bean-share"[^>]+data-result-share="link"/);
  assert.match(shopping, /id="slb-copy"[^>]+data-result-share="copy"/);
  assert.match(shopping, /id="slb-print"[^>]+data-result-share="print"/);
});

test("dataset telemetry discovers untagged public CSV links without query strings", () => {
  assert.match(layout, /new URL\(link\.getAttribute\('href'\) \|\| '', location\.origin\)/);
  assert.match(layout, /\^\\\/data\\\/\[\^\/\]\+\\\.csv\$/);
  assert.match(layout, /var fileName = url\.pathname\.split\('\/'\)\.pop\(\)/);
  assert.doesNotMatch(
    layout.match(/window\.gtag\('event', 'dataset_download', \{[\s\S]*?\}\);/)?.[0] ?? "",
    /url\.search|location\.search|referrer|textContent|innerText/,
  );
});
