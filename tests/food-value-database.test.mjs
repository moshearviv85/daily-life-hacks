import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pagePath = path.join(root, "src/pages/food-value-database/index.astro");
const page = fs.readFileSync(pagePath, "utf8");
const index = JSON.parse(fs.readFileSync(path.join(root, "public/data/api-index-v1.json"), "utf8"));

const coreRows = index.rows.filter(
  (row) => row.dataset === "fiber-per-dollar-2026" || row.dataset === "protein-per-dollar-2026",
);
const fiberRows = coreRows.filter((row) => row.dataset === "fiber-per-dollar-2026");
const proteinRows = coreRows.filter((row) => row.dataset === "protein-per-dollar-2026");
const fiberNames = new Set(fiberRows.map((row) => row.food.trim().toLowerCase()));
const proteinNames = new Set(proteinRows.map((row) => row.food.trim().toLowerCase()));
const uniqueNames = new Set([...fiberNames, ...proteinNames]);
const bothNames = [...fiberNames].filter((name) => proteinNames.has(name));

test("directory coverage is derived from the two authoritative flagship datasets", () => {
  assert.equal(fiberRows.length, 53);
  assert.equal(proteinRows.length, 49);
  assert.equal(uniqueNames.size, 79);
  assert.equal(bothNames.length, 23);
  assert.match(page, /api-index-v1\.json/);
  assert.match(page, /row\.dataset === "fiber-per-dollar-2026"/);
  assert.match(page, /row\.dataset === "protein-per-dollar-2026"/);
});

test("one crawlable page renders every unique food without thin detail routes", () => {
  assert.match(page, /\{foods\.map\(\(food\) => \(/);
  assert.match(page, /<tbody id="fvd-tbody">/);
  assert.match(page, /<th scope="row" class="sticky-food">/);
  assert.match(page, /Price basis: \{food\.priceBasis/);
  assert.equal(fs.existsSync(path.join(root, "src/pages/food-value-database/[slug].astro")), false);
  assert.equal(fs.existsSync(path.join(root, "src/pages/food-value-database/[food].astro")), false);
});

test("directory supports search, category and coverage filters, sorting, and four-food comparison", () => {
  for (const id of ["fvd-search", "fvd-category", "fvd-coverage", "fvd-sort", "fvd-compare"]) {
    assert.match(page, new RegExp(`id="${id}"`));
  }
  for (const sortValue of [
    "pricePer100g-asc",
    "packagePrice-asc",
    "proteinPer100g-desc",
    "fiberPer100g-desc",
    "proteinPerDollar-desc",
    "fiberPerDollar-desc",
  ]) {
    assert.match(page, new RegExp(`value="${sortValue}"`));
  }
  assert.match(page, /selected\.length < 4/);
  assert.match(page, /selected\.length >= 4/);
  assert.match(page, /Not measured/);
});

test("interactive states are labeled and announce changing results", () => {
  assert.match(page, /label class="control-label" for="fvd-search"/);
  assert.match(page, /label class="control-label" for="fvd-category"/);
  assert.match(page, /label class="control-label" for="fvd-coverage"/);
  assert.match(page, /label class="control-label" for="fvd-sort"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /aria-pressed="false"/);
  assert.match(page, /<caption>/);
  assert.match(page, /empty\.hidden = visible\.length > 0/);
});

test("analytics records actions and counts, never search text or selected food names", () => {
  assert.match(page, /"food_database_action"/);
  for (const action of ["search", "filter", "compare"]) {
    assert.match(page, new RegExp(`track\\("${action}"`));
  }
  assert.match(page, /result_count: visibleRows\(\)\.length/);
  assert.match(page, /selected_count: selected\.length/);
  assert.match(page, /source_page: location\.pathname/);
  const trackingFunction = page.match(/function track\(action, details\) \{[\s\S]*?\n        \}/)?.[0] ?? "";
  assert.doesNotMatch(trackingFunction, /search\.value/);
  assert.doesNotMatch(trackingFunction, /food\.food/);
  assert.doesNotMatch(trackingFunction, /query/);
});

test("directory links to sources, methodology, downloads, studies, and measured answer pages", () => {
  for (const href of [
    "/methodology/",
    "/data/",
    "/api-docs/",
    "/data/fiber-per-dollar-2026.csv",
    "/data/protein-per-dollar-2026.csv",
    "/fiber-per-dollar-cheapest-high-fiber-foods/",
    "/protein-per-dollar-cheapest-protein-sources/",
    "/foods-highest-in-protein-per-100-grams/",
    "/which-dried-beans-have-the-most-protein/",
    "/canned-beans-vs-dried-beans-nutrition/",
    "/how-much-protein-in-oatmeal/",
  ]) {
    assert.match(page, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.equal(coreRows.every((row) => row.price_basis && row.fields.price_per_100g_usd), true);
});

test("public copy avoids David Miller hard bans", () => {
  assert.doesNotMatch(page, /\u2014/);
  assert.doesNotMatch(page, /Furthermore|Moreover|In conclusion|Delve into|Dive into|Unlock|Elevate|Game-changer|Mouthwatering/i);
  assert.doesNotMatch(page, /your .* will thank you/i);
});

test("title and meta lead with nutrition-per-dollar grocery database intent", () => {
  const title = page.match(/const title = `([^`]+)`/)?.[1] ?? "";
  const description = page.match(/const description =\s*`([^`]+)`/)?.[1] ?? "";
  const renderedTitle = title.replace("${foods.length}", String(uniqueNames.size));
  const renderedDescription = description.replaceAll("${foods.length}", String(uniqueNames.size));

  assert.match(renderedTitle, /^Nutrition per Dollar:/);
  assert.match(renderedTitle, /Protein and Fiber Database/);
  assert.equal(renderedTitle.includes("Compare"), false, "title should not spend the SERP on generic compare");
  assert.ok(renderedTitle.length <= 60, `title too long for SERP: ${renderedTitle.length}`);

  assert.match(renderedDescription, /^Nutrition per dollar for \d+ grocery foods/);
  assert.match(renderedDescription, /protein and fiber per \$1/);
  assert.match(renderedDescription, /July 2026 US prices plus USDA FoodData Central/);
  assert.match(renderedDescription, /Not USDA-endorsed/);
  assert.ok(
    renderedDescription.length <= 160,
    `meta exceeds BaseLayout clamp: ${renderedDescription.length}`,
  );
});

test("the database has inbound discovery links from data, statistics, tools, and footer", () => {
  for (const file of [
    "src/pages/data/index.astro",
    "src/pages/statistics/index.astro",
    "src/pages/tools/index.astro",
    "src/components/Footer.astro",
  ]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(source, /\/food-value-database\//, `${file} should link to the directory`);
  }
});
