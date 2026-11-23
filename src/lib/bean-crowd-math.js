/**
 * Tested kitchen yield for a 15.5 oz can, plus a crowd count.
 *
 * Headline yield, from Milk Street's dried-vs-canned test of 11 varieties:
 *   1 can (15.5 oz) ≈ 1/2 cup dry ≈ 90-100 g dry ≈ 1 1/2 cups cooked, drained.
 * https://www.177milkstreet.com/stories/bean-counting-dried-vs-canned
 *
 * Crowd cans are rounded up so a pot for N people doesn't come up short.
 * Dry weight is the 90-100 g band for that many cans, not the protein-matched grams.
 *
 * Per-dish defaults (cooked beans per person):
 *   chili  1/2 cup
 *   side   1/3 cup
 *   soup   1/4 cup (beans in a mixed soup, not a bowl that is mostly beans)
 */

export const CUPS_COOKED_PER_CAN = 1.5;
export const CUPS_DRY_PER_CAN = 0.5;
export const GRAMS_DRY_PER_CAN_LOW = 90;
export const GRAMS_DRY_PER_CAN_HIGH = 100;
export const GRAMS_DRY_PER_CAN_MID = 95;
export const GRAMS_PER_POUND = 453.59237;

export const DISH_DEFAULTS = {
  chili: 0.5,
  side: 1 / 3,
  soup: 0.25,
};

export const CROWD_HEADCOUNTS = [10, 15, 20, 25, 30, 50, 75, 100];

/** Cups of cooked beans from 1 cup dry, Milk Street's per-variety table. */
export const MILK_STREET_YIELDS = [
  { variety: "Chickpeas", cookedCupsPerCupDry: "2¾" },
  { variety: "Black beans", cookedCupsPerCupDry: "2½" },
  { variety: "Pinto beans", cookedCupsPerCupDry: "2¾" },
  { variety: "Kidney beans", cookedCupsPerCupDry: "3" },
  { variety: "Navy beans", cookedCupsPerCupDry: "2¾" },
  { variety: "Cannellini", cookedCupsPerCupDry: "3¼" },
];

export const DRY_CUPS_PER_POUND = "2 to 2½";
export const CANS_PER_DRY_POUND = "4 to 5";

const FRACTIONS = [
  [0, ""],
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

export function formatCups(n) {
  if (!Number.isFinite(n)) return "";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const whole = Math.floor(abs + 1e-9);
  const frac = abs - whole;
  let best = null;
  for (const [value, label] of FRACTIONS) {
    const diff = Math.abs(frac - value);
    if (diff < 0.02 && (best === null || diff < best.diff)) best = { label, diff };
  }
  if (!best) {
    const rounded = Math.round(abs * 100) / 100;
    return sign + String(rounded);
  }
  if (whole === 0) return sign + (best.label || "0");
  if (!best.label) return sign + String(whole);
  return `${sign}${whole}${best.label}`;
}

export function formatGramRange(low, high) {
  const lo = Math.round(low);
  const hi = Math.round(high);
  return lo === hi ? String(lo) : `${lo} to ${hi}`;
}

export function formatLbRange(low, high) {
  const lo = (Math.round(low * 10) / 10).toFixed(1);
  const hi = (Math.round(high * 10) / 10).toFixed(1);
  return lo === hi ? `${lo} lb` : `${lo} to ${hi} lb`;
}

export function testedYield(cans) {
  if (!Number.isFinite(cans) || cans <= 0) return null;
  const gramsLow = cans * GRAMS_DRY_PER_CAN_LOW;
  const gramsHigh = cans * GRAMS_DRY_PER_CAN_HIGH;
  return {
    cans,
    cupsDry: cans * CUPS_DRY_PER_CAN,
    gramsLow,
    gramsHigh,
    gramsMid: cans * GRAMS_DRY_PER_CAN_MID,
    cupsCooked: cans * CUPS_COOKED_PER_CAN,
    dryLbLow: gramsLow / GRAMS_PER_POUND,
    dryLbHigh: gramsHigh / GRAMS_PER_POUND,
  };
}

export function crowdPlan({ people, cupsPerPerson }) {
  if (!Number.isFinite(people) || people <= 0) return null;
  if (!Number.isFinite(cupsPerPerson) || cupsPerPerson <= 0) return null;
  const cookedCups = people * cupsPerPerson;
  const exactCans = cookedCups / CUPS_COOKED_PER_CAN;
  const cans = Math.ceil(exactCans - 1e-9);
  return {
    people,
    cupsPerPerson,
    cookedCups,
    exactCans,
    ...testedYield(cans),
  };
}

/** Can cost is the CSV can price times cans. Dry cost uses the 95 g midpoint. */
export function crowdCost(cans, { canPrice, dryPricePer100g }) {
  if (!Number.isFinite(cans) || cans <= 0) return null;
  const dryGramsMid = cans * GRAMS_DRY_PER_CAN_MID;
  const canCost = Number.isFinite(canPrice) ? cans * canPrice : null;
  const dryCost = Number.isFinite(dryPricePer100g)
    ? (dryGramsMid / 100) * dryPricePer100g
    : null;
  return { dryGramsMid, canCost, dryCost };
}
