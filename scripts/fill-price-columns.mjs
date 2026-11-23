/**
 * Append priced_month, retailer, price_location, and audit_note to every
 * public study CSV. Re-running is a no-op when the columns already match.
 *
 * Existing cells are left byte-for-byte alone on the first append. The new
 * values come from src/content/price-basis.mjs.
 */

import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRICE_COLUMNS,
  annotateStudyTables,
  csvEscape,
  parseCsv,
} from "../src/content/price-basis.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DATA = join(ROOT, "public", "data");
const MIRRORS = [join(ROOT, "dist-datasets", "data"), join(ROOT, "mcp-server", "data")];
const INVENTORY = join(ROOT, "pipeline-data", "csv-inventory.json");

function stripPriceColumns(table) {
  const keep = table.header.map((name) => !PRICE_COLUMNS.includes(name));
  return {
    header: table.header.filter((_, index) => keep[index]),
    rows: table.rows.map((row) => row.filter((_, index) => keep[index])),
  };
}

function appendToOriginal(raw, annotatedRows) {
  const text = raw.replace(/\r\n/g, "\n");
  const lines = text.replace(/\n$/, "").split("\n");
  if (lines.length !== annotatedRows.length + 1) {
    throw new Error("Refusing to append: a quoted newline would split a row.");
  }
  const [headerLine, ...dataLines] = lines;
  const next = [
    `${headerLine},${PRICE_COLUMNS.join(",")}`,
    ...dataLines.map((line, index) => {
      const facts = PRICE_COLUMNS.map((_, factIndex) => {
        const value = annotatedRows[index][annotatedRows[index].length - PRICE_COLUMNS.length + factIndex];
        return csvEscape(value);
      });
      return `${line},${facts.join(",")}`;
    }),
  ];
  return `${next.join("\n")}\n`;
}

function valuesMatch(current, annotated) {
  if (current.header.join("|") !== annotated.header.join("|")) return false;
  if (current.rows.length !== annotated.rows.length) return false;
  for (let index = 0; index < current.rows.length; index += 1) {
    const left = current.rows[index];
    const right = annotated.rows[index];
    for (let cell = 0; cell < annotated.header.length; cell += 1) {
      if ((left[cell] ?? "") !== (right[cell] ?? "")) return false;
    }
  }
  return true;
}

const fileNames = readdirSync(PUBLIC_DATA).filter((name) => name.endsWith(".csv")).sort();
const stripped = {};
const originals = new Map();

for (const fileName of fileNames) {
  const raw = readFileSync(join(PUBLIC_DATA, fileName), "utf8");
  originals.set(fileName, raw);
  stripped[fileName] = stripPriceColumns(parseCsv(raw));
}

const { tables, unmatched } = annotateStudyTables(stripped);
if (unmatched.length) {
  console.error(unmatched.map((item) => `UNMATCHED ${item}`).join("\n"));
  process.exitCode = 1;
}

const inventory = JSON.parse(readFileSync(INVENTORY, "utf8"));
let wrote = 0;

for (const fileName of fileNames) {
  const annotated = tables[fileName];
  const current = parseCsv(originals.get(fileName));
  const already = current.header.includes("priced_month");
  if (already && valuesMatch(current, annotated)) continue;

  const next = already
    ? null
    : appendToOriginal(originals.get(fileName), annotated.rows);
  if (already) {
    throw new Error(`${fileName} already has price columns that do not match the rules.`);
  }

  const target = join(PUBLIC_DATA, fileName);
  writeFileSync(target, next);
  wrote += 1;
  for (const mirror of MIRRORS) {
    if (!existsSync(mirror)) continue;
    const dest = join(mirror, fileName);
    const isPublicMirror = mirror.endsWith(join("dist-datasets", "data"));
    if (isPublicMirror || existsSync(dest)) copyFileSync(target, dest);
  }
}

for (const entry of inventory) {
  for (const column of PRICE_COLUMNS) {
    if (!entry.fields.includes(column)) entry.fields.push(column);
  }
}
writeFileSync(INVENTORY, `${JSON.stringify(inventory, null, 1)}\n`);

const blankReport = [];
for (const fileName of fileNames) {
  const table = tables[fileName];
  const monthAt = table.header.indexOf("priced_month");
  const retailerAt = table.header.indexOf("retailer");
  const locationAt = table.header.indexOf("price_location");
  let months = 0;
  let retailers = 0;
  let locations = 0;
  for (const row of table.rows) {
    if (row[monthAt]) months += 1;
    if (row[retailerAt]) retailers += 1;
    if (row[locationAt]) locations += 1;
  }
  blankReport.push(
    `${fileName}: rows ${table.rows.length}, month ${months}, retailer ${retailers}, location ${locations}`,
  );
}

console.log(`updated ${wrote} CSVs`);
console.log(blankReport.join("\n"));
if (unmatched.length === 0) console.log("parent lookups matched");
