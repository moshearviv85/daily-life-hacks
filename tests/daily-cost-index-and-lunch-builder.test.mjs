import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { DATA_RELEASE_DATE } from "../src/content/datasets.ts";
import { parseCsv } from "../src/content/price-basis.mjs";

const COST_PAGE = "src/pages/data/daily-protein-and-fiber-cost-index/index.astro";
const LUNCH_PAGE = "src/pages/tools/work-lunch-protein-and-fiber-builder/index.astro";

const COST_LINKS = [
  "/one-dollar-of-protein-vs-one-dollar-of-fiber/",
  "/cost-of-50g-protein-and-30g-fiber-per-day/",
  "/how-much-100-grams-of-protein-costs-per-day/",
  "/what-50-grams-of-protein-costs-per-day/",
  "/methodology/",
  "/author/david-miller/",
];

const LUNCH_LINKS = [
  "/healthy-blue-collar-lunch-ideas-men/",
  "/how-to-pack-salad-for-work-not-soggy/",
  "/no-cook-emergency-protein-and-fiber-grocery-list/",
  "/cheapest-high-fiber-snacks-per-dollar/",
  "/methodology/",
  "/author/david-miller/",
];

function read(path) {
  return readFileSync(path, "utf8");
}

function rowsOf(path) {
  const parsed = parseCsv(read(path));
  return parsed.rows.map((row) =>
    Object.fromEntries(parsed.header.map((name, index) => [name, row[index] ?? ""])),
  );
}

function hrefs(source) {
  return [...source.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

function orphanSlugs() {
  const source = read("tests/orphan-contextual-inlinks.test.mjs");
  const block = source.match(/const ORPHANS = \[([\s\S]*?)\];/);
  assert.ok(block, "ORPHANS list");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function assertCanonicalInternalLinks(source, label) {
  const orphans = new Set(orphanSlugs());
  for (const href of hrefs(source)) {
    if (href === "/" || /^(?:https?:|mailto:)/i.test(href)) continue;
    assert.equal(href.includes("#"), false, `${label} hash link ${href}`);
    assert.equal(/\.csv(?:$|\?)/i.test(href), false, `${label} csv link ${href}`);
    assert.match(href, /^\/[a-z0-9-/]+\/$/, `${label} canonical ${href}`);
    const slug = href.split("/").filter(Boolean).pop();
    assert.equal(orphans.has(slug), false, `${label} orphan ${href}`);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${label} pruned ${href}`);
    assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(href.replace(/^\/|\/$/g, "")), false, href);
    const nested = href.replace(/^\/|\/$/g, "");
    assert.equal(
      existsSync(`src/pages/${nested}/index.astro`) ||
        existsSync(`src/pages/${nested}.astro`) ||
        existsSync(`src/data/articles/${slug}.md`),
      true,
      `${label} missing target ${href}`,
    );
  }
}

function assertChartVoice(source) {
  assert.match(source, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(
    source.replaceAll("Not a photograph, and not an AI illustration", ""),
    /photo/i,
  );
  assert.doesNotMatch(source, /\u2014/);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(source, /noindex/);
  assert.match(source, /author=\{AUTHOR_NAME\}/);
  assert.match(source, /browser tab/);
  assert.match(source, /document\.addEventListener\('astro:page-load'/);
  assert.doesNotMatch(source, /href="\/nutrition\/"/);
}

const costPage = read(COST_PAGE);
const lunchPage = read(LUNCH_PAGE);

test("the cost index is an indexable Dataset page with a chart and no FAQ schema", () => {
  assert.match(costPage, /"@type": "WebPage"/);
  assert.match(costPage, /"@type": "Dataset"/);
  assert.match(costPage, /"@type": "BreadcrumbList"/);
  assert.match(costPage, /DATASET_PERSON_CREATOR/);
  assert.match(costPage, /grouped bar chart/i);
  assert.match(costPage, /protein-day-cost-2026\.csv/);
  assert.match(costPage, /fiber-day-cost-2026\.csv/);
  assert.match(costPage, /one-dollar-protein-what-it-buys-2026\.csv/);
  assert.match(costPage, /one-dollar-fiber-what-it-buys-2026\.csv/);
  assert.match(costPage, /dateModified: DATA_RELEASE_DATE/);
  assert.equal(DATA_RELEASE_DATE, "2026-09-05");
  assert.equal(INDEX_PRUNE_SLUGS.has("daily-protein-and-fiber-cost-index"), false);
  assertChartVoice(costPage);
  for (const href of COST_LINKS) assert.match(costPage, new RegExp(href.replaceAll("/", "\\/")));
  assert.doesNotMatch(costPage, /what-30-grams-of-fiber-costs-per-day/);
  assertCanonicalInternalLinks(costPage, "cost index");
  const script = costPage.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline explorer");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("the lunch builder is an indexable tool with five visible FAQs and no FAQ schema", () => {
  assert.match(lunchPage, /"@type": "WebApplication"/);
  assert.match(lunchPage, /"@type": "BreadcrumbList"/);
  assert.match(lunchPage, /applicationCategory/);
  assert.match(lunchPage, /UtilitiesApplication/);
  assert.match(lunchPage, /bar chart/i);
  assert.match(lunchPage, /no-cook-protein-per-dollar-2026\.csv/);
  assert.match(lunchPage, /high-fiber-snacks-per-dollar-2026\.csv/);
  assert.match(lunchPage, /protein-per-dollar-2026\.csv/);
  assert.match(lunchPage, /fiber-per-dollar-2026\.csv/);
  assert.match(lunchPage, /href="\/methodology\/"/);
  assert.equal(INDEX_NOINDEX_TOOL_PATHS.has("tools/work-lunch-protein-and-fiber-builder"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("work-lunch-protein-and-fiber-builder"), false);
  const questions = [
    "How much protein and fiber are in one built lunch?",
    "What does this work lunch cost?",
    "How do you pack the lunch so the bread or the crunch stays firm?",
    "What protein can go with a bagel if the bagel has no price here?",
    "Which crisp add-in has the most fiber in the portion this page uses?",
  ];
  assert.equal(questions.length, 5);
  for (const question of questions) assert.match(lunchPage, new RegExp(question.replaceAll("?", "\\?")));
  assert.match(lunchPage, /<details><summary>\{question\}<\/summary><p>\{answer\}<\/p><\/details>/);
  assertChartVoice(lunchPage);
  for (const href of LUNCH_LINKS) assert.match(lunchPage, new RegExp(href.replaceAll("/", "\\/")));
  assert.doesNotMatch(lunchPage, /how-to-keep-sandwiches-from-getting-soggy/);
  assert.doesNotMatch(lunchPage, /healthy-egg-sandwich-add-ins-toppings/);
  assertCanonicalInternalLinks(lunchPage, "lunch builder");
  const script = lunchPage.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline builder");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("chart heroes are 1200 by 675 JPEGs drawn from the CSVs", async () => {
  const costScript = read("scripts/generate-daily-protein-and-fiber-cost-index-chart.py");
  const lunchScript = read("scripts/generate-work-lunch-protein-and-fiber-builder-chart.py");
  assert.match(costScript, /protein-day-cost-2026\.csv/);
  assert.match(costScript, /fiber-day-cost-2026\.csv/);
  assert.match(lunchScript, /protein-per-dollar-2026\.csv/);
  assert.doesNotMatch(costScript, /-main\.jpg/);
  assert.doesNotMatch(lunchScript, /-main\.jpg/);
  for (const file of [
    "public/images/daily-protein-and-fiber-cost-index-chart.jpg",
    "public/images/work-lunch-protein-and-fiber-builder-chart.jpg",
  ]) {
    const bytes = readFileSync(file);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 675);
  }
});

test("page math follows the published CSV rows", () => {
  const proteinDays = rowsOf("public/data/protein-day-cost-2026.csv");
  const fiberDays = rowsOf("public/data/fiber-day-cost-2026.csv");
  assert.equal(new Set(proteinDays.map((row) => row.day)).size, 5);
  assert.equal(new Set(fiberDays.map((row) => row.day)).size, 5);
  const dayOne = proteinDays.filter((row) => row.day.startsWith("Day 1"));
  const grams = dayOne.reduce((sum, row) => sum + Number(row.protein_g), 0);
  const cost = dayOne.reduce((sum, row) => sum + Number(row.cost_usd), 0);
  assert.equal(Math.round(grams * 10) / 10, 52.7);
  assert.equal(Math.round(cost * 100) / 100, 0.82);

  const proteinDollars = rowsOf("public/data/one-dollar-protein-what-it-buys-2026.csv");
  const fiberDollars = rowsOf("public/data/one-dollar-fiber-what-it-buys-2026.csv");
  assert.equal(proteinDollars.length, 15);
  assert.equal(fiberDollars.length, 15);
  assert.equal(proteinDollars[0].food, "Whole wheat flour");
  assert.equal(proteinDollars[0].value, "96.0");
  assert.equal(fiberDollars[0].food, "Whole wheat flour");
  assert.equal(fiberDollars[0].value, "77.8");

  const protein = new Map(rowsOf("public/data/protein-per-dollar-2026.csv").map((row) => [row.food, row]));
  const fiber = new Map(rowsOf("public/data/fiber-per-dollar-2026.csv").map((row) => [row.food, row]));
  const noCook = rowsOf("public/data/no-cook-protein-per-dollar-2026.csv");
  const snacks = rowsOf("public/data/high-fiber-snacks-per-dollar-2026.csv");
  assert.equal(noCook.length, 15);
  assert.equal(snacks.length, 10);
  assert.equal(noCook.some((row) => row.food === "Eggs (large)"), false);
  assert.equal(noCook.some((row) => row.food.startsWith("Mozzarella")), false);
  function metrics(food, grams) {
    const proteinRow = protein.get(food);
    const fiberRow = fiber.get(food);
    const price = Number((proteinRow ?? fiberRow).price_per_100g_usd);
    return {
      protein: proteinRow ? (Number(proteinRow.protein_g_per_100g) * grams) / 100 : 0,
      fiber: fiberRow ? (Number(fiberRow.fiber_g_per_100g) * grams) / 100 : 0,
      cost: (price * grams) / 100,
    };
  }
  const bread = metrics("100% whole wheat bread", 52);
  const tuna = metrics("Canned tuna (chunk light, in water)", 113);
  const carrots = metrics("Carrots (whole, bagged)", 100);
  const totalProtein = bread.protein + tuna.protein + carrots.protein;
  const totalFiber = bread.fiber + tuna.fiber + carrots.fiber;
  const totalCost = bread.cost + tuna.cost + carrots.cost;
  assert.equal((Math.round(totalProtein * 10) / 10).toFixed(1), "28.4");
  assert.equal((Math.round(totalFiber * 10) / 10).toFixed(1), "5.9");
  assert.equal((Math.round(totalCost * 100) / 100).toFixed(2), "1.48");
  const eggs = metrics("Eggs (large)", 100);
  assert.equal((Math.round(eggs.cost * 100) / 100).toFixed(2), "0.37");
  assert.match(lunchPage, /100% whole wheat bread/);
  assert.match(lunchPage, /Sunflower seed kernels/);
});

test("contextual links stay off the nutrition hub and do not add recipes", () => {
  const nutritionHub = read("src/pages/nutrition/index.astro");
  assert.doesNotMatch(nutritionHub, /daily-protein-and-fiber-cost-index/);
  assert.doesNotMatch(nutritionHub, /work-lunch-protein-and-fiber-builder/);
  const recipes = readdirSync("src/data/articles").filter((name) => name.endsWith(".md"));
  const recipeCount = recipes.filter((name) => /^category:\s*"?recipes"?/m.test(read(join("src/data/articles", name)))).length;
  assert.equal(recipeCount, 86);
  assert.equal(INDEX_PRUNE_SLUGS.size, 105);
  for (const [path, href] of [
    ["src/pages/data/bls-grocery-prices-2017-to-2026/index.astro", "/data/daily-protein-and-fiber-cost-index/"],
    ["src/pages/statistics/index.astro", "/data/daily-protein-and-fiber-cost-index/"],
    ["src/pages/tools/grocery-budget-calculator/index.astro", "/tools/work-lunch-protein-and-fiber-builder/"],
    ["src/pages/tools/shopping-list-builder/index.astro", "/tools/work-lunch-protein-and-fiber-builder/"],
  ]) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, path);
    assert.equal(source.includes(`${href}#`), false, path);
  }
});

test("both new URLs are sitemap candidates once the site is built", () => {
  const dist = "dist";
  if (!existsSync(join(dist, "sitemap-0.xml"))) return;
  const xml = readdirSync(dist)
    .filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"))
    .map((name) => read(join(dist, name)))
    .join("\n");
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/data\/daily-protein-and-fiber-cost-index\//);
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/tools\/work-lunch-protein-and-fiber-builder\//);
  for (const folder of [
    "data/daily-protein-and-fiber-cost-index",
    "tools/work-lunch-protein-and-fiber-builder",
  ]) {
    const html = read(join(dist, folder, "index.html"));
    const robots = html.match(/<meta name="robots" content="([^"]+)"/);
    assert.ok(robots, `${folder} robots meta`);
    assert.equal(robots[1].includes("noindex"), false, folder);
    assert.doesNotMatch(html, /"@type":"FAQPage"|"@type": "FAQPage"/, folder);
    assert.match(html, /David Miller/, folder);
    assert.doesNotMatch(html, /href="[^"]+\.csv"/, folder);
    assert.doesNotMatch(html, /href="[^"]*#[^"]*"/, folder);
    assert.match(html, /28\.4|52\.7/);
  }
  const nutrition = read(join(dist, "nutrition/index.html"));
  const anchors = [...nutrition.matchAll(/<a\b/gi)].length;
  assert.ok(anchors <= 124, `/nutrition/ rendered ${anchors} anchors`);
});
