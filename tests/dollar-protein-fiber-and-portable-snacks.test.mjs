import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const DAY = "2026-11-26";
const DOLLAR = "one-dollar-of-protein-vs-one-dollar-of-fiber";
const SNACK = "cheapest-high-protein-snacks-and-portable-foods";
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

const DOLLAR_IDS = [
  "168893",
  "172420",
  "172428",
  "173745",
  "173734",
  "175199",
  "173756",
  "174284",
  "169738",
  "174266",
  "172373",
  "173904",
  "170284",
  "175188",
  "170554",
];

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
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
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

function halfUp(value, places) {
  const factor = 10 ** places;
  const shifted = value * factor;
  const rounded = Math.sign(shifted) * Math.floor(Math.abs(shifted) + 0.5 + Number.EPSILON);
  return rounded / factor;
}

function money(value) {
  return `$${halfUp(value, 2).toFixed(2)}`;
}

function byFdc(rows) {
  return new Map(rows.filter((row) => row.fdc_id).map((row) => [row.fdc_id, row]));
}

const protein = byFdc(parseCsv(read("public/data/protein-per-dollar-2026.csv")));
const fiber = byFdc(parseCsv(read("public/data/fiber-per-dollar-2026.csv")));
const oneProtein = byFdc(parseCsv(read("public/data/one-dollar-protein-what-it-buys-2026.csv")));
const oneFiber = byFdc(parseCsv(read("public/data/one-dollar-fiber-what-it-buys-2026.csv")));
const noCook = byFdc(parseCsv(read("public/data/no-cook-protein-per-dollar-2026.csv")));
const snackFiber = byFdc(parseCsv(read("public/data/high-fiber-snacks-per-dollar-2026.csv")));

const dollarArticle = read(`src/data/articles/${DOLLAR}.md`);
const snackArticle = read(`src/data/articles/${SNACK}.md`);

function chiaProtein() {
  const row = fiber.get("170554");
  const grams =
    (16.54 / 100) *
    Number(row.package_weight_g) *
    Number(row.edible_fraction) /
    Number(row.package_price_usd);
  return halfUp(grams, 1).toFixed(1);
}

function assertClean(markdown, slug) {
  assert.equal(field(markdown, "author"), "David Miller", slug);
  assert.equal(field(markdown, "date"), DAY, slug);
  assert.equal(field(markdown, "dateModified"), DAY, slug);
  assert.equal(field(markdown, "substantiveUpdate"), DAY, slug);
  assert.equal(field(markdown, "image"), `/images/${slug}-chart.jpg`, slug);
  assert.match(field(markdown, "imageAlt"), /bar chart/i, slug);
  assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i, slug);
  assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, slug);
  assert.equal(read("public/_redirects").includes(slug), false, slug);
  assert.equal(existsSync(`public/images/${slug}-main.jpg`), false, slug);
  assert.equal(existsSync(`public/images/${slug}-chart.jpg`), true, slug);
  assert.equal(
    readFileSync(`public/images/${slug}-chart.jpg`).subarray(0, 3).toString("hex"),
    "ffd8ff",
    slug,
  );
  assert.match(markdown, new RegExp(`/images/${slug}-chart\\.jpg`));
  assert.match(markdown, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(markdown, /Illustration generated with AI/);
  assert.doesNotMatch(markdown, /FAQPage/);
  assert.doesNotMatch(markdown, /\]\([^)]*\.csv\)/);
  assert.doesNotMatch(markdown, /\]\(\/[^)\s]*#/);
  assert.doesNotMatch(markdown, /\u2014/);
  for (const orphan of ORPHANS) {
    assert.equal(markdown.includes(`](/${orphan}/)`), false, `${slug} links orphan ${orphan}`);
  }
  assert.match(
    read("tests/substantive-update-datemodified.test.mjs"),
    new RegExp(`"${slug}": "${DAY}"`),
  );
}

test("the dollar page prices 15 staples from the protein and fiber files", () => {
  assert.equal(field(dollarArticle, "title"), "What $1 Buys in Protein vs. Fiber");
  assert.equal(
    field(dollarArticle, "excerpt"),
    "One dollar of whole wheat flour buys 96 grams of protein and 77.8 grams of fiber. Fifteen staples, side by side, from the 2026 grocery files.",
  );
  assert.equal(field(dollarArticle, "excerpt").length, 141);
  assertClean(dollarArticle, DOLLAR);
  assert.match(dollarArticle, /one-dollar-protein-what-it-buys-2026\.csv/);
  assert.match(dollarArticle, /one-dollar-fiber-what-it-buys-2026\.csv/);
  assert.match(dollarArticle, /protein-per-dollar-2026\.csv/);
  assert.match(dollarArticle, /fiber-per-dollar-2026\.csv/);
  assert.match(dollarArticle, /## What does \$1 buy in protein vs\. fiber at 2026 US grocery prices\?/);
  assert.match(dollarArticle, /\]\(\/cheapest-high-protein-snacks-and-portable-foods\/\)/);
  assert.match(dollarArticle, /16\.54 grams of protein per 100 grams/);
  assert.equal(DOLLAR_IDS.length, 15);

  const chia = chiaProtein();
  assert.equal(chia, "15.9");
  for (const fdcId of DOLLAR_IDS) {
    const proteinRow = protein.get(fdcId);
    const fiberRow = fiber.get(fdcId);
    let proteinGrams;
    let fiberGrams;
    if (fdcId === "170554") {
      assert.equal(proteinRow, undefined);
      proteinGrams = chia;
      fiberGrams = fiberRow.fiber_g_per_dollar;
    } else if (fdcId === "172373") {
      assert.equal(fiberRow, undefined);
      proteinGrams = proteinRow.protein_g_per_dollar;
      fiberGrams = "0.0";
    } else {
      proteinGrams = proteinRow.protein_g_per_dollar;
      fiberGrams = fiberRow.fiber_g_per_dollar;
      const shortProtein = oneProtein.get(fdcId);
      const shortFiber = oneFiber.get(fdcId);
      if (shortProtein) assert.equal(shortProtein.value, proteinGrams, fdcId);
      if (shortFiber) assert.equal(shortFiber.value, fiberGrams, fdcId);
    }
    const proteinShare = String(halfUp((Number(proteinGrams) / 50) * 100, 0));
    const fiberShare = String(halfUp((Number(fiberGrams) / 28) * 100, 0));
    assert.match(dollarArticle, new RegExp(`${proteinGrams.replace(".", "\\.")} g \\| ${proteinShare}%`), fdcId);
    assert.match(dollarArticle, new RegExp(`${fiberGrams.replace(".", "\\.")} g \\| ${fiberShare}%`), fdcId);
    assert.match(dollarArticle, new RegExp(`food-details/${fdcId}/nutrients`), fdcId);
  }
});

test("the snack page prices 10 portable foods and five boxes from the CSVs", () => {
  assert.equal(field(snackArticle, "title"), "Cheapest Portable High-Protein Snacks");
  assert.equal(
    field(snackArticle, "excerpt"),
    "Peanut butter buys 10 grams of protein for $0.20. Ten portable desk snacks, priced for protein and fiber, from the 2026 grocery files.",
  );
  assert.equal(field(snackArticle, "excerpt").length, 134);
  assertClean(snackArticle, SNACK);
  assert.match(snackArticle, /high-fiber-snacks-per-dollar-2026\.csv/);
  assert.match(snackArticle, /no-cook-protein-per-dollar-2026\.csv/);
  assert.match(snackArticle, /21 CFR 101\.54/);
  assert.match(snackArticle, /2\.8 grams of fiber/);
  assert.match(snackArticle, /5 grams of protein/);
  assert.match(snackArticle, /\]\(\/one-dollar-of-protein-vs-one-dollar-of-fiber\/\)/);
  assert.match(snackArticle, /Popcorn kernels print 51\.3 grams/);

  const priced = [
    ["174266", "50.7", "11.4"],
    ["174262", "39.8", "13.7"],
    ["170562", "31.7", "13.1"],
    ["170894", "27.5", null],
    ["172179", "26.3", null],
    ["170567", "14.8", "8.8"],
    ["170393", null, "16.1"],
    ["173944", null, "11.6"],
    ["168162", null, "8.1"],
    ["168204", null, "7.3"],
  ];
  assert.equal(priced.length, 10);
  for (const [fdcId, proteinRate, fiberRate] of priced) {
    if (proteinRate) {
      assert.equal(noCook.get(fdcId).value, proteinRate, fdcId);
      assert.equal(protein.get(fdcId).protein_g_per_dollar, proteinRate, fdcId);
      assert.match(snackArticle, new RegExp(`${proteinRate} g \\| \\${money(10 / Number(proteinRate))}`), fdcId);
    }
    if (fiberRate) {
      assert.equal(snackFiber.get(fdcId).value, fiberRate, fdcId);
      assert.equal(fiber.get(fdcId).fiber_g_per_dollar, fiberRate, fdcId);
      assert.match(snackArticle, new RegExp(`${fiberRate} g \\| \\${money(5 / Number(fiberRate))}`), fdcId);
    }
    assert.match(snackArticle, new RegExp(`food-details/${fdcId}/nutrients`), fdcId);
  }

  const portion = (per100, grams, edible = 1) => halfUp((Number(per100) * grams * edible) / 100, 1);
  const cost = (price, weight, grams) => halfUp((Number(price) / Number(weight)) * grams, 2);
  const pb = protein.get("174266");
  const apple = fiber.get("168204");
  const carrot = fiber.get("170393");
  const sun = protein.get("170562");
  const sunFiber = fiber.get("170562");
  const yogurt = protein.get("170894");
  const banana = fiber.get("173944");
  const cottage = protein.get("172179");
  const prune = fiber.get("168162");
  const peanut = protein.get("174262");
  const peanutFiber = fiber.get("174262");
  const raisin = fiber.get("2758980");

  assert.equal(portion(pb.protein_g_per_100g, 32), 7.1);
  assert.equal(portion(fiber.get("174266").fiber_g_per_100g, 32), 1.6);
  assert.equal(portion(apple.fiber_g_per_100g, 180, apple.edible_fraction), 3.7);
  assert.equal(cost(apple.package_price_usd, apple.package_weight_g, 180), 0.51);
  assert.equal(portion(sun.protein_g_per_100g, 28), 5.8);
  assert.equal(portion(sunFiber.fiber_g_per_100g, 28), 2.4);
  assert.equal(portion(carrot.fiber_g_per_100g, 100), 2.8);
  assert.equal(portion(yogurt.protein_g_per_100g, 170), 17.3);
  assert.equal(portion(banana.fiber_g_per_100g, 185, banana.edible_fraction), 3.1);
  assert.equal(portion(cottage.protein_g_per_100g, 100), 11.1);
  assert.equal(portion(prune.fiber_g_per_100g, 40), 2.8);
  assert.equal(portion(peanut.protein_g_per_100g, 28), 6.8);
  assert.equal(portion(peanutFiber.fiber_g_per_100g, 28), 2.4);
  assert.equal(portion(raisin.fiber_g_per_100g, 40), 1.5);
  assert.match(snackArticle, /\| Apple and peanut butter \| .* \| 7\.1 g \| 5\.3 g \| \$0\.65 \|/);
  assert.match(snackArticle, /\| Carrots and sunflower kernels \| .* \| 5\.8 g \| 5\.2 g \| \$0\.35 \|/);
  assert.match(snackArticle, /\| Yogurt and banana \| .* \| 17\.3 g \| 3\.1 g \| \$0\.89 \|/);
  assert.match(snackArticle, /\| Cottage cheese and prunes \| .* \| 11\.1 g \| 2\.8 g \| \$0\.77 \|/);
  assert.match(snackArticle, /\| Peanuts and raisins \| .* \| 6\.8 g \| 3\.9 g \| \$0\.41 \|/);
});

test("the spec source pages link the new slugs without moving dateModified", () => {
  const tools = read("src/pages/tools/index.astro");
  const about = read("src/pages/about.astro");
  const reuse = read("src/pages/data-reuse.astro");
  const editorial = read("src/pages/editorial-policy.astro");
  assert.match(tools, /href="\/one-dollar-of-protein-vs-one-dollar-of-fiber\/"/);
  assert.doesNotMatch(tools, /one-dollar-of-protein-vs-one-dollar-of-fiber\/#/);
  assert.match(about, /href="\/one-dollar-of-protein-vs-one-dollar-of-fiber\/"/);
  assert.doesNotMatch(about, /one-dollar-of-protein-vs-one-dollar-of-fiber\/#/);
  assert.match(reuse, /href="\/cheapest-high-protein-snacks-and-portable-foods\/"/);
  assert.match(reuse, /dateModified: "2026-07-29"/);
  assert.match(editorial, /href="\/cheapest-high-protein-snacks-and-portable-foods\/"/);
  assert.match(editorial, /dateModified: "2026-11-23"/);
  assert.match(editorial, /Page last updated November 23, 2026/);
  assert.doesNotMatch(editorial, /cheapest-high-protein-snacks-and-portable-foods\/#/);
  assert.doesNotMatch(reuse, /cheapest-high-protein-snacks-and-portable-foods\/#/);
});

test("built pages are in the sitemap and omit FAQPage", () => {
  const sitemapPath = "dist/sitemap-0.xml";
  if (!existsSync(sitemapPath)) return;
  const sitemap = readdirSync("dist")
    .filter((name) => name.startsWith("sitemap") && name.endsWith(".xml"))
    .map((name) => read(join("dist", name)))
    .join("\n");
  for (const slug of [DOLLAR, SNACK]) {
    assert.match(sitemap, new RegExp(`https://www\\.daily-life-hacks\\.com/${slug}/`));
    const html = read(join("dist", slug, "index.html"));
    assert.doesNotMatch(html, /FAQPage/);
    assert.match(html, new RegExp(`"dateModified":"${DAY}T00:00:00.000Z"`));
    assert.match(html, /David Miller/);
    assert.match(html, /<meta name="robots" content="index, follow/);
  }
});
