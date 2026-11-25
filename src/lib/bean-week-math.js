/**
 * Family-week dried-bean planner.
 *
 * Yield, stated by the Bean Institute chart and by Nebraska Extension:
 *   1 pound dry = 2 cups dry = about 6 cups cooked.
 * The planner divides cooked cups by 6 for pounds and treats that pound as
 * 2 cups dry. Both sources call the cooked yield "about 6 cups."
 *
 * Can count is two published charts, not one invented average.
 *   This site's kitchen measure: 1 1/2 cups drained per 15.5 oz can, rounded up.
 *   Bean Institute and UNL: 1 3/4 cups cooked per 15-oz can.
 *
 * Prices are package price divided by package grams, times 453.59237 grams
 * per pound. Nothing here stores a price. Callers pass rows from the study CSV.
 */

import { formatCups } from "./bean-crowd-math.js";

export const CUPS_COOKED_PER_POUND = 6;
export const DRY_CUPS_PER_POUND = 2;
export const CUPS_COOKED_PER_CAN = 1.5;
export const BEAN_INSTITUTE_CUPS_PER_CAN = 1.75;
export const GRAMS_PER_POUND = 453.59237;

export const BEAN_INSTITUTE_YIELD_URL =
  "https://beaninstitute.com/resources/cook-with-beans/dry-vs-canned/";
export const UNL_YIELD_URL = "https://food.unl.edu/article/how-cook-dry-beans-scratch/";

export const DEFAULT_PEOPLE = 4;
export const DEFAULT_DAYS = 7;
export const DEFAULT_CUPS = 0.5;
export const HOUSEHOLD_SIZES = [2, 4, 6];

export const DEFAULT_PLAN_INPUT = {
  people: DEFAULT_PEOPLE,
  days: DEFAULT_DAYS,
  cupsPerPersonPerDay: DEFAULT_CUPS,
};

function shopCans(exact) {
  return Math.ceil(exact - 1e-9);
}

export function weekPlan({ people, days, cupsPerPersonPerDay }) {
  if (!Number.isFinite(people) || people <= 0) return null;
  if (!Number.isFinite(days) || days <= 0) return null;
  if (!Number.isFinite(cupsPerPersonPerDay) || cupsPerPersonPerDay <= 0) return null;
  const cookedCups = people * days * cupsPerPersonPerDay;
  const dryLb = cookedCups / CUPS_COOKED_PER_POUND;
  const exactCansKitchen = cookedCups / CUPS_COOKED_PER_CAN;
  const exactCansInstitute = cookedCups / BEAN_INSTITUTE_CUPS_PER_CAN;
  return {
    people,
    days,
    cupsPerPersonPerDay,
    cookedCups,
    dryLb,
    dryCups: dryLb * DRY_CUPS_PER_POUND,
    exactCansKitchen,
    shopCansKitchen: shopCans(exactCansKitchen),
    exactCansInstitute,
    shopCansInstitute: shopCans(exactCansInstitute),
  };
}

export function pricePerPound(packagePrice, packageGrams) {
  if (!Number.isFinite(packagePrice) || !Number.isFinite(packageGrams) || packageGrams <= 0) {
    return null;
  }
  return (packagePrice / packageGrams) * GRAMS_PER_POUND;
}

export function roundCents(amount) {
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100 + 1e-8) / 100;
}

export function formatMoney(amount) {
  const cents = roundCents(amount);
  if (cents === null) return "";
  return `$${cents.toFixed(2)}`;
}

export function formatPounds(lb) {
  return `${formatCups(lb)} lb`;
}

export function cupsPhrase(n) {
  const label = formatCups(n);
  return `${label} ${n > 1 ? "cups" : "cup"}`;
}

export function dryCost(dryLb, food) {
  const perPound = pricePerPound(food.packagePrice, food.packageGrams);
  if (perPound === null) return null;
  return dryLb * perPound;
}

export function canCost(cans, food) {
  if (!Number.isFinite(cans) || !Number.isFinite(food?.packagePrice)) return null;
  return cans * food.packagePrice;
}

const DRY_KEYS = ["pinto", "black", "brownLentils", "redLentils"];

export function priceWeek(plan, prices) {
  if (!plan) return null;
  const dry = {};
  for (const key of DRY_KEYS) {
    dry[key] = dryCost(plan.dryLb, prices[key]);
  }
  return {
    ...plan,
    poundsLabel: formatPounds(plan.dryLb),
    cookedLabel: cupsPhrase(plan.cookedCups),
    dryCupsLabel: cupsPhrase(plan.dryCups),
    dry,
    cannedKitchen: canCost(plan.shopCansKitchen, prices.cannedBlack),
    cannedInstitute: canCost(plan.shopCansInstitute, prices.cannedBlack),
  };
}

export function householdWeeks(prices, cupsPerPersonPerDay = DEFAULT_CUPS, days = DEFAULT_DAYS) {
  return HOUSEHOLD_SIZES.map((people) =>
    priceWeek(weekPlan({ people, days, cupsPerPersonPerDay }), prices),
  );
}

export function describeWeek(priced, prices) {
  if (!priced) return null;
  const each = cupsPhrase(priced.cupsPerPersonPerDay);
  return {
    summary: `${priced.people} people for ${priced.days} days at ${each} cooked is ${priced.cookedLabel} cooked.`,
    pounds: priced.poundsLabel,
    dryCups: priced.dryCupsLabel,
    cansKitchen: String(priced.shopCansKitchen),
    cansInstitute: String(priced.shopCansInstitute),
    cost: `Pinto ${formatMoney(priced.dry.pinto)}. Black beans ${formatMoney(priced.dry.black)}. Brown lentils ${formatMoney(priced.dry.brownLentils)}. Red lentils ${formatMoney(priced.dry.redLentils)}.`,
    canned: `Canned black beans cost ${formatMoney(priced.cannedKitchen)} at ${priced.shopCansKitchen} cans, or ${formatMoney(priced.cannedInstitute)} at ${priced.shopCansInstitute} cans. The can in the study is ${formatMoney(prices.cannedBlack.packagePrice)}.`,
  };
}
