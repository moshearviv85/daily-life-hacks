import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

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
const OATS = "high-protein-overnight-oats-chia-greek-yogurt";
const SOUP = "brown-lentil-and-pearled-barley-soup-high-fiber";
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

  for (const slug of [OATS, SOUP]) {
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
    assert.equal(
      readFileSync(join(ROOT, "public/images", `${slug}-chart.jpg`)).subarray(0, 3).toString("hex"),
      "ffd8ff",
      slug,
    );
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
    }
  }
});

test("the jars and the bowls match FoodData Central and the price files", () => {
  const cache = JSON.parse(read("src/data/fdc-cache.json"));
  const foods = foodsByDescription(cache);
  const articles = new Map(loadRecipeArticles(join(ROOT, "src/data/articles")).map((entry) => [entry.id, entry]));

  const oats = articles.get(OATS);
  const soup = articles.get(SOUP);
  assert.equal(oats.data.servings, 4);
  assert.equal(soup.data.servings, 6);
  assert.equal(resolveRecipeLines(oats.data.ingredients, foods).unmapped.length, 0);
  assert.equal(resolveRecipeLines(soup.data.ingredients, foods).unmapped.length, 0);

  const oatsNutrition = nutritionFromFrontmatter({ ...oats.data, id: OATS }, cache);
  const soupNutrition = nutritionFromFrontmatter({ ...soup.data, id: SOUP }, cache);
  assert.equal(oatsNutrition.rounded.kcal, 482);
  assert.equal(oatsNutrition.rounded.protein, 30.8);
  assert.equal(oatsNutrition.rounded.fiber, 11.2);
  assert.equal(Number(oats.data.calories), 482);
  assert.equal(soupNutrition.rounded.kcal, 431);
  assert.equal(soupNutrition.rounded.protein, 18.9);
  assert.equal(soupNutrition.rounded.fiber, 16);
  assert.equal(Number(soup.data.calories), 431);

  const oatsCost = costForRows(oatsNutrition.rows, 4);
  const soupCost = costForRows(soupNutrition.rows, 6);
  assert.equal(oatsCost.complete, true);
  assert.equal(soupCost.complete, false);
  assert.equal(oatsCost.perServing.toFixed(2), "1.01");
  assert.equal(soupCost.perServing.toFixed(2), "0.43");
  assert.ok(oatsCost.perServing < 1.1);
  assert.ok(soupCost.perServing < 0.7);

  const oatsMarkdown = article(OATS);
  const soupMarkdown = article(SOUP);
  assert.match(oatsMarkdown, /30\.8 g/);
  assert.match(oatsMarkdown, /11\.2 g/);
  assert.match(oatsMarkdown, /\$1\.01/);
  assert.match(soupMarkdown, /16\.0 g/);
  assert.match(soupMarkdown, /18\.9 g/);
  assert.match(soupMarkdown, /\$0\.43/);
  assert.match(oatsMarkdown, /No egg/);
  assert.equal(oats.data.ingredients.some((line) => /\beggs?\b/i.test(line)), false);
  assert.equal(soup.data.ingredients.some((line) => /\beggs?\b/i.test(line)), false);
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
    if (hub.category === "nutrition") {
      assert.ok(total <= 124, `nutrition hub ${total}`);
      assert.equal(alphabetical.some((entry) => entry.slug === OATS || entry.slug === SOUP), false);
    }
    if (hub.category === "recipes") {
      assert.ok(total <= 126, `recipes hub ${total}`);
      assert.equal(alphabetical.some((entry) => entry.slug === OATS), true);
      assert.equal(alphabetical.some((entry) => entry.slug === SOUP), true);
    }
  }

  const nutritionBox = read("src/components/RecipeNutritionBox.astro");
  const scaler = read("src/components/RecipeServingScaler.astro");
  assert.match(nutritionBox, /href=\{oatsPath\}/);
  assert.match(nutritionBox, /\/high-protein-overnight-oats-chia-greek-yogurt\//);
  assert.match(scaler, /href=\{soupPath\}/);
  assert.match(scaler, /\/brown-lentil-and-pearled-barley-soup-high-fiber\//);
  assert.doesNotMatch(nutritionBox, /FAQPage|\.csv|href="[^"]*#/);
  assert.doesNotMatch(scaler, /FAQPage|\.csv|href="[^"]*#/);
});

test("built pages are in the sitemap and skip FAQPage when dist exists", () => {
  const sitemap = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemap)) return;
  const xml = readFileSync(sitemap, "utf8");
  for (const slug of [OATS, SOUP]) {
    assert.match(xml, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = readFileSync(join(ROOT, "dist", slug, "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, slug);
    assert.match(html, /Not a photograph/);
    assert.doesNotMatch(html, /Illustration generated with AI/);
    assert.match(html, new RegExp(`/images/${slug}-chart\\.jpg`));
  }
  const oatsHtml = readFileSync(join(ROOT, "dist", OATS, "index.html"), "utf8");
  const soupHtml = readFileSync(join(ROOT, "dist", SOUP, "index.html"), "utf8");
  assert.equal(oatsHtml.includes("land at 30.8 grams of protein and $1.01 a jar"), false);
  assert.match(oatsHtml, /Scaling a pot instead of a jar/);
  assert.match(soupHtml, /land at 30\.8 grams of protein and \$1\.01 a jar/);
  assert.equal(soupHtml.includes("Scaling a pot instead of a jar"), false);
  const other = readFileSync(join(ROOT, "dist/split-pea-soup-recipe-high-fiber/index.html"), "utf8");
  assert.match(other, /land at 30\.8 grams of protein and \$1\.01 a jar/);
  assert.match(other, /Scaling a pot instead of a jar/);
});
