import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { DATA_RELEASE_DATE } from "../src/content/datasets.ts";
import { parseCsv } from "../src/content/price-basis.mjs";

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

const BLS_LINKS = [
  "/protein-per-dollar-2017-to-2026-bls-trends/",
  "/us-regional-grocery-protein-prices-october-2026/",
  "/cost-of-50g-protein-and-30g-fiber-per-day/",
  "/plant-vs-animal-protein-cost-per-dollar/",
  "/methodology/",
  "/author/david-miller/",
];

const SODIUM_LINKS = [
  "/low-sodium-high-protein-foods-per-dollar/",
  "/canned-vs-dry-beans-cost-and-sodium-per-serving/",
  "/cheapest-canned-fish-and-seafood-protein-per-dollar/",
  "/data/bls-grocery-prices-2017-to-2026/",
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
    if (existsSync(`src/data/articles/${slug}.md`) || existsSync(`src/pages/${slug}.astro`)) {
      continue;
    }
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

const blsPage = read("src/pages/data/bls-grocery-prices-2017-to-2026/index.astro");
const sodiumPage = read("src/pages/tools/sodium-per-dollar-calculator/index.astro");
const dataHub = read("src/pages/data/index.astro");
const toolsHub = read("src/pages/tools/index.astro");
const foodValue = read("src/pages/food-value-database/index.astro");
const nutritionHub = read("src/pages/nutrition/index.astro");

test("the BLS explorer is an indexable Dataset page with a chart hero and no FAQ schema", () => {
  assert.match(blsPage, /author=\{AUTHOR_NAME\}/);
  assert.match(blsPage, /"@type": "WebPage"/);
  assert.match(blsPage, /"@type": "Dataset"/);
  assert.match(blsPage, /"@type": "BreadcrumbList"/);
  assert.match(blsPage, /DATASET_PERSON_CREATOR/);
  assert.doesNotMatch(blsPage, /FAQPage/);
  assert.doesNotMatch(blsPage, /noindex/);
  assert.doesNotMatch(blsPage, /\u2014/);
  assert.match(blsPage, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(
    blsPage.replaceAll("Not a photograph, and not an AI illustration", ""),
    /photo/i,
  );
  assert.match(blsPage, /line chart/i);
  assert.match(blsPage, /bls-nutrition-per-dollar-monthly\.csv/);
  assert.match(blsPage, /bls-nutrition-per-dollar-latest\.csv/);
  assert.match(blsPage, /FF1101/);
  assert.match(blsPage, /document\.addEventListener\('astro:page-load'/);
  assert.match(blsPage, /browser tab/);
  assert.equal(INDEX_PRUNE_SLUGS.has("bls-grocery-prices-2017-to-2026"), false);
  for (const href of BLS_LINKS) assert.match(blsPage, new RegExp(href.replaceAll("/", "\\/")));
  assertCanonicalInternalLinks(blsPage, "bls");
  assert.doesNotMatch(blsPage, /href="\/nutrition\/"/);
});

test("the sodium calculator is an indexable tool with five visible answers and no FAQ schema", () => {
  assert.match(sodiumPage, /"@type": "WebApplication"/);
  assert.match(sodiumPage, /applicationCategory/);
  assert.match(sodiumPage, /"@type": "BreadcrumbList"/);
  assert.match(sodiumPage, /author=\{AUTHOR_NAME\}/);
  assert.doesNotMatch(sodiumPage, /"@type": "FAQPage"/);
  assert.doesNotMatch(sodiumPage, /noindex/);
  assert.doesNotMatch(sodiumPage, /\u2014/);
  assert.match(sodiumPage, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(
    sodiumPage.replaceAll("Not a photograph, and not an AI illustration", ""),
    /photo/i,
  );
  assert.match(sodiumPage, /bar chart/i);
  assert.match(sodiumPage, /sodium-per-dollar-2026\.csv/);
  assert.match(sodiumPage, /protein-per-dollar-2026\.csv/);
  assert.match(sodiumPage, /fiber-per-dollar-2026\.csv/);
  assert.match(sodiumPage, /21 CFR 101\.61/);
  assert.match(sodiumPage, /2,300/);
  assert.match(sodiumPage, /browser tab/);
  assert.match(sodiumPage, /href="\/methodology\/"/);
  assert.match(sodiumPage, /document\.addEventListener\('astro:page-load'/);
  assert.equal(INDEX_NOINDEX_TOOL_PATHS.has("tools/sodium-per-dollar-calculator"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("sodium-per-dollar-calculator"), false);
  const faqs = [
    ...sodiumPage.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs),
  ];
  assert.equal(faqs.length, 5);
  for (const href of SODIUM_LINKS) assert.match(sodiumPage, new RegExp(href.replaceAll("/", "\\/")));
  assertCanonicalInternalLinks(sodiumPage, "sodium");
  assert.doesNotMatch(sodiumPage, /Cottage cheese/);
  assert.doesNotMatch(sodiumPage, /82 mg/);
  const script = sodiumPage.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline calculator");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("chart heroes are 1200 by 675 JPEGs drawn from the CSVs", async () => {
  const blsScript = read("scripts/generate-bls-grocery-prices-chart.py");
  const sodiumScript = read("scripts/generate-sodium-per-dollar-calculator-chart.py");
  assert.match(blsScript, /bls-nutrition-per-dollar-monthly\.csv/);
  assert.match(blsScript, /FF1101/);
  assert.match(sodiumScript, /sodium-per-dollar-2026\.csv/);
  assert.match(sodiumScript, /FDA_LINE = 140/);
  assert.doesNotMatch(blsScript, /-main\.jpg/);
  assert.doesNotMatch(sodiumScript, /-main\.jpg/);
  for (const file of [
    "public/images/bls-grocery-prices-2017-to-2026-data-chart.jpg",
    "public/images/sodium-per-dollar-calculator-chart.jpg",
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

test("explorer copy uses the CSV values for breast protein and the six sodium bars", () => {
  const monthly = rowsOf("public/data/bls-nutrition-per-dollar-monthly.csv").filter(
    (row) => row.bls_item_code === "FF1101" && row.area_name === "U.S. city average",
  );
  const byDate = new Map(monthly.map((row) => [row.date, row]));
  assert.equal(byDate.get("2017-01-01").protein_g_per_dollar, "31.72");
  assert.equal(byDate.get("2026-10-01").protein_g_per_dollar, "24.90");
  assert.match(blsPage, /breastUsJan\.protein_g_per_dollar/);
  assert.match(blsPage, /breastUsOct\.protein_g_per_dollar/);

  const sodium = new Map(
    rowsOf("public/data/sodium-per-dollar-2026.csv").map((row) => [row.food, row.sodium_mg_per_100g]),
  );
  assert.equal(sodium.get("Almonds"), "1");
  assert.equal(sodium.get("Black beans (dry)"), "5");
  assert.equal(sodium.get("Frozen shelled edamame"), "6");
  assert.equal(sodium.get("Chicken drumsticks (bone-in)"), "106");
  assert.equal(sodium.get("Canned kidney beans"), "296");
  assert.equal(sodium.get("Cheddar cheese"), "653");
  assert.equal(sodium.has("Cottage cheese"), false);
  for (const name of [
    "Almonds",
    "Black beans (dry)",
    "Frozen shelled edamame",
    "Chicken drumsticks (bone-in)",
    "Canned kidney beans",
    "Cheddar cheese",
  ]) {
    assert.match(sodiumPage, new RegExp(name.replace("(", "\\(").replace(")", "\\)")));
  }
});

test("hub links sit below the locked data-catalog date and off the nutrition hub", () => {
  assert.match(dataHub, /dateModified: DATA_RELEASE_DATE/);
  assert.equal(DATA_RELEASE_DATE, "2026-09-05");
  const studiesAt = dataHub.indexOf("Featured 2026 Visual Studies Built From These Datasets");
  const citeAt = dataHub.indexOf('id="how-to-cite"');
  const explorerAt = dataHub.indexOf("/data/bls-grocery-prices-2017-to-2026/");
  assert.ok(studiesAt >= 0 && citeAt > studiesAt && explorerAt > citeAt);
  assert.doesNotMatch(dataHub.slice(studiesAt, citeAt), /bls-grocery-prices-2017-to-2026/);
  assert.match(toolsHub, /href: "\/tools\/sodium-per-dollar-calculator\/"/);
  assert.match(foodValue, /href="\/tools\/sodium-per-dollar-calculator\/"/);
  assert.match(foodValue, /const dateModified = "2026-09-24";/);
  assert.doesNotMatch(nutritionHub, /bls-grocery-prices-2017-to-2026/);
  assert.doesNotMatch(nutritionHub, /sodium-per-dollar-calculator/);
});

test("both new URLs are sitemap candidates once the site is built", () => {
  const dist = "dist";
  if (!existsSync(join(dist, "sitemap-0.xml"))) return;
  const xml = readdirSync(dist)
    .filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"))
    .map((name) => read(join(dist, name)))
    .join("\n");
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/data\/bls-grocery-prices-2017-to-2026\//);
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/tools\/sodium-per-dollar-calculator\//);
  for (const folder of [
    "data/bls-grocery-prices-2017-to-2026",
    "tools/sodium-per-dollar-calculator",
  ]) {
    const html = read(join(dist, folder, "index.html"));
    const robots = html.match(/<meta name="robots" content="([^"]+)"/);
    assert.ok(robots, `${folder} robots meta`);
    assert.equal(robots[1].includes("noindex"), false, folder);
    assert.doesNotMatch(html, /"@type":"FAQPage"|"@type": "FAQPage"/, folder);
    assert.match(html, /David Miller/, folder);
    assert.doesNotMatch(html, /href="[^"]+\.csv"/, folder);
    assert.doesNotMatch(html, /href="[^"]*#[^"]*"/, folder);
  }
});
