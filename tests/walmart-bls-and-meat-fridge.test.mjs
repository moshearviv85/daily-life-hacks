import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";

const ROOT = join(import.meta.dirname, "..");
const DAY = "2026-11-26";
const WALMART = "how-much-fiber-and-protein-per-dollar-at-walmart-vs-bls";
const MEAT = "how-long-do-cooked-meat-and-poultry-last-in-the-fridge";

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

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function article(slug) {
  return read(`src/data/articles/${slug}.md`);
}

function field(markdown, name) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const line = frontmatter.match(new RegExp(`^${name}:\\s*(.*)$`, "m"))?.[1]?.trim();
  if (!line) return null;
  if (
    (line.startsWith('"') && line.endsWith('"')) ||
    (line.startsWith("'") && line.endsWith("'"))
  ) {
    return line.slice(1, -1);
  }
  return line;
}

function body(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
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
  const [headers, ...data] = rows.filter((line) => line.some((value) => value !== ""));
  return data.map((line) =>
    Object.fromEntries(headers.map((header, index) => [header, line[index] ?? ""])),
  );
}

function internalHrefs(markdown) {
  return [...body(markdown).matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1]);
}

test("both tips pages are indexable chart heroes with substantive dates", () => {
  const registry = read("tests/substantive-update-datemodified.test.mjs");
  const redirects = read("public/_redirects");
  const pages = [
    [WALMART, ["protein-per-dollar-2026.csv", "fiber-per-dollar-2026.csv", "bls-nutrition-per-dollar-latest.csv"]],
    [MEAT, ["meat-per-dollar-protein-ranked-2026.csv"]],
  ];

  for (const [slug, csvNames] of pages) {
    const markdown = article(slug);
    const excerpt = field(markdown, "excerpt");
    assert.equal(field(markdown, "author"), "David Miller", slug);
    assert.equal(field(markdown, "category"), "tips", slug);
    assert.equal(field(markdown, "date"), DAY, slug);
    assert.equal(field(markdown, "dateModified"), DAY, slug);
    assert.equal(field(markdown, "substantiveUpdate"), DAY, slug);
    assert.equal(field(markdown, "image"), `/images/${slug}-chart.jpg`, slug);
    assert.match(field(markdown, "imageAlt"), /chart/i, slug);
    assert.doesNotMatch(field(markdown, "imageAlt"), /photo/i, slug);
    assert.ok(excerpt.length >= 130 && excerpt.length <= 160, `${slug} excerpt ${excerpt.length}`);
    assert.equal(markdown.includes("FAQPage"), false, slug);
    assert.equal(markdown.includes("\u2014"), false, slug);
    assert.match(registry, new RegExp(`"${slug}": "${DAY}"`));
    assert.equal(INDEX_PRUNE_SLUGS.has(slug), false, slug);
    assert.doesNotMatch(redirects, new RegExp(`^/${slug}(?:/)?\\s`, "m"));
    assert.equal(existsSync(join(ROOT, "public/images", `${slug}-main.jpg`)), false);
    assert.equal(existsSync(join(ROOT, "public/images", `${slug}-chart.jpg`)), true);
    assert.match(body(markdown), new RegExp(`/images/${slug}-chart\\.jpg`));
    assert.match(markdown, /Not a photograph, and not an AI illustration/);
    for (const name of csvNames) {
      assert.match(markdown, new RegExp(name.replaceAll(".", "\\.")), slug);
    }
    assert.doesNotMatch(markdown, /\[[^\]]*\]\([^)]*\.csv[^)]*\)/, slug);
    assert.doesNotMatch(markdown, /\]\(\/[^)\s]*#/);

    for (const href of internalHrefs(markdown)) {
      assert.equal(href.includes("#"), false, href);
      if (href.startsWith("/images/")) continue;
      assert.equal(href.endsWith("/"), true, href);
      const target = href.slice(1, -1);
      assert.equal(ORPHANS.includes(target), false, `${slug} links orphan ${target}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(target), false, `${slug} links pruned ${target}`);
      assert.equal(INDEX_PRUNE_SLUGS.has(target.split("/").pop()), false, target);
    }
  }
});

test("Walmart and BLS grams match the protein, fiber, and October files", () => {
  const markdown = article(WALMART);
  const protein = new Map(
    parseCsv(read("public/data/protein-per-dollar-2026.csv")).map((row) => [row.food, row]),
  );
  const fiber = new Map(
    parseCsv(read("public/data/fiber-per-dollar-2026.csv")).map((row) => [row.food, row]),
  );
  const named = [
    ["Whole wheat flour", "Walmart", "96.0", "77.8"],
    ["Brown lentils (dry)", "Walmart", "77.7", "33.7"],
    ["Green split peas (dry)", "Walmart", "73.9", "71.0"],
    ["Chickpeas (dry)", "Walmart", "56.7", "33.8"],
    ["Chicken drumsticks (bone-in)", "Walmart", "50.3", null],
    ["Greek yogurt (plain, nonfat)", "Walmart", "27.5", null],
    ["Navy beans (dry)", "BLS", "59.9", "41.1"],
    ["Black beans (dry)", "BLS", "58.0", "41.6"],
    ["Pinto beans (dry)", "BLS", "57.6", "41.7"],
    ["Eggs (large)", "BLS", "34.4", null],
    ["Whole milk", "BLS", "28.5", null],
    ["Chicken breast (boneless, skinless)", "BLS", "24.6", null],
    ["100% whole wheat bread", "BLS", "20.1", "9.7"],
    ["Ground beef (80/20)", "BLS", "11.3", null],
  ];
  for (const [food, basis, proteinPerDollar, fiberPerDollar] of named) {
    const row = protein.get(food);
    assert.equal(row.protein_g_per_dollar, proteinPerDollar, food);
    assert.equal(row.retailer.startsWith(basis), true, `${food} ${row.retailer}`);
    assert.match(markdown, new RegExp(proteinPerDollar.replace(".", "\\.")), food);
    assert.match(markdown, new RegExp(`food-details/${row.fdc_id}/nutrients`), food);
    if (fiberPerDollar) {
      assert.equal(fiber.get(food).fiber_g_per_dollar, fiberPerDollar, food);
      assert.match(markdown, new RegExp(fiberPerDollar.replace(".", "\\.")), food);
    }
  }
  assert.match(markdown, /FDC 172373[\s\S]{0,80}0\.0 grams of fiber/);
  assert.match(markdown, /FDC 170894[\s\S]{0,80}0 grams of fiber/);
  assert.match(markdown, /does not beat BLS whole milk at 28\.5/);
  assert.match(markdown, /May 2026/);
  assert.equal(protein.get("Whole wheat flour").priced_month, "");
  assert.equal(protein.get("100% whole wheat bread").priced_month, "2026-05");

  const october = parseCsv(read("public/data/bls-nutrition-per-dollar-latest.csv")).filter(
    (row) => row.area_name === "U.S. city average" && row.date === "2026-10-01",
  );
  const byFdc = new Map(october.map((row) => [row.fdc_id, row]));
  const moved = [
    ["168894", "87.17", "22.85"],
    ["171287", "32.48", "0.00"],
    ["171265", "29.99", "0.00"],
    ["171077", "24.90", "0.00"],
    ["174036", "11.53", "0.00"],
  ];
  for (const [fdc, proteinPerDollar, fiberPer100] of moved) {
    const row = byFdc.get(fdc);
    assert.equal(row.protein_g_per_dollar, proteinPerDollar, fdc);
    assert.equal(row.fiber_g_per_dollar, fiberPer100, fdc);
    assert.match(markdown, new RegExp(proteinPerDollar.replace(".", "\\.")), fdc);
  }
  assert.match(markdown, /\]\(\/one-dollar-of-protein-vs-one-dollar-of-fiber\/\)/);
  assert.match(markdown, /\]\(\/how-long-do-cooked-meat-and-poultry-last-in-the-fridge\/\)/);
  assert.match(markdown, /\]\(\/us-regional-grocery-protein-prices-october-2026\/\)/);
  assert.match(markdown, /\]\(\/plant-vs-animal-protein-cost-per-dollar\/\)/);
});

test("cooked meat costs and storage windows match the meat file and the cold-storage chart", () => {
  const markdown = article(MEAT);
  const rows = parseCsv(read("public/data/meat-per-dollar-protein-ranked-2026.csv"));
  const byFood = new Map(rows.map((row) => [row.food, row]));
  const costs = [
    ["Chicken drumsticks (bone-in)", "50.3", "$0.60"],
    ["Chicken thighs (boneless, skinless)", "27.7", "$1.08"],
    ["Rotisserie chicken (whole, cooked)", "26.7", "$1.12"],
    ["Pork shoulder butt roast (boneless)", "25.2", "$1.19"],
    ["Chicken breast (boneless, skinless)", "24.6", "$1.22"],
    ["Pork loin chops (boneless)", "23.0", "$1.30"],
    ["Ground turkey (93/7)", "15.6", "$1.92"],
    ["Ground beef (80/20)", "11.3", "$2.65"],
  ];
  for (const [food, grams, dollars] of costs) {
    const row = byFood.get(food);
    assert.equal(row.value, grams, food);
    const cost = (30 / Number(grams)).toFixed(2);
    // half-up via integer cents
    const cents = Math.round((30 / Number(grams)) * 100);
    assert.equal((cents / 100).toFixed(2), dollars.slice(1), food);
    assert.equal(cost, dollars.slice(1), food);
    assert.match(markdown, new RegExp(dollars.replace("$", "\\$")), food);
    assert.match(markdown, new RegExp(`food-details/${row.fdc_id}/nutrients`), food);
  }
  for (const phrase of [
    "3 to 4 days",
    "2 to 6 months",
    "1 to 2 days",
    "3 to 5 days",
    "9 months",
    "1 year",
    "4 to 12 months",
    "165°F",
    "160°F",
    "145°F",
    "3 minute rest",
    "within 2 hours",
    "above 90°F",
    "40°F",
    "0°F",
  ]) {
    assert.match(markdown, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), phrase);
  }
  assert.match(markdown, /foodsafety\.gov\/food-safety-charts\/cold-food-storage-charts/);
  assert.match(markdown, /fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/leftovers-and-food-safety/);
  assert.match(markdown, /fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/safe-temperature-chart/);
  assert.match(markdown, /\]\(\/how-long-do-cooked-grains-and-beans-last-in-the-fridge\/\)/);
  assert.match(markdown, /\]\(\/how-much-fiber-and-protein-per-dollar-at-walmart-vs-bls\/\)/);
  assert.match(markdown, /\]\(\/animal-protein-per-dollar-ranked\/\)/);
  assert.doesNotMatch(markdown, /\]\(\/how-long-do-leftovers-last-in-the-fridge\//);
});

test("the spec links are one canonical path each and the charts are 1200 by 675", async () => {
  const sources = [
    ["src/pages/404.astro", `/${WALMART}/`],
    ["src/components/BeanWeekPlanner.astro", `/${MEAT}/`],
  ];
  for (const [path, href] of sources) {
    const source = read(path);
    const hits = source.match(new RegExp(href.replaceAll("/", "\\/"), "g")) ?? [];
    assert.equal(hits.length, 1, `${path} -> ${href}`);
    assert.equal(source.includes(`${href}#`), false, path);
    assert.equal(source.includes("\u2014"), false, path);
  }

  for (const slug of [WALMART, MEAT]) {
    const bytes = readFileSync(join(ROOT, "public/images", `${slug}-chart.jpg`));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, "jpeg");
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 675);
  }
  assert.match(read("scripts/generate-walmart-vs-bls-protein-fiber-chart.py"), /protein-per-dollar-2026\.csv/);
  assert.match(read("scripts/generate-cooked-meat-poultry-fridge-chart.py"), /meat-per-dollar-protein-ranked-2026\.csv/);
});
