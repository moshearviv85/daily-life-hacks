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
