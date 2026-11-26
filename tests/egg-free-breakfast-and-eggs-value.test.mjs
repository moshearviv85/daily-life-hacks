import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const EGGS_TITLE = "Are Eggs the Cheapest Protein? Flour Leads";
const EGGS_EXCERPT =
  "Eggs deliver 34.4 g of protein per dollar and rank 17th of 49 foods. Every dried legume beats them; most meat, fish, and dairy don't.";
const BREAKFAST_EXCERPT =
  "A high-protein breakfast without eggs can clear 30 grams. Greek yogurt, cottage cheese, oats, and peanut butter, priced from published grocery rows.";

const DAY = "2026-11-25";

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

function roundHalfUp(value, places) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function money(value) {
  return `$${roundHalfUp(value, 2).toFixed(2)}`;
}

function proteinGrams(per100, grams) {
  return (Number(per100) * grams) / 100;
}

function directAnswer(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const index = lines.indexOf(`## ${heading}`);
  assert.notEqual(index, -1, heading);
  const paragraph = [];
  for (const line of lines.slice(index + 1)) {
    if (line.startsWith("## ") || line.startsWith("|")) break;
    if (line.trim() === "") {
      if (paragraph.length) break;
      continue;
    }
    paragraph.push(line);
  }
  return paragraph.join(" ");
}

function words(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

const proteinRows = parseCsv(read("public/data/protein-per-dollar-2026.csv"));
const breakfastRows = parseCsv(read("public/data/breakfast-staples-per-dollar-2026.csv"));
const eggsRows = parseCsv(read("public/data/eggs-vs-everything-protein-value-2026.csv"));
const proteinByName = new Map(proteinRows.map((row) => [row.food, row]));
const breakfastByName = new Map(breakfastRows.map((row) => [row.food, row]));
const eggsByName = new Map(eggsRows.map((row) => [row.food, row]));

function rate(name) {
  const row = proteinByName.get(name);
  assert.ok(row, name);
  return Number(row.protein_g_per_dollar);
}

const breakfastArticle = read("src/data/articles/high-protein-breakfast-without-eggs.md");
const eggsArticle = read("src/data/articles/eggs-vs-everything-protein-value.md");

const STAPLES = [
  ["Greek yogurt (plain, nonfat)", "Plain nonfat Greek yogurt", 170, "170894"],
  ["Cottage cheese (4%)", "Cottage cheese, 4%", 225, "172179"],
  ["Peanut butter", "Peanut butter", 32, "174266"],
  ["Old-fashioned rolled oats", "Rolled oats, dry", 40, "173904"],
  ["Whole milk", "Whole milk", 244, "171265"],
  ["Tofu (extra firm)", "Extra-firm tofu", 100, "174290"],
  ["100% whole wheat bread", "Whole wheat bread", 52, "172688"],
  ["Almonds", "Almonds", 28, "170567"],
];

const COMBOS = [
  ["Yogurt bowl", [["Greek yogurt (plain, nonfat)", 170], ["Old-fashioned rolled oats", 40], ["Peanut butter", 32]]],
  ["Cottage toast", [["Cottage cheese (4%)", 225], ["100% whole wheat bread", 52]]],
  ["Tofu and oats", [["Tofu (extra firm)", 200], ["Old-fashioned rolled oats", 80]]],
  ["Milk, oats, peanut butter", [["Whole milk", 244], ["Old-fashioned rolled oats", 60], ["Peanut butter", 64]]],
];

const EGG_PORTIONS = [
  ["Eggs (large)", "5 large (250 g)", 250, "171287"],
  ["Greek yogurt (plain, nonfat)", "294 g", 294, "170894"],
  ["Cottage cheese (4%)", "270 g", 270, "172179"],
  ["Chicken breast (boneless, skinless)", "133 g", 133, "171077"],
  ["Brown lentils (dry)", "122 g", 122, "172420"],
  ["Peanut butter", "135 g", 135, "174266"],
];

test("the egg-free breakfast page prices 30 g from the published CSVs", () => {
  assert.equal(field(breakfastArticle, "title"), "High-Protein Breakfast Without Eggs: 30 Grams");
  assert.equal(field(breakfastArticle, "excerpt"), BREAKFAST_EXCERPT);
  assert.equal(BREAKFAST_EXCERPT.length, 148);
  assert.equal(field(breakfastArticle, "author"), "David Miller");
  assert.equal(field(breakfastArticle, "date"), DAY);
  assert.equal(field(breakfastArticle, "dateModified"), DAY);
  assert.equal(field(breakfastArticle, "substantiveUpdate"), DAY);
  assert.equal(field(breakfastArticle, "image"), "/images/high-protein-breakfast-without-eggs-chart.jpg");
  assert.match(field(breakfastArticle, "imageAlt"), /bar chart/i);
  assert.doesNotMatch(field(breakfastArticle, "imageAlt"), /photo/i);
  assert.equal(INDEX_PRUNE_SLUGS.has("high-protein-breakfast-without-eggs"), false);
  assert.equal(read("public/_redirects").includes("high-protein-breakfast-without-eggs"), false);
  assert.equal(existsSync("public/images/high-protein-breakfast-without-eggs-main.jpg"), false);
  assert.equal(existsSync("public/images/high-protein-breakfast-without-eggs-chart.jpg"), true);
  assert.equal(
    readFileSync("public/images/high-protein-breakfast-without-eggs-chart.jpg").subarray(0, 3).toString("hex"),
    "ffd8ff",
  );
  assert.match(breakfastArticle, /\/images\/high-protein-breakfast-without-eggs-chart\.jpg/);
  assert.match(breakfastArticle, /Chart credit: rendered from breakfast-staples-per-dollar-2026\.csv and protein-per-dollar-2026\.csv/);
  assert.match(breakfastArticle, /Not a photograph, and not an AI illustration/);
  assert.doesNotMatch(breakfastArticle, /Illustration generated with AI/);
  assert.doesNotMatch(breakfastArticle, /FAQPage/);
  assert.doesNotMatch(breakfastArticle, /\]\([^)]*\.csv\)/);
  assert.doesNotMatch(breakfastArticle, /\]\(\/[^)\s]*#/);
  assert.match(breakfastArticle, /breakfast-staples-per-dollar-2026\.csv/);
  assert.match(breakfastArticle, /protein-per-dollar-2026\.csv/);
  assert.match(breakfastArticle, /## How do you hit 30 grams of protein at breakfast without eggs\?/);

  const answer = directAnswer(
    breakfastArticle,
    "How do you hit 30 grams of protein at breakfast without eggs?",
  );
  const answerWords = words(answer);
  assert.ok(answerWords >= 40 && answerWords <= 60, `breakfast answer is ${answerWords} words`);
  assert.match(answer, /29\.7 grams/);
  assert.match(answer, /\$0\.88/);
  assert.match(answer, /170894/);

  for (const [csvName, label, grams, fdc] of STAPLES) {
    const row = proteinByName.get(csvName);
    assert.equal(row.fdc_id, fdc, csvName);
    const breakfast = breakfastByName.get(csvName);
    if (breakfast) {
      assert.equal(breakfast.protein_g_per_dollar, row.protein_g_per_dollar, csvName);
      assert.equal(breakfast.fdc_id, fdc, csvName);
    }
    const protein = roundHalfUp(proteinGrams(row.protein_g_per_100g, grams), 1).toFixed(1);
    const cost = money(30 / rate(csvName));
    assert.match(
      breakfastArticle,
      new RegExp(
        `\\| ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ${grams} g \\| ${protein} g \\| ${row.protein_g_per_dollar} g \\| \\$${cost.slice(1)} \\|`,
      ),
      label,
    );
  }

  for (const [label, parts] of COMBOS) {
    let protein = 0;
    let cost = 0;
    for (const [name, grams] of parts) {
      const row = proteinByName.get(name);
      const partProtein = proteinGrams(row.protein_g_per_100g, grams);
      protein += partProtein;
      cost += partProtein / Number(row.protein_g_per_dollar);
    }
    assert.match(
      breakfastArticle,
      new RegExp(
        `\\| ${label} \\| .* \\| ${roundHalfUp(protein, 1).toFixed(1)} g \\| \\$${money(cost).slice(1)} \\|`,
      ),
      label,
    );
  }

  assert.match(
    read("tests/substantive-update-datemodified.test.mjs"),
    /"high-protein-breakfast-without-eggs": "2026-11-25"/,
  );
});

test("the eggs page adds a 30 g cost table and cites the CSV without linking it", () => {
  assert.equal(field(eggsArticle, "title"), EGGS_TITLE);
  assert.match(eggsArticle, /^excerpt: "Eggs deliver 34\.4 g of protein per dollar and rank 17th of 49 foods\. Every dried legume beats them; most meat, fish, and dairy don't\."$/m);
  assert.equal(field(eggsArticle, "author"), "David Miller");
  assert.equal(field(eggsArticle, "dateModified"), DAY);
  assert.equal(field(eggsArticle, "substantiveUpdate"), DAY);
  assert.equal(field(eggsArticle, "date"), "2026-07-13");
  assert.doesNotMatch(eggsArticle, /FAQPage/);
  assert.doesNotMatch(eggsArticle, /\]\([^)]*\.csv\)/);
  assert.match(eggsArticle, /eggs-vs-everything-protein-value-2026\.csv/);
  assert.match(eggsArticle, /protein-per-dollar-2026\.csv/);
  assert.match(eggsArticle, /\]\(\/high-protein-breakfast-without-eggs\/\)/);
  assert.doesNotMatch(eggsArticle, /\]\(\/high-protein-breakfast-without-eggs\/#/);
  assert.match(
    eggsArticle,
    /## How much do 30 grams of protein from eggs cost compared with yogurt, chicken, and lentils\?/,
  );

  const answer = directAnswer(
    eggsArticle,
    "How much do 30 grams of protein from eggs cost compared with yogurt, chicken, and lentils?",
  );
  const answerWords = words(answer);
  assert.ok(answerWords >= 40 && answerWords <= 60, `eggs answer is ${answerWords} words`);
  assert.match(answer, /\$0\.87/);
  assert.match(answer, /\$0\.39/);
  assert.match(answer, /171287/);
  assert.match(answer, /172420/);

  assert.equal(EGG_PORTIONS.length, 6);
  for (const [name, portion, grams, fdc] of EGG_PORTIONS) {
    const proteinRow = proteinByName.get(name);
    const eggsRow = eggsByName.get(name);
    assert.equal(proteinRow.fdc_id, fdc, name);
    assert.equal(eggsRow.fdc_id, fdc, name);
    assert.equal(eggsRow.value, proteinRow.protein_g_per_dollar, name);
    const protein = roundHalfUp(proteinGrams(proteinRow.protein_g_per_100g, grams), 1).toFixed(1);
    const cost = money(30 / Number(eggsRow.value));
    assert.match(
      eggsArticle,
      new RegExp(
        `\\| ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ${portion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ${protein} g \\|`,
      ),
      name,
    );
    assert.match(eggsArticle, new RegExp(`\\| ${proteinRow.protein_g_per_dollar} g \\| \\$${cost.slice(1)} \\|`), name);
  }

  assert.match(
    read("tests/substantive-update-datemodified.test.mjs"),
    /"eggs-vs-everything-protein-value": "2026-11-25"/,
  );
});

test("contextual links land on the named pages without moving dateModified", () => {
  const sources = [
    ["src/data/articles/cottage-cheese-vs-greek-yogurt-protein-uses.md", "2026-11-23", "/high-protein-breakfast-without-eggs/"],
    ["src/data/articles/savory-chia-seed-recipes-breakfast.md", "2026-11-23", "/high-protein-breakfast-without-eggs/"],
    ["src/data/articles/how-much-protein-do-you-need-per-day.md", "2026-07-12", "/eggs-vs-everything-protein-value/"],
    ["src/data/articles/best-low-cost-protein-sources-large-families.md", "2026-09-24", "/eggs-vs-everything-protein-value/"],
  ];
  for (const [path, modified, href] of sources) {
    const source = read(path);
    assert.match(source, new RegExp(`\\]\\(${href.replaceAll("/", "\\/")}\\)`), path);
    assert.doesNotMatch(source, new RegExp(`\\]\\(${href.replaceAll("/", "\\/")}#`), path);
    assert.equal(field(source, "dateModified"), modified, path);
  }
  assert.equal(
    field(read("src/data/articles/cottage-cheese-vs-greek-yogurt-protein-uses.md"), "substantiveUpdate"),
    "2026-11-23",
  );
  assert.equal(
    field(read("src/data/articles/savory-chia-seed-recipes-breakfast.md"), "substantiveUpdate"),
    "2026-11-23",
  );
  assert.equal(
    field(read("src/data/articles/how-much-protein-do-you-need-per-day.md"), "substantiveUpdate"),
    null,
  );
  assert.equal(
    field(read("src/data/articles/best-low-cost-protein-sources-large-families.md"), "substantiveUpdate"),
    null,
  );
});
