import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = process.cwd();
const read = (path) => readFileSync(join(ROOT, path), "utf8");

const hub = read("src/pages/printables/index.astro");
const calculator = read("src/pages/tools/protein-per-dollar-calculator/index.astro");
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

const GUARDED = [
  "canned-vs-dry-beans-cost-and-sodium-per-serving",
  "cheapest-frozen-vegetables-for-fiber-and-protein",
  "cheapest-shelf-stable-pantry-foods-for-protein",
  "how-long-do-cooked-grains-and-beans-last-in-the-fridge",
  "sourdough-discard-hydration-conversion-chart",
];

function literalHrefs(source) {
  return [...source.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
}

test("printables hub is an indexable collection page with a chart hero", async () => {
  assert.match(hub, /"@type": "CollectionPage"/);
  assert.match(hub, /"@type": "ItemList"/);
  assert.match(hub, /"@type": "BreadcrumbList"/);
  assert.match(hub, /name: AUTHOR_NAME/);
  assert.match(hub, /author=\{AUTHOR_NAME\}/);
  assert.match(hub, /\/images\/printables-hub-chart\.jpg/);
  assert.match(hub, /Not a photograph/);
  assert.doesNotMatch(hub, /FAQPage/);
  assert.doesNotMatch(hub, /\u2014/);
  assert.doesNotMatch(hub, /href="[^"]*\.csv"/);
  assert.doesNotMatch(hub, /href="[^"]*#/);
  assert.doesNotMatch(hub, /href="[^"]*\.pdf"/);
  for (const href of [
    "/printables/weekly-grocery-budget-planner/",
    "/printables/bean-conversion-card/",
    "/printables/fridge-life-card/",
    "/printables/smoke-point-chart/",
    "/printables/sourdough-discard-grams-cheat-sheet/",
  ]) {
    assert.equal(hub.includes(`"${href}"`), true, href);
  }
  assert.equal(INDEX_PRUNE_SLUGS.has("printables"), false);
  assert.match(read("src/components/DataProvenance.astro"), /href="\/printables\/"/);
  assert.match(read("scripts/generate-printables-hub-chart.py"), /canned-vs-dry-beans-cost-2026\.csv/);
  assert.doesNotMatch(read("scripts/generate-printables-hub-chart.py"), /-main\.jpg/);

  const bytes = readFileSync(join(ROOT, "public/images/printables-hub-chart.jpg"));
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
});

test("companion studies are linked only when the article file exists", () => {
  assert.match(hub, /articleExists\(item\.slug\)/);
  for (const slug of GUARDED) {
    assert.match(hub, new RegExp(slug));
    const exists = existsSync(join(ROOT, "src/data/articles", `${slug}.md`));
    assert.equal(
      hub.includes(`href="/${slug}/"`),
      false,
      `${slug} is emitted from the filtered list, not a hardcoded href`,
    );
    if (!exists) assert.equal(ORPHANS.includes(slug), false, slug);
  }
  for (const href of literalHrefs(hub)) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const slug = href.replace(/^\/|\/$/g, "");
    const leaf = slug.split("/").pop();
    assert.equal(href.includes("#"), false, href);
    assert.equal(ORPHANS.includes(leaf), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(leaf), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, href);
  }
});

test("protein per dollar calculator stays indexable and chart-backed", async () => {
  assert.match(calculator, /"@type": "WebApplication"/);
  assert.match(calculator, /applicationCategory/);
  assert.match(calculator, /browser tab/);
  assert.match(calculator, /href="\/methodology\/"/);
  assert.match(calculator, /document\.addEventListener\('astro:page-load'/);
  assert.match(calculator, /target\/food\.raw/);
  assert.match(calculator, /target\/food\.adjusted/);
  assert.match(calculator, /min="50" max="150"/);
  assert.match(calculator, /Not a photograph/);
  assert.doesNotMatch(calculator, /FAQPage/);
  assert.doesNotMatch(calculator, /\u2014/);
  assert.doesNotMatch(calculator, /href="[^"]*\.csv"/);
  assert.doesNotMatch(calculator, /href="[^"]*#/);
  assert.match(calculator, /protein-per-dollar-2026\.csv/);
  assert.match(calculator, /protein-quality-per-dollar-2026\.csv/);
  assert.equal(INDEX_PRUNE_SLUGS.has("tools/protein-per-dollar-calculator"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("protein-per-dollar-calculator"), false);
  assert.equal(INDEX_NOINDEX_TOOL_PATHS.has("tools/protein-per-dollar-calculator"), false);
  assert.match(
    read("src/components/KitchenCalculator.astro"),
    /href="\/tools\/protein-per-dollar-calculator\/"/,
  );
  assert.match(read("src/pages/terms.astro"), /href="\/tools\/protein-per-dollar-calculator\/"/);
  assert.match(read("scripts/generate-protein-per-dollar-calculator-chart.py"), /protein-quality-per-dollar-2026\.csv/);
  assert.doesNotMatch(read("scripts/generate-protein-per-dollar-calculator-chart.py"), /-main\.jpg/);

  const bytes = readFileSync(join(ROOT, "public/images/protein-per-dollar-calculator-chart.jpg"));
  assert.equal(bytes[0], 0xff);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);

  for (const href of literalHrefs(calculator)) {
    const slug = href.replace(/^\/|\/$/g, "").split("/").pop();
    assert.equal(ORPHANS.includes(slug), false, href);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, href);
  }
});

test("built sitemap includes both new pages when dist exists", () => {
  const sitemap = join(ROOT, "dist/sitemap-0.xml");
  if (!existsSync(sitemap)) return;
  const xml = readFileSync(sitemap, "utf8");
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/printables\/</);
  assert.match(xml, /https:\/\/www\.daily-life-hacks\.com\/tools\/protein-per-dollar-calculator\/</);
  const hubHtml = readFileSync(join(ROOT, "dist/printables/index.html"), "utf8");
  assert.equal(hubHtml.includes("FAQPage"), false);
  assert.equal(hubHtml.includes("/cheapest-frozen-vegetables-for-fiber-and-protein/"), false);
  assert.equal(hubHtml.includes("/cheapest-shelf-stable-pantry-foods-for-protein/"), false);
  assert.match(hubHtml, /\/canned-vs-dry-beans-cost-and-sodium-per-serving\//);
  assert.match(hubHtml, /\/how-long-do-cooked-grains-and-beans-last-in-the-fridge\//);
  assert.match(hubHtml, /\/sourdough-discard-hydration-conversion-chart\//);
  const calcHtml = readFileSync(join(ROOT, "dist/tools/protein-per-dollar-calculator/index.html"), "utf8");
  assert.equal(calcHtml.includes("FAQPage"), false);
  assert.match(calcHtml, /77\.7/);
  assert.match(calcHtml, /49\.0/);
  assert.match(calcHtml, /"@type":"WebApplication"/);
});
