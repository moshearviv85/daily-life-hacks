import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const salt = readFileSync(
  join(root, "src/data/articles/fix-oversalted-soup-sauce-rice.md"),
  "utf8",
);
const popcorn = readFileSync(
  join(root, "src/data/articles/high-fiber-popcorn-toppings-healthy.md"),
  "utf8",
);
const cache = JSON.parse(readFileSync(join(root, "src/data/fdc-cache.json"), "utf8")).foods;

const SALT_QUESTION = "Does adding a raw potato actually remove salt from oversalted soup?";
const POPCORN_QUESTION = "Which popcorn toppings actually add fiber and protein per tablespoon?";
const UPDATED = "2026-11-25";

function frontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "missing frontmatter");
  return match[1];
}

function field(markdown, name) {
  const match = frontmatter(markdown).match(
    new RegExp(`^${name}:\\s*"?([^"\\n]+?)"?\\s*$`, "m"),
  );
  return match ? match[1] : null;
}

function body(markdown) {
  return markdown.split(/\n---\n/).slice(1).join("\n---\n");
}

function answerParagraph(markdown, heading) {
  const marker = `## ${heading}\n\n`;
  const start = markdown.indexOf(marker);
  assert.notEqual(start, -1, `missing heading: ${heading}`);
  const paragraph = markdown.slice(start + marker.length).split(/\n\s*\n/)[0];
  assert.ok(paragraph, `missing direct answer under ${heading}`);
  return paragraph;
}

function visibleWords(paragraph) {
  const visible = paragraph.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return visible.match(/[\p{L}\p{N}]+(?:[.'’][\p{L}\p{N}]+)*/gu) ?? [];
}

function tableRows(markdown, header) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.indexOf(header);
  assert.notEqual(headerIndex, -1, `missing table header: ${header}`);
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) break;
    rows.push(
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    );
  }
  return rows;
}

function portionGrams(record, modifier) {
  const portion = record.portions.find((item) => item.modifier === modifier);
  assert.ok(portion, `${record.fdcId} is missing portion ${modifier}`);
  return portion.grams;
}

function scaled(per100, grams) {
  return (per100 * grams) / 100;
}

function formatGrams(per100, grams) {
  return (Math.round(scaled(per100, grams) * 10) / 10).toFixed(1);
}

function formatSodium(per100, grams) {
  const value = scaled(per100, grams);
  if (value < 10) return (Math.round(value * 10) / 10).toFixed(1);
  const rounded = Math.round(value);
  return rounded >= 1000 ? rounded.toLocaleString("en-US") : String(rounded);
}

function articleLinks(markdown) {
  return [...body(markdown).matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map((match) => ({
    anchor: match[1],
    href: match[2],
  }));
}

test("salt rescue page answers the potato question with a 5-row FDC table", () => {
  assert.equal(field(salt, "title"), "How to Fix Oversalted Soup, Sauce, and Rice");
  assert.equal(
    field(salt, "excerpt"),
    "Rescue oversalted soup, sauce, or rice with practical fixes that balance the pot without forcing you to throw out dinner and start again.",
  );
  assert.equal(field(salt, "author"), "David Miller");
  assert.equal(field(salt, "date"), "2026-04-24");
  assert.equal(field(salt, "dateModified"), UPDATED);
  assert.equal(field(salt, "substantiveUpdate"), UPDATED);
  assert.equal(salt.includes("FAQPage"), false);
  assert.equal(salt.includes("\u2014"), false);
  assert.doesNotMatch(body(salt), /\]\([^)]+\.csv/);
  const hashed = articleLinks(salt).filter(
    (link) => link.href.startsWith("/") && link.href.includes("#"),
  );
  assert.deepEqual(
    hashed.map((link) => link.href),
    ["/protein-per-serving-beans-chicken-tofu-compared/#cost-per-25-g"],
  );

  const answer = answerParagraph(salt, SALT_QUESTION);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 60,
    `salt answer should be 40-60 visible words, got ${words.length}: ${words.join(" ")}`,
  );
  assert.match(answer, /Genuine Ideas/);
  assert.match(answer, /https:\/\/genuineideas\.com\/ArticlesIndex\/potatosponge\.html/);
  assert.match(answer, /Kitchn/);
  assert.match(answer, /4%/);
  assert.match(answer, /half a teaspoon/);
  assert.match(answer, /15 teaspoons/);

  const broth = cache["171583"];
  const beans = { sodium: 1, cup: 172 };
  const vinegar = cache["173469"];
  const unsalted = cache["173430"];
  const salted = cache["173410"];
  const tableSalt = cache["173468"];
  const brothCup = portionGrams(broth, "cup");
  const vinegarTbsp = portionGrams(vinegar, "tbsp");
  const butterTbsp = portionGrams(unsalted, "tbsp");
  const saltTsp = portionGrams(tableSalt, "tsp");
  assert.equal(portionGrams(salted, "tbsp"), butterTbsp);

  const rows = tableRows(salt, "| Rescue | What changes | Sodium figure | Record |");
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((row) => row[0]), [
    "Dilute with water or unsalted broth",
    "Add unsalted bulk",
    "Add lemon or vinegar",
    "Add unsalted dairy or fat",
    "Simmer a raw potato",
  ]);
  assert.match(rows[0][2], new RegExp(`${formatSodium(broth.nutrientsPer100g.sodium, brothCup)} mg`));
  assert.match(rows[0][2], new RegExp(`${brothCup} g`));
  assert.match(rows[0][3], /FDC 171583/);
  assert.match(rows[1][2], new RegExp(`${beans.sodium} mg per 100 g`));
  assert.match(rows[1][2], new RegExp(`${formatSodium(beans.sodium, beans.cup)} mg in a ${beans.cup} g cup`));
  assert.match(rows[1][3], /FDC 173735/);
  assert.match(rows[2][2], new RegExp(`${formatSodium(vinegar.nutrientsPer100g.sodium, vinegarTbsp)} mg`));
  assert.match(rows[2][2], new RegExp(`${vinegarTbsp} g`));
  assert.match(rows[2][3], /FDC 173469/);
  assert.match(rows[3][2], new RegExp(`${formatSodium(unsalted.nutrientsPer100g.sodium, butterTbsp)} mg`));
  assert.match(rows[3][2], new RegExp(`${formatSodium(salted.nutrientsPer100g.sodium, butterTbsp)} mg`));
  assert.match(rows[3][3], /FDC 173430/);
  assert.match(rows[3][3], /FDC 173410/);
  assert.match(rows[4][2], new RegExp(`${formatSodium(tableSalt.nutrientsPer100g.sodium, saltTsp)} mg`));
  assert.match(rows[4][2], /349 mg/);
  assert.match(rows[4][2], /6\.7 g/);
  assert.match(rows[4][3], /FDC 173468/);
  assert.match(rows[4][3], /FDC 171589/);
  assert.equal(Math.round((5203 * 6.7) / 100), 349);
});

test("popcorn toppings page answers with a 6-row USDA topping table", () => {
  assert.equal(field(popcorn, "title"), "High Fiber Popcorn Toppings");
  assert.equal(
    field(popcorn, "excerpt"),
    "Give plain popcorn a real personality with chili-lime, cocoa-cinnamon, Parmesan-pepper, and four more toppings worth movie night.",
  );
  assert.equal(field(popcorn, "author"), "David Miller");
  assert.equal(field(popcorn, "date"), "2026-02-01");
  assert.equal(field(popcorn, "dateModified"), UPDATED);
  assert.equal(field(popcorn, "substantiveUpdate"), UPDATED);
  assert.equal(popcorn.includes("FAQPage"), false);
  assert.equal(popcorn.includes("\u2014"), false);
  assert.doesNotMatch(body(popcorn), /\]\([^)]+\.csv/);
  assert.doesNotMatch(body(popcorn), /\]\(\/[^)]*#/);

  const answer = answerParagraph(popcorn, POPCORN_QUESTION);
  const words = visibleWords(answer);
  assert.ok(
    words.length >= 40 && words.length <= 60,
    `popcorn answer should be 40-60 visible words, got ${words.length}: ${words.join(" ")}`,
  );
  assert.match(answer, /FDC 167959/);
  assert.match(answer, /3\.5 grams of fiber/);
  assert.match(answer, /3\.1 grams of protein/);
  assert.match(answer, /1\.9 milligrams of sodium/);

  const flax = cache["169414"];
  const chia = cache["170554"];
  const parmesan = cache["171247"];
  const cinnamon = cache["171320"];
  const paprika = cache["171329"];
  const flaxGrams = portionGrams(flax, "tbsp, ground");
  const chiaGrams = portionGrams(chia, "oz");
  const parmesanGrams = portionGrams(parmesan, "tbsp");
  const cinnamonGrams = portionGrams(cinnamon, "tsp");
  const paprikaGrams = portionGrams(paprika, "tsp");
  const popcornPer100 = { fiber: 14.5, protein: 12.94, sodium: 8 };
  const popcornGrams = 24;

  const rows = tableRows(
    popcorn,
    "| Topping | Household measure | Grams | Fiber | Protein | Sodium | Record |",
  );
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map((row) => row[0]), [
    "Ground flaxseed",
    "Chia seeds, dried",
    "Grated Parmesan",
    "Ground cinnamon",
    "Paprika",
    "Nutritional yeast flakes, Great Value label",
  ]);

  const expectRow = (row, grams, record, id) => {
    assert.match(row[2], new RegExp(`^${grams} g$`));
    const fiber = formatGrams(record.nutrientsPer100g.fiber, grams);
    assert.match(row[3], new RegExp(`^${fiber === "0.0" ? "0" : fiber} g$`));
    assert.match(row[4], new RegExp(`${formatGrams(record.nutrientsPer100g.protein, grams)} g`));
    assert.match(row[5], new RegExp(`${formatSodium(record.nutrientsPer100g.sodium, grams)} mg`));
    assert.match(row[6], new RegExp(`FDC ${id}`));
  };
  expectRow(rows[0], flaxGrams, flax, 169414);
  expectRow(rows[1], chiaGrams, chia, 170554);
  expectRow(rows[2], parmesanGrams, parmesan, 171247);
  expectRow(rows[3], cinnamonGrams, cinnamon, 171320);
  expectRow(rows[4], paprikaGrams, paprika, 171329);
  assert.match(rows[5][2], /^5 g$/);
  assert.match(rows[5][3], /^1 g$/);
  assert.match(rows[5][4], /^2 g$/);
  assert.match(rows[5][5], /^10 mg$/);
  assert.match(rows[5][6], /FDC 2676401/);
  assert.match(popcorn, /no SR Legacy record/);

  assert.match(answer, new RegExp(`${formatGrams(popcornPer100.fiber, popcornGrams)} grams of fiber`));
  assert.match(answer, new RegExp(`${formatGrams(popcornPer100.protein, popcornGrams)} grams of protein`));
  assert.match(popcorn, /4\.1 grams of fiber, 2\.0 grams of protein, and 1\.9 mg of sodium/);
  assert.equal(formatGrams(chia.nutrientsPer100g.fiber, 12), "4.1");
  assert.equal(formatGrams(chia.nutrientsPer100g.protein, 12), "2.0");
  assert.equal(formatSodium(chia.nutrientsPer100g.sodium, 12), "1.9");
  assert.equal(formatGrams(popcornPer100.fiber, popcornGrams), "3.5");
  assert.equal(formatGrams(popcornPer100.protein, popcornGrams), "3.1");
  assert.equal(formatSodium(popcornPer100.sodium, popcornGrams), "1.9");
});

test("pair B contextual links stay canonical and do not move source dates", () => {
  const sources = [
    ["kitchen-tools-that-save-time-and-money.md", "2026-07-20", null, "/fix-oversalted-soup-sauce-rice/"],
    ["how-to-double-recipe-seasoning-without-guessing.md", "2026-11-23", "2026-11-23", "/fix-oversalted-soup-sauce-rice/"],
    ["healthy-alternatives-potato-chips-snacking.md", "2026-09-23", null, "/high-fiber-popcorn-toppings-healthy/"],
    ["high-protein-vs-high-fiber-satiety.md", "2026-07-20", null, "/high-fiber-popcorn-toppings-healthy/"],
  ];
  for (const [name, modified, substantive, href] of sources) {
    const markdown = readFileSync(join(root, "src/data/articles", name), "utf8");
    assert.equal(field(markdown, "author"), "David Miller", name);
    assert.equal(field(markdown, "dateModified"), modified, name);
    assert.equal(field(markdown, "substantiveUpdate"), substantive, name);
    const hits = articleLinks(markdown).filter((link) => link.href === href);
    assert.equal(hits.length, 1, `${name} should link ${href} once`);
    assert.equal(hits[0].href.includes("#"), false, hits[0].href);
    assert.equal(hits[0].href.endsWith("/"), true, hits[0].href);
  }
});
