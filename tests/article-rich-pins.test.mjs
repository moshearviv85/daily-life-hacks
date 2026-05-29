import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const articlePage = readFileSync(new URL("../src/pages/[slug].astro", import.meta.url), "utf8");
const baseLayout = readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");

test("recipe articles expose Recipe JSON-LD for Pinterest Rich Pins", () => {
  assert.match(articlePage, /"@type": "Recipe"/);
  assert.match(articlePage, /url: articleUrl/);
  assert.match(articlePage, /name: article\.data\.title/);
  assert.match(articlePage, /description: article\.data\.excerpt/);
  assert.match(articlePage, /recipeYield/);
  assert.match(articlePage, /recipeIngredient: article\.data\.ingredients/);
  assert.match(articlePage, /recipeInstructions: article\.data\.steps/);
  assert.match(baseLayout, /type="application\/ld\+json"/);
  assert.match(baseLayout, /<meta name="pinterest-rich-pin" content="true" \/>/);
});

test("recipe card is visually below the article body and before FAQ", () => {
  assert.match(articlePage, /<main[\s\S]*flex flex-col/);
  assert.match(articlePage, /class="article-content order-\[20\]"/);
  assert.match(articlePage, /class="order-\[30\][^"]*border-2 border-\[#F29B30\]/);
  assert.match(articlePage, /<section class="order-\[40\][\s\S]*Frequently Asked Questions/);
});

test("recipe schema durations use ISO-8601 duration helper", () => {
  assert.match(articlePage, /function durationToIso/);
  assert.match(articlePage, /prepTime: durationToIso\(article\.data\.prepTime\)/);
  assert.doesNotMatch(articlePage, /replace\(\/\\s\*minutes\?/);
});
