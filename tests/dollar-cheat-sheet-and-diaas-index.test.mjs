import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_NOINDEX_TOOL_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { parseCsv } from "../src/content/price-basis.mjs";

const ORPHANS = new Set([
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
]);

const SHEET = "src/pages/printables/high-fiber-and-protein-dollar-cheat-sheet/index.astro";
const DIAAS = "src/pages/data/protein-quality-diaas-and-cost-index/index.astro";
const SHEET_LINKS = [
  "/one-dollar-of-protein-vs-one-dollar-of-fiber/",
  "/cheapest-family-grocery-basket-for-protein-and-fiber/",
  "/how-much-fiber-and-protein-per-dollar-at-walmart-vs-bls/",
  "/cheapest-ways-to-add-10-grams-of-fiber-to-any-meal/",
  "/cost-of-50g-protein-and-30g-fiber-per-day/",
  "/methodology/",
  "/author/david-miller/",
  "/printables/",
];
const DIAAS_LINKS = [
  "/protein-per-dollar-adjusted-for-quality/",
  "/plant-vs-animal-protein-cost-per-dollar/",
  "/cheapest-dairy-and-soy-protein-per-dollar/",
  "/animal-protein-per-dollar-ranked/",
  "/methodology/",
  "/author/david-miller/",
  "/data/",
];

function read(path) {
  return readFileSync(path, "utf8");
}

function rowsOf(path) {
  const parsed = parseCsv(read(path));
  return parsed.rows.map((row) =>
    Object.fromEntries(parsed.header.map((name, index) => [name, row[index] ?? ""])),
  );
}

function hrefs(source) {
  return [...source.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

function rowFor(source, name) {
  const marker = `data-name="${name}"`;
  const start = source.indexOf(marker);
  assert.ok(start > 0, name);
  const trStart = source.lastIndexOf("<tr", start);
  const trEnd = source.indexOf("</tr>", start);
  return source.slice(trStart, trEnd);
}

function assertCanonicalInternalLinks(source, label) {
  for (const href of hrefs(source)) {
    if (href === "/" || /^(?:https?:|mailto:)/i.test(href)) continue;
    assert.equal(href.includes("#"), false, `${label} hash link ${href}`);
    assert.equal(/\.csv(?:$|\?)/i.test(href), false, `${label} csv link ${href}`);
    assert.match(href, /^\/[a-z0-9-/]+\/$/, `${label} canonical ${href}`);
    const slug = href.split("/").filter(Boolean).pop();
    const nested = href.replace(/^\/|\/$/g, "");
    assert.equal(ORPHANS.has(slug), false, `${label} orphan ${href}`);
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, `${label} pruned ${href}`);
    assert.equal(INDEX_PRUNE_SLUGS.has(nested), false, `${label} pruned ${href}`);
    assert.equal(INDEX_NOINDEX_TOOL_PATHS.has(nested), false, `${label} noindex tool ${href}`);
    const page =
      existsSync(`src/pages/${nested}/index.astro`) ||
      existsSync(`src/pages/${nested}.astro`) ||
      existsSync(`src/data/articles/${slug}.md`);
    assert.equal(page, true, `${label} missing target ${href}`);
  }
}

const sheet = read(SHEET);
const diaas = read(DIAAS);
const quality = rowsOf("public/data/protein-quality-per-dollar-2026.csv");
const dairy = rowsOf("public/data/dairy-protein-per-dollar-ranked-2026.csv");
const meat = rowsOf("public/data/meat-per-dollar-protein-ranked-2026.csv");
const scoredNames = new Set(quality.map((row) => row.food));
const gaps = [...dairy, ...meat].filter((row) => !scoredNames.has(row.food));

test("the dollar cheat sheet is an indexable printable with a chart hero", async () => {
  assert.match(sheet, /author=\{AUTHOR_NAME\}/);
  assert.match(sheet, /"@type": "WebPage"/);
  assert.match(sheet, /"@type": "BreadcrumbList"/);
  assert.match(sheet, /name: AUTHOR_NAME/);
  assert.doesNotMatch(sheet, /FAQPage/);
  assert.doesNotMatch(sheet, /noindex/);
  assert.doesNotMatch(sheet, /\u2014/);
  assert.match(sheet, /window\.print\(\)/);
  assert.match(sheet, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(sheet.replaceAll("Not a photograph, and not an AI illustration", ""), /photo/i);
  assert.match(sheet, /bar chart/i);
  assert.match(sheet, /one-dollar-protein-what-it-buys-2026\.csv/);
  assert.match(sheet, /one-dollar-fiber-what-it-buys-2026\.csv/);
  assert.match(sheet, /52\.7/);
  assert.match(sheet, /37\.13/);
  assert.match(sheet, /0\.82/);
  assert.match(sheet, /don't contain a \$2\.00 combined menu/);
  assert.equal(INDEX_PRUNE_SLUGS.has("high-fiber-and-protein-dollar-cheat-sheet"), false);
  assert.equal(INDEX_PRUNE_SLUGS.has("printables/high-fiber-and-protein-dollar-cheat-sheet"), false);
  for (const href of SHEET_LINKS) assert.match(sheet, new RegExp(href.replaceAll("/", "\\/")));
  assertCanonicalInternalLinks(sheet, "cheat sheet");
  assert.doesNotMatch(sheet, /href="\/nutrition\/"/);
  assert.doesNotMatch(sheet, /weekly-grocery-budget-planner/);

  const script = read("scripts/generate-dollar-cheat-sheet-chart.py");
  assert.match(script, /one-dollar-protein-what-it-buys-2026\.csv/);
  assert.match(script, /one-dollar-fiber-what-it-buys-2026\.csv/);
  assert.doesNotMatch(script, /-main\.jpg/);
  const bytes = readFileSync("public/images/high-fiber-and-protein-dollar-cheat-sheet-chart.jpg");
  assert.equal(bytes[0], 0xff);
  assert.equal(bytes[1], 0xd8);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
});

test("the DIAAS index uses only published scores and names the gaps", async () => {
  assert.equal(quality.length, 25);
  assert.equal(gaps.length, 8);
  assert.match(diaas, /author=\{AUTHOR_NAME\}/);
  assert.match(diaas, /"@type": "WebPage"/);
  assert.match(diaas, /"@type": "Dataset"/);
  assert.match(diaas, /"@type": "BreadcrumbList"/);
  assert.match(diaas, /DATASET_PERSON_CREATOR/);
  assert.doesNotMatch(diaas, /FAQPage/);
  assert.doesNotMatch(diaas, /noindex/);
  assert.doesNotMatch(diaas, /\u2014/);
  assert.match(diaas, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(diaas.replaceAll("Not a photograph, and not an AI illustration", ""), /photo/i);
  assert.match(diaas, /slope chart/i);
  assert.match(diaas, /protein-quality-per-dollar-2026\.csv/);
  assert.match(diaas, /dairy-protein-per-dollar-ranked-2026\.csv/);
  assert.match(diaas, /meat-per-dollar-protein-ranked-2026\.csv/);
  assert.match(diaas, /document\.addEventListener\('astro:page-load'/);
  assert.match(diaas, /browser tab/);
  assert.match(diaas, /value="raw"/);
  assert.match(diaas, /value="adjusted"/);
  assert.equal(INDEX_PRUNE_SLUGS.has("protein-quality-diaas-and-cost-index"), false);
  for (const href of DIAAS_LINKS) assert.match(diaas, new RegExp(href.replaceAll("/", "\\/")));
  assertCanonicalInternalLinks(diaas, "diaas index");
  assert.doesNotMatch(diaas, /href="\/nutrition\/"/);

  assert.match(diaas, /score: row\.diaas_score/);
  assert.match(diaas, /capped: row\.diaas_capped_for_multiplication/);
  assert.match(diaas, /adjusted: row\.adjusted_g_per_dollar/);
  assert.match(diaas, /raw: row\.protein_g_per_dollar/);
  assert.match(diaas, /score: "none"/);
  assert.match(diaas, /No published DIAAS/);
  assert.match(diaas, /is not copied over/);
  assert.match(diaas, /milkScore/);
  assert.doesNotMatch(diaas, /54\.3/);
  assert.doesNotMatch(diaas, /38\.9/);
  assert.match(diaas, /!qualityByName\.has\(row\.food\)/);

  const script = diaas.match(/<script is:inline>([\s\S]*?)<\/script>/);
  assert.ok(script, "inline explorer");
  assert.doesNotThrow(() => new Function(script[1]));

  const chartScript = read("scripts/generate-protein-quality-diaas-chart.py");
  assert.match(chartScript, /protein-quality-per-dollar-2026\.csv/);
  assert.match(chartScript, /adjusted_g_per_dollar/);
  assert.doesNotMatch(chartScript, /-main\.jpg/);
  const bytes = readFileSync("public/images/protein-quality-diaas-and-cost-index-chart.jpg");
  assert.equal(bytes[0], 0xff);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
});

test("inbound links point at the new pages and the hubs stay within their caps", () => {
  const hub = read("src/pages/printables/index.astro");
  const planner = read("src/pages/printables/weekly-grocery-budget-planner/index.astro");
  const protein = read("src/pages/data/meat-dairy-and-plant-protein-index/index.astro");
  const tools = read("src/pages/tools/index.astro");
  assert.match(hub, /\/printables\/high-fiber-and-protein-dollar-cheat-sheet\//);
  assert.match(planner, /\/printables\/high-fiber-and-protein-dollar-cheat-sheet\//);
  assert.match(protein, /\/data\/protein-quality-diaas-and-cost-index\//);
  assert.match(tools, /\/data\/protein-quality-diaas-and-cost-index\//);
  assert.match(tools, /86 recipes/);
  assert.doesNotMatch(hub, /\u2014/);
  assert.doesNotMatch(planner, /\u2014/);
  assert.doesNotMatch(protein, /\u2014/);
  assert.doesNotMatch(read("astro.config.mjs"), /high-fiber-and-protein-dollar-cheat-sheet/);
  assert.doesNotMatch(read("src/content/index-prune.js"), /protein-quality-diaas-and-cost-index/);
});

test("both new URLs are sitemap candidates once the site is built", () => {
  const sitemap = "dist/sitemap-0.xml";
  if (!existsSync(sitemap)) return;
  const xml = readdirSync("dist")
    .filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"))
    .map((name) => read(join("dist", name)))
    .join("\n");
  for (const path of [
    "/printables/high-fiber-and-protein-dollar-cheat-sheet/",
    "/data/protein-quality-diaas-and-cost-index/",
  ]) {
    assert.match(xml, new RegExp(`https://www\\.daily-life-hacks\\.com${path.replaceAll("/", "\\/")}`));
    const html = read(join("dist", path, "index.html"));
    const robots = html.match(/<meta name="robots" content="([^"]+)"/);
    assert.ok(robots, path);
    assert.equal(robots[1].includes("noindex"), false, path);
    assert.doesNotMatch(html, /"@type":"FAQPage"|"@type": "FAQPage"/);
    assert.match(html, /David Miller/);
    assert.doesNotMatch(html, /href="[^"]+\.csv"/);
    assert.doesNotMatch(html, /href="[^"]*#[^"]*"/);
  }
  const diaasHtml = read("dist/data/protein-quality-diaas-and-cost-index/index.html");
  for (const row of quality) {
    const html = rowFor(diaasHtml, row.food);
    assert.match(html, new RegExp(`data-score="${row.diaas_score}"`));
    assert.match(html, new RegExp(`data-adjusted="${row.adjusted_g_per_dollar}"`));
    assert.match(html, new RegExp(`data-raw="${row.protein_g_per_dollar}"`));
    assert.match(html, /data-gap="0"/);
    assert.doesNotMatch(html, /No published DIAAS/);
  }
  for (const row of gaps) {
    const html = rowFor(diaasHtml, row.food);
    assert.match(html, /data-score="none"/);
    assert.match(html, /data-gap="1"/);
    assert.match(html, /No published DIAAS/);
    assert.doesNotMatch(html, /data-score="\d/);
    assert.match(html, new RegExp(`>${row.value}<`));
  }
  const drumsticks = rowFor(diaasHtml, "Chicken drumsticks (bone-in)");
  assert.match(drumsticks, /data-score="1.08"/);
  assert.match(drumsticks, /data-capped="1.00"/);
  assert.match(drumsticks, /data-adjusted="50.3"/);
  assert.doesNotMatch(drumsticks, /54\.3/);
  assert.doesNotMatch(rowFor(diaasHtml, "Cheddar cheese"), /1\.14/);
  assert.match(diaasHtml, /1\.14 is not copied over/);
  const nutrition = read("dist/nutrition/index.html");
  const anchors = [...nutrition.matchAll(/<a\b/gi)].length;
  assert.ok(anchors <= 124, `/nutrition/ rendered ${anchors} anchors`);
});
