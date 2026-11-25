import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";
import { discardSplit } from "../src/lib/sourdough-discard-math.js";

const SLUG = "sourdough-discard-buttermilk-substitute";
const EXCERPT =
  "Sourdough discard can replace buttermilk once you subtract the flour and add the missing liquid. One cup of buttermilk is 245 grams, not a free pour.";
const LINER_EXCERPT =
  "Parchment paper vs silicone baking mat, with the heat ratings manufacturers actually publish and a side-by-side cookie test that settles the spreading question.";

function read(path) {
  return readFileSync(path, "utf8");
}

function field(markdown, name) {
  return extractFrontmatterField(markdown, name);
}

function gramsText(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function words(value) {
  return value.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) ?? [];
}

const article = read(`src/data/articles/${SLUG}.md`);
const liner = read("src/data/articles/baking-sheet-liners-parchment-silicone-when-to-use.md");

const cups = [
  { label: "1/4 cup (61.25 g)", grams: 61.25 },
  { label: "1/2 cup (122.5 g)", grams: 122.5 },
  { label: "3/4 cup (183.75 g)", grams: 183.75 },
  { label: "1 cup (245 g)", grams: 245 },
];

const hydrations = [
  { label: "100% (1:1)", percent: 100 },
  { label: "80% (4:5)", percent: 80 },
];

test("the buttermilk table matches discardSplit at 100% and 80%", () => {
  assert.equal(field(article, "excerpt"), EXCERPT);
  assert.equal(EXCERPT.length, 149);
  assert.equal(field(article, "title"), "Can You Substitute Sourdough Discard for Buttermilk?");
  assert.equal(field(article, "author"), "David Miller");
  assert.equal(field(article, "dateModified"), "2026-11-25");
  assert.equal(field(article, "substantiveUpdate"), "2026-11-25");
  assert.match(field(article, "imageAlt"), /illustration/i);
  assert.doesNotMatch(field(article, "imageAlt"), /photo/i);
  assert.equal(INDEX_PRUNE_SLUGS.has(SLUG), false);
  assert.doesNotMatch(read("public/_redirects"), new RegExp(`/${SLUG}`));
  assert.match(article, /W \/ \(1 \+ h\)/);
  assert.match(article, /W \* h \/ \(1 \+ h\)/);
  assert.match(article, /245 grams/);
  assert.match(article, /FDC 170874/);
  assert.match(article, /pH 4\.5/);
  assert.match(article, /3\.5 to 4\.0/);
  assert.match(article, /lactic acid and acetic acid/i);
  assert.match(article, /milk fat or milk solids/);
  assert.match(article, /pancakes, waffles, cornbread, and drop biscuits/i);
  assert.match(article, /layer cake/i);
  assert.match(article, /cut-in biscuits/i);
  assert.match(article, /\/sourdough-discard-hydration-conversion-chart\//);
  assert.match(article, /\/tools\/sourdough-discard-calculator\//);
  assert.match(article, /\/easy-sourdough-discard-recipes-beginners\//);
  assert.match(article, /\/sourdough-discard-recipes-no-yeast\//);
  assert.match(article, /\/how-to-measure-sourdough-discard-grams\//);
  assert.doesNotMatch(article, /FAQPage/);
  assert.doesNotMatch(article, /\]\(\/[^)\s]*#/);
  assert.match(article, /<!-- numbers-source: src\/lib\/sourdough-discard-math\.js, FDC 170874 -->/);
  assert.equal(existsSync(`public/images/${SLUG}-main.jpg`), true);
  assert.equal(readFileSync(`public/images/${SLUG}-main.jpg`).subarray(0, 3).toString("hex"), "ffd8ff");

  for (const cup of cups) {
    for (const hydration of hydrations) {
      const split = discardSplit(cup.grams, hydration.percent);
      const thin = cup.grams - split.water;
      const line = `| ${cup.label} | ${hydration.label} | ${cup.grams} g | ${gramsText(split.flour)} g | ${gramsText(split.water)} g | ${gramsText(thin)} g |`;
      assert.match(article, new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), line);
    }
  }
});

test("the liner page keeps its excerpt and adds the four-column comparison", () => {
  assert.equal(field(liner, "title"), "Baking Sheet Liners: Parchment vs Silicone Mats");
  assert.equal(field(liner, "excerpt"), LINER_EXCERPT);
  assert.equal(LINER_EXCERPT.length, 160);
  assert.equal(field(liner, "author"), "David Miller");
  assert.equal(field(liner, "dateModified"), "2026-11-25");
  assert.equal(field(liner, "substantiveUpdate"), "2026-11-25");

  const heading = "## Parchment paper vs. silicone mat vs. foil: which liner fits the job?";
  const at = liner.indexOf(heading);
  assert.ok(at !== -1, "missing comparison heading");
  const paragraph = liner.slice(at + heading.length).trimStart().split(/\n\s*\n/)[0];
  const paragraphWords = words(paragraph);
  assert.ok(
    paragraphWords.length >= 40 && paragraphWords.length <= 60,
    `liner answer is ${paragraphWords.length} words`,
  );
  for (const number of ["425", "375", "500"]) {
    assert.ok(paragraphWords.includes(number), `missing ${number}`);
  }
  assert.match(liner, /\| Job \| Parchment paper \| Silicone baking mat \| Aluminum foil \|/);
  assert.match(liner, /Oven ceiling/);
  assert.match(liner, /Cookie spread/);
  assert.match(liner, /Sticky or acidic/);
  assert.match(liner, /Reuse and cleanup/);
  assert.match(liner, /https:\/\/www\.reynoldsbrands\.com\/tips-and-how-tos\/wax-paper-vs-parchment-paper/);
  assert.match(liner, /https:\/\/www\.kingarthurbaking\.com\/blog\/2022\/12\/01\/keep-cookies-from-spreading/);
  assert.match(liner, /https:\/\/www\.reynoldsbrands\.com\/tips-and-how-tos\/aluminum-foil-guide/);
  assert.match(liner, /https:\/\/www\.nordicware\.com\/products\/deluxe-silicone-baking-mat\//);
  assert.doesNotMatch(liner, /FAQPage/);
  assert.doesNotMatch(liner, /\]\(\/[^)\s]*#/);
});

test("both discard pages link the substitute guide without a date bump", () => {
  const sources = [
    ["src/data/articles/sourdough-discard-recipes-no-yeast.md", "2026-11-23", "2026-11-23"],
    ["src/data/articles/easy-sourdough-discard-recipes-beginners.md", "2026-11-23", null],
  ];
  for (const [path, modified, substantive] of sources) {
    const source = read(path);
    const matches = source.match(/\]\(\/sourdough-discard-buttermilk-substitute\/\)/g) ?? [];
    assert.equal(matches.length, 1, path);
    assert.equal(field(source, "dateModified"), modified, path);
    assert.equal(field(source, "substantiveUpdate"), substantive, path);
    assert.doesNotMatch(source, /sourdough-discard-buttermilk-substitute\/#/);
  }
});
