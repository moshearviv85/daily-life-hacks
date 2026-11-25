import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const FIBER_EXCERPT =
  "A bean-free day hits 30.1 grams of fiber for $2.31: oats, barley, bread, avocado, an apple, and almonds, priced from the 2026 file.";
const GRAIN_EXCERPT =
  "FoodKeeper gives cooked rice 4 to 6 fridge days, pasta 3 to 5, and quinoa 6 to 7. FSIS leftovers still say 3 to 4. Cool the pot within 2 hours.";

const LEGUMES = new Set([
  "Green split peas (dry)",
  "Pinto beans (dry)",
  "Black beans (dry)",
  "Navy beans (dry)",
  "Canned black beans",
  "Chickpeas (dry)",
  "Brown lentils (dry)",
  "Red lentils (dry)",
  "Canned chickpeas",
  "Canned kidney beans",
  "Frozen green peas",
  "Dry roasted peanuts",
  "Peanut butter",
  "Frozen green beans",
  "Frozen shelled edamame",
]);

const DAY = [
  ["Old-fashioned rolled oats", 70, "7.1 g", "$0.20"],
  ["100% whole wheat bread", 52, "3.1 g", "$0.32"],
  ["Avocado", 100, "5.0 g", "$0.48"],
  ["Apples (gala)", 180, "3.7 g", "$0.51"],
  ["Almonds", 28, "3.5 g", "$0.40"],
  ["Pearled barley (dry)", 30, "4.7 g", "$0.08"],
  ["Frozen broccoli florets", 100, "3.0 g", "$0.32"],
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

function roundHalfUp(value, places) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

const fiberArticle = read("src/data/articles/high-fiber-without-beans.md");
const grainArticle = read("src/data/articles/how-long-do-cooked-grains-and-beans-last-in-the-fridge.md");
const rows = parseCsv(read("public/data/fiber-per-dollar-2026.csv"));
const byFood = new Map(rows.map((row) => [row.food, row]));
const redirects = read("public/_redirects");

test("the bean-free day uses only non-legume rows and matches the CSV", () => {
  assert.equal(field(fiberArticle, "excerpt"), FIBER_EXCERPT);
  assert.ok(FIBER_EXCERPT.length >= 130 && FIBER_EXCERPT.length <= 160);
  assert.equal(field(fiberArticle, "author"), "David Miller");
  assert.equal(field(fiberArticle, "date"), "2026-11-25");
  assert.equal(field(fiberArticle, "dateModified"), "2026-11-25");
  assert.equal(field(fiberArticle, "substantiveUpdate"), "2026-11-25");
  assert.equal(field(fiberArticle, "image"), "/images/high-fiber-without-beans-chart.jpg");
  assert.match(field(fiberArticle, "imageAlt"), /bar chart/i);
  assert.doesNotMatch(field(fiberArticle, "imageAlt"), /photo/i);
  assert.equal(INDEX_PRUNE_SLUGS.has("high-fiber-without-beans"), false);
  assert.doesNotMatch(redirects, /high-fiber-without-beans/);
  assert.doesNotMatch(fiberArticle, /FAQPage/);
  assert.doesNotMatch(fiberArticle, /\]\(\/[^)\s]*#/);
  assert.doesNotMatch(fiberArticle, /\]\([^)]*\.csv\)/);
  assert.doesNotMatch(fiberArticle, /\]\(\/data\//);
  assert.match(fiberArticle, /\/images\/high-fiber-without-beans-chart\.jpg/);
  assert.equal(existsSync("public/images/high-fiber-without-beans-chart.jpg"), true);
  assert.equal(existsSync("scripts/generate-high-fiber-without-beans-chart.py"), true);
  assert.match(fiberArticle, /30\.1 g/);
  assert.match(fiberArticle, /\$2\.31/);
  assert.doesNotMatch(fiberArticle, /\| (Green split peas|Pinto beans|Chickpeas|Peanut butter|Frozen shelled edamame) /);

  let fiber = 0;
  let cost = 0;
  for (const [food, grams, fiberText, costText] of DAY) {
    const row = byFood.get(food);
    assert.ok(row, food);
    assert.equal(LEGUMES.has(food), false, food);
    const fiberValue = roundHalfUp(
      (grams / 100) * Number(row.fiber_g_per_100g) * Number(row.edible_fraction),
      1,
    );
    const costValue = roundHalfUp((grams / 100) * Number(row.price_per_100g_usd), 2);
    assert.equal(`${fiberValue.toFixed(1)} g`, fiberText, food);
    assert.equal(`$${costValue.toFixed(2)}`, costText, food);
    assert.match(fiberArticle, new RegExp(fiberText.replace(".", "\\.")));
    assert.match(fiberArticle, new RegExp(costText.replace("$", "\\$")));
    if (row.fdc_id) {
      assert.match(fiberArticle, new RegExp(`food-details/${row.fdc_id}/nutrients`));
    }
    fiber += fiberValue;
    cost += costValue;
  }
  assert.equal(fiber.toFixed(1), "30.1");
  assert.equal(cost.toFixed(2), "2.31");

  const named = [
    ["Whole wheat flour", "77.8", "168893"],
    ["Pearled barley (dry)", "57.1", "170284"],
    ["Popcorn kernels", "51.3", ""],
    ["Old-fashioned rolled oats", "35.8", "173904"],
    ["Chia seeds", "33.1", "170554"],
    ["Avocado", "10.4", "171705"],
    ["100% whole wheat bread", "9.7", "172688"],
    ["Frozen broccoli florets", "9.5", "169968"],
    ["Almonds", "8.8", "170567"],
    ["Pears", "8.0", "169118"],
    ["Apples (gala)", "7.3", "168204"],
    ["Raspberries", "4.5", "167755"],
    ["Blackberries", "4.0", "173946"],
  ];
  for (const [food, perDollar, fdc] of named) {
    const row = byFood.get(food);
    assert.equal(row.fiber_g_per_dollar, perDollar, food);
    assert.match(fiberArticle, new RegExp(perDollar.replace(".", "\\.")));
    if (fdc) assert.match(fiberArticle, new RegExp(`food-details/${fdc}/nutrients`));
  }
  assert.match(fiberArticle, /derived from \[167959\]/);
  assert.match(fiberArticle, /May 2026/);
  assert.equal([...byFood.keys()].filter((food) => !LEGUMES.has(food)).length, 38);
});

test("the grain fridge page reconciles FoodKeeper ranges with the FSIS leftovers rule", () => {
  assert.equal(field(grainArticle, "excerpt"), GRAIN_EXCERPT);
  assert.ok(GRAIN_EXCERPT.length >= 130 && GRAIN_EXCERPT.length <= 160);
  assert.equal(field(grainArticle, "author"), "David Miller");
  assert.equal(field(grainArticle, "date"), "2026-11-25");
  assert.equal(field(grainArticle, "dateModified"), "2026-11-25");
  assert.equal(field(grainArticle, "substantiveUpdate"), "2026-11-25");
  assert.equal(
    field(grainArticle, "image"),
    "/images/how-long-do-cooked-grains-and-beans-last-in-the-fridge-chart.jpg",
  );
  assert.match(field(grainArticle, "imageAlt"), /range chart/i);
  assert.doesNotMatch(field(grainArticle, "imageAlt"), /photo/i);
  assert.equal(
    INDEX_PRUNE_SLUGS.has("how-long-do-cooked-grains-and-beans-last-in-the-fridge"),
    false,
  );
  assert.doesNotMatch(redirects, /how-long-do-cooked-grains-and-beans-last-in-the-fridge/);
  assert.doesNotMatch(grainArticle, /FAQPage/);
  assert.doesNotMatch(grainArticle, /\]\(\/[^)\s]*#/);
  assert.doesNotMatch(grainArticle, /\]\([^)]*\.csv\)/);
  assert.doesNotMatch(grainArticle, /\]\(\/how-long-do-leftovers-last-in-the-fridge\//);
  assert.match(
    grainArticle,
    /\/images\/how-long-do-cooked-grains-and-beans-last-in-the-fridge-chart\.jpg/,
  );
  assert.equal(
    existsSync("public/images/how-long-do-cooked-grains-and-beans-last-in-the-fridge-chart.jpg"),
    true,
  );
  assert.equal(existsSync("scripts/generate-cooked-grains-fridge-chart.py"), true);

  assert.match(grainArticle, /3 to 5 days/);
  assert.match(grainArticle, /4 to 6 days/);
  assert.match(grainArticle, /6 to 7 days/);
  assert.match(grainArticle, /3 to 4 days/);
  assert.match(grainArticle, /2 to 3 days/);
  assert.match(grainArticle, /FoodKeeper 174/);
  assert.match(grainArticle, /FoodKeeper 177/);
  assert.match(grainArticle, /FoodKeeper 178/);
  assert.match(grainArticle, /FoodKeeper 426/);
  assert.match(grainArticle, /FoodKeeper 372/);
  assert.match(grainArticle, /FoodKeeper 499/);
  assert.match(grainArticle, /within 2 hours/);
  assert.match(grainArticle, /above 90°F/);
  assert.match(grainArticle, /shallow containers/i);
  assert.match(grainArticle, /Bacillus cereus/);
  assert.match(grainArticle, /fsis\.usda\.gov\/food-safety\/safe-food-handling-and-preparation\/food-safety-basics\/leftovers-and-food-safety/);
  assert.match(grainArticle, /foodsafety\.gov\/keep-food-safe\/foodkeeper-app/);
  assert.match(grainArticle, /FMA-Data-v128/);
  assert.match(grainArticle, /\]\(\/freezer-inventory-simple-system\/\)/);
  assert.match(grainArticle, /\]\(\/can-you-eat-rice-and-beans-everyday\/\)/);
});

test("the new pages are linked from the pages the spec names, without a date bump", () => {
  const sources = [
    ["src/data/articles/oatmeal-vs-grits-fiber-content.md", "/high-fiber-without-beans/", "2026-09-23"],
    ["src/data/articles/popcorn-vs-potato-chips-fiber-comparison.md", "/high-fiber-without-beans/", "2026-09-23"],
    ["src/data/articles/how-long-do-leftovers-last-in-the-fridge.md", "/how-long-do-cooked-grains-and-beans-last-in-the-fridge/", null],
    ["src/data/articles/freezer-inventory-simple-system.md", "/how-long-do-cooked-grains-and-beans-last-in-the-fridge/", "2026-07-20"],
  ];
  for (const [path, href, modified] of sources) {
    const source = read(path);
    assert.match(source, new RegExp(`\\]\\(${href.replaceAll("/", "\\/")}\\)`), path);
    assert.equal(field(source, "dateModified"), modified, path);
    assert.doesNotMatch(source, new RegExp(`${href}#`));
  }
});
