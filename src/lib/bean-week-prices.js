/**
 * July 2026 bean package prices for the week planner.
 * Rows come from the protein-per-dollar study CSV, which records package
 * weight. The canned-vs-dry file carries the same package prices without grams.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseCsv } from "../content/price-basis.mjs";
import { pricePerPound } from "./bean-week-math.js";

export const PROTEIN_PRICE_CSV = "public/data/protein-per-dollar-2026.csv";
export const CANNED_VS_DRY_CSV = "public/data/canned-vs-dry-beans-cost-2026.csv";

export const BEAN_WEEK_FOODS = {
  pinto: "Pinto beans (dry)",
  black: "Black beans (dry)",
  brownLentils: "Brown lentils (dry)",
  redLentils: "Red lentils (dry)",
  cannedBlack: "Canned black beans",
};

function record(header, row) {
  const out = {};
  header.forEach((name, index) => {
    out[name] = row[index] ?? "";
  });
  return out;
}

export function loadBeanWeekPrices(root = process.cwd()) {
  const parsed = parseCsv(readFileSync(join(root, PROTEIN_PRICE_CSV), "utf8"));
  const byFood = new Map(
    parsed.rows.map((row) => {
      const item = record(parsed.header, row);
      return [item.food, item];
    }),
  );
  const prices = {};
  for (const [key, food] of Object.entries(BEAN_WEEK_FOODS)) {
    const item = byFood.get(food);
    if (!item) throw new Error(`bean week prices: missing ${food}`);
    const packagePrice = Number(item.package_price_usd);
    const packageGrams = Number(item.package_weight_g);
    prices[key] = {
      key,
      food,
      packageLabel: item.package,
      packagePrice,
      packageGrams,
      priceBasis: item.price_basis,
      pricedMonth: item.priced_month,
      retailer: item.retailer,
      fdcId: item.fdc_id,
      perPound: pricePerPound(packagePrice, packageGrams),
    };
  }
  return prices;
}
