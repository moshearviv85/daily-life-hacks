import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const articleDirectory = join(process.cwd(), "src", "data", "articles");
const fiberFlagship = "fiber-per-dollar-cheapest-high-fiber-foods";
const proteinFlagship = "protein-per-dollar-cheapest-protein-sources";
const retiredProteinSlug = "protein-per-dollar-cheapest-high-protein-foods";

const requiredLinks = [
  [fiberFlagship, proteinFlagship],
  ["savory-chia-seed-recipes-breakfast", fiberFlagship],
  ["costco-rotisserie-chicken-meal-ideas-dinner", proteinFlagship],
  ["how-to-keep-sandwiches-from-getting-soggy", proteinFlagship],
  ["beans-and-rice-complete-protein-meal", proteinFlagship],
  ["beans-and-rice-complete-protein-meal", fiberFlagship],
  ["high-protein-on-a-budget-complete-guide", fiberFlagship],
  ["lentils-vs-chicken-breast-protein-cost", fiberFlagship],
  ["canned-vs-dry-beans-cost", fiberFlagship],
  ["easy-black-bean-tacos-weeknight-dinner", proteinFlagship],
  ["easy-black-bean-tacos-weeknight-dinner", fiberFlagship],
  ["how-to-cook-dried-beans-from-scratch", proteinFlagship],
  ["how-to-cook-dried-beans-from-scratch", fiberFlagship],
  ["high-fiber-quinoa-salad-for-lunch-prep", fiberFlagship],
  ["high-protein-bagel-sandwich-ideas-lunch", proteinFlagship],
];

function articleBody(slug) {
  const articlePath = join(articleDirectory, `${slug}.md`);
  assert.equal(existsSync(articlePath), true, `missing article: ${slug}`);
  return readFileSync(articlePath, "utf8");
}

function hrefMatches(body, slug) {
  return body.match(new RegExp(`\\]\\(\\/${slug}\\/\\)`, "g")) ?? [];
}

test("ranking pages keep one honest in-body href to each required flagship", () => {
  for (const [source, target] of requiredLinks) {
    const matches = hrefMatches(articleBody(source), target);
    assert.equal(
      matches.length,
      1,
      `${source} should link to /${target}/ exactly once`,
    );
  }
});

test("sourdough stays out of the flagship crawl-path bet", () => {
  const body = articleBody("easy-sourdough-discard-recipes-beginners");
  assert.equal(hrefMatches(body, fiberFlagship).length, 0);
  assert.equal(hrefMatches(body, proteinFlagship).length, 0);
});

test("edited articles do not reintroduce the retired protein flagship slug", () => {
  const sources = new Set(requiredLinks.map(([source]) => source));
  sources.add("easy-sourdough-discard-recipes-beginners");

  for (const slug of sources) {
    assert.equal(
      articleBody(slug).includes(retiredProteinSlug),
      false,
      `${slug} should not mention ${retiredProteinSlug}`,
    );
  }
});

function pageSource(...segments) {
  const pagePath = join(process.cwd(), "src", "pages", ...segments);
  assert.equal(existsSync(pagePath), true, `missing page: ${segments.join("/")}`);
  return readFileSync(pagePath, "utf8");
}

function htmlHrefMatches(source, slug) {
  return source.match(new RegExp(`href="/${slug}/"`, "g")) ?? [];
}

const leftoverToolPages = [
  ["tools hub intro", ["tools", "index.astro"]],
  ["dried beans converter", ["tools", "dried-beans-to-canned-converter", "index.astro"]],
  ["grocery budget calculator", ["tools", "grocery-budget-calculator", "index.astro"]],
];

test("leftover tool pages cite each flagship once in the page source", () => {
  for (const [label, segments] of leftoverToolPages) {
    const source = pageSource(...segments);
    assert.equal(
      htmlHrefMatches(source, fiberFlagship).length,
      1,
      `${label} should link to /${fiberFlagship}/ exactly once`,
    );
    assert.equal(
      htmlHrefMatches(source, proteinFlagship).length,
      1,
      `${label} should link to /${proteinFlagship}/ exactly once`,
    );
    assert.equal(source.includes(retiredProteinSlug), false);
  }
});

