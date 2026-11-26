/**
 * 33-row produce and whole-grain fiber index.
 * Rows come from the published ranked CSVs. Nothing here invents a price.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseCsv } from "../content/price-basis.mjs";

export const PRODUCE_FILE = "produce-fiber-per-dollar-ranked-2026.csv";
export const GRAINS_FILE = "grains-fiber-per-dollar-ranked-2026.csv";
export const DAY_COST_FILE = "fiber-day-cost-2026.csv";

export const FORMATS = [
  { id: "all", label: "All rows" },
  { id: "whole-grains", label: "Whole grains" },
  { id: "fresh-produce", label: "Fresh produce" },
  { id: "frozen-vegetables", label: "Frozen vegetables" },
  { id: "dried-fruit", label: "Dried fruit" },
];

const FORMAT_LABEL = {
  "whole-grains": "Whole grains",
  "fresh-produce": "Fresh produce",
  "frozen-vegetables": "Frozen vegetables",
  "dried-fruit": "Dried fruit",
};

export function readDataCsv(root, fileName) {
  const text = readFileSync(join(root, "public/data", fileName), "utf8");
  const { header, rows } = parseCsv(text);
  return rows.map((cells) => {
    const record = {};
    header.forEach((key, index) => {
      record[key] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

export function formatIdForCategory(category) {
  if (category === "Whole grains") return "whole-grains";
  if (category === "Frozen vegetables") return "frozen-vegetables";
  if (category === "Fresh vegetables" || category === "Fresh fruit") return "fresh-produce";
  return "other";
}

function toRow(record, sourceFile) {
  return {
    food: record.food,
    category: record.category,
    format: formatIdForCategory(record.category),
    formatLabel: FORMAT_LABEL[formatIdForCategory(record.category)] ?? record.category,
    fiberPerDollar: Number(record.value),
    fiberLabel: record.value,
    package: record.package,
    packagePrice: Number(record.package_price_usd),
    priceLabel: record.package_price_usd,
    fdcId: record.fdc_id,
    retailer: record.retailer,
    sourceFile,
  };
}

export function loadFiberIndex(root = process.cwd()) {
  const produce = readDataCsv(root, PRODUCE_FILE).map((row) => toRow(row, PRODUCE_FILE));
  const grains = readDataCsv(root, GRAINS_FILE).map((row) => toRow(row, GRAINS_FILE));
  if (produce.length !== 22) {
    throw new Error(`expected 22 produce rows, found ${produce.length}`);
  }
  if (grains.length !== 11) {
    throw new Error(`expected 11 grain rows, found ${grains.length}`);
  }
  const rows = [...produce, ...grains].sort((a, b) => b.fiberPerDollar - a.fiberPerDollar);
  if (rows.length !== 33) {
    throw new Error(`expected 33 fiber rows, found ${rows.length}`);
  }
  if (rows.some((row) => row.format === "dried-fruit")) {
    throw new Error("dried fruit showed up in the ranked files; the empty filter would be a lie");
  }
  return rows;
}

export function fiberDaySummaries(root = process.cwd()) {
  const rows = readDataCsv(root, DAY_COST_FILE);
  const days = new Map();
  for (const row of rows) {
    const entry = days.get(row.day) ?? { day: row.day, fiber: 0, cost: 0, meals: 0 };
    entry.fiber += Number(row.fiber_g) || 0;
    entry.cost += Number(row.cost_usd) || 0;
    entry.meals += 1;
    days.set(row.day, entry);
  }
  return [...days.values()].map((entry) => ({
    day: entry.day,
    meals: entry.meals,
    fiber: Math.round(entry.fiber * 10) / 10,
    cost: Math.round(entry.cost * 100) / 100,
  }));
}

/** Top foods in each chart group. Ranked files only. Popcorn stays if it places. */
export function chartGroups(rows) {
  const groups = [
    ["Whole grains", "Whole grains"],
    ["Fresh vegetables", "Fresh vegetables"],
    ["Frozen vegetables", "Frozen vegetables"],
    ["Fresh fruit", "Fresh fruit"],
  ];
  return groups.map(([label, category]) => {
    const foods = rows
      .filter((row) => row.category === category)
      .sort((a, b) => b.fiberPerDollar - a.fiberPerDollar)
      .slice(0, 3);
    if (foods.length !== 3) {
      throw new Error(`expected 3 foods for ${label}, found ${foods.length}`);
    }
    return { label, foods };
  });
}

export function money(amount) {
  const cents = Math.round((amount + Number.EPSILON) * 100);
  return `$${(cents / 100).toFixed(2)}`;
}
