import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const pagePath = path.join(root, "src/pages/tools/grocery-trip-savings-calculator/index.astro");

test("grocery trip calculator exposes the decision inputs and both net results", async () => {
  const source = await readFile(pagePath, "utf8");
  for (const id of [
    "trip-savings",
    "trip-miles",
    "trip-mpg",
    "trip-gas",
    "trip-fees",
    "trip-minutes",
    "trip-time-value",
    "trip-cash",
    "trip-full",
  ]) {
    assert.match(source, new RegExp(`id=["']${id}["']`));
  }
  assert.match(source, /x\.miles\s*\/\s*x\.mpg\s*\*\s*x\.gas/);
  assert.match(source, /x\.minutes\s*\/\s*60\s*\*\s*x\.timeValue/);
  assert.match(source, /full=cash-time/);
});

test("grocery trip calculator has canonical structured data and supporting links", async () => {
  const source = await readFile(pagePath, "utf8");
  assert.match(source, /https:\/\/www\.daily-life-hacks\.com\/tools\/grocery-trip-savings-calculator\//);
  assert.match(source, /"@type": "WebApplication"/);
  assert.match(source, /"@type": "FAQPage"/);
  assert.match(source, /href="\/tools\/grocery-unit-price-calculator\/"/);
  assert.match(source, /href="\/tools\/grocery-budget-calculator\/"/);
  assert.match(source, /href="\/is-driving-to-cheaper-grocery-store-worth-it\/"/);
});

test("tools hub promotes the grocery trip calculator", async () => {
  const source = await readFile(path.join(root, "src/pages/tools/index.astro"), "utf8");
  assert.match(source, /href: "\/tools\/grocery-trip-savings-calculator\/"/);
  assert.match(source, /See Whether the Cheaper Store Is Actually Cheaper/);
});
