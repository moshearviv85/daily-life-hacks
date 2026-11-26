import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { CATEGORY_HUBS, assembleHub } from "../src/content/category-hubs.ts";
import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";
import { costForRows } from "../src/lib/recipe-cost.mjs";
import {
  foodsByDescription,
  nutritionFromFrontmatter,
  resolveRecipeLines,
} from "../src/lib/recipe-nutrition.mjs";
import { loadRecipeArticles } from "../src/lib/recipe-articles.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DAY = "2026-11-26";
const SHEET = "sheet-pan-chicken-thighs-and-chickpeas-high-protein";
const CURRY = "budget-green-split-pea-and-sweet-potato-curry";
const ORPHANS = [
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
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function article(slug) {
  return read(`src/data/articles/${slug}.md`);
}

function body(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
}

function field(markdown, name) {
  return extractFrontmatterField(markdown, name);
}

test("both recipe chart pages are dated, authored, and kept out of FAQPage", () => {
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const redirects = read("public/_redirects");
  const orphans = new Set(ORPHANS);

  for (const slug of [SHEET, CURRY]) {
    const markdown = article(slug);
    const excerpt = field(markdown, "excerpt");
    assert.equal(field(markdown, "author"), "David Miller", slug);
    assert.equal(field(markdown, "category"), "recipes", slug);
    assert.equal(field(markdown, "date"), DAY, slug);
    assert.equal(field(markdown, "dateModified"), DAY, slug);
    assert.equal(field(markdown, "substantiveUpdate"), DAY, slug);
    assert.equal(field(markdown, "image"), `/images/${slug}-chart.jpg`, slug);
    assert.match(field(markdown, "imageAlt"), /chart/i, slug);
    assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i, slug);
    assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${slug} excerpt ${excerpt.length}`);
    assert.equal(markdown.includes("FAQPage"), false, slug);
    assert.equal(markdown.includes("\u2014"), false, slug);
    assert.match(registry, new RegExp(`"${slug}": "${DAY}"`));
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, slug);
    assert.doesNotMatch(redirects, new RegExp(`^/${slug}(?:/)?\\s`, "m"), slug);
    assert.equal(existsSync(join(ROOT, "public/images", `${slug}-main.jpg`)), false, slug);
    assert.equal(existsSync(join(ROOT, "public/images", `${slug}-chart.jpg`)), true, slug);
    assert.match(body(markdown), /Not a photograph/, slug);
    assert.match(markdown, /protein-per-dollar-2026\.csv/);
    assert.match(markdown, /fiber-per-dollar-2026\.csv/);
    assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/, slug);
    assert.doesNotMatch(markdown, /href=["'][^"']*\.csv/i, slug);
    assert.match(body(markdown), new RegExp(`\\]\\(/images/${slug}-chart\\.jpg\\)`));

    for (const href of [...body(markdown).matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1])) {
      assert.equal(href.includes("#"), false, `${slug} ${href}`);
      if (href.startsWith("/images/")) continue;
      assert.equal(href.endsWith("/"), true, href);
      const target = href.slice(1, -1);
      assert.equal(orphans.has(target), false, `${slug} links orphan ${target}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(target), false, `${slug} links pruned ${target}`);
      const articlePath = join(ROOT, "src/data/articles", `${target}.md`);
      const pagePath = join(ROOT, "src/pages", target, "index.astro");
      const pageFile = join(ROOT, "src/pages", `${target}.astro`);
      assert.equal(
        existsSync(articlePath) || existsSync(pagePath) || existsSync(pageFile),
        true,
        `${slug} links missing ${href}`,
      );
    }
  }
});

test("the pan and the curry match FoodData Central and the price files", () => {
  const cache = JSON.parse(read("src/data/fdc-cache.json"));
  const foods = foodsByDescription(cache);
  const articles = new Map(loadRecipeArticles(join(ROOT, "src/data/articles")).map((entry) => [entry.id, entry]));

  const sheet = articles.get(SHEET);
  const curry = articles.get(CURRY);
  assert.equal(sheet.data.servings, 4);
  assert.equal(curry.data.servings, 4);
  assert.equal(resolveRecipeLines(sheet.data.ingredients, foods).unmapped.length, 0);
  assert.equal(resolveRecipeLines(curry.data.ingredients, foods).unmapped.length, 0);

  const sheetNutrition = nutritionFromFrontmatter({ ...sheet.data, id: SHEET }, cache);
  const curryNutrition = nutritionFromFrontmatter({ ...curry.data, id: CURRY }, cache);
  assert.equal(sheetNutrition.rounded.kcal, 407);
  assert.equal(sheetNutrition.rounded.protein, 36.4);
  assert.equal(sheetNutrition.rounded.fiber, 9.2);
  assert.equal(Number(sheet.data.calories), 407);
  assert.equal(curryNutrition.rounded.kcal, 523);
  assert.equal(curryNutrition.rounded.protein, 19.9);
  assert.equal(curryNutrition.rounded.fiber, 17.7);
  assert.equal(Number(curry.data.calories), 523);
  assert.equal(sheetNutrition.rows.find((row) => row.fdcId === 173627).grams, 570);
  assert.equal(sheetNutrition.rows.find((row) => row.fdcId === 173801).grams, 254);
  assert.equal(curryNutrition.rows.find((row) => row.fdcId === 172428).grams, 240);
  assert.equal(curryNutrition.rows.find((row) => row.fdcId === 169703).grams, 250);

  const sheetCost = costForRows(sheetNutrition.rows, 4);
  const curryCost = costForRows(curryNutrition.rows, 4);
  assert.equal(sheetCost.complete, false);
  assert.equal(curryCost.complete, false);
  assert.equal(sheetCost.perServing.toFixed(2), "1.55");
  assert.equal(curryCost.perServing.toFixed(2), "0.42");
  assert.ok(curryCost.perServing < 0.75);
  assert.equal(sheetCost.unpriced.some((item) => item.includes("chickpeas")), true);
  assert.equal(curryCost.unpriced.some((item) => item.includes("spinach")), true);

  const sheetMarkdown = article(SHEET);
  const curryMarkdown = article(CURRY);
  assert.match(sheetMarkdown, /36\.4 g/);
  assert.match(sheetMarkdown, /9\.2 g/);
  assert.match(sheetMarkdown, /\$1\.79/);
  assert.match(sheetMarkdown, /\$1\.55/);
  assert.match(curryMarkdown, /19\.9 g/);
  assert.match(curryMarkdown, /17\.7 g/);
  assert.match(curryMarkdown, /\$0\.42/);
  assert.doesNotMatch(body(sheetMarkdown), /split-pea-soup-recipe-high-fiber/);
  assert.doesNotMatch(body(curryMarkdown), /split-pea-soup-recipe-high-fiber/);
});

test("tool pages link each new recipe once, on a canonical path", () => {
  const sources = [
    ["src/pages/tools/recipe-cost-calculator/index.astro", `/${SHEET}/`],
    ["src/pages/tools/grocery-unit-price-calculator/index.astro", `/${SHEET}/`],
    ["src/pages/tools/dried-beans-to-canned-converter/index.astro", `/${CURRY}/`],
    ["src/pages/tools/grocery-budget-calculator/index.astro", `/${CURRY}/`],
  ];
  for (const [path, href] of sources) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, `${path} -> ${href}`);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.doesNotMatch(source, /\[[^\]]*\]\([^)]*\.csv/);
    assert.equal(source.includes("FAQPage"), false, path);
  }
});

test("new recipes stay on the recipes hub and do not push /nutrition/ past 124", () => {
  const header = read("src/components/Header.astro");
  const footer = read("src/components/Footer.astro");
  const chrome = [...header.matchAll(/href:\s*"([^"]+)"/g)].length * 2
    + (header.includes('href="/"') ? 1 : 0)
    + [...footer.matchAll(/<a\b/g)].length;
  const now = Date.now();
  const articles = readdirSync(join(ROOT, "src/data/articles"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const markdown = read(`src/data/articles/${name}`);
      const release = field(markdown, "publishAt") || field(markdown, "date");
      return {
        slug: name.replace(/\.md$/, ""),
        title: field(markdown, "title"),
        category: field(markdown, "category"),
        released: release ? Date.parse(release) <= now : false,
      };
    })
    .filter((entry) => entry.released);

  for (const hub of CATEGORY_HUBS) {
    const { topics, alphabetical } = assembleHub(hub, articles);
    const topicLinks = topics.reduce((sum, topic) => sum + topic.articles.length, 0);
    const tools = hub.category === "recipes" ? 1 : 0;
    const total = alphabetical.length + topicLinks + tools + chrome;
    assert.ok(total <= 124, `${hub.category} hub ${total}`);
    if (hub.category === "nutrition") {
      assert.equal(alphabetical.some((entry) => entry.slug === SHEET || entry.slug === CURRY), false);
    }
    if (hub.category === "recipes") {
      assert.equal(alphabetical.some((entry) => entry.slug === SHEET), true);
      assert.equal(alphabetical.some((entry) => entry.slug === CURRY), true);
    }
  }
});

test("chart heroes are 1200 by 675 JPEGs generated from the CSVs", async () => {
  const sheetScript = read("scripts/generate-sheet-pan-chicken-chickpeas-chart.py");
  const curryScript = read("scripts/generate-split-pea-sweet-potato-curry-chart.py");
  assert.match(sheetScript, /protein-per-dollar-2026\.csv/);
  assert.match(sheetScript, /fiber-per-dollar-2026\.csv/);
  assert.match(sheetScript, /175206/);
  assert.match(curryScript, /fiber-per-dollar-2026\.csv/);
  assert.doesNotMatch(sheetScript, /-main\.jpg/);
  assert.doesNotMatch(curryScript, /-main\.jpg/);
  for (const slug of [SHEET, CURRY]) {
    const bytes = readFileSync(join(ROOT, "public/images", `${slug}-chart.jpg`));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 675);
  }
});

test("built pages are in the sitemap and skip FAQPage when dist exists", () => {
  const sitemap = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemap)) return;
  const xml = readFileSync(sitemap, "utf8");
  for (const slug of [SHEET, CURRY]) {
    assert.match(xml, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, slug);
    assert.match(html, /David Miller/);
    assert.match(html, /Not a photograph/);
    assert.doesNotMatch(html, /Illustration generated with AI/);
    assert.match(html, new RegExp(`/images/${slug}-chart\\.jpg`));
    assert.doesNotMatch(html, /href="[^"]*\.csv/i, slug);
    assert.doesNotMatch(html, /href="\/[^"]*#[^"]*"/, slug);
  }
});
