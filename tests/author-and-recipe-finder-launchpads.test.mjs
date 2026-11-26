import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { isIndexPruned } from "../src/content/index-prune.js";

const author = readFileSync("src/pages/author/david-miller.astro", "utf8");
const finder = readFileSync("src/pages/tools/recipe-finder/index.astro", "utf8");

const AUTHOR_SLUGS = [
  "cost-of-50g-protein-and-30g-fiber-per-day",
  "protein-per-dollar-2017-to-2026-bls-trends",
  "plant-vs-animal-protein-cost-per-dollar",
  "us-regional-grocery-protein-prices-october-2026",
  "one-dollar-of-protein-vs-one-dollar-of-fiber",
  "cheapest-high-protein-snacks-and-portable-foods",
  "canned-vs-dry-beans-cost-and-sodium-per-serving",
  "cheapest-fast-food-protein-under-5-dollars",
];

const FINDER_SLUGS = [
  "cheapest-canned-fish-and-seafood-protein-per-dollar",
  "cheapest-whole-grains-for-fiber-per-dollar",
  "cheapest-dairy-and-soy-protein-per-dollar",
  "how-much-100-grams-of-protein-costs-per-day",
  "no-cook-emergency-protein-and-fiber-grocery-list",
  "how-long-do-cooked-grains-and-beans-last-in-the-fridge",
  "low-sodium-high-protein-foods-per-dollar",
  "cheapest-high-fiber-fruits-and-vegetables",
];

const PANTRY_GUIDE_SLUGS = [
  "cheapest-shelf-stable-pantry-foods-for-protein",
  "cheapest-nuts-and-seeds-for-protein-and-fiber",
  "how-much-fiber-and-protein-per-dollar-at-walmart-vs-bls",
  "how-long-do-cooked-meat-and-poultry-last-in-the-fridge",
  "plan-week-of-dinners-fewer-grocery-runs",
  "prebiotic-foods-beyond-the-buzzwords",
  "easy-high-fiber-breakfast-ideas-for-gut-health",
  "high-fiber-meals-for-constipation-relief",
];

const PREP_GUIDE_SLUGS = [
  "high-fiber-pizza-crust-cauliflower",
  "artichoke-recipes-for-gut-health",
  "high-fiber-quinoa-salad-for-lunch-prep",
  "high-fiber-salad-dressings-homemade",
  "sheet-pan-salmon-and-vegetables-30-minutes",
  "brown-lentil-and-pearled-barley-soup-high-fiber",
  "high-protein-overnight-oats-chia-greek-yogurt",
  "how-long-do-cooked-meat-and-poultry-last-in-the-fridge",
];

function slugBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing ${marker}`);
  const end = source.indexOf("] as const;", start);
  assert.ok(end > start, `${marker} should stay a const slug list`);
  return source.slice(start, end);
}

function orphanSlugs() {
  const source = readFileSync("tests/orphan-contextual-inlinks.test.mjs", "utf8");
  const block = source.match(/const ORPHANS = \[([\s\S]*?)\];/)?.[1] ?? "";
  return new Set([...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]));
}

function section(source, heading, nextHeading) {
  const start = source.indexOf(heading);
  assert.ok(start >= 0, `missing heading ${heading}`);
  const end = source.indexOf(nextHeading, start + heading.length);
  assert.ok(end > start, `${heading} should stay before ${nextHeading}`);
  return source.slice(start, end);
}

test("author profile launchpad names the eight 2026 chart studies and skips missing files", () => {
  assert.match(author, /Featured 2026 Research & Chart Studies/);
  assert.match(author, /existsSync\(join\(process\.cwd\(\), "src\/data\/articles"/);
  assert.match(author, /isIndexPruned\(article\.id\)/);
  assert.match(author, /!isReleased\(article\)/);
  assert.match(author, /href: `\/\$\{slug\}\/`/);
  assert.doesNotMatch(author, /FAQPage/);
  assert.doesNotMatch(author, /<img\b/i);
  assert.doesNotMatch(author, /\u2014/);
  const block = slugBlock(author, "FEATURED_2026_STUDY_SLUGS");
  for (const slug of AUTHOR_SLUGS) {
    assert.match(block, new RegExp(`"${slug}"`));
  }
  const cards = section(author, "Featured 2026 Research & Chart Studies", 'id="articles"');
  assert.match(cards, /href=\{study\.href\}/);
  assert.doesNotMatch(cards, /href=["'{][^"'}]*#/);
  assert.doesNotMatch(cards, /\.csv/);
  assert.doesNotMatch(cards, /\u2014/);
  assert.doesNotMatch(cards, /<img\b/i);
});

test("recipe finder launchpad names the eight ingredient studies without changing the tool", () => {
  assert.match(finder, /Compare Ingredient Cost & Nutrition Studies/);
  assert.match(finder, /robots=\{noindexFollowFor\("tools\/recipe-finder"\)\}/);
  assert.match(finder, /Recipes by Ingredient: Find a Recipe From What You Have/);
  assert.match(finder, /existsSync\(join\(process\.cwd\(\), "src\/data\/articles"/);
  assert.match(finder, /isIndexPruned\(article\.id\)/);
  assert.match(finder, /!isReleased\(article\)/);
  assert.match(finder, /href: `\/\$\{slug\}\/`/);
  assert.doesNotMatch(finder, /FAQPage/);
  assert.doesNotMatch(finder, /\u2014/);
  const block = slugBlock(finder, "INGREDIENT_STUDY_SLUGS");
  for (const slug of FINDER_SLUGS) {
    assert.match(block, new RegExp(`"${slug}"`));
  }
  const cards = section(finder, "Compare Ingredient Cost & Nutrition Studies", 'class="prose-like max-w-4xl"');
  assert.match(cards, /href=\{study\.href\}/);
  assert.doesNotMatch(cards, /href=["'{][^"'}]*#/);
  assert.doesNotMatch(cards, /\.csv/);
  assert.doesNotMatch(cards, /\u2014/);
});

test("author profile adds a text-only pantry and meal-prep launchpad", () => {
  assert.match(author, /Pantry Economics, Gut Health & Meal-Prep Guides/);
  assert.match(author, /article\.data\.author !== "David Miller"/);
  assert.doesNotMatch(author, /<img\b/i);
  assert.doesNotMatch(author, /FAQPage/);
  assert.doesNotMatch(author, /\bphoto\b/i);
  const block = slugBlock(author, "PANTRY_GUIDE_SLUGS");
  assert.equal(PANTRY_GUIDE_SLUGS.length, 8);
  const orphans = orphanSlugs();
  for (const slug of PANTRY_GUIDE_SLUGS) {
    assert.match(block, new RegExp(`"${slug}"`));
    assert.equal(existsSync(`src/data/articles/${slug}.md`), true, slug);
    assert.equal(isIndexPruned(slug), false, slug);
    assert.equal(orphans.has(slug), false, `${slug} locks dateModified as an orphan`);
  }
  const cards = section(author, "Pantry Economics, Gut Health & Meal-Prep Guides", 'id="articles"');
  assert.match(cards, /href=\{guide\.href\}/);
  assert.doesNotMatch(cards, /href=["'{][^"'}]*#/);
  assert.doesNotMatch(cards, /\.csv/);
  assert.doesNotMatch(cards, /\u2014/);
  assert.doesNotMatch(cards, /<img\b/i);
  assert.doesNotMatch(cards, /href="\/nutrition\/"/);
});

test("recipe finder adds the weak-inlink recipe and storage grid without changing the count", () => {
  assert.match(finder, /Cost-Audited Recipes & Prep Storage Guides/);
  assert.match(finder, /Recipes by Ingredient: Find a Recipe From What You Have/);
  assert.match(finder, /article\.data\.author !== "David Miller"/);
  assert.doesNotMatch(finder, /FAQPage/);
  assert.doesNotMatch(finder, /\bphoto\b/i);
  const block = slugBlock(finder, "PREP_GUIDE_SLUGS");
  assert.equal(PREP_GUIDE_SLUGS.length, 8);
  const orphans = orphanSlugs();
  for (const slug of PREP_GUIDE_SLUGS) {
    assert.match(block, new RegExp(`"${slug}"`));
    assert.equal(existsSync(`src/data/articles/${slug}.md`), true, slug);
    assert.equal(isIndexPruned(slug), false, slug);
    assert.equal(orphans.has(slug), false, `${slug} locks dateModified as an orphan`);
  }
  const cards = section(finder, "Cost-Audited Recipes & Prep Storage Guides", 'class="prose-like max-w-4xl"');
  assert.match(cards, /href=\{guide\.href\}/);
  assert.doesNotMatch(cards, /href=["'{][^"'}]*#/);
  assert.doesNotMatch(cards, /\.csv/);
  assert.doesNotMatch(cards, /\u2014/);
  assert.doesNotMatch(cards, /href="\/nutrition\/"/);
});
