import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { DATA_RELEASE_DATE } from "../src/content/datasets.ts";
import { parseCsv } from "../src/content/price-basis.mjs";
import {
  chartPlates,
  loadRiceBeansModel,
  money,
  oneDecimal,
  quoteRiceBeans,
} from "../src/lib/rice-beans-portion.mjs";
import {
  chartComparison,
  loadPantryCostIndex,
  money as pantryMoney,
} from "../src/lib/pantry-cost-index.mjs";

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

const CALCULATOR_LINKS = [
  "/can-you-eat-rice-and-beans-everyday/",
  "/beans-and-rice-complete-protein-meal/",
  "/how-many-pounds-of-dried-beans-for-a-week/",
  "/how-to-cook-dried-beans-from-scratch/",
  "/methodology/",
  "/author/david-miller/",
];

const INDEX_LINKS = [
  "/canned-vs-dry-beans-cost-and-sodium-per-serving/",
  "/canned-beans-vs-dried-beans-nutrition/",
  "/cheapest-shelf-stable-pantry-foods-for-protein/",
  "/how-much-protein-and-fiber-in-canned-vs-frozen-vs-dry-staples/",
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

function assertCanonicalInternalLinks(source, label) {
  for (const href of hrefs(source)) {
    if (href === "/" || /^(?:https?:|mailto:)/i.test(href)) continue;
    assert.equal(href.includes("#"), false, `${label} hash link ${href}`);
    assert.equal(/\.csv(?:$|\?)/i.test(href), false, `${label} csv link ${href}`);
    assert.match(href, /^\/[a-z0-9-/]+\/$/, `${label} canonical ${href}`);
    const slug = href.split("/").filter(Boolean).pop();
    assert.equal(ORPHANS.has(slug), false, `${label} orphan ${href}`);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${label} pruned ${href}`);
    assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(href.replace(/^\/|\/$/g, "")), false, href);
    if (existsSync(`src/data/articles/${slug}.md`) || existsSync(`src/pages/${slug}.astro`)) continue;
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

const calculatorPage = read("src/pages/tools/rice-and-beans-portion-and-cost-calculator/index.astro");
const indexPage = read("src/pages/data/canned-vs-dry-beans-and-pantry-cost-index/index.astro");
const dataHub = read("src/pages/data/index.astro");
const toolsHub = read("src/pages/tools/index.astro");
const nutritionHub = read("src/pages/nutrition/index.astro");
const foodValue = read("src/pages/food-value-database/index.astro");

test("the rice and beans calculator is an indexable tool with five visible answers and no FAQ schema", () => {
  assert.match(calculatorPage, /"@type": "WebApplication"/);
  assert.match(calculatorPage, /applicationCategory/);
  assert.match(calculatorPage, /"@type": "BreadcrumbList"/);
  assert.match(calculatorPage, /author=\{AUTHOR_NAME\}/);
  assert.doesNotMatch(calculatorPage, /FAQPage/);
  assert.doesNotMatch(calculatorPage, /noindex/);
  assert.doesNotMatch(calculatorPage, /\u2014/);
  assert.doesNotMatch(calculatorPage, /\u2013/);
  assert.match(calculatorPage, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(
    calculatorPage.replaceAll("Not a photograph, and not an AI illustration", ""),
    /photo/i,
  );
  assert.match(calculatorPage, /bar chart/i);
  assert.match(calculatorPage, /\{BEAN_COST_FILE\}/);
  assert.match(calculatorPage, /\{BEAN_FIBER_FILE\}/);
  assert.match(calculatorPage, /\{PAIRS_FILE\}/);
  assert.match(calculatorPage, /\{PANTRY_FILE\}/);
  assert.match(calculatorPage, /browser tab/);
  assert.match(calculatorPage, /href="\/methodology\/"/);
  assert.match(calculatorPage, /document\.addEventListener\('astro:page-load'/);
  assert.equal(INDEX_NOINDEX_TOOL_PATHS.has("tools/rice-and-beans-portion-and-cost-calculator"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("rice-and-beans-portion-and-cost-calculator"), false);
  const faqs = [
    ...calculatorPage.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs),
  ];
  assert.equal(faqs.length, 5);
  for (const href of CALCULATOR_LINKS) assert.match(calculatorPage, new RegExp(href.replaceAll("/", "\\/")));
  assertCanonicalInternalLinks(calculatorPage, "calculator");
  assert.doesNotMatch(calculatorPage, /href="\/nutrition\/"/);
  assert.doesNotMatch(calculatorPage, /canned-vs-dry-beans-and-pantry-cost-index/);
  const script = calculatorPage.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline calculator");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("the pantry cost index is an indexable Dataset page with a comparison chart and no FAQ schema", () => {
  assert.match(indexPage, /author=\{AUTHOR_NAME\}/);
  assert.match(indexPage, /"@type": "WebPage"/);
  assert.match(indexPage, /"@type": "Dataset"/);
  assert.match(indexPage, /"@type": "BreadcrumbList"/);
  assert.match(indexPage, /DATASET_PERSON_CREATOR/);
  assert.doesNotMatch(indexPage, /FAQPage/);
  assert.doesNotMatch(indexPage, /noindex/);
  assert.doesNotMatch(indexPage, /\u2014/);
  assert.doesNotMatch(indexPage, /\u2013/);
  assert.match(indexPage, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(
    indexPage.replaceAll("Not a photograph, and not an AI illustration", ""),
    /photo/i,
  );
  assert.match(indexPage, /Grouped bar chart/);
  assert.match(indexPage, /\{PANTRY_FILE\}/);
  assert.match(indexPage, /\{BEAN_COST_FILE\}/);
  assert.match(indexPage, /\{BEAN_FIBER_FILE\}/);
  assert.match(indexPage, /\{FIBER_FILE\}/);
  assert.match(indexPage, /\{SODIUM_FILE\}/);
  assert.match(indexPage, /document\.addEventListener\('astro:page-load'/);
  assert.match(indexPage, /browser tab/);
  assert.equal(INDEX_PRUNE_SLUGS.has("canned-vs-dry-beans-and-pantry-cost-index"), false);
  for (const href of INDEX_LINKS) assert.match(indexPage, new RegExp(href.replaceAll("/", "\\/")));
  assertCanonicalInternalLinks(indexPage, "pantry index");
  assert.doesNotMatch(indexPage, /href="\/nutrition\/"/);
  assert.doesNotMatch(indexPage, /rice-and-beans-portion-and-cost-calculator/);
  const script = indexPage.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline filter");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("chart heroes are 1200 by 675 JPEGs drawn from the CSVs", async () => {
  const calculatorScript = read("scripts/generate-rice-and-beans-portion-calculator-chart.py");
  const indexScript = read("scripts/generate-canned-vs-dry-beans-pantry-cost-index-chart.py");
  assert.match(calculatorScript, /cheapest-complete-protein-pairs-2026\.csv/);
  assert.match(calculatorScript, /canned-vs-dry-beans-cost-2026\.csv/);
  assert.match(calculatorScript, /shelf-stable-pantry-per-dollar-2026\.csv/);
  assert.match(calculatorScript, /protein-per-dollar-2026\.csv/);
  assert.match(indexScript, /canned-vs-dry-beans-cost-2026\.csv/);
  assert.doesNotMatch(calculatorScript, /-main\.jpg/);
  assert.doesNotMatch(indexScript, /-main\.jpg/);
  assert.doesNotMatch(calculatorScript, /photo/i);
  assert.doesNotMatch(indexScript, /photo/i);
  for (const file of [
    "public/images/rice-and-beans-portion-and-cost-calculator-chart.jpg",
    "public/images/canned-vs-dry-beans-and-pantry-cost-index-chart.jpg",
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

test("page copy is backed by the published rice, bean, and pantry rows", () => {
  const model = loadRiceBeansModel();
  assert.equal(model.beans.length, 5);
  assert.deepEqual(
    model.beans.map((bean) => bean.pairRateLabel),
    ["57.2", "55.2", "48.2", "47.3", "47.1"],
  );
  const week = quoteRiceBeans(model, {
    people: 4,
    days: 7,
    presetId: "dinner",
    beanFood: "Pinto beans (dry)",
  });
  assert.equal(week.beanGrams, 2520);
  assert.equal(week.riceGrams, 1680);
  assert.equal(money(week.batchCost), "$12.84");
  assert.equal(oneDecimal(week.proteinPerPerson), "23.8");
  assert.equal(oneDecimal(week.fiberPerPerson), "16.1");
  assert.equal(money(week.batchCost / week.meals), "$0.46");
  assert.equal(week.shopCans, 23);
  const plates = chartPlates(model);
  assert.equal(money(plates[0].cost), "$0.41");
  assert.equal(plates[0].protein.toFixed(1), "26.7");
  assert.match(calculatorPage, /pairRateLabel/);

  const rows = loadPantryCostIndex();
  assert.equal(rows.length, 27);
  assert.equal(rows.filter((row) => row.format === "Dry").length, 7);
  assert.equal(rows.filter((row) => row.format === "Canned").length, 3);
  assert.equal(rows.filter((row) => row.format === "Shelf-stable").length, 17);
  const costs = rowsOf("public/data/canned-vs-dry-beans-cost-2026.csv");
  const fibers = rowsOf("public/data/beans-double-win-fiber-protein-2026.csv");
  const pantry = rowsOf("public/data/shelf-stable-pantry-per-dollar-2026.csv");
  assert.equal(costs.length, 10);
  assert.equal(fibers.length, 10);
  assert.equal(pantry.length, 27);
  const black = rows.find((row) => row.food === "Black beans (dry)");
  const can = rows.find((row) => row.food === "Canned black beans");
  const kidney = rows.find((row) => row.food === "Canned kidney beans");
  assert.equal(black.proteinLabel, "58.0");
  assert.equal(black.fiberLabel, "41.6");
  assert.equal(black.sodiumLabel, "5");
  assert.equal(pantryMoney(black.servingCost), "$0.14");
  assert.equal(can.proteinLabel, "30.1");
  assert.equal(can.sodiumLabel, "");
  assert.equal(pantryMoney(can.servingCost), "$0.29");
  assert.equal(kidney.proteinLabel, "23.4");
  assert.equal(kidney.sodiumLabel, "296");
  const bars = chartComparison(rows);
  assert.equal(bars[0].dryProtein, 58);
  assert.equal(bars[0].cannedProtein, 30.1);
  assert.equal(bars[1].dryProtein, 56.7);
  assert.equal(bars[1].cannedProtein, 22);
  assert.match(indexPage, /proteinLabel/);
  assert.match(indexPage, /sodiumLabel/);
});

test("hub links stay off the nutrition hub and do not move locked dates", () => {
  assert.match(dataHub, /dateModified: DATA_RELEASE_DATE/);
  assert.equal(DATA_RELEASE_DATE, "2026-09-05");
  const studiesAt = dataHub.indexOf("Featured 2026 Visual Studies Built From These Datasets");
  const citeAt = dataHub.indexOf('id="how-to-cite"');
  const explorerAt = dataHub.indexOf("/data/canned-vs-dry-beans-and-pantry-cost-index/");
  assert.ok(studiesAt >= 0 && citeAt > studiesAt && explorerAt > citeAt);
  assert.doesNotMatch(dataHub.slice(studiesAt, citeAt), /canned-vs-dry-beans-and-pantry-cost-index/);
  assert.match(toolsHub, /href: "\/tools\/rice-and-beans-portion-and-cost-calculator\/"/);
  assert.match(toolsHub, /86 recipes/);
  assert.match(foodValue, /href="\/data\/canned-vs-dry-beans-and-pantry-cost-index\/"/);
  assert.match(foodValue, /const dateModified = "2026-09-24";/);
  assert.doesNotMatch(nutritionHub, /canned-vs-dry-beans-and-pantry-cost-index/);
  assert.doesNotMatch(nutritionHub, /rice-and-beans-portion-and-cost-calculator/);
  for (const [path, href] of [
    ["src/pages/tools/complete-protein-pair-builder/index.astro", "/tools/rice-and-beans-portion-and-cost-calculator/"],
    ["src/pages/tools/pantry-meal-cost-and-storage-planner/index.astro", "/tools/rice-and-beans-portion-and-cost-calculator/"],
    ["src/pages/data/index.astro", "/data/canned-vs-dry-beans-and-pantry-cost-index/"],
    ["src/pages/food-value-database/index.astro", "/data/canned-vs-dry-beans-and-pantry-cost-index/"],
  ]) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, path);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.equal(source.includes("\u2014"), false, path);
  }
});

test("both new URLs are sitemap candidates once the site is built", () => {
  const dist = "dist";
  if (!existsSync(join(dist, "sitemap-0.xml"))) return;
  const xml = readdirSync(dist)
    .filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"))
    .map((name) => read(join(dist, name)))
    .join("\n");
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/tools\/rice-and-beans-portion-and-cost-calculator\//);
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/data\/canned-vs-dry-beans-and-pantry-cost-index\//);
  for (const folder of [
    "tools/rice-and-beans-portion-and-cost-calculator",
    "data/canned-vs-dry-beans-and-pantry-cost-index",
  ]) {
    const html = read(join(dist, folder, "index.html"));
    const robots = html.match(/<meta name="robots" content="([^"]+)"/);
    assert.ok(robots, `${folder} robots meta`);
    assert.equal(robots[1].includes("noindex"), false, folder);
    assert.doesNotMatch(html, /"@type":"FAQPage"|"@type": "FAQPage"/, folder);
    assert.match(html, /David Miller/, folder);
    assert.match(html, /canned-vs-dry-beans-cost-2026\.csv/, folder);
    if (folder.startsWith("tools/")) {
      assert.match(html, /\$12\.84/, folder);
      assert.match(html, /57\.2/, folder);
      assert.match(html, /beans-double-win-fiber-protein-2026\.csv/, folder);
      assert.match(html, /cheapest-complete-protein-pairs-2026\.csv/, folder);
    }
    if (folder.startsWith("data/")) {
      assert.match(html, /58\.0/, folder);
      assert.match(html, /296/, folder);
      assert.match(html, /shelf-stable-pantry-per-dollar-2026\.csv/, folder);
      assert.match(html, /beans-double-win-fiber-protein-2026\.csv/, folder);
    }
    assert.doesNotMatch(html, /href="[^"]+\.csv"/, folder);
    assert.doesNotMatch(html, /href="[^"]*#[^"]*"/, folder);
  }
  const nutrition = read(join(dist, "nutrition/index.html"));
  const anchors = [...nutrition.matchAll(/<a\b/gi)].length;
  assert.ok(anchors <= 124, `/nutrition/ rendered ${anchors} anchors`);
});
