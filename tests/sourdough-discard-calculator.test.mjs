import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { INDEX_KEEP_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import {
  CUP_GRAMS,
  addDiscard,
  cupsToGrams,
  discardSplit,
  feedStarter,
  gramsToCups,
  maxUsableDiscard,
} from "../src/lib/sourdough-discard-math.js";

const pagePath = join(
  process.cwd(),
  "src/pages/tools/sourdough-discard-calculator/index.astro",
);

test("100 g of 100% hydration discard is 50 g flour and 50 g water", () => {
  const split = discardSplit(100, 100);
  assert.equal(split.flour, 50);
  assert.equal(split.water, 50);
});

test("150 g at 50% hydration is 100 g flour and 50 g water", () => {
  const split = discardSplit(150, 50);
  assert.equal(split.flour, 100);
  assert.equal(split.water, 50);
});

test("max usable discard is min(F*(1+h), W*(1+h)/h)", () => {
  const samples = [
    { flour: 300, liquid: 210, hydration: 100 },
    { flour: 200, liquid: 80, hydration: 50 },
    { flour: 180, liquid: 75, hydration: 100 },
    { flour: 100, liquid: 40, hydration: 80 },
  ];
  for (const sample of samples) {
    const h = sample.hydration / 100;
    const byFlour = sample.flour * (1 + h);
    const byLiquid = (sample.liquid * (1 + h)) / h;
    assert.equal(
      maxUsableDiscard(sample.flour, sample.liquid, sample.hydration),
      Math.min(byFlour, byLiquid),
      JSON.stringify(sample),
    );
  }
});

test("a discard larger than the recipe flags a negative flour or liquid addition", () => {
  const over = addDiscard({
    flour: 150,
    liquid: 100,
    discard: 400,
    hydrationPercent: 100,
  });
  assert.equal(over.flour, 200);
  assert.equal(over.water, 200);
  assert.equal(over.flourToAdd, -50);
  assert.equal(over.liquidToAdd, -100);
  assert.equal(over.flourShort, true);
  assert.equal(over.liquidShort, true);
  assert.equal(over.maxDiscard, 200);
});

test("feeding 50 g at 1:5:5 gives 250 g flour, 250 g water, and 550 g total", () => {
  const fed = feedStarter(50, 5, 5);
  assert.equal(fed.flour, 250);
  assert.equal(fed.water, 250);
  assert.equal(fed.total, 550);
  assert.equal(fed.hydration, 100);
});

test("one cup of 100% hydration discard is the 227 g King Arthur cup", () => {
  assert.equal(CUP_GRAMS, 227);
  assert.equal(cupsToGrams(1), 227);
  assert.equal(gramsToCups(227), 1);
  assert.equal(cupsToGrams(0.5), 113.5);
});

test("the calculator page is one indexable URL and does not emit FAQPage", () => {
  const source = readFileSync(pagePath, "utf8");
  assert.match(source, /const PATH = "\/tools\/sourdough-discard-calculator\/"/);
  assert.match(source, /toolPageSchema\(/);
  assert.match(source, /webAppSchema\(/);
  assert.match(source, /id="worked-example"/);
  assert.match(source, /id="sourdough-tool"/);
  assert.match(
    source,
    /https:\/\/www\.kingarthurbaking\.com\/blog\/2025\/03\/13\/sourdough-feeding-ratios/,
  );
  assert.match(source, /\/easy-sourdough-discard-recipes-beginners\//);
  assert.match(source, /\/what-to-make-with-sourdough-discard-by-amount\//);
  assert.match(source, /const noYeastLive = existsSync\(/);
  assert.match(source, /\{noYeastLive && \(/);
  assert.match(source, /sourdough-discard-recipes-no-yeast/);
  assert.equal(
    existsSync(join(process.cwd(), "src/data/articles/sourdough-discard-recipes-no-yeast.md")),
    true,
    "the no-yeast hub is on main, so the calculator link must be able to render",
  );
  const hub = readFileSync(
    join(process.cwd(), "src/data/articles/sourdough-discard-recipes-no-yeast.md"),
    "utf8",
  );
  const grams = readFileSync(
    join(process.cwd(), "src/data/articles/how-to-measure-sourdough-discard-grams.md"),
    "utf8",
  );
  assert.match(hub, /\]\(\/tools\/sourdough-discard-calculator\/\)/);
  assert.match(grams, /\]\(\/tools\/sourdough-discard-calculator\/\)/);
  const redirectSources = new Set(
    readFileSync(join(process.cwd(), "public/_redirects"), "utf8")
      .split(/\n/)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter((source) => source && !source.startsWith("#"))
      .map((source) => (source.endsWith("/") ? source : `${source}/`)),
  );
  for (const href of [
    "/tools/sourdough-discard-calculator/",
    "/sourdough-discard-recipes-no-yeast/",
    "/how-to-measure-sourdough-discard-grams/",
    "/easy-sourdough-discard-recipes-beginners/",
    "/what-to-make-with-sourdough-discard-by-amount/",
  ]) {
    assert.equal(redirectSources.has(href), false, `${href} is a redirect source`);
  }
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(source, /\u2014/);
  assert.equal(INDEX_KEEP_PATHS.has("tools/sourdough-discard-calculator"), true);
  assert.equal(INDEX_PRUNE_SLUGS.has("tools/sourdough-discard-calculator"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("sourdough-discard-calculator"), false);
});
