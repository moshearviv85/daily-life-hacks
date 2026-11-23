import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  GROCERY_STUDY_PAGES,
  PRICE_COLUMNS,
  annotateStudyTables,
  parseCsv,
  priceBasisParts,
  priceBasisWordCount,
  summaryForStudy,
} from "../src/content/price-basis.mjs";

const root = join(import.meta.dirname, "..");
const dataDir = join(root, "public", "data");

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function loadTables() {
  const tables = {};
  for (const fileName of readdirSync(dataDir).filter((name) => name.endsWith(".csv"))) {
    const parsed = parseCsv(read(join("public", "data", fileName)));
    const keep = parsed.header.map((name) => !PRICE_COLUMNS.includes(name));
    tables[fileName] = {
      header: parsed.header.filter((_, index) => keep[index]),
      rows: parsed.rows.map((row) => row.filter((_, index) => keep[index])),
    };
  }
  return tables;
}

const annotated = annotateStudyTables(loadTables());

test("price columns match the recorded-text rules and parent lookups resolve", () => {
  assert.deepEqual(annotated.unmatched, []);
  for (const fileName of Object.keys(annotated.tables)) {
    const expected = annotated.tables[fileName];
    const actual = parseCsv(read(join("public", "data", fileName)));
    assert.deepEqual(actual.header.slice(-PRICE_COLUMNS.length), PRICE_COLUMNS, fileName);
    assert.deepEqual(actual.header, expected.header, fileName);
    assert.equal(actual.rows.length, expected.rows.length, fileName);
    for (let index = 0; index < actual.rows.length; index += 1) {
      assert.deepEqual(actual.rows[index], expected.rows[index], `${fileName} row ${index + 1}`);
    }
  }
});

test("Walmart rows without a month in the cell stay blank, and BLS months are kept", () => {
  const fiber = parseCsv(read("public/data/fiber-per-dollar-2026.csv"));
  const foodAt = fiber.header.indexOf("food");
  const monthAt = fiber.header.indexOf("priced_month");
  const retailerAt = fiber.header.indexOf("retailer");
  const locationAt = fiber.header.indexOf("price_location");
  const flour = fiber.rows.find((row) => row[foodAt] === "Whole wheat flour");
  const bread = fiber.rows.find((row) => row[foodAt] === "100% whole wheat bread");

  assert.equal(flour[monthAt], "");
  assert.equal(flour[retailerAt], "Walmart Great Value");
  assert.equal(flour[locationAt], "");
  assert.equal(bread[monthAt], "2026-05");
  assert.equal(bread[retailerAt], "BLS");
  assert.equal(bread[locationAt], "US average");
});

test("fast-food months come from the price text and the chain is the retailer", () => {
  const table = parseCsv(read("public/data/fastfood-protein-per-dollar-2026.csv"));
  const row = (item) => table.rows.find((cells) => cells[table.header.indexOf("item")] === item);
  const at = (cells, name) => cells[table.header.indexOf(name)];
  const cup = row("High Protein Cup (4 oz chicken)");
  const subway = row("Footlong Meatball Marinara");

  assert.equal(at(cup, "priced_month"), "2025-12");
  assert.equal(at(cup, "retailer"), "Chipotle");
  assert.equal(at(cup, "price_location"), "national");
  assert.equal(at(subway, "priced_month"), "");
  assert.equal(at(subway, "retailer"), "Subway");
  assert.equal(at(subway, "price_location"), "");
});

test("price location never invents online or a ZIP", () => {
  for (const fileName of readdirSync(dataDir).filter((name) => name.endsWith(".csv"))) {
    const table = parseCsv(read(join("public", "data", fileName)));
    const locationAt = table.header.indexOf("price_location");
    for (const row of table.rows) {
      const location = row[locationAt] ?? "";
      assert.doesNotMatch(location, /online|zip|\b\d{5}\b/i, `${fileName}: ${location}`);
    }
  }
});

test("every grocery study box stays within 120 words and omits an unknown month", () => {
  for (const slug of Object.keys(GROCERY_STUDY_PAGES)) {
    const summary = summaryForStudy(slug);
    assert.ok(summary.itemCount > 0, slug);
    assert.ok(priceBasisWordCount(summary) <= 120, `${slug} has ${priceBasisWordCount(summary)} words`);
    const parts = priceBasisParts(summary).join(" ");
    if (!summary.months.length) assert.doesNotMatch(parts, /Price month/);
    if (!summary.retailers.length) assert.doesNotMatch(parts, /Retailers/);
    assert.match(parts, new RegExp(`^${summary.itemCount} `));
    assert.match(summary.unitBasis, /^Unit:/);
  }

  const pairs = summaryForStudy("cheapest-complete-protein-pairs");
  assert.equal(pairs.months.length, 0);
  assert.equal(pairs.temporalCoverage, "");

  const animal = summaryForStudy("animal-protein-per-dollar-ranked");
  assert.equal(animal.temporalCoverage, "2026-07");
  assert.equal(animal.monthRows, animal.itemCount);

  const protein = summaryForStudy("foods-highest-in-protein-per-100-grams");
  assert.equal(protein.itemCount, 49);
  assert.equal(protein.temporalCoverage, "");
  assert.ok(protein.monthRows < protein.itemCount);
});

test("the study page renders the price box without a dateModified write", () => {
  const page = read("src/pages/[slug].astro");
  assert.match(page, /<PriceBasisBox summary=\{priceBasis\} \/>/);
  assert.match(page, /temporalCoverage: priceBasis\?\.temporalCoverage \|\| dataset\.temporal/);
  assert.match(page, /dateModified: modifiedDate/);
  assert.match(read("src/pages/editorial-policy.astro"), /id="corrections"/);
  assert.doesNotMatch(page, /dateModified:\s*new Date/);
});
