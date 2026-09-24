import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { INDEX_KEEP_PATHS, INDEX_PRUNE_SLUGS } from "../src/content/index-prune.js";
import { proteinRow } from "../src/content/meal-protein-cost.mjs";

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

const pairByFood = new Map(
  parseCsv(read("public/data/cheapest-complete-protein-pairs-2026.csv")).map(
    (row) => [row.food, row],
  ),
);

/** Display labels that are shorter than the protein CSV food name. */
const FOOD_ALIASES = {
  "Drumsticks (bone-in)": "Chicken drumsticks (bone-in)",
  "Thighs (boneless, skinless)": "Chicken thighs (boneless, skinless)",
  "Breast (boneless, skinless)": "Chicken breast (boneless, skinless)",
  "Bacon (the anti-example)": "Bacon",
  "Rolled oats": "Old-fashioned rolled oats",
  "Canned tuna (chunk light)": "Canned tuna (chunk light, in water)",
  "Rotisserie chicken": "Rotisserie chicken (whole, cooked)",
};

/** Canned-vs-dry table uses a short food name plus a Type cell. */
const FOOD_BY_TYPE = {
  "brown lentils|dry": "Brown lentils (dry)",
  "green split peas|dry": "Green split peas (dry)",
  "navy beans|dry": "Navy beans (dry)",
  "black beans|dry": "Black beans (dry)",
  "pinto beans|dry": "Pinto beans (dry)",
  "chickpeas|dry": "Chickpeas (dry)",
  "red lentils|dry": "Red lentils (dry)",
  "black beans|canned": "Canned black beans",
  "kidney beans|canned": "Canned kidney beans",
  "chickpeas|canned": "Canned chickpeas",
};

const STALE_PROTEIN_TOKENS = ["97.9", "81.0", "75.9", "57.8"];

function clean(cell) {
  return String(cell ?? "")
    .replace(/\*\*/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function cellsOf(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(clean);
}

function isSeparator(line) {
  return /^\|?\s*:?-{3,}/.test(line.trim().replace(/\|/g, "").trim()) ||
    /^\|?\s*:?-+:?/.test(line.trim());
}

function markdownTables(markdown) {
  const lines = markdown.split(/\n/);
  const tables = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|")) continue;
    const block = [];
    while (index < lines.length && lines[index].trim().startsWith("|")) {
      block.push(lines[index]);
      index += 1;
    }
    index -= 1;
    if (block.length >= 3 && isSeparator(block[1])) tables.push(block);
  }
  return tables;
}

function isProteinDollarLabel(value) {
  const label = clean(value).toLowerCase();
  return (
    label.includes("protein") &&
    /per\s*\$/.test(label) &&
    !label.includes("100") &&
    !label.includes("quality")
  );
}

function gramToken(cell) {
  const match = clean(cell).match(/(\d+\.\d+)/);
  assert.ok(match, `expected a one-decimal protein figure, got "${cell}"`);
  return match[1];
}

function expectedGrams(label, typeCell) {
  const name = clean(label);
  if (name.includes(" + ")) {
    const pair = pairByFood.get(name);
    assert.ok(pair, `pair is not in the complete-protein CSV: ${name}`);
    return pair.value;
  }
  if (typeCell) {
    const form = clean(typeCell).split(",")[0].trim().toLowerCase();
    const typed = FOOD_BY_TYPE[`${name.toLowerCase()}|${form}`];
    assert.ok(typed, `no CSV food for "${name}" (${form})`);
    return proteinRow(typed).protein_g_per_dollar;
  }
  return proteinRow(FOOD_ALIASES[name] ?? name).protein_g_per_dollar;
}

function keepArticles() {
  const articles = [];
  for (const slug of INDEX_KEEP_PATHS) {
    assert.equal(
      INDEX_PRUNE_SLUGS.has(slug) || INDEX_PRUNE_SLUGS.has(slug.split("/").pop()),
      false,
      `${slug} is both KEEP and PRUNE`,
    );
    const relativePath = join("src/data/articles", `${slug}.md`);
    if (!existsSync(join(root, relativePath))) continue;
    articles.push({ slug, relativePath, markdown: read(relativePath) });
  }
  return articles;
}

test("KEEP articles do not cite the pre-BLS pinto, black bean, navy, or quality-adjusted pinto figures", () => {
  const articles = keepArticles();
  assert.ok(articles.length >= 15, "expected KEEP protein articles on disk");
  for (const { slug, markdown } of articles) {
    for (const token of STALE_PROTEIN_TOKENS) {
      const pattern = new RegExp(`(?<!\\d)${token.replace(".", "\\.")}(?!\\d)`);
      assert.doesNotMatch(
        markdown,
        pattern,
        `${slug} still cites stale protein figure ${token}`,
      );
    }
  }
});

test("KEEP comparison tables lock protein-per-dollar cells to the live CSVs", () => {
  let checked = 0;
  for (const { slug, markdown } of keepArticles()) {
    for (const block of markdownTables(markdown)) {
      const header = cellsOf(block[0]);
      const body = block.slice(2).map(cellsOf);
      const proteinColumns = header
        .map((cell, index) => ({ cell, index }))
        .filter(({ cell }) => isProteinDollarLabel(cell));
      const metricRow = body.find((row) => isProteinDollarLabel(row[0]));

      if (metricRow) {
        for (let index = 1; index < header.length; index += 1) {
          const actual = gramToken(metricRow[index]);
          const expected = expectedGrams(header[index]);
          assert.equal(
            actual,
            expected,
            `${slug} ${header[index]} protein per dollar should be ${expected}, not ${actual}`,
          );
          checked += 1;
        }
        continue;
      }

      if (proteinColumns.length === 0) continue;
      assert.equal(
        proteinColumns.length,
        1,
        `${slug} table has more than one protein-per-dollar column: ${header.join(" | ")}`,
      );
      const proteinIndex = proteinColumns[0].index;
      const foodIndex = header.findIndex((cell) =>
        /^(food|pair|cut|grain|plant protein|best value)$/i.test(cell),
      );
      const typeIndex = header.findIndex((cell) => /^type$/i.test(cell));
      const labelIndex = foodIndex === -1 ? 0 : foodIndex;

      for (const row of body) {
        if (!row[labelIndex] || !row[proteinIndex]) continue;
        if (isProteinDollarLabel(row[labelIndex])) continue;
        const actual = gramToken(row[proteinIndex]);
        const expected = expectedGrams(
          row[labelIndex],
          typeIndex === -1 ? "" : row[typeIndex],
        );
        assert.equal(
          actual,
          expected,
          `${slug} ${row[labelIndex]} protein per dollar should be ${expected}, not ${actual}`,
        );
        checked += 1;
      }
    }
  }
  assert.ok(checked >= 80, `expected to lock dozens of protein cells, checked ${checked}`);
});

test("complete-protein pair CSV still restates the parent protein-per-dollar rows", () => {
  for (const row of pairByFood.values()) {
    const quoted = [...row.price_basis.matchAll(/([^,]+?) (\d+\.\d+)(?:,|$)/g)];
    assert.equal(quoted.length, 2, row.food);
    const [left, right] = quoted.map((match) => ({
      food: match[1].replace(/^50\/50 dollar split of audited rows:\s*/, "").trim(),
      grams: match[2],
    }));
    assert.equal(proteinRow(left.food).protein_g_per_dollar, left.grams, left.food);
    assert.equal(proteinRow(right.food).protein_g_per_dollar, right.grams, right.food);
    assert.equal(`${left.food} + ${right.food}`, row.food);
  }
});

test("protein flagship five-dollar caption matches five times the CSV rows", () => {
  const markdown = read(
    "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
  );
  const pinto = Number(proteinRow("Pinto beans (dry)").protein_g_per_dollar);
  const bacon = Number(proteinRow("Bacon").protein_g_per_dollar);
  const pintoFive = String(Math.round(pinto * 5));
  const baconFive = String(Math.round(bacon * 5));
  assert.match(markdown, new RegExp(`${pintoFive} grams for dried pinto beans`));
  assert.match(markdown, new RegExp(`${baconFive} grams for bacon`));
  assert.match(
    markdown,
    new RegExp(`Five dollars of dry pinto beans buys ${pintoFive} grams`),
  );
  assert.doesNotMatch(markdown, /490 grams/);
  assert.doesNotMatch(markdown, /46 grams for bacon/);
});
