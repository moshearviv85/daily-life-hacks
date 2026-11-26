/**
 * Dry beans, canned beans, and the rest of the shelf-stable pantry.
 * Protein per dollar and the package price come from the pantry file.
 * The bean files confirm those 10 rows and add fiber per dollar.
 * Fiber for the other cupboard foods comes from the fiber file, by FDC id.
 * Sodium milligrams per 100 g come from the sodium file, by FDC id.
 * A missing cell stays blank. This file does not borrow a neighboring price.
 */
import { readDataCsv, money } from "./produce-grain-fiber-index.mjs";

export const PANTRY_FILE = "shelf-stable-pantry-per-dollar-2026.csv";
export const BEAN_COST_FILE = "canned-vs-dry-beans-cost-2026.csv";
export const BEAN_FIBER_FILE = "beans-double-win-fiber-protein-2026.csv";
export const FIBER_FILE = "fiber-per-dollar-2026.csv";
export const SODIUM_FILE = "sodium-per-dollar-2026.csv";
export const PROTEIN_FILE = "protein-per-dollar-2026.csv";

export const HALF_CUP_COOKED_GRAMS = 454 / 12;

export const FORMATS = ["Dry", "Canned", "Shelf-stable"];

const FORMAT_BY_CATEGORY = {
  "Dried beans & lentils": "Dry",
  "Canned beans": "Canned",
};

function num(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function byFood(rows) {
  return new Map(rows.map((row) => [row.food, row]));
}

function byFdc(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.fdc_id) map.set(row.fdc_id, row);
  }
  return map;
}

export function servingCost(format, packagePrice, packageGrams) {
  if (format === "Dry") return (packagePrice * HALF_CUP_COOKED_GRAMS) / packageGrams;
  if (format === "Canned") return packagePrice / 3;
  return (packagePrice * 100) / packageGrams;
}

export function servingLabel(format) {
  if (format === "Dry") return "1/2 cup cooked";
  if (format === "Canned") return "1/2 cup from the can";
  return "100 g";
}

export function loadPantryCostIndex(root = process.cwd()) {
  const pantry = readDataCsv(root, PANTRY_FILE);
  const costs = readDataCsv(root, BEAN_COST_FILE);
  const fibers = readDataCsv(root, BEAN_FIBER_FILE);
  const fiberFile = readDataCsv(root, FIBER_FILE);
  const sodiumFile = readDataCsv(root, SODIUM_FILE);
  const proteinFile = readDataCsv(root, PROTEIN_FILE);
  if (pantry.length !== 27) throw new Error(`expected 27 pantry rows, got ${pantry.length}`);
  if (costs.length !== 10) throw new Error(`expected 10 bean cost rows, got ${costs.length}`);
  if (fibers.length !== 10) throw new Error(`expected 10 bean fiber rows, got ${fibers.length}`);

  const costByFood = byFood(costs);
  const fiberByFood = byFood(fibers);
  const fiberByFdc = byFdc(fiberFile);
  const sodiumByFdc = byFdc(sodiumFile);
  const proteinByFdc = byFdc(proteinFile);

  const rows = pantry.map((row) => {
    const format = FORMAT_BY_CATEGORY[row.category] ?? "Shelf-stable";
    if (!FORMATS.includes(format)) throw new Error(`bad format for ${row.food}`);
    const proteinPerDollar = num(row.value);
    const packagePrice = num(row.package_price_usd);
    const weight = proteinByFdc.get(row.fdc_id);
    const packageGrams = weight ? num(weight.package_weight_g) : null;
    if (proteinPerDollar == null || packagePrice == null || packageGrams == null) {
      throw new Error(`incomplete pantry row ${row.food}`);
    }
    const beanCost = costByFood.get(row.food);
    const beanFiber = fiberByFood.get(row.food);
    if (format !== "Shelf-stable") {
      if (!beanCost || beanCost.value !== row.value) {
        throw new Error(`${row.food} is missing from the bean cost file`);
      }
      if (!beanFiber) throw new Error(`${row.food} is missing from the bean fiber file`);
    }
    const fiberRow = beanFiber ?? fiberByFdc.get(row.fdc_id);
    const fiberPerDollar = fiberRow
      ? num(fiberRow.fiber_g_per_dollar ?? fiberRow.value)
      : null;
    const sodiumRow = sodiumByFdc.get(row.fdc_id);
    const sodium = sodiumRow ? num(sodiumRow.sodium_mg_per_100g) : null;
    const cost = servingCost(format, packagePrice, packageGrams);
    const fiberLabel = beanFiber
      ? beanFiber.fiber_g_per_dollar
      : fiberRow
        ? fiberRow.fiber_g_per_dollar
        : "";
    return {
      food: row.food,
      category: row.category,
      format,
      proteinPerDollar,
      proteinLabel: row.value,
      fiberPerDollar,
      fiberLabel,
      sodium,
      sodiumLabel: sodiumRow ? sodiumRow.sodium_mg_per_100g : "",
      packagePrice,
      package: row.package,
      packageGrams,
      fdcId: row.fdc_id,
      servingCost: cost,
      serving: servingLabel(format),
      fiberSource: beanFiber ? BEAN_FIBER_FILE : fiberPerDollar == null ? "" : FIBER_FILE,
    };
  });

  const counts = {
    all: rows.length,
    dry: rows.filter((row) => row.format === "Dry").length,
    canned: rows.filter((row) => row.format === "Canned").length,
    shelf: rows.filter((row) => row.format === "Shelf-stable").length,
  };
  if (counts.dry !== 7 || counts.canned !== 3 || counts.shelf !== 17) {
    throw new Error(`unexpected format counts ${JSON.stringify(counts)}`);
  }
  return rows;
}

export function comparisonPairs(rows) {
  const foods = new Map(rows.map((row) => [row.food, row]));
  const specs = [
    ["Black beans (dry)", "Canned black beans"],
    ["Chickpeas (dry)", "Canned chickpeas"],
  ];
  return specs.map(([dryName, canName]) => {
    const dry = foods.get(dryName);
    const can = foods.get(canName);
    if (!dry || !can) throw new Error(`missing comparison ${dryName}`);
    return { dry, can };
  });
}

export function chartComparison(rows) {
  return comparisonPairs(rows).map((pair) => ({
    label: pair.dry.food.replace(" (dry)", ""),
    dryProtein: pair.dry.proteinPerDollar,
    cannedProtein: pair.can.proteinPerDollar,
  }));
}

export { money };
