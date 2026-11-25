import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";
import {
  CUP_GRAMS,
  addDiscard,
  discardSplit,
} from "../src/lib/sourdough-discard-math.js";

const PROTEIN_EXCERPT =
  "A 7-day high-protein grocery list built from USDA data and July 2026 US prices: 52.5 g protein a day for $10.27 a week, vs $92.61 for restaurant days.";
const DISCARD_EXCERPT =
  "Convert 100%, 80%, and 50% hydration sourdough discard in grams: exact flour and water subtraction formulas plus a printable swap chart for any recipe.";

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

function gramsText(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function dayTotals(rows) {
  const totals = new Map();
  for (const row of rows) {
    const current = totals.get(row.day) ?? { protein: 0, cost: 0 };
    current.protein += Number(row.protein_g);
    current.cost += Number(row.cost_usd);
    totals.set(row.day, current);
  }
  return totals;
}

const proteinArticle = read("src/data/articles/high-protein-grocery-list-50-grams.md");
const discardArticle = read("src/data/articles/sourdough-discard-hydration-conversion-chart.md");
const proteinRows = parseCsv(read("public/data/protein-day-cost-2026.csv"));
const days = dayTotals(proteinRows);

test("the 7-day protein cart is two dry days, three mixed days, and two no-cook days", () => {
  const dry = days.get("Day 1: Rock-bottom dry goods");
  const mixed = days.get("Day 5: Realistic mixed");
  const noCook = days.get("Day 2: No-cook convenience");
  const meat = days.get("Day 3: Meat-eater cook day");
  const restaurant = days.get("Day 4: Restaurant day");
  const protein = 2 * dry.protein + 3 * mixed.protein + 2 * noCook.protein;
  const cost = 2 * dry.cost + 3 * mixed.cost + 2 * noCook.cost;

  assert.equal(dry.protein.toFixed(1), "52.7");
  assert.equal(dry.cost.toFixed(2), "0.82");
  assert.equal(mixed.protein.toFixed(1), "51.7");
  assert.equal(mixed.cost.toFixed(2), "1.51");
  assert.equal(noCook.protein.toFixed(1), "53.5");
  assert.equal(noCook.cost.toFixed(2), "2.05");
  assert.equal(protein.toFixed(1), "367.5");
  assert.equal((protein / 7).toFixed(1), "52.5");
  assert.equal(cost.toFixed(2), "10.27");
  assert.equal((7 * meat.cost).toFixed(2), "19.46");
  assert.equal((7 * restaurant.cost).toFixed(2), "92.61");

  assert.equal(field(proteinArticle, "excerpt"), PROTEIN_EXCERPT);
  assert.equal(PROTEIN_EXCERPT.length, 150);
  assert.equal(field(proteinArticle, "author"), "David Miller");
  assert.equal(field(proteinArticle, "dateModified"), "2026-11-25");
  assert.equal(field(proteinArticle, "substantiveUpdate"), "2026-11-25");
  assert.match(field(proteinArticle, "imageAlt"), /illustration/i);
  assert.doesNotMatch(field(proteinArticle, "imageAlt"), /photo/i);
  assert.equal(INDEX_PRUNE_SLUGS.has("high-protein-grocery-list-50-grams"), false);
  assert.match(proteinArticle, /\$10\.27/);
  assert.match(proteinArticle, /367\.5 g/);
  assert.match(proteinArticle, /52\.5/);
  assert.match(proteinArticle, /\$19\.46/);
  assert.match(proteinArticle, /\$92\.61/);
  assert.match(proteinArticle, /BLS May 2026/);
  assert.match(proteinArticle, /food-details\/172688\/nutrients/);
  assert.match(proteinArticle, /<!-- numbers-source: public\/data\/protein-day-cost-2026\.csv, public\/data\/protein-per-dollar-2026\.csv -->/);
  assert.match(proteinArticle, /\/images\/high-protein-grocery-list-50-grams-chart\.jpg/);
  assert.equal(existsSync("public/images/high-protein-grocery-list-50-grams-main.jpg"), true);
  assert.equal(existsSync("public/images/high-protein-grocery-list-50-grams-chart.jpg"), true);
  assert.doesNotMatch(proteinArticle, /FAQPage/);
  assert.doesNotMatch(proteinArticle, /\]\(\/[^)\s]*#/);
});

test("the discard chart uses the calculator formulas at 100, 80, and 50 percent", () => {
  assert.equal(CUP_GRAMS, 227);
  const weights = [50, 100, 150, 200, 227];
  const hydrations = [100, 80, 50];
  for (const weight of weights) {
    const cells = [];
    for (const hydration of hydrations) {
      const split = discardSplit(weight, hydration);
      cells.push(`${gramsText(split.flour)} g`, `${gramsText(split.water)} g`);
    }
    assert.match(
      discardArticle,
      new RegExp(`\\| ${weight} g \\| ${cells.join(" \\| ")} \\|`),
      `${weight} g row`,
    );
  }

  const liquid = addDiscard({ flour: 300, liquid: 210, discard: 100, hydrationPercent: 100 });
  const stiff = addDiscard({ flour: 250, liquid: 120, discard: 150, hydrationPercent: 50 });
  const eighty = addDiscard({ flour: 260, liquid: 120, discard: 100, hydrationPercent: 80 });
  assert.match(discardArticle, new RegExp(`${gramsText(liquid.flourToAdd)} grams of flour and ${gramsText(liquid.liquidToAdd)} grams of liquid`));
  assert.match(discardArticle, new RegExp(`${gramsText(liquid.maxDiscard)} grams`));
  assert.match(discardArticle, new RegExp(`${gramsText(stiff.flourToAdd)} grams of flour and ${gramsText(stiff.liquidToAdd)} grams of liquid`));
  assert.match(discardArticle, new RegExp(`The cap is ${gramsText(stiff.maxDiscard)} grams`));
  assert.match(discardArticle, new RegExp(`${gramsText(eighty.flourToAdd)} grams of flour and ${gramsText(eighty.liquidToAdd)} grams of liquid`));
  assert.match(discardArticle, new RegExp(`The cap is ${gramsText(eighty.maxDiscard)} grams`));
  assert.match(discardArticle, /min\(F \* \(1 \+ h\), W \* \(1 \+ h\) \/ h\)/);
  assert.match(discardArticle, /D \/ \(1 \+ h\)/);
  assert.match(discardArticle, /D \* h \/ \(1 \+ h\)/);
  assert.match(discardArticle, /CUP_GRAMS = 227/);
  assert.match(discardArticle, /FDC 168936/);
  assert.match(discardArticle, /FDC 168893/);

  assert.equal(field(discardArticle, "excerpt"), DISCARD_EXCERPT);
  assert.equal(DISCARD_EXCERPT.length, 151);
  assert.equal(field(discardArticle, "author"), "David Miller");
  assert.equal(field(discardArticle, "dateModified"), "2026-11-25");
  assert.equal(field(discardArticle, "substantiveUpdate"), "2026-11-25");
  assert.match(field(discardArticle, "imageAlt"), /illustration/i);
  assert.doesNotMatch(field(discardArticle, "imageAlt"), /photo/i);
  assert.equal(INDEX_PRUNE_SLUGS.has("sourdough-discard-hydration-conversion-chart"), false);
  assert.match(discardArticle, /\/images\/sourdough-discard-hydration-conversion-chart-chart\.jpg/);
  assert.equal(existsSync("public/images/sourdough-discard-hydration-conversion-chart-main.jpg"), true);
  assert.equal(existsSync("public/images/sourdough-discard-hydration-conversion-chart-chart.jpg"), true);
  assert.doesNotMatch(discardArticle, /FAQPage/);
  assert.doesNotMatch(discardArticle, /\]\(\/[^)\s]*#/);
});

test("the new pages are linked from the pages the spec names, without a date bump", () => {
  const proteinSources = [
    ["src/data/articles/what-50-grams-of-protein-costs-per-day.md", "2026-09-24"],
    ["src/data/articles/protein-per-dollar-adjusted-for-quality.md", "2026-11-23"],
  ];
  for (const [path, modified] of proteinSources) {
    const source = read(path);
    assert.match(source, /\]\(\/high-protein-grocery-list-50-grams\/\)/);
    assert.equal(field(source, "dateModified"), modified, path);
    assert.doesNotMatch(source, /\]\(\/high-protein-grocery-list-50-grams\/#[^)]+\)/);
  }
  const planner = read("src/pages/tools/grocery-budget-calculator/index.astro");
  assert.match(planner, /href="\/high-protein-grocery-list-50-grams\/"/);
  assert.doesNotMatch(planner, /high-protein-grocery-list-50-grams\/#/);

  const discardSources = [
    "src/pages/tools/sourdough-discard-calculator/index.astro",
    "src/data/articles/what-to-make-with-sourdough-discard-by-amount.md",
    "src/data/articles/sourdough-discard-vs-active-starter.md",
  ];
  for (const path of discardSources) {
    const source = read(path);
    assert.match(source, /\/sourdough-discard-hydration-conversion-chart\//);
    assert.doesNotMatch(source, /sourdough-discard-hydration-conversion-chart\/#/);
    if (path.endsWith(".md")) {
      assert.equal(field(source, "dateModified"), null, path);
    }
  }
});
