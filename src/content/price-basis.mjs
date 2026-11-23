/**
 * Price-month and retailer columns for the grocery study CSVs, plus the
 * "How we priced this" summary those columns feed.
 *
 * A cell is filled only from text that row already records (its price_basis
 * or basis, the BLS date and area columns, the fast-food chain column, or a
 * parent row the file itself names). A missing month or place stays blank.
 * Nothing here turns a study-level "July 2026" sentence into a row date.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PRICE_COLUMNS = [
  "priced_month",
  "retailer",
  "price_location",
  "audit_note",
];

/** Opening sentence repeated on several study pages. It is not the answer. */
export const UNIT_BOILERPLATE =
  "The per-dollar figure divides the FoodData Central protein or fiber per 100 grams by the July 2026 package price. The link is that nutrient record, not a price the lab published.";

/**
 * Grocery cost study pages and the CSV the box is built from.
 * Category cuts that only exist as anchors on a flagship are not pages.
 */
export const GROCERY_STUDY_PAGES = {
  "foods-highest-in-protein-per-100-grams": "/data/protein-per-dollar-2026.csv",
  "what-30-grams-of-fiber-costs-per-day": "/data/fiber-day-cost-2026.csv",
  "what-50-grams-of-protein-costs-per-day": "/data/protein-day-cost-2026.csv",
  "protein-per-dollar-adjusted-for-quality": "/data/protein-quality-per-dollar-2026.csv",
  "fast-food-protein-per-dollar-ranked": "/data/fastfood-protein-per-dollar-2026.csv",
  "low-sodium-budget-foods-ranked": "/data/sodium-per-dollar-2026.csv",
  "breakfast-staples-per-dollar": "/data/breakfast-staples-per-dollar-2026.csv",
  "canned-beans-vs-dried-beans-nutrition": "/data/canned-vs-dry-beans-cost-2026.csv",
  "cheapest-complete-protein-pairs": "/data/cheapest-complete-protein-pairs-2026.csv",
  "eggs-vs-everything-protein-value": "/data/eggs-vs-everything-protein-value-2026.csv",
  "animal-protein-per-dollar-ranked": "/data/animal-protein-per-dollar-ranked-2026.csv",
  "beans-double-win-fiber-protein": "/data/beans-double-win-fiber-protein-2026.csv",
};

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

const MONTH_NUMBER = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sept: "09",
  sep: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

const MONTH_LABEL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_PATTERN =
  /\b(september|sept|january|february|october|november|december|august|april|march|june|july|may|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?(?:\s+\d{1,2})?,?\s+(20\d{2})\b/gi;

const DEPENDENT_FILES = new Set([
  "cheapest-complete-protein-pairs-2026.csv",
  "protein-quality-per-dollar-2026.csv",
  "fiber-day-cost-2026.csv",
  "protein-day-cost-2026.csv",
]);

export function emptyFacts() {
  return {
    priced_month: "",
    retailer: "",
    price_location: "",
    audit_note: "",
  };
}

export function monthsInText(text) {
  const found = new Set();
  for (const match of String(text ?? "").matchAll(MONTH_PATTERN)) {
    const month = MONTH_NUMBER[match[1].toLowerCase()];
    if (month) found.add(`${match[2]}-${month}`);
  }
  return [...found];
}

export function monthLabel(iso) {
  const [year, month] = String(iso).split("-");
  const name = MONTH_LABEL[Number(month) - 1];
  return name && year ? `${name} ${year}` : iso;
}

/** One month only. Two different months in one cell is not a single observation. */
export function pricedMonthFromText(text) {
  const months = monthsInText(text);
  return months.length === 1 ? months[0] : "";
}

export function retailerFromText(text) {
  const value = String(text ?? "").trim();
  if (/^BLS\b/i.test(value)) return "BLS";
  if (/^Walmart GV\b/i.test(value)) return "Walmart Great Value";
  if (/^Walmart deli\b/i.test(value)) return "Walmart deli";
  if (/^Walmart\b/i.test(value)) return "Walmart";
  if (/^McDonald's\b/.test(value)) return "McDonald's";
  if (/^Chipotle\b/.test(value)) return "Chipotle";
  if (/^Taco Bell\b/.test(value)) return "Taco Bell";
  if (/^Wendy's\b/.test(value)) return "Wendy's";
  if (/^KFC\b/.test(value)) return "KFC";
  if (/^Subway\b/.test(value)) return "Subway";
  if (/^Chick-fil-A\b/.test(value)) return "Chick-fil-A";
  return "";
}

/**
 * Location words that are actually in the cell. "US avg" is the BLS U.S.
 * average. "national" is kept only when the cell says it. A Walmart row
 * with no place word stays blank: the file never names a store or ZIP.
 */
export function locationFromText(text) {
  const value = String(text ?? "");
  if (/\bUS avg\b/i.test(value) || /\bU\.S\. city average\b/i.test(value)) {
    return "US average";
  }
  if (/\bnational\b/i.test(value)) return "national";
  return "";
}

export function auditNoteFromText(text) {
  const value = String(text ?? "");
  const notes = [];
  if (/fiber study, audited/i.test(value)) notes.push("fiber study, audited");
  for (const part of value.split(";").slice(1)) {
    const clause = part.trim().replace(/\.$/, "");
    if (!clause || /^a la carte\b/i.test(clause)) continue;
    if (
      /usda|refuse|label value|yield|estimate|vary|consensus|promo|weakest|add-on|value menu|observed range|corroborat|same row as/i.test(
        clause,
      )
    ) {
      notes.push(clause);
    }
  }
  return notes.join("; ");
}

export function factsFromPriceText(text) {
  return {
    priced_month: pricedMonthFromText(text),
    retailer: retailerFromText(text),
    price_location: locationFromText(text),
    audit_note: auditNoteFromText(text),
  };
}

export function normalizeFoodName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = String(text).replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const kept = rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
  const [header, ...body] = kept;
  return { header: header ?? [], rows: body };
}

export function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function serializeCsv(header, rows) {
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(header.map((_, index) => csvEscape(row[index] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function asRecord(header, row) {
  const record = {};
  header.forEach((name, index) => {
    record[name] = row[index] ?? "";
  });
  return record;
}

function pairFoods(basis) {
  const match = String(basis).match(
    /^50\/50 dollar split of audited rows: (.+?) (\d+\.\d+), (.+?) (\d+\.\d+)\s*$/,
  );
  return match ? [match[1], match[3]] : null;
}

function mergePairFacts(left, right) {
  const facts = emptyFacts();
  if (!left || !right) return facts;
  for (const field of ["priced_month", "price_location"]) {
    if (left[field] && left[field] === right[field]) facts[field] = left[field];
  }
  for (const field of ["retailer", "audit_note"]) {
    const a = left[field] || "";
    const b = right[field] || "";
    if (a && b) facts[field] = a === b ? a : `${a} + ${b}`;
  }
  return facts;
}

function lookupFacts(lookup, food) {
  return lookup.get(normalizeFoodName(food)) ?? null;
}

function directFacts(fileName, record) {
  if (fileName.startsWith("bls-nutrition-per-dollar")) {
    const date = String(record.date ?? "");
    return {
      priced_month: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : "",
      retailer: "BLS",
      price_location: String(record.area_name ?? "").trim(),
      audit_note: "",
    };
  }

  if (fileName.startsWith("fastfood-")) {
    const basis = record.price_basis ?? "";
    return {
      priced_month: pricedMonthFromText(basis),
      retailer: String(record.chain ?? "").trim(),
      price_location: locationFromText(basis),
      audit_note: auditNoteFromText(basis),
    };
  }

  const basis = record.price_basis || record.basis || "";
  if (/^parent CSV:/i.test(basis) || /^50\/50 dollar split/i.test(basis)) {
    return emptyFacts();
  }
  return factsFromPriceText(basis);
}

/**
 * Fill the four columns for every study CSV.
 * `tables` is `{ [fileName]: { header, rows } }` using the columns WITHOUT
 * the price columns. Returns the same shape with the four columns appended,
 * plus `unmatched` parent lookups that were left blank.
 */
export function annotateStudyTables(tables) {
  const annotated = new Map();
  const unmatched = [];

  for (const [fileName, table] of Object.entries(tables)) {
    if (DEPENDENT_FILES.has(fileName)) continue;
    annotated.set(fileName, annotateDirect(fileName, table));
  }

  const protein = foodIndex(annotated.get("protein-per-dollar-2026.csv"));
  const fiber = foodIndex(annotated.get("fiber-per-dollar-2026.csv"));

  for (const fileName of DEPENDENT_FILES) {
    const table = tables[fileName];
    if (!table) continue;
    annotated.set(
      fileName,
      annotateDependent(fileName, table, { protein, fiber, unmatched }),
    );
  }

  for (const [fileName, table] of Object.entries(tables)) {
    if (!annotated.has(fileName)) annotated.set(fileName, annotateDirect(fileName, table));
  }

  return { tables: Object.fromEntries(annotated), unmatched };
}

function annotateDirect(fileName, table) {
  const baseHeader = table.header.filter((name) => !PRICE_COLUMNS.includes(name));
  const header = [...baseHeader, ...PRICE_COLUMNS];
  const rows = table.rows.map((row) => {
    const record = asRecord(table.header, row);
    const facts = directFacts(fileName, record);
    return [
      ...baseHeader.map((name) => record[name] ?? ""),
      ...PRICE_COLUMNS.map((name) => facts[name]),
    ];
  });
  return { header, rows };
}

function baseCells(table, row) {
  const record = asRecord(table.header, row);
  const header = table.header.filter((name) => !PRICE_COLUMNS.includes(name));
  return { record, header, cells: header.map((name) => record[name] ?? "") };
}

function annotateDependent(fileName, table, context) {
  const header = [
    ...table.header.filter((name) => !PRICE_COLUMNS.includes(name)),
    ...PRICE_COLUMNS,
  ];
  const rows = table.rows.map((row) => {
    const { record, cells } = baseCells(table, row);
    const facts = dependentFacts(fileName, record, context);
    return [...cells, ...PRICE_COLUMNS.map((name) => facts[name])];
  });
  return { header, rows };
}

function dependentFacts(fileName, record, context) {
  if (fileName === "protein-quality-per-dollar-2026.csv") {
    const found = lookupFacts(context.protein, record.food);
    if (!found) {
      context.unmatched.push(`${fileName}: ${record.food}`);
      return emptyFacts();
    }
    return { ...found };
  }

  if (fileName === "cheapest-complete-protein-pairs-2026.csv") {
    const foods = pairFoods(record.price_basis ?? "");
    if (!foods) {
      context.unmatched.push(`${fileName}: ${record.food}`);
      return emptyFacts();
    }
    const left = lookupFacts(context.protein, foods[0]);
    const right = lookupFacts(context.protein, foods[1]);
    if (!left || !right) {
      context.unmatched.push(`${fileName}: ${record.food}`);
    }
    return mergePairFacts(left, right);
  }

  const basis = record.basis ?? "";
  const parentMatch = basis.match(/^parent CSV:\s*(.+)$/i);
  if (parentMatch) {
    const index = fileName.startsWith("fiber-") ? context.fiber : context.protein;
    const fallback = fileName.startsWith("fiber-") ? context.protein : context.fiber;
    const found = lookupFacts(index, parentMatch[1]) || lookupFacts(fallback, parentMatch[1]);
    if (!found) {
      context.unmatched.push(`${fileName}: ${parentMatch[1]}`);
      return emptyFacts();
    }
    return { ...found };
  }

  return factsFromPriceText(basis);
}

function foodIndex(table) {
  const map = new Map();
  if (!table) return map;
  const foodAt = table.header.indexOf("food");
  for (const row of table.rows) {
    const facts = {};
    for (const name of PRICE_COLUMNS) {
      facts[name] = row[table.header.indexOf(name)] ?? "";
    }
    map.set(normalizeFoodName(row[foodAt]), facts);
  }
  return map;
}

export function unitBasisSentence(header, rows) {
  const names = new Set(header);
  const basis = rows.map((row) => row[header.indexOf("price_basis")] ?? "").join("\n");
  if (names.has("diaas_score") && names.has("adjusted_g_per_dollar")) {
    return "Unit: adjusted grams per dollar = protein grams per dollar × DIAAS, capped at 1.";
  }
  if (names.has("chain") && names.has("price_usd")) {
    return "Unit: protein per dollar = the menu item's protein grams ÷ its recorded price.";
  }
  if (names.has("grams_used") && names.has("cost_usd")) {
    return "Unit: each cost applies the parent price to the grams used in that meal.";
  }
  if (/^50\/50 dollar split/m.test(basis)) {
    return "Unit: each score is a 50/50 dollar split of the two foods' recorded protein grams per dollar.";
  }
  if (
    names.has("package_price_usd") &&
    names.has("package_weight_g") &&
    names.has("edible_fraction")
  ) {
    return "Unit: price per 100 g = package price ÷ (package grams × edible fraction) × 100.";
  }
  if (names.has("package_price_usd") || names.has("price_usd") || names.has("cost_usd")) {
    return "Unit: grams per dollar come from the recorded package price.";
  }
  if (names.has("grams_per_priced_unit") && names.has("price_usd")) {
    return "Unit: price per 100 g = BLS average price ÷ edible grams in the priced unit × 100.";
  }
  return "";
}

function itemNoun(header, count) {
  const names = new Set(header);
  if (names.has("chain") && names.has("item")) {
    return count === 1 ? "menu item" : "menu items";
  }
  if (names.has("day") && names.has("meal")) {
    return count === 1 ? "meal row" : "meal rows";
  }
  return count === 1 ? "food" : "foods";
}

export function summarizePriceTable(header, rows) {
  const monthAt = header.indexOf("priced_month");
  const retailerAt = header.indexOf("retailer");
  const retailers = new Map();
  const months = new Map();
  let retailerRows = 0;
  let monthRows = 0;

  for (const row of rows) {
    const retailer = (row[retailerAt] ?? "").trim();
    const month = (row[monthAt] ?? "").trim();
    if (retailer) {
      retailerRows += 1;
      retailers.set(retailer, (retailers.get(retailer) ?? 0) + 1);
    }
    if (month) {
      monthRows += 1;
      months.set(month, (months.get(month) ?? 0) + 1);
    }
  }

  const monthList = [...months.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([iso, count]) => ({ iso, label: monthLabel(iso), count }));
  const distinctMonths = [...months.keys()].sort();

  return {
    itemCount: rows.length,
    itemNoun: itemNoun(header, rows.length),
    retailers: [...retailers.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count })),
    retailerRows,
    months: monthList,
    monthRows,
    unitBasis: unitBasisSentence(header, rows),
    temporalCoverage:
      monthRows === rows.length && rows.length > 0 && distinctMonths.length > 0
        ? distinctMonths.length === 1
          ? distinctMonths[0]
          : `${distinctMonths[0]}/${distinctMonths[distinctMonths.length - 1]}`
        : "",
  };
}

export function priceBasisParts(summary) {
  const parts = [`${summary.itemCount} ${summary.itemNoun}.`];
  if (summary.retailers.length) {
    const mix = summary.retailers.map((item) => `${item.name} (${item.count})`).join(", ");
    const qualifier = summary.retailerRows < summary.itemCount ? ", on rows that record one" : "";
    parts.push(`Retailers${qualifier}: ${mix}.`);
  }
  if (summary.months.length) {
    const mix = summary.months.map((item) => `${item.label} (${item.count})`).join(", ");
    const qualifier = summary.monthRows < summary.itemCount ? ", on rows that record one" : "";
    parts.push(`Price month${qualifier}: ${mix}.`);
  }
  if (summary.unitBasis) parts.push(summary.unitBasis);
  return parts;
}

export function priceBasisWordCount(summary) {
  const text = [
    "How we priced this",
    ...priceBasisParts(summary),
    "CSV",
    "Methodology",
    "Corrections",
    "Dataset catalog",
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function readStudyTable(csvHref) {
  const fileName = csvHref.split("/").pop();
  const parsed = parseCsv(readFileSync(join(ROOT, "public", "data", fileName), "utf8"));
  return parsed;
}

export function summaryForStudy(slug) {
  const csvHref = GROCERY_STUDY_PAGES[slug];
  if (!csvHref) return null;
  const table = readStudyTable(csvHref);
  return {
    csvHref,
    ...summarizePriceTable(table.header, table.rows),
  };
}

export function isGroceryStudySlug(slug) {
  return Object.prototype.hasOwnProperty.call(GROCERY_STUDY_PAGES, slug);
}
