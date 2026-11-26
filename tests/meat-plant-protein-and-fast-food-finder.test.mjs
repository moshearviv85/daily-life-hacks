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

const PROTEIN_LINKS = [
  "/plant-vs-animal-protein-cost-per-dollar/",
  "/animal-protein-per-dollar-ranked/",
  "/cheapest-dairy-and-soy-protein-per-dollar/",
  "/protein-per-dollar-adjusted-for-quality/",
  "/methodology/",
  "/author/david-miller/",
];

const FINDER_LINKS = [
  "/fast-food-protein-per-dollar-ranked/",
  "/fast-food-meals-with-protein-and-fiber/",
  "/cheapest-fast-food-protein-under-5-dollars/",
  "/high-fiber-fast-food-under-500-calories/",
  "/methodology/",
  "/author/david-miller/",
];

const FAST_FOOD_INDEX = "src/pages/data/fast-food-protein-and-fiber-index/index.astro";

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
    if (href === "/data/fast-food-protein-and-fiber-index/" && !existsSync(FAST_FOOD_INDEX)) {
      assert.fail(`${label} links the fast-food index before that page exists`);
    }
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

const proteinPage = read("src/pages/data/meat-dairy-and-plant-protein-index/index.astro");
const finderPage = read("src/pages/tools/fast-food-protein-and-fiber-finder/index.astro");
const dataHub = read("src/pages/data/index.astro");
const toolsHub = read("src/pages/tools/index.astro");
const nutritionHub = read("src/pages/nutrition/index.astro");

test("the protein index is an indexable Dataset page with a grouped chart and no FAQ schema", () => {
  assert.match(proteinPage, /author=\{AUTHOR_NAME\}/);
  assert.match(proteinPage, /"@type": "WebPage"/);
  assert.match(proteinPage, /"@type": "Dataset"/);
  assert.match(proteinPage, /"@type": "BreadcrumbList"/);
  assert.match(proteinPage, /DATASET_PERSON_CREATOR/);
  assert.doesNotMatch(proteinPage, /FAQPage/);
  assert.doesNotMatch(proteinPage, /noindex/);
  assert.doesNotMatch(proteinPage, /\u2014/);
  assert.match(proteinPage, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(
    proteinPage.replaceAll("Not a photograph, and not an AI illustration", ""),
    /photo/i,
  );
  assert.match(proteinPage, /grouped bar chart/i);
  assert.match(proteinPage, /meat-per-dollar-protein-ranked-2026\.csv/);
  assert.match(proteinPage, /dairy-protein-per-dollar-ranked-2026\.csv/);
  assert.match(proteinPage, /plant-protein-per-dollar-ranked-2026\.csv/);
  assert.match(proteinPage, /protein-per-dollar-2026\.csv/);
  assert.match(proteinPage, /document\.addEventListener\('astro:page-load'/);
  assert.match(proteinPage, /browser tab/);
  assert.equal(INDEX_PRUNE_SLUGS.has("meat-dairy-and-plant-protein-index"), false);
  for (const href of PROTEIN_LINKS) assert.match(proteinPage, new RegExp(href.replaceAll("/", "\\/")));
  assertCanonicalInternalLinks(proteinPage, "protein index");
  assert.doesNotMatch(proteinPage, /href="\/nutrition\/"/);
  const script = proteinPage.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline filter");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("the fast-food finder is an indexable tool and stays complementary to a separate index", () => {
  assert.match(finderPage, /"@type": "WebApplication"/);
  assert.match(finderPage, /applicationCategory/);
  assert.match(finderPage, /"@type": "BreadcrumbList"/);
  assert.match(finderPage, /author=\{AUTHOR_NAME\}/);
  assert.doesNotMatch(finderPage, /FAQPage/);
  assert.doesNotMatch(finderPage, /noindex/);
  assert.doesNotMatch(finderPage, /\u2014/);
  assert.match(finderPage, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(
    finderPage.replaceAll("Not a photograph, and not an AI illustration", ""),
    /photo/i,
  );
  assert.match(finderPage, /bar chart/i);
  assert.match(finderPage, /fastfood-protein-per-dollar-2026\.csv/);
  assert.match(finderPage, /high-fiber-fast-food-2026\.csv/);
  assert.match(finderPage, /browser tab/);
  assert.match(finderPage, /href="\/methodology\/"/);
  assert.match(finderPage, /document\.addEventListener\('astro:page-load'/);
  assert.match(finderPage, /existsSync/);
  assert.match(finderPage, /fastFoodIndexExists &&/);
  assert.equal(INDEX_NOINDEX_TOOL_PATHS.has("tools/fast-food-protein-and-fiber-finder"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("fast-food-protein-and-fiber-finder"), false);
  const faqs = [
    ...finderPage.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs),
  ];
  assert.equal(faqs.length, 5);
  for (const href of FINDER_LINKS) assert.match(finderPage, new RegExp(href.replaceAll("/", "\\/")));
  assertCanonicalInternalLinks(finderPage, "finder");
  assert.doesNotMatch(finderPage, /href="\/nutrition\/"/);
  if (!existsSync(FAST_FOOD_INDEX)) {
    assert.equal(
      hrefs(finderPage).includes("/data/fast-food-protein-and-fiber-index/"),
      false,
    );
  }
  const script = finderPage.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline finder");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("chart heroes are 1200 by 675 JPEGs drawn from the CSVs", async () => {
  const proteinScript = read("scripts/generate-meat-dairy-plant-protein-chart.py");
  const finderScript = read("scripts/generate-fast-food-protein-fiber-finder-chart.py");
  assert.match(proteinScript, /meat-per-dollar-protein-ranked-2026\.csv/);
  assert.match(proteinScript, /dairy-protein-per-dollar-ranked-2026\.csv/);
  assert.match(proteinScript, /plant-protein-per-dollar-ranked-2026\.csv/);
  assert.match(finderScript, /fastfood-protein-per-dollar-2026\.csv/);
  assert.match(finderScript, /high-fiber-fast-food-2026\.csv/);
  assert.doesNotMatch(proteinScript, /-main\.jpg/);
  assert.doesNotMatch(finderScript, /-main\.jpg/);
  for (const file of [
    "public/images/meat-dairy-and-plant-protein-index-chart.jpg",
    "public/images/fast-food-protein-and-fiber-finder-chart.jpg",
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

test("page copy is backed by the category and fast-food CSV values", () => {
  const foods = [
    ...rowsOf("public/data/meat-per-dollar-protein-ranked-2026.csv"),
    ...rowsOf("public/data/dairy-protein-per-dollar-ranked-2026.csv"),
    ...rowsOf("public/data/plant-protein-per-dollar-ranked-2026.csv"),
  ];
  assert.equal(foods.length, 35);
  const byName = new Map(foods.map((row) => [row.food, row.value]));
  assert.equal(byName.get("Brown lentils (dry)"), "77.7");
  assert.equal(byName.get("Peanut butter"), "50.7");
  assert.equal(byName.get("Chicken drumsticks (bone-in)"), "50.3");
  assert.equal(byName.get("Eggs (large)"), "34.4");
  assert.equal(byName.get("Mozzarella (low-moisture part-skim)"), "30.1");
  assert.equal(byName.get("Chicken thighs (boneless, skinless)"), "27.7");
  assert.equal(byName.get("Greek yogurt (plain, nonfat)"), "27.5");
  assert.equal(byName.get("Pork shoulder butt roast (boneless)"), "25.2");
  assert.equal(byName.get("Chicken breast (boneless, skinless)"), "24.6");
  assert.equal(byName.get("TVP (textured vegetable protein)"), "23.4");
  assert.equal(byName.get("Tofu (extra firm)"), "13.6");
  assert.equal(byName.get("Ground beef (80/20)"), "11.3");
  const flour = rowsOf("public/data/protein-per-dollar-2026.csv").find(
    (row) => row.food === "Whole wheat flour",
  );
  assert.equal(flour.protein_g_per_dollar, "96.0");
  assert.equal(byName.has("Whole wheat flour"), false);
  for (const name of [
    "Brown lentils (dry)",
    "Peanut butter",
    "Chicken drumsticks (bone-in)",
    "Eggs (large)",
    "Ground beef (80/20)",
    "Whole wheat flour",
  ]) {
    assert.match(proteinPage, new RegExp(name.replace("(", "\\(").replace(")", "\\)")));
  }

  const priced = rowsOf("public/data/fastfood-protein-per-dollar-2026.csv");
  const fiber = rowsOf("public/data/high-fiber-fast-food-2026.csv");
  assert.equal(priced.length, 30);
  assert.equal(fiber.length, 29);
  const cup = priced.find((row) => row.item.startsWith("High Protein Cup"));
  assert.equal(cup.protein_g_per_dollar, "8.4");
  assert.equal(cup.price_usd, "3.82");
  const breast = priced.find((row) => row.item.startsWith("Original Recipe Chicken Breast"));
  assert.equal(breast.price_usd, "5.10");
  const bowl = fiber.find((row) => row.item.startsWith("Veggie burrito bowl"));
  assert.equal(bowl.fiber_g, "25");
  assert.equal(bowl.calories, "725");
  const soup = fiber.find((row) => row.item.startsWith("Chicken Tortilla Soup"));
  assert.equal(soup.fiber_g, "18");
  assert.equal(soup.calories, "350");
  assert.match(finderPage, /PRICE_CAP = 5/);
  assert.match(finderPage, /CALORIE_CAP = 500/);
});

test("hub links stay off the nutrition hub and do not move the data catalog date", () => {
  assert.match(dataHub, /dateModified: DATA_RELEASE_DATE/);
  assert.equal(DATA_RELEASE_DATE, "2026-09-05");
  const studiesAt = dataHub.indexOf("Featured 2026 Visual Studies Built From These Datasets");
  const citeAt = dataHub.indexOf('id="how-to-cite"');
  const explorerAt = dataHub.indexOf("/data/meat-dairy-and-plant-protein-index/");
  assert.ok(studiesAt >= 0 && citeAt > studiesAt && explorerAt > citeAt);
  assert.doesNotMatch(dataHub.slice(studiesAt, citeAt), /meat-dairy-and-plant-protein-index/);
  assert.match(toolsHub, /href: "\/tools\/fast-food-protein-and-fiber-finder\/"/);
  assert.match(toolsHub, /86 recipes/);
  assert.doesNotMatch(nutritionHub, /meat-dairy-and-plant-protein-index/);
  assert.doesNotMatch(nutritionHub, /fast-food-protein-and-fiber-finder/);
  for (const [path, href] of [
    ["src/pages/tools/grocery-budget-calculator/index.astro", "/data/meat-dairy-and-plant-protein-index/"],
    ["src/pages/tools/recipe-cost-calculator/index.astro", "/data/meat-dairy-and-plant-protein-index/"],
    ["src/pages/tools/grocery-unit-price-calculator/index.astro", "/tools/fast-food-protein-and-fiber-finder/"],
    ["src/pages/tools/grocery-trip-savings-calculator/index.astro", "/tools/fast-food-protein-and-fiber-finder/"],
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
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/data\/meat-dairy-and-plant-protein-index\//);
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/tools\/fast-food-protein-and-fiber-finder\//);
  for (const folder of [
    "data/meat-dairy-and-plant-protein-index",
    "tools/fast-food-protein-and-fiber-finder",
  ]) {
    const html = read(join(dist, folder, "index.html"));
    const robots = html.match(/<meta name="robots" content="([^"]+)"/);
    assert.ok(robots, `${folder} robots meta`);
    assert.equal(robots[1].includes("noindex"), false, folder);
    assert.doesNotMatch(html, /"@type":"FAQPage"|"@type": "FAQPage"/, folder);
    assert.match(html, /David Miller/, folder);
    assert.doesNotMatch(html, /href="[^"]+\.csv"/, folder);
    assert.doesNotMatch(html, /href="[^"]*#[^"]*"/, folder);
    if (folder.startsWith("tools/") && existsSync(FAST_FOOD_INDEX)) {
      assert.match(html, /\/data\/fast-food-protein-and-fiber-index\//, folder);
    }
    if (folder.startsWith("tools/") && !existsSync(FAST_FOOD_INDEX)) {
      assert.equal(html.includes("/data/fast-food-protein-and-fiber-index/"), false, folder);
    }
  }
  const nutrition = read(join(dist, "nutrition/index.html"));
  const anchors = [...nutrition.matchAll(/<a\b/gi)].length;
  assert.ok(anchors <= 124, `/nutrition/ rendered ${anchors} anchors`);
});
