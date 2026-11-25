import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DAY = "2026-11-25";
const FIBER_HREF = "/good-source-of-fiber-label-meaning/";
const BREAKFAST_HREF = "/breakfast-staples-per-dollar/";
const FIBER_HEADING =
  "Which everyday foods clear the 2.8 g good-source and 5.6 g high-fiber FDA cutoffs?";
const BREAKFAST_HEADING =
  "How much does a high-protein, high-fiber breakfast actually cost per morning?";

const LINK_SOURCES = [
  ["src/data/articles/fiber-protein-daily-values-explained.md", FIBER_HREF, "Which everyday foods clear 2.8 g and 5.6 g"],
  ["src/data/articles/high-fiber-fast-food-options-guide.md", FIBER_HREF, "What 2.8 g and 5.6 g mean on real food"],
  ["src/data/articles/high-fiber-yogurt-parfait-for-breakfast.md", BREAKFAST_HREF, "What these breakfast staples cost per morning"],
  ["src/data/articles/easy-high-fiber-breakfast-ideas-for-gut-health.md", BREAKFAST_HREF, "Breakfast staples per dollar"],
];

// Cup and slice weights are the USDA household measures for these records.
// Half-cup rows are half of that cup. Checked against FoodData Central on 2026-11-25.
const LABEL_ROWS = [
  { food: "Cooked black beans", grams: 172 / 2, per100: 8.7, fdc: "173735", portion: "1/2 cup (86 g)" },
  { food: "Cooked lentils", grams: 198 / 2, per100: 7.9, fdc: "172421", portion: "1/2 cup (99 g)" },
  { food: "Cooked pearled barley", grams: 157, per100: 3.8, fdc: "170285", portion: "1 cup (157 g)" },
  { food: "Dry rolled oats", grams: 81 / 2, per100: 10.1, fdc: "173904", portion: "1/2 cup (40.5 g)" },
  { food: "Raw raspberries", grams: 123, per100: 6.5, fdc: "167755", portion: "1 cup (123 g)" },
  { food: "Whole wheat bread", grams: 32 * 2, per100: 6, fdc: "172688", portion: "2 slices (64 g)" },
  { food: "Apple with skin", grams: 182, per100: 2.4, fdc: "171688", portion: "1 medium (182 g)" },
];

// Fruit protein is the FoodData Central value for the record the fiber CSV
// prices. The protein CSV does not score these three.
const FRUIT_PROTEIN_PER_100G = {
  Bananas: { per100: 1.09, fdc: "173944" },
  "Apples (gala)": { per100: 0.25, fdc: "168204" },
  Blackberries: { per100: 1.39, fdc: "173946" },
};

const COMBOS = [
  {
    name: "Oats, peanut butter, and banana",
    parts: [
      ["Old-fashioned rolled oats", 40.5],
      ["Peanut butter", 32],
      ["Bananas", 118],
    ],
  },
  {
    name: "Eggs, whole wheat toast, and apple",
    parts: [
      ["Eggs (large)", 100],
      ["100% whole wheat bread", 64],
      ["Apples (gala)", 172],
    ],
  },
  {
    name: "Plain nonfat Greek yogurt, oats, and blackberries",
    parts: [
      ["Greek yogurt (plain, nonfat)", 170],
      ["Old-fashioned rolled oats", 40.5],
      ["Blackberries", 72],
    ],
  },
  {
    name: "Whole milk, oats, and peanut butter",
    parts: [
      ["Whole milk", 244],
      ["Old-fashioned rolled oats", 40.5],
      ["Peanut butter", 32],
    ],
  },
];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function gitShow(relativePath) {
  return execFileSync("git", ["show", `origin/main:${relativePath}`], {
    cwd: root,
    encoding: "utf8",
  });
}

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing frontmatter");
  return match[1];
}

function answerParagraph(markdown, heading) {
  const marker = `## ${heading}\n\n`;
  const start = markdown.indexOf(marker);
  assert.notEqual(start, -1, `missing heading: ${heading}`);
  const paragraph = markdown.slice(start + marker.length).split(/\n\s*\n/)[0];
  assert.ok(paragraph, `missing the direct answer under ${heading}`);
  return paragraph;
}

function visibleWords(paragraph) {
  const visible = paragraph.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.match(/[\p{L}\p{N}]+(?:[.'’][\p{L}\p{N}]+)*/gu) ?? [];
}

function parseCsv(source) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else field += character;
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }
  const [headers, ...rows] = records;
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function fixed(value, digits) {
  const factor = 10 ** digits;
  return (Math.round((value + Number.EPSILON) * factor) / factor).toFixed(digits);
}

function tierFor(fiberGrams) {
  if (fiberGrams >= 5.6) return "High fiber";
  if (fiberGrams >= 2.8) return "Good source";
  return "Under 10% DV";
}

const fiberRows = parseCsv(read("public/data/fiber-per-dollar-2026.csv"));
const proteinRows = parseCsv(read("public/data/protein-per-dollar-2026.csv"));
const breakfastRows = parseCsv(read("public/data/breakfast-staples-per-dollar-2026.csv"));
const fiberByFood = new Map(fiberRows.map((row) => [row.food, row]));
const proteinByFood = new Map(proteinRows.map((row) => [row.food, row]));
const breakfastByFood = new Map(breakfastRows.map((row) => [row.food, row]));

function consumed(food, edibleGrams) {
  const fiberRow = fiberByFood.get(food);
  const proteinRow = proteinByFood.get(food);
  const priceRow = fiberRow || proteinRow;
  assert.ok(priceRow, `${food} is missing from both study CSVs`);
  const fraction = Number(priceRow.edible_fraction || 1);
  const cost = ((edibleGrams / fraction) / 100) * Number(priceRow.price_per_100g_usd);
  const fiberPer100 = fiberRow ? Number(fiberRow.fiber_g_per_100g) : 0;
  const fruit = FRUIT_PROTEIN_PER_100G[food];
  const proteinPer100 = proteinRow ? Number(proteinRow.protein_g_per_100g) : fruit.per100;
  const fdc = String(priceRow.fdc_id);
  if (fruit) assert.equal(fdc, fruit.fdc, `${food} FDC drifted from the fruit protein record`);
  return {
    fiber: (edibleGrams * fiberPer100) / 100,
    protein: (edibleGrams * proteinPer100) / 100,
    cost,
    fdc,
  };
}

test("fiber-label page keeps the title and adds the seven-food cutoff table", () => {
  const path = "src/data/articles/good-source-of-fiber-label-meaning.md";
  const markdown = read(path);
  const before = gitShow(path);
  assert.equal(
    extractFrontmatterField(markdown, "title"),
    "High Fiber Label Minimum: 5 or 5.6 Grams Per Serving",
  );
  assert.equal(extractFrontmatterField(markdown, "title"), extractFrontmatterField(before, "title"));
  assert.equal(extractFrontmatterField(markdown, "excerpt"), extractFrontmatterField(before, "excerpt"));
  assert.equal(extractFrontmatterField(markdown, "author"), "David Miller");
  assert.equal(extractFrontmatterField(markdown, "dateModified"), DAY);
  assert.equal(extractFrontmatterField(markdown, "substantiveUpdate"), DAY);
  assert.equal(markdown.includes("FAQPage"), false);

  const answer = answerParagraph(markdown, FIBER_HEADING);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 60,
    `fiber direct answer should be 40-60 visible words, got ${words.length}: ${words.join(" ")}`,
  );
  assert.match(answer, /21 CFR 101\.54/);
  assert.match(answer, /21 CFR 101\.9/);
  assert.match(answer, /2\.8/);
  assert.match(answer, /5\.6/);

  const oats = fiberByFood.get("Old-fashioned rolled oats");
  const berries = fiberByFood.get("Raspberries");
  const bread = fiberByFood.get("100% whole wheat bread");
  assert.equal(oats.fiber_g_per_100g, "10.1");
  assert.equal(oats.fdc_id, "173904");
  assert.equal(berries.fiber_g_per_100g, "6.5");
  assert.equal(berries.fdc_id, "167755");
  assert.equal(bread.fiber_g_per_100g, "6.0");
  assert.equal(bread.fdc_id, "172688");
  assert.match(fiberByFood.get("Apples (gala)").nutrition_source_note, /2\.4/);
  assert.match(fiberByFood.get("Apples (gala)").nutrition_source_note, /FDC 171688/);

  assert.equal(LABEL_ROWS.length, 7);
  for (const row of LABEL_ROWS) {
    const fiberGrams = (row.grams * row.per100) / 100;
    const percent = (fiberGrams / 28) * 100;
    const line = `| ${row.food} | ${row.portion} | ${fixed(fiberGrams, 1)} g | ${fixed(percent, 1)}% | ${tierFor(fiberGrams)} | [FDC ${row.fdc}](https://fdc.nal.usda.gov/food-details/${row.fdc}/nutrients) |`;
    assert.ok(markdown.includes(line), `missing label row: ${line}`);
  }
});

test("breakfast page keeps the title and prices four morning bowls from the CSVs", () => {
  const path = "src/data/articles/breakfast-staples-per-dollar.md";
  const markdown = read(path);
  const before = gitShow(path);
  assert.equal(extractFrontmatterField(markdown, "title"), "Cheapest Breakfast per Dollar: Flour, Then Oats");
  assert.equal(extractFrontmatterField(markdown, "title"), extractFrontmatterField(before, "title"));
  assert.equal(extractFrontmatterField(markdown, "excerpt"), extractFrontmatterField(before, "excerpt"));
  assert.equal(extractFrontmatterField(markdown, "author"), "David Miller");
  assert.equal(extractFrontmatterField(markdown, "dateModified"), DAY);
  assert.equal(extractFrontmatterField(markdown, "substantiveUpdate"), DAY);
  assert.equal(markdown.includes("FAQPage"), false);
  assert.equal(markdown.includes("](/data/"), false);
  assert.equal(/\]\([^)]+\.csv\)/.test(markdown), false);

  const answer = answerParagraph(markdown, BREAKFAST_HEADING);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 60,
    `breakfast direct answer should be 40-60 visible words, got ${words.length}: ${words.join(" ")}`,
  );
  assert.match(answer, /\$0\.52/);
  assert.match(answer, /\$1\.30/);
  assert.match(answer, /\$1\.71/);
  assert.match(answer, /5\.6 grams of fiber/);
  assert.match(answer, /FDC 173904/);

  assert.equal(COMBOS.length, 4);
  for (const combo of COMBOS) {
    const parts = combo.parts.map(([food, grams]) => consumed(food, grams));
    const protein = parts.reduce((sum, part) => sum + part.protein, 0);
    const fiber = parts.reduce((sum, part) => sum + part.fiber, 0);
    const cost = parts.reduce((sum, part) => sum + part.cost, 0);
    const ids = parts.map((part) => part.fdc).join("|");
    const row = markdown.split("\n").find((line) => line.startsWith(`| ${combo.name} |`));
    assert.ok(row, `missing combo row ${combo.name}`);
    assert.match(row, new RegExp(`\\| ${fixed(protein, 1)} g \\| ${fixed(fiber, 1)} g \\| \\$${fixed(cost, 2)} \\|`));
    for (const id of parts.map((part) => part.fdc)) {
      assert.match(row, new RegExp(id));
    }
    assert.match(ids, /\d/);
  }

  assert.equal(fiberByFood.has("Eggs (large)"), false);
  assert.equal(fiberByFood.has("Whole milk"), false);
  assert.equal(fiberByFood.has("Greek yogurt (plain, nonfat)"), false);
  assert.equal(breakfastByFood.has("Old-fashioned rolled oats"), true);
  assert.equal(breakfastByFood.has("Blackberries"), false);
  assert.equal(breakfastByFood.has("100% whole wheat bread"), false);
  assert.match(markdown, /May 2026 BLS average/);
});

test("contextual links stay canonical and do not move dateModified", () => {
  for (const [path, href, anchor] of LINK_SOURCES) {
    const markdown = read(path);
    const before = gitShow(path);
    assert.equal(frontmatter(markdown), frontmatter(before), `${path} changed frontmatter`);
    assert.equal(
      extractFrontmatterField(markdown, "dateModified"),
      extractFrontmatterField(before, "dateModified"),
      `${path} moved dateModified`,
    );
    assert.equal(extractFrontmatterField(markdown, "author"), "David Miller");
    const links = [...markdown.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].filter((match) => match[2] === href);
    assert.ok(links.some((match) => match[1] === anchor), `${path} missing "${anchor}" -> ${href}`);
    assert.equal(href.includes("#"), false, href);
    assert.equal(href.includes(".csv"), false, href);
    assert.match(href, /^\/[a-z0-9-]+\/$/);
  }
});
