import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import {
  DAY_COST_FILE,
  GRAINS_FILE,
  PRODUCE_FILE,
  chartGroups,
  fiberDaySummaries,
  loadFiberIndex,
  money,
} from "../src/lib/produce-grain-fiber-index.mjs";
import {
  BEANS_FILE,
  MEAT_FILE,
  PANTRY_FILE,
  chartPoints,
  loadPlannerFoods,
  quote,
} from "../src/lib/pantry-meal-storage.mjs";

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), "utf8");

const DATA_PAGE = "src/pages/data/produce-and-grain-fiber-index/index.astro";
const TOOL_PAGE = "src/pages/tools/pantry-meal-cost-and-storage-planner/index.astro";
const DATA_CHART = "public/images/produce-and-grain-fiber-index-chart.jpg";
const TOOL_CHART = "public/images/pantry-meal-cost-and-storage-planner-chart.jpg";

const ORPHANS = new Set([
  "balanced-breakfast-that-keeps-you-full",
  "best-way-to-store-avocados-to-stop-browning",
  "gut-health-tea-peppermint-ginger",
  "fiber-rich-soup-for-weight-loss-cabbage",
  "high-protein-high-fiber-meals-for-weight-loss",
  "creamy-mushroom-barley-risotto-hands-off",
  "selenium-containing-foods-easy-ways",
  "high-fiber-stir-fry-vegetables",
  "prune-juice-alternatives-for-constipation",
  "natto-japanese-fermented-soybeans-gut-health",
  "water-and-fiber-the-golden-rule",
  "fix-oversalted-soup-sauce-rice",
  "eggs-vs-everything-protein-value",
  "how-to-keep-sandwiches-from-getting-soggy",
  "what-30-grams-of-fiber-costs-per-day",
  "split-pea-soup-recipe-high-fiber",
  "cheapest-complete-protein-pairs",
]);

function hrefs(source) {
  return [...source.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
}

function assertPageLinks(source, label) {
  assert.doesNotMatch(source, /FAQPage/, label);
  assert.doesNotMatch(source, /\u2014/, label);
  assert.doesNotMatch(source, /\u2013/, label);
  assert.doesNotMatch(source, /href="[^"]*\.csv"/, label);
  assert.doesNotMatch(source, /href="[^"]*#/, label);
  assert.doesNotMatch(source, /photograph of|photo of/i, label);
  assert.match(source, /Not a photograph/, label);
  assert.match(source, /AUTHOR_NAME/, label);
  const sitePaths = new Set([
    "",
    "data",
    "methodology",
    "tools",
    "author/david-miller",
    "data/produce-and-grain-fiber-index",
    "tools/pantry-meal-cost-and-storage-planner",
  ]);
  for (const href of hrefs(source)) {
    assert.equal(href.includes("#"), false, href);
    assert.equal(href.includes("?"), false, href);
    const slug = href.replace(/^\/|\/$/g, "");
    const leaf = slug.split("/").pop();
    assert.equal(INDEX_PRUNE_SLUGS.has(leaf), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, href);
    assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(slug), false, href);
    if (sitePaths.has(slug)) continue;
    const article = join(ROOT, "src/data/articles", `${leaf}.md`);
    assert.equal(existsSync(article), true, `${label} links missing ${href}`);
    assert.equal(ORPHANS.has(leaf), false, `${label} links orphan ${leaf}`);
  }
}

test("the fiber index is 33 ranked rows and the day file stays a summary", () => {
  const rows = loadFiberIndex();
  assert.equal(rows.length, 33);
  assert.equal(rows.filter((row) => row.sourceFile === PRODUCE_FILE).length, 22);
  assert.equal(rows.filter((row) => row.sourceFile === GRAINS_FILE).length, 11);
  assert.equal(rows.filter((row) => row.format === "dried-fruit").length, 0);
  const byFood = new Map(rows.map((row) => [row.food, row]));
  assert.equal(byFood.get("Whole wheat flour").fiberLabel, "77.8");
  assert.equal(byFood.get("Pearled barley (dry)").fiberLabel, "57.1");
  assert.equal(byFood.get("Old-fashioned rolled oats").fiberLabel, "35.8");
  assert.equal(byFood.get("Frozen green peas").fiberLabel, "17.6");
  assert.equal(byFood.get("Carrots (whole, bagged)").fiberLabel, "16.1");
  assert.equal(byFood.get("Green cabbage").fiberLabel, "14.6");
  assert.equal(byFood.get("Sweet potatoes").fiberLabel, "13.9");
  assert.equal(byFood.get("Bananas").fiberLabel, "11.6");
  assert.equal(byFood.get("Popcorn kernels").fdcId, "");
  const groups = chartGroups(rows);
  assert.deepEqual(groups.map((group) => group.foods[0].food), [
    "Whole wheat flour",
    "Carrots (whole, bagged)",
    "Frozen green peas",
    "Bananas",
  ]);
  const days = fiberDaySummaries();
  assert.equal(days.length, 5);
  assert.equal(days[0].fiber, 31.9);
  assert.equal(days[0].cost, 0.62);
});

test("the planner prices the published protein rows and keeps the shorter fridge clock", () => {
  const foods = loadPlannerFoods();
  const drumsticks = foods.find((food) => food.id === "drumsticks");
  const beef = foods.find((food) => food.id === "ground-beef");
  const rice = foods.find((food) => food.id === "rice");
  assert.equal(drumsticks.proteinPerDollar, 50.3);
  assert.equal(beef.proteinPerDollar, 11.3);
  assert.equal(money(30 / drumsticks.proteinPerDollar), "$0.60");
  assert.equal(money(30 / beef.proteinPerDollar), "$2.65");
  const cooked = drumsticks.modes.find((mode) => mode.id === "cooked");
  const priced = quote(drumsticks, cooked, 4, 50, 7);
  assert.equal(priced.protein, 1400);
  assert.equal(money(priced.cost), "$27.83");
  assert.equal(priced.riskDays, 3);
  assert.equal(money(priced.riskCost), "$11.93");
  const cookedRice = rice.modes.find((mode) => mode.id === "cooked");
  assert.equal(cookedRice.fridgeMax, 4);
  assert.equal(cookedRice.chartDays, 6);
  const points = chartPoints(foods);
  assert.equal(points.length, 11);
  assert.equal(points[0].fridgeDays, 2);
  assert.equal(points.at(-1).fridgeDays, 6);
  assert.equal(points.at(-1).label, "Cooked brown rice, FoodKeeper upper day");
});

test("both new pages stay indexable, chart-backed, and free of file links", async () => {
  const data = read(DATA_PAGE);
  const tool = read(TOOL_PAGE);
  assert.match(data, /"@type": "WebPage"/);
  assert.match(data, /"@type": "Dataset"/);
  assert.match(data, /"@type": "BreadcrumbList"/);
  assert.match(data, /name: AUTHOR_NAME/);
  assert.match(data, /\{PRODUCE_FILE\}/);
  assert.match(data, /\{GRAINS_FILE\}/);
  assert.match(data, /\{DAY_COST_FILE\}/);
  assert.match(data, /dried fruit/i);
  assert.match(data, /href="\/cheapest-whole-grains-for-fiber-per-dollar\/"/);
  assert.match(data, /href="\/cheapest-high-fiber-fruits-and-vegetables\/"/);
  assert.doesNotMatch(data, /href="\/what-30-grams-of-fiber-costs-per-day\/"/);
  assert.match(data, /href="\/tools\/pantry-meal-cost-and-storage-planner\/"/);
  assertPageLinks(data, "fiber index");

  assert.match(tool, /"@type": "WebApplication"/);
  assert.match(tool, /"@type": "BreadcrumbList"/);
  assert.match(tool, /applicationCategory/);
  assert.match(tool, /browser tab/);
  assert.match(tool, /href="\/methodology\/"/);
  assert.match(tool, /document\.addEventListener\('astro:page-load'/);
  assert.match(tool, /\{PANTRY_FILE\}/);
  assert.match(tool, /\{MEAT_FILE\}/);
  assert.match(tool, /\{BEANS_FILE\}/);
  assert.match(tool, /href="\/how-long-do-cooked-grains-and-beans-last-in-the-fridge\/"/);
  assert.match(tool, /href="\/how-long-do-cooked-meat-and-poultry-last-in-the-fridge\/"/);
  assert.match(tool, /href="\/cheapest-shelf-stable-pantry-foods-for-protein\/"/);
  assert.match(tool, /href="\/data\/produce-and-grain-fiber-index\/"/);
  const faqs = [...tool.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)];
  assert.equal(faqs.length, 5);
  assertPageLinks(tool, "planner");

  assert.equal(INDEX_PRUNE_SLUGS.has("produce-and-grain-fiber-index"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("pantry-meal-cost-and-storage-planner"), false);
  assert.equal(INDEX_NOINDEX_TOOL_PATHS.has("tools/pantry-meal-cost-and-storage-planner"), false);
  assert.equal(read("src/content/category-hubs.ts").includes("produce-and-grain-fiber-index"), false);
  assert.equal(read("src/content/category-hubs.ts").includes("pantry-meal-cost-and-storage-planner"), false);
  assert.equal(read("src/pages/nutrition/index.astro").includes("produce-and-grain-fiber-index"), false);

  const fiberScript = read("scripts/generate-produce-and-grain-fiber-index-chart.py");
  const plannerScript = read("scripts/generate-pantry-meal-cost-and-storage-planner-chart.py");
  assert.match(fiberScript, /produce-fiber-per-dollar-ranked-2026\.csv/);
  assert.match(fiberScript, /grains-fiber-per-dollar-ranked-2026\.csv/);
  assert.match(plannerScript, /shelf-stable-pantry-per-dollar-2026\.csv/);
  assert.match(plannerScript, /meat-per-dollar-protein-ranked-2026\.csv/);
  assert.doesNotMatch(fiberScript, /-main\.jpg/);
  assert.doesNotMatch(plannerScript, /-main\.jpg/);
  for (const point of chartPoints()) {
    assert.ok(plannerScript.includes(point.label), point.label);
  }

  for (const [path, width, height] of [
    [DATA_CHART, 1200, 675],
    [TOOL_CHART, 1200, 675],
  ]) {
    const bytes = readFileSync(join(ROOT, path));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, width, path);
    assert.equal(meta.height, height, path);
  }
});

test("contextual links land on the new pages and leave locked dates alone", () => {
  const editorial = read("src/pages/editorial-policy.astro");
  const methodology = read("src/pages/methodology.astro");
  const provenance = read("src/components/DataProvenance.astro");
  const fridge = read("src/pages/printables/fridge-life-card/index.astro");
  assert.match(editorial, /href="\/data\/produce-and-grain-fiber-index\/"/);
  assert.match(editorial, /dateModified: "2026-11-23"/);
  assert.match(editorial, /Page last updated November 23, 2026/);
  assert.match(methodology, /href="\/data\/produce-and-grain-fiber-index\/"/);
  assert.match(methodology, /dateModified: "2026-07-30"/);
  assert.match(methodology, /Page last updated July 30, 2026/);
  assert.match(provenance, /href="\/tools\/pantry-meal-cost-and-storage-planner\/"/);
  assert.match(provenance, /href="\/printables\/"/);
  assert.match(fridge, /href="\/tools\/pantry-meal-cost-and-storage-planner\/"/);
  for (const source of [editorial, provenance, fridge]) {
    assert.doesNotMatch(source, /href="[^"]*produce-and-grain-fiber-index[^"]*\.csv"/);
    assert.doesNotMatch(source, /href="[^"]*pantry-meal-cost-and-storage-planner[^"]*\.csv"/);
  }
  for (const source of [editorial, methodology, provenance, fridge]) {
    assert.doesNotMatch(source, /produce-and-grain-fiber-index\/#/);
    assert.doesNotMatch(source, /pantry-meal-cost-and-storage-planner\/#/);
  }
});

test("built sitemap includes both new pages when dist exists", () => {
  const sitemap = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemap)) return;
  const xml = readFileSync(sitemap, "utf8");
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/data\/produce-and-grain-fiber-index\//);
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/tools\/pantry-meal-cost-and-storage-planner\//);
  const dataHtml = readFileSync(join(ROOT, "dist/data/produce-and-grain-fiber-index/index.html"), "utf8");
  const toolHtml = readFileSync(join(ROOT, "dist/tools/pantry-meal-cost-and-storage-planner/index.html"), "utf8");
  assert.equal(dataHtml.includes("FAQPage"), false);
  assert.equal(toolHtml.includes("FAQPage"), false);
  assert.match(dataHtml, /David Miller/);
  assert.match(toolHtml, /David Miller/);
  assert.match(dataHtml, /<meta name="robots" content="index, follow/);
  assert.match(toolHtml, /<meta name="robots" content="index, follow/);
  assert.match(dataHtml, /77\.8/);
  assert.match(dataHtml, /produce-fiber-per-dollar-ranked-2026\.csv/);
  assert.match(dataHtml, /grains-fiber-per-dollar-ranked-2026\.csv/);
  assert.match(dataHtml, /fiber-day-cost-2026\.csv/);
  assert.doesNotMatch(dataHtml, /href="[^"]*\.csv"/);
  assert.match(toolHtml, /\$27\.83/);
  assert.match(toolHtml, /shelf-stable-pantry-per-dollar-2026\.csv/);
  assert.match(toolHtml, /meat-per-dollar-protein-ranked-2026\.csv/);
  assert.match(toolHtml, /canned-vs-dry-beans-cost-2026\.csv/);
  assert.doesNotMatch(toolHtml, /href="[^"]*\.csv"/);
  const nutrition = readFileSync(join(ROOT, "dist/nutrition/index.html"), "utf8");
  const anchors = [...nutrition.matchAll(/<a\b/gi)].length;
  assert.ok(anchors <= 124, `/nutrition/ rendered ${anchors} anchors`);
});
