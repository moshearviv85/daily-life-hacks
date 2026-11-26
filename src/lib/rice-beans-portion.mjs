/**
 * Rice-and-beans portions from the published bag prices.
 * Dry yield is the Bean Institute figure already used on the week page:
 * 1 pound is 2 cups dry and about 6 cups cooked. A 15.5 oz can is 1.5 cups
 * drained. Rice cups use the 185 g cup on the beans-and-rice recipe.
 * Rice water is 2 cups per cup of dry brown rice, the ratio behind the
 * 250 g pot that the split-pea curry cooks in 2 3/4 cups of water.
 * The cook page never gives bean simmer water in cups, so this file doesn't either.
 */
import { readDataCsv, money } from "./produce-grain-fiber-index.mjs";

export const BEAN_COST_FILE = "canned-vs-dry-beans-cost-2026.csv";
export const BEAN_FIBER_FILE = "beans-double-win-fiber-protein-2026.csv";
export const PAIRS_FILE = "cheapest-complete-protein-pairs-2026.csv";
export const PANTRY_FILE = "shelf-stable-pantry-per-dollar-2026.csv";
export const PROTEIN_FILE = "protein-per-dollar-2026.csv";
export const FIBER_FILE = "fiber-per-dollar-2026.csv";

export const RICE_FOOD = "Brown rice (dry)";
export const RICE_CUP_GRAMS = 185;
export const RICE_WATER_CUPS_PER_CUP = 2;
export const POUND_GRAMS = 454;
export const DRY_CUPS_PER_POUND = 2;
export const COOKED_CUPS_PER_POUND = 6;
export const DRAINED_CUPS_PER_CAN = 1.5;
export const DRY_CUP_GRAMS = POUND_GRAMS / DRY_CUPS_PER_POUND;

export const PRESETS = [
  {
    id: "dinner",
    label: "Audited dinner plate",
    beanGrams: 90,
    riceGrams: 60,
  },
  {
    id: "full-day",
    label: "Full-day 2 to 1 basket",
    beanGrams: 200,
    riceGrams: 400,
  },
];

export const LIMITS = { peopleMin: 1, peopleMax: 50, daysMin: 1, daysMax: 14 };

const CAN_BY_DRY = {
  "Black beans (dry)": "Canned black beans",
  "Chickpeas (dry)": "Canned chickpeas",
};

function must(rows, food, fileName) {
  const row = rows.find((item) => item.food === food);
  if (!row) throw new Error(`Missing ${food} in ${fileName}`);
  return row;
}

function num(row, key) {
  const value = Number(row[key]);
  if (!Number.isFinite(value)) throw new Error(`Bad ${key} for ${row.food}`);
  return value;
}

export function clampCount(value, min, max, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function oneDecimal(value) {
  return (Math.round((value + Number.EPSILON) * 10) / 10).toFixed(1);
}

export function loadRiceBeansModel(root = process.cwd()) {
  const costs = readDataCsv(root, BEAN_COST_FILE);
  const fibers = readDataCsv(root, BEAN_FIBER_FILE);
  const pairs = readDataCsv(root, PAIRS_FILE);
  const pantry = readDataCsv(root, PANTRY_FILE);
  const protein = readDataCsv(root, PROTEIN_FILE);
  const fiber = readDataCsv(root, FIBER_FILE);
  if (costs.length !== 10) throw new Error(`expected 10 bean cost rows, got ${costs.length}`);
  if (fibers.length !== 10) throw new Error(`expected 10 bean fiber rows, got ${fibers.length}`);

  const rice = must(pantry, RICE_FOOD, PANTRY_FILE);
  const riceProtein = must(protein, RICE_FOOD, PROTEIN_FILE);
  const riceFiber = must(fiber, RICE_FOOD, FIBER_FILE);
  const riceModel = {
    food: RICE_FOOD,
    proteinPerDollar: num(rice, "value"),
    proteinPerDollarLabel: rice.value,
    fiberPerDollar: num(riceFiber, "fiber_g_per_dollar"),
    fiberPerDollarLabel: riceFiber.fiber_g_per_dollar,
    proteinPer100: num(riceProtein, "protein_g_per_100g"),
    fiberPer100: num(riceFiber, "fiber_g_per_100g"),
    packagePrice: num(rice, "package_price_usd"),
    packageGrams: num(riceProtein, "package_weight_g"),
    package: rice.package,
    fdcId: rice.fdc_id,
  };
  if (riceModel.proteinPerDollar !== 36.6) throw new Error("brown rice protein rate moved");
  if (riceModel.fiberPerDollar !== 17.5) throw new Error("brown rice fiber rate moved");

  const ricePairs = pairs.filter((row) => row.food.endsWith(` + ${RICE_FOOD}`));
  if (ricePairs.length !== 5) throw new Error(`expected 5 brown-rice pairs, got ${ricePairs.length}`);

  const beans = ricePairs.map((pair) => {
    const food = pair.food.slice(0, -(` + ${RICE_FOOD}`).length);
    const cost = must(costs, food, BEAN_COST_FILE);
    const fiberRow = must(fibers, food, BEAN_FIBER_FILE);
    const proteinRow = must(protein, food, PROTEIN_FILE);
    const pantryRow = must(pantry, food, PANTRY_FILE);
    if (cost.value !== pantryRow.value) {
      throw new Error(`${food} protein rate disagrees across files`);
    }
    if (cost.package_price_usd !== pantryRow.package_price_usd) {
      throw new Error(`${food} package price disagrees across files`);
    }
    const canFood = CAN_BY_DRY[food] ?? "";
    const can = canFood ? must(costs, canFood, BEAN_COST_FILE) : null;
    return {
      food,
      pairRate: num(pair, "value"),
      pairRateLabel: pair.value,
      proteinPerDollar: num(cost, "value"),
      proteinPerDollarLabel: cost.value,
      fiberPerDollar: num(fiberRow, "fiber_g_per_dollar"),
      fiberPerDollarLabel: fiberRow.fiber_g_per_dollar,
      proteinPer100: num(proteinRow, "protein_g_per_100g"),
      fiberPer100: num(must(fiber, food, FIBER_FILE), "fiber_g_per_100g"),
      packagePrice: num(cost, "package_price_usd"),
      packageGrams: num(proteinRow, "package_weight_g"),
      package: cost.package,
      fdcId: cost.fdc_id,
      canFood,
      canPrice: can ? num(can, "package_price_usd") : null,
      canPackage: can ? can.package : "",
    };
  });

  return { rice: riceModel, beans };
}

export function presetById(id) {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

export function quoteRiceBeans(model, input) {
  const people = clampCount(input.people, LIMITS.peopleMin, LIMITS.peopleMax, 4);
  const days = clampCount(input.days, LIMITS.daysMin, LIMITS.daysMax, 7);
  const preset = presetById(input.presetId);
  const bean = model.beans.find((item) => item.food === input.beanFood) ?? model.beans.find((item) => item.food === "Pinto beans (dry)");
  if (!bean) throw new Error("no bean rows");
  const meals = people * days;
  const beanGrams = preset.beanGrams * meals;
  const riceGrams = preset.riceGrams * meals;
  const beanCost = (beanGrams * bean.packagePrice) / bean.packageGrams;
  const riceCost = (riceGrams * model.rice.packagePrice) / model.rice.packageGrams;
  const proteinPerPerson = (preset.beanGrams * bean.proteinPer100) / 100 + (preset.riceGrams * model.rice.proteinPer100) / 100;
  const fiberPerPerson = (preset.beanGrams * bean.fiberPer100) / 100 + (preset.riceGrams * model.rice.fiberPer100) / 100;
  const dryCups = beanGrams / DRY_CUP_GRAMS;
  const cookedCups = (beanGrams / POUND_GRAMS) * COOKED_CUPS_PER_POUND;
  const cans = cookedCups / DRAINED_CUPS_PER_CAN;
  const shopCans = Math.ceil(cans - 1e-9);
  const riceCups = riceGrams / RICE_CUP_GRAMS;
  const riceWaterCups = riceCups * RICE_WATER_CUPS_PER_CUP;
  return {
    people,
    days,
    preset,
    bean,
    meals,
    beanGrams,
    riceGrams,
    beanCost,
    riceCost,
    batchCost: beanCost + riceCost,
    proteinPerPerson,
    fiberPerPerson,
    batchProtein: proteinPerPerson * meals,
    batchFiber: fiberPerPerson * meals,
    dryCups,
    cookedCups,
    cans,
    shopCans,
    canCost: bean.canPrice == null ? null : cans * bean.canPrice,
    shopCanCost: bean.canPrice == null ? null : shopCans * bean.canPrice,
    riceCups,
    riceWaterCups,
    pounds: beanGrams / POUND_GRAMS,
  };
}

export function chartPlates(model) {
  return model.beans.map((bean) => {
    const plate = quoteRiceBeans(model, {
      people: 1,
      days: 1,
      presetId: "dinner",
      beanFood: bean.food,
    });
    return {
      food: bean.food,
      pairRate: bean.pairRate,
      cost: plate.batchCost,
      protein: plate.proteinPerPerson,
    };
  });
}

export function resultNote(priced) {
  const water = `Rice water is ${oneDecimal(priced.riceWaterCups)} cups, at 2 cups per cup of dry brown rice.`;
  const cover = "The cook page covers soaked beans with fresh water a few inches above the beans. It never gives that cover in cups, so this page doesn't invent one.";
  if (priced.bean.canPrice == null) {
    return `${water} ${cover} ${priced.bean.food} has no canned price in the file. The yield is still ${oneDecimal(priced.cans)} cans, and the shop count rounds up to ${priced.shopCans}.`;
  }
  return `${water} ${cover} ${priced.bean.canFood} are ${money(priced.bean.canPrice)} each. ${oneDecimal(priced.cans)} cans is ${money(priced.canCost)}. ${priced.shopCans} cans, the rounded shop count, is ${money(priced.shopCanCost)}.`;
}

export { money };
