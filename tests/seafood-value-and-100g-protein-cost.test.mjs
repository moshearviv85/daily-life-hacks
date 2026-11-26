import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { extractFrontmatterField } from "../src/content/modified-date.mjs";

const DAY = "2026-11-26";
const FISH_SLUG = "cheapest-canned-fish-and-seafood-protein-per-dollar";
const DAY_SLUG = "how-much-100-grams-of-protein-costs-per-day";

const FISH_EXCERPT =
  "Chunk light tuna is the cheapest canned fish here, at 22.4 g of protein per dollar. Salmon, tilapia, and sardines follow, all FDA Best Choices.";
const DAY_EXCERPT =
  "Five grocery days near 100 g of protein cost $1.57 to $8.33. Lentils, peanut butter, and oats are the cheap cart. Beef and bacon are not.";

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
const dairyRows = parseCsv(read("public/data/dairy-protein-per-dollar-ranked-2026.csv"));
const meatRows = parseCsv(read("public/data/meat-per-dollar-protein-ranked-2026.csv"));
const animalRows = parseCsv(read("public/data/animal-protein-per-dollar-ranked-2026.csv"));
const sodiumRows = parseCsv(read("public/data/sodium-per-dollar-2026.csv"));
const proteinByFdc = new Map(proteinRows.map((row) => [row.fdc_id, row]));
const proteinByName = new Map(proteinRows.map((row) => [row.food, row]));
const dairyByName = new Map(dairyRows.map((row) => [row.food, row]));
const meatByName = new Map(meatRows.map((row) => [row.food, row]));
const animalByFdc = new Map(animalRows.map((row) => [row.fdc_id, row]));
const sodiumByFdc = new Map(sodiumRows.map((row) => [row.fdc_id, row]));
const fdcCache = JSON.parse(read("src/data/fdc-cache.json")).foods;

const fishArticle = read(`src/data/articles/${FISH_SLUG}.md`);
const dayArticle = read(`src/data/articles/${DAY_SLUG}.md`);

const FISH = [
  ["173709", "Chunk light tuna", "0.126 ppm"],
  ["173690", "Canned pink salmon", "0.014 ppm"],
  ["175176", "Frozen tilapia", "0.013 ppm"],
  ["175139", "Sardines in oil", "0.013 ppm"],
];

const MENUS = [
  [
    "Legume + PB + oats",
    [
      ["Brown lentils (dry)", "Brown lentils, dry", 260],
      ["Peanut butter", "Peanut butter", 80],
      ["Old-fashioned rolled oats", "Rolled oats, dry", 140],
    ],
  ],
  [
    "Eggs + Greek yogurt + milk + oats",
    [
      ["Eggs (large)", "Eggs, large", 200],
      ["Greek yogurt (plain, nonfat)", "Greek yogurt, plain nonfat", 450],
      ["Whole milk", "Whole milk", 488],
      ["Old-fashioned rolled oats", "Rolled oats, dry", 100],
    ],
  ],
  [
    "Chicken drumsticks + eggs + cottage cheese",
    [
      ["Chicken drumsticks (bone-in)", "Chicken drumsticks, edible", 250],
      ["Eggs (large)", "Eggs, large", 150],
      ["Cottage cheese (4%)", "Cottage cheese, 4%", 325],
    ],
  ],
  [
    "Chicken breast + canned tuna + mozzarella",
    [
      ["Chicken breast (boneless, skinless)", "Chicken breast, boneless", 200],
      ["Canned tuna (chunk light, in water)", "Canned tuna, chunk light", 113],
      ["Mozzarella (low-moisture part-skim)", "Mozzarella, part-skim", 140],
    ],
  ],
  [
    "80/20 ground beef + cheddar + bacon",
    [
      ["Ground beef (80/20)", "Ground beef, 80/20", 300],
      ["Cheddar cheese", "Cheddar cheese", 120],
      ["Bacon", "Bacon", 155],
    ],
  ],
];

function rateChecked(name) {
  const row = proteinByName.get(name);
  assert.ok(row, name);
  const dairy = dairyByName.get(name);
  const meat = meatByName.get(name);
  if (dairy) assert.equal(dairy.value, row.protein_g_per_dollar, `${name} dairy rate`);
  if (meat) assert.equal(meat.value, row.protein_g_per_dollar, `${name} meat rate`);
  return row;
}

function portion(name, grams) {
  const row = rateChecked(name);
  const protein = (Number(row.protein_g_per_100g) * grams) / 100;
  return {
    protein,
    cost: protein / Number(row.protein_g_per_dollar),
    fdc: row.fdc_id,
  };
}

test("the canned fish page prices four Best Choices from the published CSVs", () => {
  assert.equal(field(fishArticle, "title"), "Cheapest Canned Fish Protein per Dollar");
  assert.equal(field(fishArticle, "excerpt"), FISH_EXCERPT);
  assert.ok(FISH_EXCERPT.length <= 160, FISH_EXCERPT.length);
  assert.equal(field(fishArticle, "author"), "David Miller");
  assert.equal(field(fishArticle, "date"), DAY);
  assert.equal(field(fishArticle, "dateModified"), DAY);
  assert.equal(field(fishArticle, "substantiveUpdate"), DAY);
  assert.equal(field(fishArticle, "image"), `/images/${FISH_SLUG}-chart.jpg`);
  assert.match(field(fishArticle, "imageAlt"), /bar chart/i);
  assert.doesNotMatch(field(fishArticle, "imageAlt"), /photo/i);
  assert.equal(INDEX_PRUNE_SLUGS.has(FISH_SLUG), false);
  assert.equal(read("public/_redirects").includes(FISH_SLUG), false);
  assert.equal(existsSync(`public/images/${FISH_SLUG}-main.jpg`), false);
  assert.equal(existsSync(`public/images/${FISH_SLUG}-chart.jpg`), true);
  assert.equal(readFileSync(`public/images/${FISH_SLUG}-chart.jpg`).subarray(0, 3).toString("hex"), "ffd8ff");
  assert.match(fishArticle, /\/images\/cheapest-canned-fish-and-seafood-protein-per-dollar-chart\.jpg/);
  assert.match(fishArticle, /A chart, not a camera image, and not an AI illustration/);
  assert.doesNotMatch(fishArticle, /FAQPage/);
  assert.doesNotMatch(fishArticle, /\]\([^)]*\.csv\)/);
  assert.doesNotMatch(fishArticle, /\]\(\/[^)\s]*#/);
  assert.match(fishArticle, /animal-protein-per-dollar-ranked-2026\.csv/);
  assert.match(fishArticle, /protein-per-dollar-2026\.csv/);
  assert.match(fishArticle, /sodium-per-dollar-2026\.csv/);
  assert.match(fishArticle, /## Which canned or frozen fish gives the most protein per dollar with the lowest mercury\?/);
  assert.match(fishArticle, /\/how-much-100-grams-of-protein-costs-per-day\//);
  assert.match(fishArticle, /\/animal-protein-per-dollar-ranked\//);
  assert.doesNotMatch(fishArticle, /\]\(\/methodology\//);

  const answer = directAnswer(
    fishArticle,
    "Which canned or frozen fish gives the most protein per dollar with the lowest mercury?",
  );
  const answerWords = words(answer);
  assert.ok(answerWords >= 40 && answerWords <= 60, `fish answer is ${answerWords} words`);
  assert.match(answer, /22\.4 grams/);
  assert.match(answer, /0\.350 ppm/);
  assert.match(answer, /173709/);

  for (const [fdc, label, mercury] of FISH) {
    const row = proteinByFdc.get(fdc);
    const animal = animalByFdc.get(fdc);
    assert.equal(animal.value, row.protein_g_per_dollar, fdc);
    const sodiumRow = sodiumByFdc.get(fdc);
    const sodium = sodiumRow
      ? sodiumRow.sodium_mg_per_100g
      : String(fdcCache[fdc].nutrientsPer100g.sodium);
    const cost = money(30 / Number(row.protein_g_per_dollar));
    assert.match(
      fishArticle,
      new RegExp(
        `\\| ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ${row.protein_g_per_dollar} g \\| \\$${cost.slice(1)} \\| ${sodium} mg \\| ${mercury.replace(".", "\\.")} \\| Best Choices \\|`,
      ),
      label,
    );
  }
  assert.equal(sodiumByFdc.has("175176"), false);
  assert.equal(fdcCache["175176"].nutrientsPer100g.sodium, 52);
});

test("the 100 gram page prices five menus from the three published CSVs", () => {
  assert.equal(field(dayArticle, "title"), "What 100 Grams of Protein Costs a Day");
  assert.equal(field(dayArticle, "excerpt"), DAY_EXCERPT);
  assert.ok(DAY_EXCERPT.length <= 160, DAY_EXCERPT.length);
  assert.equal(field(dayArticle, "author"), "David Miller");
  assert.equal(field(dayArticle, "date"), DAY);
  assert.equal(field(dayArticle, "dateModified"), DAY);
  assert.equal(field(dayArticle, "substantiveUpdate"), DAY);
  assert.equal(field(dayArticle, "image"), `/images/${DAY_SLUG}-chart.jpg`);
  assert.match(field(dayArticle, "imageAlt"), /bar chart/i);
  assert.doesNotMatch(field(dayArticle, "imageAlt"), /photo/i);
  assert.equal(INDEX_PRUNE_SLUGS.has(DAY_SLUG), false);
  assert.equal(read("public/_redirects").includes(DAY_SLUG), false);
  assert.equal(existsSync(`public/images/${DAY_SLUG}-main.jpg`), false);
  assert.equal(existsSync(`public/images/${DAY_SLUG}-chart.jpg`), true);
  assert.equal(readFileSync(`public/images/${DAY_SLUG}-chart.jpg`).subarray(0, 3).toString("hex"), "ffd8ff");
  assert.match(dayArticle, /\/images\/how-much-100-grams-of-protein-costs-per-day-chart\.jpg/);
  assert.match(dayArticle, /A chart, not a camera image, and not an AI illustration/);
  assert.doesNotMatch(dayArticle, /FAQPage/);
  assert.doesNotMatch(dayArticle, /\]\([^)]*\.csv\)/);
  assert.doesNotMatch(dayArticle, /\]\(\/[^)\s]*#/);
  assert.match(dayArticle, /protein-per-dollar-2026\.csv/);
  assert.match(dayArticle, /dairy-protein-per-dollar-ranked-2026\.csv/);
  assert.match(dayArticle, /meat-per-dollar-protein-ranked-2026\.csv/);
  assert.match(dayArticle, /## How much does 100 grams of protein per day actually cost at the grocery store\?/);
  assert.match(dayArticle, /\/cheapest-canned-fish-and-seafood-protein-per-dollar\//);
  assert.match(dayArticle, /\/what-50-grams-of-protein-costs-per-day\//);
  assert.doesNotMatch(dayArticle, /\]\(\/methodology\//);
  assert.match(dayArticle, /0\.8 grams per kilogram/);
  assert.match(dayArticle, /172420/);
  assert.match(dayArticle, /174266/);
  assert.match(dayArticle, /172373/);
  assert.match(dayArticle, /171287/);
  assert.match(dayArticle, /170894/);
  assert.match(dayArticle, /172179/);
  assert.match(dayArticle, /171077/);
  assert.match(dayArticle, /173709/);
  assert.match(dayArticle, /174036/);
  assert.match(dayArticle, /173414/);

  const answer = directAnswer(
    dayArticle,
    "How much does 100 grams of protein per day actually cost at the grocery store?",
  );
  const answerWords = words(answer);
  assert.ok(answerWords >= 40 && answerWords <= 60, `100 g answer is ${answerWords} words`);
  assert.match(answer, /\$1\.57/);
  assert.match(answer, /\$8\.33/);

  const totals = [];
  for (const [menu, parts] of MENUS) {
    let protein = 0;
    let cost = 0;
    for (const [csvName, label, grams] of parts) {
      const part = portion(csvName, grams);
      protein += part.protein;
      cost += part.cost;
      assert.match(
        dayArticle,
        new RegExp(
          `\\| ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ${grams} g \\| ${roundHalfUp(part.protein, 1).toFixed(1)} g \\| \\$${money(part.cost).slice(1)} \\|`,
        ),
        label,
      );
    }
    const proteinText = `${roundHalfUp(protein, 1).toFixed(1)} g`;
    const costText = money(cost);
    totals.push(cost);
    assert.match(
      dayArticle,
      new RegExp(
        `\\| ${menu.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ${proteinText.replace(".", "\\.")} \\| \\$${costText.slice(1)} \\|`,
      ),
      menu,
    );
  }
  const spread = roundHalfUp(totals[totals.length - 1] / totals[0], 1);
  assert.equal(spread, 5.3);
  assert.match(dayArticle, /5\.3 times/);
});

test("the spec pages link each new article once, on a canonical path", () => {
  const sources = [
    ["src/pages/food-value-database/index.astro", `/${FISH_SLUG}/`],
    ["src/pages/tools/grocery-unit-price-calculator/index.astro", `/${FISH_SLUG}/`],
    ["src/pages/tools/grocery-budget-calculator/index.astro", `/${DAY_SLUG}/`],
    ["src/pages/statistics/index.astro", `/${DAY_SLUG}/`],
  ];
  for (const [path, href] of sources) {
    const source = read(path);
    assert.match(source, new RegExp(`href="${href.replaceAll("/", "\\/")}"`), path);
    assert.doesNotMatch(source, new RegExp(`${href.replaceAll("/", "\\/")}#`), path);
  }
});
