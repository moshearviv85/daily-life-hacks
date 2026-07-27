#!/usr/bin/env node
/**
 * Closing the American fiber gap: what does it cost?
 *
 * Most US adults eat somewhere around 16 g of fiber a day. The FDA Daily Value
 * is 28 g. That leaves a gap of about 12 g. This script uses the Fiber per
 * Dollar Index to work out the cheapest single foods that close it, then checks
 * that answer against the fully costed day-menus in the daily-cost dataset to
 * see whether a realistic day of eating lands anywhere near the theoretical floor.
 *
 * Reads from this repo:
 *   data/fiber-per-dollar-2026.csv - 53 foods, grams of fiber per dollar
 *   data/fiber-day-cost-2026.csv   - 27 costed meals across several full days
 *
 * No dependencies. Node 18+. Run from anywhere:
 *     node examples/fiber_gap.mjs
 *
 * Data: Daily Life Hacks Food Value Data - https://www.daily-life-hacks.com/data/
 * Methodology: https://www.daily-life-hacks.com/methodology/
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

const TYPICAL_INTAKE_G = 16; // approximate US adult average
const DAILY_VALUE_G = 28; // FDA Daily Value for dietary fiber
const GAP_G = DAILY_VALUE_G - TYPICAL_INTAKE_G;

/** Minimal RFC4180-ish CSV parser: handles quoted fields containing commas. */
function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows
    .filter((r) => r.length === header.length && r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const load = (f) => parseCsv(readFileSync(join(DATA, f), "utf8"));
const usd = (n) => `$${n.toFixed(2)}`;

const index = load("fiber-per-dollar-2026.csv");
const dayCost = load("fiber-day-cost-2026.csv");

console.log("Closing the fiber gap: 16 g typical intake -> 28 g Daily Value");
console.log(`Gap to close: ${GAP_G} g of fiber per day`);
console.log("US national prices, July 2026, as-purchased with USDA refuse removed");
console.log("=".repeat(74));

// ---- 1. Cheapest single foods that close the gap --------------------------------
const ranked = index
  .map((r) => ({
    food: r.food,
    category: r.category,
    gPerDollar: Number(r.fiber_g_per_dollar),
    per100g: Number(r.fiber_g_per_100g),
    basis: r.price_basis,
  }))
  .filter((r) => Number.isFinite(r.gPerDollar) && r.gPerDollar > 0)
  .sort((a, b) => b.gPerDollar - a.gPerDollar);

console.log(`\nCHEAPEST 10 WAYS TO BUY ${GAP_G} g OF FIBER (of ${ranked.length} foods indexed)\n`);
console.log(
  "#".padStart(2) + "  " + "Food".padEnd(30) + "g/$".padStart(7) +
  `${GAP_G}g cost`.padStart(10) + "  grams needed"
);
console.log("-".repeat(74));
for (const [i, r] of ranked.slice(0, 10).entries()) {
  const cost = GAP_G / r.gPerDollar;
  const gramsNeeded = (GAP_G / r.per100g) * 100;
  console.log(
    String(i + 1).padStart(2) + ". " + r.food.padEnd(30) +
    r.gPerDollar.toFixed(1).padStart(7) + usd(cost).padStart(10) +
    "  " + `${Math.round(gramsNeeded)} g`
  );
}

// ---- 2. Cost of the gap by grocery category -------------------------------------
const byCategory = new Map();
for (const r of ranked) {
  const best = byCategory.get(r.category);
  if (!best || r.gPerDollar > best.gPerDollar) byCategory.set(r.category, r);
}
const categories = [...byCategory.values()].sort((a, b) => b.gPerDollar - a.gPerDollar);

console.log(`\n\nBEST OPTION IN EACH AISLE (${categories.length} categories)\n`);
console.log("Category".padEnd(26) + "Best food".padEnd(28) + `${GAP_G}g cost`.padStart(10));
console.log("-".repeat(74));
for (const r of categories) {
  console.log(
    r.category.padEnd(26) + r.food.slice(0, 26).padEnd(28) +
    usd(GAP_G / r.gPerDollar).padStart(10)
  );
}

// ---- 3. Sanity-check against fully costed days ----------------------------------
const days = new Map();
for (const r of dayCost) {
  const d = days.get(r.day) ?? { fiber: 0, cost: 0, meals: 0 };
  d.fiber += Number(r.fiber_g) || 0;
  d.cost += Number(r.cost_usd) || 0;
  d.meals += 1;
  days.set(r.day, d);
}

console.log("\n\nREALITY CHECK: FULLY COSTED DAYS FROM data/fiber-day-cost-2026.csv\n");
console.log("Day".padEnd(38) + "meals".padStart(6) + "fiber g".padStart(9) + "cost".padStart(9));
console.log("-".repeat(74));
for (const [day, d] of days) {
  console.log(
    day.slice(0, 36).padEnd(38) + String(d.meals).padStart(6) +
    d.fiber.toFixed(1).padStart(9) + usd(d.cost).padStart(9)
  );
}

const cheapestDay = [...days.entries()].sort((a, b) => a[1].cost - b[1].cost)[0];
const theoretical = GAP_G / ranked[0].gPerDollar;

console.log("\n" + "=".repeat(74));
console.log(
  `Theoretical floor: ${usd(theoretical)} of ${ranked[0].food} covers the ${GAP_G} g gap.`
);
console.log(
  `Cheapest full day in the data: ${cheapestDay[0]} at ${usd(cheapestDay[1].cost)} ` +
  `for ${cheapestDay[1].fiber.toFixed(1)} g of fiber.`
);
console.log(
  `That day beats the ${DAILY_VALUE_G} g Daily Value: ` +
  `${cheapestDay[1].fiber >= DAILY_VALUE_G ? "yes" : "no"}.`
);
console.log("\nSource: Daily Life Hacks Food Value Data (2026.1)");
console.log("Study:  https://www.daily-life-hacks.com/fiber-per-dollar-cheapest-high-fiber-foods/");
console.log("Terms:  https://www.daily-life-hacks.com/methodology/#data-license");
