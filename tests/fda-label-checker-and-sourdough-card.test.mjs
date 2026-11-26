import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { CUP_GRAMS, discardSplit } from "../src/lib/sourdough-discard-math.js";

const ROOT = new URL("..", import.meta.url).pathname;
const TOOL = "src/pages/tools/fda-fiber-and-protein-label-checker/index.astro";
const CARD = "src/pages/printables/sourdough-discard-hydration-and-swap-card/index.astro";

const TOOL_LINKS = [
  "/good-source-of-fiber-label-meaning/",
  "/fiber-protein-daily-values-explained/",
  "/low-sodium-high-protein-foods-per-dollar/",
  "/canned-vs-dry-beans-cost-and-sodium-per-serving/",
  "/methodology/",
];
const CARD_LINKS = [
  "/sourdough-discard-hydration-conversion-chart/",
  "/sourdough-discard-buttermilk-substitute/",
  "/sourdough-discard-vs-baking-powder-and-yeast-cost-per-bake/",
  "/easy-sourdough-discard-pizza-dough-no-yeast/",
  "/tools/sourdough-discard-calculator/",
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function tenth(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function orphanSlugs() {
  const source = read("tests/orphan-contextual-inlinks.test.mjs");
  const block = source.match(/const ORPHANS = \[([\s\S]*?)\];/);
  assert.ok(block, "ORPHANS list");
  return new Set([...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]));
}

function hrefs(source) {
  return [...source.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
}

function assertLinkable(href) {
  assert.equal(href.includes("#"), false, href);
  assert.equal(href.includes(".csv"), false, href);
  const slug = href.replace(/^\/|\/$/g, "");
  const leaf = slug.split("/").pop();
  assert.equal(INDEX_PRUNE_SLUGS.has(leaf), false, href);
  assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, href);
  assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(slug), false, href);
  assert.equal(orphanSlugs().has(leaf), false, href);
  assert.notEqual(href, "/how-to-read-nutrition-labels-for-beginners/");
}

test("FDA checker cites 21 CFR 101.54 gram gates, not a 5.5 g ceiling", () => {
  const source = read(TOOL);
  assert.match(source, /"@type": "WebApplication"/);
  assert.match(source, /"@type": "BreadcrumbList"/);
  assert.match(source, /applicationCategory/);
  assert.match(source, /browser tab/);
  assert.match(source, /href="\/methodology\/"/);
  assert.match(read("src/content/author.ts"), /export const AUTHOR_NAME = "David Miller"/);
  assert.match(source, /author=\{AUTHOR_NAME\}/);
  assert.match(source, /document\.addEventListener\('astro:page-load'/);
  assert.match(source, /21 CFR 101\.54\(b\)/);
  assert.match(source, /21 CFR 101\.54\(c\)/);
  assert.match(source, /21 CFR 101\.9\(c\)\(9\)/);
  assert.match(source, /21 CFR 101\.9\(c\)\(7\)/);
  assert.match(source, /21 CFR 101\.61\(b\)\(4\)/);
  assert.match(source, /21 CFR 101\.62\(b\)\(2\)/);
  assert.match(source, /FIBER_GOOD_MIN !== 2\.8 \|\| FIBER_GOOD_MAX !== 5\.32 \|\| FIBER_HIGH_MIN !== 5\.6/);
  assert.match(source, /PROTEIN_GOOD_MIN !== 5 \|\| PROTEIN_GOOD_MAX !== 9\.5 \|\| PROTEIN_HIGH_MIN !== 10/);
  assert.match(source, /2\.8 grams through 5\.32 grams/);
  assert.match(source, /5\.6 grams or more/);
  assert.match(source, /5 grams through 9\.5 grams/);
  assert.match(source, /10 grams or more/);
  assert.match(source, /140 mg/);
  assert.match(source, /Not a photograph/);
  assert.doesNotMatch(source, /2\.8 to 5\.5/);
  assert.doesNotMatch(source, /2\.8-5\.5/);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(source, /\u2014/);
  assert.doesNotMatch(source, /href="[^"]*\.csv"/);
  assert.doesNotMatch(source, /href="[^"]*#/);
  const faqs = [...source.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/gs)];
  assert.equal(faqs.length, 5);
  assert.equal(INDEX_PRUNE_SLUGS.has("fda-fiber-and-protein-label-checker"), false);
  assert.equal(INDEX_NOINDEX_TOOL_PATHS.has("tools/fda-fiber-and-protein-label-checker"), false);
  assert.doesNotMatch(read("astro.config.mjs"), /fda-fiber-and-protein-label-checker/);
  for (const href of TOOL_LINKS) assert.match(source, new RegExp(href.replaceAll("/", "\\/")));
  for (const href of hrefs(source)) assertLinkable(href);
  const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline checker");
  assert.doesNotThrow(() => new Function(script[1]));
});

test("sourdough card prints the calculator split and stays indexable", () => {
  const source = read(CARD);
  assert.match(source, /"@type": "WebPage"/);
  assert.match(source, /"@type": "BreadcrumbList"/);
  assert.match(read("src/content/author.ts"), /export const AUTHOR_NAME = "David Miller"/);
  assert.match(source, /author=\{AUTHOR_NAME\}/);
  assert.match(source, /window\.print\(\)/);
  assert.match(source, /Not a photograph/);
  assert.doesNotMatch(source, /noindex/);
  assert.doesNotMatch(source, /FAQPage/);
  assert.doesNotMatch(source, /\u2014/);
  assert.doesNotMatch(source, /href="[^"]*\.csv"/);
  assert.doesNotMatch(source, /href="[^"]*#/);
  assert.equal(INDEX_PRUNE_SLUGS.has("sourdough-discard-hydration-and-swap-card"), false);
  assert.doesNotMatch(
    read("astro.config.mjs"),
    /addPath\('\/printables\/sourdough-discard-hydration-and-swap-card'\)/,
  );
  for (const href of CARD_LINKS) assert.match(source, new RegExp(href.replaceAll("/", "\\/")));
  for (const href of hrefs(source)) assertLinkable(href);
  assert.doesNotMatch(source, /sourdough-discard-grams-cheat-sheet/);
  assert.equal(source.includes("discardSplit(grams, hydration)"), true);
  assert.equal(source.includes("PIZZA_FLOUR * (grams / PIZZA_DISCARD)"), true);
  assert.equal(source.includes("PIZZA_WATER * (grams / PIZZA_DISCARD)"), true);
  assert.equal(source.includes("const PIZZA_FLOUR = 180;"), true);
  assert.equal(source.includes("const PIZZA_WATER = 75;"), true);
  assert.match(source, /50 g of flour/);
  assert.match(source, /113\.5 g of flour/);
  assert.match(source, /122\.5 g/);
  assert.match(source, /136\.1 g/);
  assert.match(source, /108\.9 g/);

  const cup = discardSplit(CUP_GRAMS, 100);
  assert.equal(tenth(cup.flour), "113.5");
  assert.equal(tenth(cup.water), "113.5");
  const stiff = discardSplit(100, 50);
  assert.equal(tenth(stiff.flour), "66.7");
  assert.equal(tenth(stiff.water), "33.3");
  assert.equal(tenth(180 * (100 / CUP_GRAMS)), "79.3");
  assert.equal(tenth(75 * (100 / CUP_GRAMS)), "33");
  assert.equal(tenth(180 * (150 / CUP_GRAMS)), "118.9");
  assert.equal(tenth(75 * (150 / CUP_GRAMS)), "49.6");
  const buttermilk = discardSplit(245, 80);
  assert.equal(tenth(buttermilk.flour), "136.1");
  assert.equal(tenth(buttermilk.water), "108.9");
});

test("chart heroes are generated JPEGs and the link sources point here", async () => {
  const charts = [
    [
      "public/images/fda-fiber-and-protein-label-checker-chart.jpg",
      "scripts/generate-fda-fiber-and-protein-label-checker-chart.py",
      "fiber-per-dollar-2026.csv",
    ],
    [
      "public/images/sourdough-discard-hydration-and-swap-card-chart.jpg",
      "scripts/generate-sourdough-discard-hydration-and-swap-card-chart.py",
      "discard / (1 + hydration)",
    ],
  ];
  for (const [image, script, marker] of charts) {
    const bytes = readFileSync(join(ROOT, image));
    assert.equal(bytes[0], 0xff, image);
    assert.equal(bytes[1], 0xd8, image);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg", image);
    assert.equal(meta.width, 1200, image);
    assert.equal(meta.height, 675, image);
    const generator = read(script);
    assert.equal(generator.includes(marker), true, script);
    assert.doesNotMatch(generator, /-main\.jpg/);
    assert.match(generator, /not a photograph/i);
  }

  assert.match(read("src/pages/tools/fiber-per-dollar-calculator.astro"), /\/tools\/fda-fiber-and-protein-label-checker\//);
  assert.match(read("src/pages/tools/sodium-per-dollar-calculator/index.astro"), /\/tools\/fda-fiber-and-protein-label-checker\//);
  assert.match(read("src/pages/printables/sourdough-discard-grams-cheat-sheet/index.astro"), /\/printables\/sourdough-discard-hydration-and-swap-card\//);
  assert.match(read("src/pages/tools/sourdough-discard-calculator/index.astro"), /\/printables\/sourdough-discard-hydration-and-swap-card\//);
  assert.match(read("src/pages/tools/index.astro"), /\/tools\/fda-fiber-and-protein-label-checker\//);
  assert.match(read("src/pages/tools/index.astro"), /86 recipes/);
  assert.match(read("src/pages/printables/index.astro"), /\/printables\/sourdough-discard-hydration-and-swap-card\//);
});

test("built pages are in the sitemap and /nutrition/ stays at the anchor cap", () => {
  const sitemapPath = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemapPath)) return;
  const xml = readFileSync(sitemapPath, "utf8");
  for (const path of [
    "/tools/fda-fiber-and-protein-label-checker/",
    "/printables/sourdough-discard-hydration-and-swap-card/",
  ]) {
    assert.match(xml, new RegExp(`https://www\\.daily-life-hacks\\.com${path}`));
    const html = readFileSync(join(ROOT, "dist", path.slice(1), "index.html"), "utf8");
    assert.equal(html.includes("FAQPage"), false, path);
    assert.match(html, /David Miller/);
    assert.match(html, /<meta name="robots" content="index, follow/);
    assert.doesNotMatch(html, /href="[^"]*\.csv/i);
    assert.doesNotMatch(html, /href="[^"]*#/);
  }
  const cardHtml = readFileSync(
    join(ROOT, "dist/printables/sourdough-discard-hydration-and-swap-card/index.html"),
    "utf8",
  );
  assert.match(cardHtml, /25 g/);
  assert.match(cardHtml, /79\.3 g/);
  assert.match(cardHtml, /118\.9 g/);
  const toolHtml = readFileSync(
    join(ROOT, "dist/tools/fda-fiber-and-protein-label-checker/index.html"),
    "utf8",
  );
  assert.match(toolHtml, /2\.8 g to 5\.32 g/);
  assert.match(toolHtml, /5 g to 9\.5 g/);
  const nutrition = readFileSync(join(ROOT, "dist/nutrition/index.html"), "utf8");
  const anchors = nutrition.match(/<a\b/g)?.length ?? 0;
  assert.ok(anchors <= 124, `/nutrition/ rendered ${anchors} anchors`);
  assert.match(readFileSync(join(ROOT, "dist/tools/index.html"), "utf8"), /86 recipes/);
});
