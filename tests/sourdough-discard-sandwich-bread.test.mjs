import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const slug = "sourdough-discard-sandwich-bread-no-yeast";
const articlePath = join("src/data/articles", `${slug}.md`);
const source = readFileSync(articlePath, "utf8");
const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");

const MEASURE_EXCERPT =
  "One cup of 100% hydration sourdough discard is about 227 g and 413 kcal with all-purpose flour, or 386 kcal with whole wheat. 100 g is 182 or 170 kcal (USDA).";

const clusterPages = [
  "sourdough-discard-recipes-no-yeast",
  "easy-sourdough-discard-recipes-beginners",
  "easy-sourdough-discard-pizza-dough-no-yeast",
  "how-to-measure-sourdough-discard-grams",
];

function field(markdown, name) {
  const match = markdown.match(new RegExp(`^${name}:\\s*(.*)$`, "m"));
  if (!match) return undefined;
  const rest = match[1].trim();
  if (
    (rest.startsWith('"') && rest.endsWith('"')) ||
    (rest.startsWith("'") && rest.endsWith("'"))
  ) {
    return rest.slice(1, -1);
  }
  return rest;
}

test("no-yeast sandwich bread is a gram recipe by David Miller", () => {
  assert.equal(field(source, "author"), "David Miller");
  assert.equal(field(source, "category"), "recipes");
  assert.equal(field(source, "recipeCategory"), "Bread");
  assert.equal(field(source, "date"), "2026-11-25");
  assert.equal(field(source, "dateModified"), undefined);
  assert.equal(field(source, "substantiveUpdate"), undefined);
  assert.equal(field(source, "image"), `/images/${slug}-main.jpg`);
  assert.match(field(source, "imageAlt"), /^Illustration of /);
  assert.doesNotMatch(source, /photograph|photo of|real photo/i);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(source, /\u2014/);
  assert.match(body, /227 g/);
  assert.match(body, /280 g/);
  assert.match(body, /9\.2 g/);
  assert.match(body, /2\.3 g/);
  assert.match(body, /baking powder/i);
  assert.match(body, /baking soda/i);
  assert.match(body, /9-by-5/);
  assert.match(body, /195 to 200F/);
  assert.match(body, /202 calories/);
  assert.match(body, /5\.2 grams of protein/);
  assert.match(body, /1\.1 grams of fiber/);
  assert.equal(INDEX_PRUNE_SLUGS.has(slug), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("easy-sandwich-bread-recipe-beginners"), true);
});

test("the new loaf does not paste another blogger's formula", () => {
  assert.doesNotMatch(source, /breadbythehour|jennibee|12\.5 g|226 g/i);
  assert.doesNotMatch(body, /\]\(#[^)]+\)/);
  for (const match of body.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    assert.match(match[1], /^\/[a-z0-9-]+\/$/, match[1]);
  }
});

test("the discard cluster links the sandwich loaf without moving dates", () => {
  for (const page of clusterPages) {
    const pageSource = readFileSync(join("src/data/articles", `${page}.md`), "utf8");
    const pageBody = pageSource.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
    assert.match(pageBody, new RegExp(`\\(/${slug}/\\)`), page);
    assert.doesNotMatch(pageBody, new RegExp(`\\(/${slug}/#`), page);
    const modified = page === "easy-sourdough-discard-pizza-dough-no-yeast" ? "2026-11-26" : "2026-11-23";
    assert.equal(field(pageSource, "dateModified"), modified, page);
  }
  const hub = readFileSync(
    join("src/data/articles", "sourdough-discard-recipes-no-yeast.md"),
    "utf8",
  );
  assert.equal(field(hub, "substantiveUpdate"), "2026-11-23");
  assert.match(hub, /\/sourdough-discard-cinnamon-rolls-no-yeast\//);
  assert.match(hub, /farmhouseonboone\.com\/quick-sourdough-discard-cinnamon-rolls/);
  assert.doesNotMatch(hub, /breadbythehour\.com/);
  assert.doesNotMatch(hub, /\| All-purpose flour \| 240 g \|/);
});

test("the discard gram excerpt carries the cup calorie figures only", () => {
  const page = readFileSync(
    join("src/data/articles", "how-to-measure-sourdough-discard-grams.md"),
    "utf8",
  );
  assert.equal(field(page, "excerpt"), MEASURE_EXCERPT);
  assert.equal(MEASURE_EXCERPT.length, 158);
  assert.equal(field(page, "title"), "How Many Grams Is 1 Cup of Sourdough Discard?");
  assert.equal(field(page, "dateModified"), "2026-11-23");
  assert.equal(field(page, "substantiveUpdate"), "2026-11-23");
  assert.match(page, /\| 1 cup \(227 g\) \| 413 \| 386 \|/);
  assert.match(page, /\| 100 g \| 182 \| 170 \|/);
  assert.match(page, /FDC 168936/);
  assert.match(page, /FDC 168893/);
  assert.match(page, /\/sourdough-discard-cinnamon-rolls-no-yeast\//);
});

test("built loaf and gram pages publish Recipe nutrition and the calorie excerpt", () => {
  const loafPath = join("dist", slug, "index.html");
  const gramPath = join("dist", "how-to-measure-sourdough-discard-grams", "index.html");
  if (!existsSync(loafPath) || !existsSync(gramPath)) return;

  const loaf = readFileSync(loafPath, "utf8");
  const grams = readFileSync(gramPath, "utf8");
  const escapedExcerpt = MEASURE_EXCERPT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(grams, new RegExp(`<meta name="description" content="${escapedExcerpt}">`));
  assert.match(grams, new RegExp(`"description":"${escapedExcerpt.replace(/ /g, " ")}"`));
  assert.match(grams, /413/);
  assert.match(grams, /386/);
  assert.doesNotMatch(grams, /FAQPage/);
  assert.match(grams, /"dateModified":"2026-11-23T00:00:00.000Z"/);

  assert.match(loaf, /"@type":"Recipe"/);
  assert.match(loaf, /"@type":"NutritionInformation"/);
  assert.match(loaf, /"recipeCategory":"Bread"/);
  assert.match(loaf, /"calories":"202 calories"/);
  assert.match(loaf, /227 g sourdough discard/);
  assert.match(loaf, /280 g all-purpose flour/);
  assert.match(loaf, /9\.2 g baking powder/);
  assert.match(loaf, /Illustration generated with AI/);
  assert.match(loaf, /David Miller/);
  assert.doesNotMatch(loaf, /FAQPage/);
  assert.doesNotMatch(loaf, /photograph/i);

  const sitemapFiles = readdirSync("dist").filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"));
  const sitemap = sitemapFiles.map((name) => readFileSync(join("dist", name), "utf8")).join("\n");
  assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
});
