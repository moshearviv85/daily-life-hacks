import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("homepage sends research readers to the priced weekly planner", async () => {
  const source = await readFile("src/pages/index.astro", "utf8");
  assert.match(source, /href="\/tools\/grocery-budget-calculator\/"/);
  assert.match(source, /10 priced menus/);
  assert.match(source, /Plan the Week Before the Cart Gets Ideas/);
  assert.match(source, /Grocery Cost Studies, Recipes and Food Tools/);
  assert.match(source, /Grocery Cost Studies, Practical Recipes, and Food Tools/);
  assert.doesNotMatch(source, /Join 2,500\+ readers/);
  assert.doesNotMatch(source, /rebuilding our spreadsheet one bean at a time[^<]*—/);
});

test("recipes index advertises the scaler where people choose a recipe", async () => {
  const source = await readFile("src/pages/recipes/index.astro", "utf8");
  assert.match(source, /Easy Recipes With Adjustable Servings/);
  assert.match(source, /change the servings inside the ingredient card/);
  assert.match(source, /All \{articles\.length\} recipes scale/);
});

test("recipes index links the finder and combined shopping list", async () => {
  const source = await readFile("src/pages/recipes/index.astro", "utf8");
  assert.match(source, /href="\/tools\/recipe-finder\/"/);
  assert.match(source, /href="\/tools\/shopping-list-builder\/"/);
  assert.match(source, /You've Got Ingredients\. Let's Find Dinner\./);
  assert.match(source, /Make One Shopping List, Not Five/);
});

test("weekly planner cannot quietly become a 35-day week", async () => {
  const source = await readFile("src/pages/tools/grocery-budget-calculator/index.astro", "utf8");
  assert.match(source, /allowed=Math\.max\(0,7-others\)/);
  assert.match(source, /planned===7\?money\(totalCost\*4\.33\)/);
  assert.match(source, /planner caps the total at seven days/);
});
