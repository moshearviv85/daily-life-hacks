import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../src/pages/tools/recipe-finder/index.astro", import.meta.url);
const source = await readFile(pagePath, "utf8");

test("recipe finder is built from released recipe frontmatter", () => {
  assert.match(source, /getCollection\("articles"\)/);
  assert.match(source, /isReleased\(article\)/);
  assert.match(source, /article\.data\.category === "recipes"/);
  assert.match(source, /article\.data\.ingredients\?\.length && article\.data\.servings/);
  assert.match(source, /ingredients: article\.data\.ingredients/);
});

test("recipe finder ranks overlap and exposes shopping gaps", () => {
  assert.match(source, /b\.matched\.length-a\.matched\.length/);
  assert.match(source, /a\.mainMissing\.length-b\.mainMissing\.length/);
  assert.match(source, /You(?:'|&#39;)d still need:/);
  assert.match(source, /pantry basic/);
  assert.match(source, /See the recipe and fix the servings/);
});

test("recipe finder includes utility SEO and structured data", () => {
  assert.match(source, /Recipe Finder by Ingredients: Use What You Have/);
  assert.match(source, /"@type": "WebApplication"/);
  assert.match(source, /"@type": "FAQPage"/);
  assert.match(source, /https:\/\/www\.daily-life-hacks\.com\/tools\/recipe-finder\//);
});

test("analytics records usage without ingredient values", () => {
  const analyticsCall = source.match(/gtag\('event','recipe_finder_used',[\s\S]*?\}\)/)?.[0] ?? "";
  assert.match(analyticsCall, /tool_name:'recipe_finder'/);
  assert.match(analyticsCall, /interaction_type:'ingredient_added'/);
  assert.doesNotMatch(analyticsCall, /selected|ingredient_count|event\.target|value/);
});

test("David Miller hard bans stay out of UI copy", () => {
  assert.doesNotMatch(source, /—/u);
  assert.doesNotMatch(source, /\b(?:Furthermore|Moreover|In conclusion|Delve into|Dive into|Unlock|Elevate|Game-changer|Revolutionize|Mouthwatering)\b/i);
  assert.doesNotMatch(source, /Your [^\n.]+ will thank you/i);
});
