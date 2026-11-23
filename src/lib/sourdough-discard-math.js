/**
 * Sourdough discard math for /tools/sourdough-discard-calculator/.
 *
 * Hydration is a percent on the way in (100 means equal flour and water)
 * and a ratio inside the formulas (h = percent / 100).
 *
 * Flour in the discard:  Fd = D / (1 + h)
 * Water in the discard:  Wd = D * h / (1 + h)
 * Max discard a recipe can absorb: min(F * (1 + h), W * (1 + h) / h)
 */

export const CUP_GRAMS = 227;

export const FEED_PRESETS = {
  "1:1:1": { flourParts: 1, waterParts: 1, peak: "4-6 hours" },
  "1:2:2": { flourParts: 2, waterParts: 2, peak: "6-8 hours" },
  "1:5:5": { flourParts: 5, waterParts: 5, peak: "8-12 hours" },
  "1:10:10": { flourParts: 10, waterParts: 10, peak: "12-16 hours" },
};

export function hydrationRatio(percent) {
  if (!Number.isFinite(percent) || percent < 0) return null;
  return percent / 100;
}

export function discardSplit(discardGrams, hydrationPercent) {
  if (!Number.isFinite(discardGrams) || discardGrams < 0) return null;
  const h = hydrationRatio(hydrationPercent);
  if (h === null) return null;
  const flour = discardGrams / (1 + h);
  const water = (discardGrams * h) / (1 + h);
  return { flour, water, h };
}

/** Smaller of the flour cap and the liquid cap. At 0% hydration there is no liquid cap. */
export function maxUsableDiscard(flourGrams, liquidGrams, hydrationPercent) {
  if (!Number.isFinite(flourGrams) || flourGrams < 0) return null;
  if (!Number.isFinite(liquidGrams) || liquidGrams < 0) return null;
  const h = hydrationRatio(hydrationPercent);
  if (h === null) return null;
  const byFlour = flourGrams * (1 + h);
  if (h === 0) return byFlour;
  const byLiquid = (liquidGrams * (1 + h)) / h;
  return Math.min(byFlour, byLiquid);
}

export function addDiscard({ flour, liquid, discard, hydrationPercent }) {
  const split = discardSplit(discard, hydrationPercent);
  if (!split) return null;
  if (!Number.isFinite(flour) || flour < 0) return null;
  if (!Number.isFinite(liquid) || liquid < 0) return null;
  const flourToAdd = flour - split.flour;
  const liquidToAdd = liquid - split.water;
  const maxDiscard = maxUsableDiscard(flour, liquid, hydrationPercent);
  return {
    ...split,
    flourToAdd,
    liquidToAdd,
    maxDiscard,
    flourShort: flourToAdd < -1e-9,
    liquidShort: liquidToAdd < -1e-9,
  };
}

export function feedStarter(starterGrams, flourParts, waterParts) {
  if (!Number.isFinite(starterGrams) || starterGrams <= 0) return null;
  if (!Number.isFinite(flourParts) || flourParts < 0) return null;
  if (!Number.isFinite(waterParts) || waterParts < 0) return null;
  const flour = starterGrams * flourParts;
  const water = starterGrams * waterParts;
  const total = starterGrams + flour + water;
  const hydration = flour > 0 ? (water / flour) * 100 : null;
  return { flour, water, total, hydration };
}

export function cupsToGrams(cups) {
  if (!Number.isFinite(cups) || cups < 0) return null;
  return cups * CUP_GRAMS;
}

export function gramsToCups(grams) {
  if (!Number.isFinite(grams) || grams < 0) return null;
  return grams / CUP_GRAMS;
}
