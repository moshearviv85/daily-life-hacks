import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
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
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }

  const [headers, ...rows] = records;
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]])),
    );
}

function faqBlock(slug) {
  const markdown = read(`src/data/articles/${slug}.md`);
  const faq = markdown.match(/^faq:\n([\s\S]*?)\n---\n/m)?.[1] ?? "";
  assert.ok(faq.includes("question:"), `${slug} is missing FAQ frontmatter`);
  return { markdown, faq };
}

function row(rows, name) {
  const match = rows.find((entry) => entry.food === name);
  assert.ok(match, `${name} missing from CSV`);
  return match;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("breakfast FAQ quotes combined lead figures from its CSV", () => {
  const rows = parseCsv(read("public/data/breakfast-staples-per-dollar-2026.csv"));
  const flour = row(rows, "Whole wheat flour");
  const oats = row(rows, "Old-fashioned rolled oats");
  const peanutButter = row(rows, "Peanut butter");
  const eggs = row(rows, "Eggs (large)");
  const milk = row(rows, "Whole milk");
  const yogurt = row(rows, "Greek yogurt (plain, nonfat)");
  const cottage = row(rows, "Cottage cheese (4%)");
  const bananas = row(rows, "Bananas");
  const apples = row(rows, "Apples (gala)");

  const flourCombined = (
    Number(flour.protein_g_per_dollar) + Number(flour.fiber_g_per_dollar)
  ).toFixed(1);
  const oatsCombined = (
    Number(oats.protein_g_per_dollar) + Number(oats.fiber_g_per_dollar)
  ).toFixed(1);
  assert.equal(flourCombined, flour.value);
  assert.equal(oatsCombined, oats.value);
  assert.equal(flour.protein_g_per_dollar, "96.0");
  assert.equal(flour.fiber_g_per_dollar, "77.8");
  assert.equal(flourCombined, "173.8");
  assert.equal(oats.protein_g_per_dollar, "46.6");
  assert.equal(oats.fiber_g_per_dollar, "35.8");
  assert.equal(oatsCombined, "82.4");
  assert.equal(milk.protein_g_per_dollar, "28.5");
  assert.equal(milk.package_price_usd, "4.31");

  const { markdown, faq } = faqBlock("breakfast-staples-per-dollar");
  const title = markdown.match(/^title: "(.*)"$/m)?.[1] ?? "";
  assert.equal(
    title,
    `Cheapest Breakfast: Flour ${flourCombined}g vs Oats ${oatsCombined}g Combined`,
  );

  assert.match(faq, new RegExp(`${escapeRegExp(flourCombined)} grams combined`));
  assert.match(faq, new RegExp(`${escapeRegExp(oatsCombined)} grams combined`));
  assert.match(
    faq,
    new RegExp(`${escapeRegExp(flour.protein_g_per_dollar)} grams of protein`),
  );
  assert.match(
    faq,
    new RegExp(`${escapeRegExp(flour.fiber_g_per_dollar)} grams of fiber`),
  );
  assert.match(
    faq,
    new RegExp(`${escapeRegExp(oats.protein_g_per_dollar)} grams of protein`),
  );
  assert.match(
    faq,
    new RegExp(`${escapeRegExp(oats.fiber_g_per_dollar)} grams of fiber`),
  );
  for (const value of [
    peanutButter.protein_g_per_dollar,
    eggs.protein_g_per_dollar,
    milk.protein_g_per_dollar,
    yogurt.protein_g_per_dollar,
    cottage.protein_g_per_dollar,
    bananas.fiber_g_per_dollar,
    apples.fiber_g_per_dollar,
  ]) {
    assert.match(faq, new RegExp(escapeRegExp(value)));
  }
  assert.match(faq, /\$3\.12/);
  assert.match(faq, /\$3\.36/);
  assert.match(faq, /\$2\.19/);
  assert.match(faq, /\$4\.31 gallon/);

  assert.doesNotMatch(faq, /97\.9|70\.8|29\.1/);
  assert.doesNotMatch(faq, /more than double the next food/);
  assert.doesNotMatch(faq, /technically wins at 96\.0/);
  assert.doesNotMatch(faq, /for far less/);
  assert.doesNotMatch(
    faq,
    /96\.0 grams combined|46\.6 grams combined|34\.4 grams combined|28\.5 grams combined/,
  );
});

test("eggs FAQ quotes protein lead figures from its CSV", () => {
  const rows = parseCsv(read("public/data/eggs-vs-everything-protein-value-2026.csv"));
  const grams = (name) => row(rows, name).value;
  const flour = grams("Whole wheat flour");
  const eggs = grams("Eggs (large)");
  const pinto = grams("Pinto beans (dry)");
  const redLentils = grams("Red lentils (dry)");
  const brownLentils = grams("Brown lentils (dry)");
  assert.equal(flour, "96.0");
  assert.equal(eggs, "34.4");
  assert.equal(pinto, "57.6");

  const legumes = rows.filter((entry) => entry.category === "Dried beans & lentils");
  const legumeValues = legumes.map((entry) => Number(entry.value));
  assert.equal(Math.min(...legumeValues).toFixed(1), redLentils);
  assert.equal(Math.max(...legumeValues).toFixed(1), brownLentils);
  const aboveEggs = rows.filter((entry) => Number(entry.value) > Number(eggs));
  assert.equal(aboveEggs.length, 16);

  const { markdown, faq } = faqBlock("eggs-vs-everything-protein-value");
  const title = markdown.match(/^title: "(.*)"$/m)?.[1] ?? "";
  assert.equal(title, `Are Eggs the Cheapest Protein? Flour ${flour}g vs Eggs ${eggs}g`);
  assert.equal(title.toLowerCase().includes("combined"), false);

  assert.match(faq, /Sixteen foods/);
  assert.match(faq, new RegExp(`beat eggs at ${escapeRegExp(eggs)} grams of protein per dollar`));
  assert.match(faq, new RegExp(`Whole wheat flour led at ${escapeRegExp(flour)}`));
  assert.match(faq, new RegExp(`Whole wheat flour leads at ${escapeRegExp(flour)}`));
  assert.match(faq, new RegExp(`Dry pinto beans delivered ${escapeRegExp(pinto)}`));
  assert.match(faq, new RegExp(`dry pinto beans at ${escapeRegExp(pinto)}`));
  assert.match(
    faq,
    new RegExp(
      `red lentils at ${escapeRegExp(redLentils)} to brown lentils at ${escapeRegExp(brownLentils)}`,
    ),
  );
  for (const [name, pattern] of [
    ["Whole wheat spaghetti", `Whole wheat spaghetti is ${grams("Whole wheat spaghetti")}`],
    ["Spaghetti (regular, dry)", `regular spaghetti is ${grams("Spaghetti (regular, dry)")}`],
    ["Peanut butter", `Peanut butter is ${grams("Peanut butter")}`],
    ["Chicken drumsticks (bone-in)", `drumsticks 50\\.3|drumsticks at ${grams("Chicken drumsticks (bone-in)")}`],
    ["Old-fashioned rolled oats", `rolled oats ${grams("Old-fashioned rolled oats")}`],
    ["Dry roasted peanuts", `dry roasted peanuts ${grams("Dry roasted peanuts")}`],
    ["Brown rice (dry)", `brown rice ${grams("Brown rice (dry)")}`],
    ["Pearled barley (dry)", `pearled barley ${grams("Pearled barley (dry)")}`],
    ["Chicken breast (boneless, skinless)", grams("Chicken breast (boneless, skinless)")],
    ["Ground beef (80/20)", grams("Ground beef (80/20)")],
    ["Ground beef (93/7)", grams("Ground beef (93/7)")],
    ["Bacon", grams("Bacon")],
  ]) {
    assert.match(faq, new RegExp(pattern), `${name} should stay locked to ${pattern}`);
  }
  assert.match(faq, /\$2\.19/);
  assert.doesNotMatch(faq, /[Cc]ombined/);
  assert.doesNotMatch(faq, /97\.9|70\.8|29\.1/);
  assert.doesNotMatch(faq, /both spaghettis/);
});
