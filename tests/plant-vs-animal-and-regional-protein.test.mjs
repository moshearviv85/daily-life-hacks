import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const DAY = "2026-11-26";
const PLANT = "plant-vs-animal-protein-cost-per-dollar";
const REGION = "us-regional-grocery-protein-prices-october-2026";

const PLANT_EXCERPT =
  "Brown lentils lead raw protein at 77.7 grams per dollar. After a DIAAS cap at 1.00, bone-in drumsticks pass them at 50.3 usable grams.";
const REGION_EXCERPT =
  "October 2026 BLS prices: Midwest chicken breast is 27.09 g per dollar, South ground beef is 12.32, and the West pays more for both.";

const PLANT_FOODS = [
  ["172373", "50.3", "1.08", "1.00", "50.3"],
  ["172420", "77.7", "0.63", "0.63", "49.0"],
  ["173756", "56.7", "0.83", "0.83", "47.1"],
  ["172428", "73.9", "0.58", "0.58", "42.9"],
  ["171287", "34.4", "1.13", "1.00", "34.4"],
  ["171244", "30.1", "1.14", "1.00", "30.1"],
  ["171265", "28.5", "1.14", "1.00", "28.5"],
  ["171077", "24.6", "1.08", "1.00", "24.6"],
  ["174290", "13.6", "0.90", "0.90", "12.2"],
  ["174036", "11.3", "1.11", "1.00", "11.3"],
];

const REGION_STAPLES = ["FF1101", "706111", "704212", "703112", "703613", "710212", "709112"];
const REGION_NAMES = ["Northeast", "Midwest", "South", "West"];

function read(path) {
  return readFileSync(path, "utf8");
}

function field(markdown, name) {
  return extractFrontmatterField(markdown, name);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const [headers, ...body] = rows.filter((line) => line.some((value) => value !== ""));
  return body.map((line) =>
    Object.fromEntries(headers.map((header, index) => [header, line[index] ?? ""])),
  );
}

function wordsAfter(markdown, heading) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  assert.ok(start >= 0, heading);
  const paragraph = markdown
    .slice(start + marker.length)
    .trim()
    .split(/\n\s*\n/, 1)[0];
  const visible = paragraph.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.split(/\s+/).filter(Boolean);
}

function assertChartPage(markdown, slug, excerpt) {
  assert.equal(field(markdown, "excerpt"), excerpt);
  assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${slug} excerpt ${excerpt.length}`);
  assert.equal(field(markdown, "author"), "David Miller");
  assert.equal(field(markdown, "category"), "nutrition");
  assert.equal(field(markdown, "date"), DAY);
  assert.equal(field(markdown, "dateModified"), DAY);
  assert.equal(field(markdown, "substantiveUpdate"), DAY);
  assert.equal(field(markdown, "image"), `/images/${slug}-chart.jpg`);
  assert.match(field(markdown, "imageAlt"), /chart/i);
  assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i);
  assert.equal(INDEX_PRUNE_SLUGS.has(slug), false);
  assert.doesNotMatch(markdown, /FAQPage/);
  assert.doesNotMatch(markdown, /\u2014/);
  assert.doesNotMatch(markdown, /\]\([^)]*\.csv\)/);
  assert.doesNotMatch(markdown, /\]\(\/data\//);
  assert.doesNotMatch(markdown, /\]\(\/[^)\s]*#/);
  assert.match(markdown, new RegExp(`/images/${slug}-chart\\.jpg`));
  assert.equal(existsSync(`public/images/${slug}-chart.jpg`), true);
  for (const match of markdown.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    if (match[1].startsWith("/images/")) continue;
    assert.match(match[1], /^\/[a-z0-9-]+\/$/, match[1]);
  }
}

const plant = read(`src/data/articles/${PLANT}.md`);
const region = read(`src/data/articles/${REGION}.md`);
const quality = parseCsv(read("public/data/protein-quality-per-dollar-2026.csv"));
const plantRanked = parseCsv(read("public/data/plant-protein-per-dollar-ranked-2026.csv"));
const animalRanked = parseCsv(read("public/data/animal-protein-per-dollar-ranked-2026.csv"));
const bls = parseCsv(read("public/data/bls-nutrition-per-dollar-latest.csv"));
const qualityByFdc = new Map(quality.filter((row) => row.fdc_id).map((row) => [row.fdc_id, row]));
const rankedByFdc = new Map(
  [...plantRanked, ...animalRanked].filter((row) => row.fdc_id).map((row) => [row.fdc_id, row]),
);

test("the plant-versus-animal page uses the ten audited DIAAS rows", () => {
  assertChartPage(plant, PLANT, PLANT_EXCERPT);
  assert.equal(existsSync("scripts/generate-plant-vs-animal-protein-cost-chart.py"), true);
  assert.match(
    plant,
    /Which gives cheaper usable protein per dollar: plant staples or animal foods\?/,
  );
  const answer = wordsAfter(
    plant,
    "Which gives cheaper usable protein per dollar: plant staples or animal foods?",
  );
  assert.ok(answer.length >= 40 && answer.length <= 60, `answer has ${answer.length} words`);
  assert.match(plant, /plant-protein-per-dollar-ranked-2026\.csv/);
  assert.match(plant, /animal-protein-per-dollar-ranked-2026\.csv/);
  assert.match(plant, /protein-quality-per-dollar-2026\.csv/);
  assert.match(plant, /\/protein-per-dollar-adjusted-for-quality\//);
  assert.match(plant, /\/animal-protein-per-dollar-ranked\//);
  assert.match(plant, /\/us-regional-grocery-protein-prices-october-2026\//);

  for (const [fdc, raw, published, capped, adjusted] of PLANT_FOODS) {
    const row = qualityByFdc.get(fdc);
    assert.equal(row.protein_g_per_dollar, raw, fdc);
    assert.equal(row.diaas_score, published, fdc);
    assert.equal(row.diaas_capped_for_multiplication, capped, fdc);
    assert.equal(row.adjusted_g_per_dollar, adjusted, fdc);
    assert.equal(rankedByFdc.get(fdc).value, raw, `${fdc} ranking`);
    assert.match(plant, new RegExp(`food-details/${fdc}/nutrients`));
    assert.match(plant, new RegExp(raw.replace(".", "\\.")));
    assert.match(plant, new RegExp(adjusted.replace(".", "\\.")));
  }
});

test("the regional page quotes October 2026 BLS rows and labels older months", () => {
  assertChartPage(region, REGION, REGION_EXCERPT);
  assert.equal(existsSync("scripts/generate-us-regional-grocery-protein-prices-chart.py"), true);
  assert.match(
    region,
    /Which U\.S\. region has the cheapest grocery protein per dollar in October 2026\?/,
  );
  const answer = wordsAfter(
    region,
    "Which U.S. region has the cheapest grocery protein per dollar in October 2026?",
  );
  assert.ok(answer.length >= 40 && answer.length <= 60, `answer has ${answer.length} words`);
  assert.match(region, /bls-nutrition-per-dollar-latest\.csv/);
  assert.match(region, /\/plant-vs-animal-protein-cost-per-dollar\//);
  assert.match(region, /\/animal-protein-per-dollar-ranked\//);
  assert.doesNotMatch(region, /47\.78 g per dollar looks like the best protein deal[\s\S]{0,80}October 2026 winner/);

  const byKey = new Map(
    bls
      .filter((row) => REGION_STAPLES.includes(row.bls_item_code) && REGION_NAMES.includes(row.area_name))
      .map((row) => [`${row.bls_item_code}:${row.area_name}`, row]),
  );
  assert.equal(byKey.size, REGION_STAPLES.length * REGION_NAMES.length);
  for (const [key, row] of byKey) {
    assert.match(region, new RegExp(`food-details/${row.fdc_id}/nutrients`), key);
    assert.match(region, new RegExp(row.protein_g_per_dollar.replace(".", "\\.")), key);
    assert.match(region, new RegExp(row.price_usd.replace(".", "\\.")), key);
    assert.match(region, new RegExp(row.priced_month), key);
  }

  const breastMidwest = byKey.get("FF1101:Midwest");
  const breastWest = byKey.get("FF1101:West");
  const beefSouth = byKey.get("703112:South");
  const beefWest = byKey.get("703112:West");
  const cheddarSouth = byKey.get("710212:South");
  const cheddarWest = byKey.get("710212:West");
  const porkNortheast = byKey.get("704212:Northeast");
  const porkMidwest = byKey.get("704212:Midwest");
  assert.equal(breastMidwest.priced_month, "2026-10");
  assert.equal(cheddarSouth.priced_month, "2026-10");
  assert.equal(byKey.get("709112:Midwest").priced_month, "2020-04");
  assert.equal(byKey.get("703613:Northeast").priced_month, "2023-06");

  const percent = (high, low) =>
    (((Number(high) - Number(low)) / Number(low)) * 100).toFixed(1);
  assert.equal(percent(breastWest.price_usd, breastMidwest.price_usd), "19.8");
  assert.equal(percent(beefWest.price_usd, beefSouth.price_usd), "15.3");
  assert.equal(percent(cheddarWest.price_usd, cheddarSouth.price_usd), "42.2");
  assert.equal(percent(porkMidwest.price_usd, porkNortheast.price_usd), "8.2");
  assert.match(region, /19\.8 percent/);
  assert.match(region, /15\.3 percent/);
  assert.match(region, /42\.2 percent/);
  assert.match(region, /8\.2 percent/);
});

test("the four source pages link the new slugs without moving dateModified", () => {
  const sources = [
    ["high-fiber-pizza-crust-cauliflower", PLANT, "2026-09-23"],
    ["sourdough-discard-sandwich-bread-no-yeast", PLANT, null],
    ["sourdough-discard-cinnamon-rolls-no-yeast", REGION, null],
    ["can-you-use-sourdough-discard-from-a-new-starter", REGION, null],
  ];
  for (const [slug, target, dateModified] of sources) {
    const markdown = read(`src/data/articles/${slug}.md`);
    assert.equal(field(markdown, "dateModified"), dateModified, slug);
    assert.equal(field(markdown, "substantiveUpdate"), null, slug);
    assert.match(markdown, new RegExp(`\\(/${target}/\\)`), slug);
    assert.doesNotMatch(markdown, new RegExp(`/${target}/#`), slug);
  }
});

test("built pages are in the sitemap and omit FAQPage", () => {
  const sitemapPath = "dist/sitemap-0.xml";
  if (!existsSync(sitemapPath)) return;
  const sitemap = readdirSync("dist")
    .filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"))
    .map((name) => read(join("dist", name)))
    .join("\n");
  for (const slug of [PLANT, REGION]) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = read(join("dist", slug, "index.html"));
    assert.doesNotMatch(html, /FAQPage/);
    assert.match(html, new RegExp(`"dateModified":"${DAY}T00:00:00.000Z"`));
    assert.match(html, /David Miller/);
    assert.match(html, /<meta name="robots" content="index, follow/);
  }
});
