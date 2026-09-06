/**
 * Compact protein-cost (and fiber-cost) callouts for indexable meal/guide pages.
 *
 * Food names and package counts live here. Every displayed number is derived
 * from the live study CSVs. tests/meal-protein-cost.test.mjs recomputes the
 * same math so a later data fix cannot silently drift the highlights.
 *
 * Do not add sourdough slugs. Do not add INDEX_PRUNE_SLUGS.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isIndexPruned } from "./index-prune.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const PROTEIN_CSV = "public/data/protein-per-dollar-2026.csv";
export const FIBER_CSV = "public/data/fiber-per-dollar-2026.csv";
export const PROTEIN_FLAGSHIP_HREF = "/protein-per-dollar-cheapest-protein-sources/";
export const FIBER_FLAGSHIP_HREF = "/fiber-per-dollar-cheapest-high-fiber-foods/";
export const FOOD_VALUE_DB_HREF = "/food-value-database/";
export const PRICE_MONTH_LABEL = "July 2026";

export const DISCLOSURE =
  "July 2026 US grocery sample, with BLS national averages for some animal foods. Nutrition values from USDA FoodData Central. Package prices from the live study CSVs. This is a price ranking, not a food endorsement.";

function parseCsv(source) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }

  const [headers, ...rows] = records;
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, row[index]])),
    );
}

function loadRows(relativePath) {
  return parseCsv(readFileSync(join(root, relativePath), "utf8"));
}

const proteinByFood = new Map(
  loadRows(PROTEIN_CSV).map((row) => [row.food, row]),
);
const fiberByFood = new Map(loadRows(FIBER_CSV).map((row) => [row.food, row]));

export function proteinRow(food) {
  const row = proteinByFood.get(food);
  if (!row) throw new Error(`protein CSV missing food: ${food}`);
  return row;
}

export function fiberRow(food) {
  const row = fiberByFood.get(food);
  if (!row) throw new Error(`fiber CSV missing food: ${food}`);
  return row;
}

export function packageProteinG(row) {
  return (
    (Number(row.package_weight_g) *
      Number(row.edible_fraction) *
      Number(row.protein_g_per_100g)) /
    100
  );
}

export function packageFiberG(row) {
  return (
    (Number(row.package_weight_g) *
      Number(row.edible_fraction) *
      Number(row.fiber_g_per_100g)) /
    100
  );
}

export function packageCostUsd(row, packages = 1) {
  return packages * Number(row.package_price_usd);
}

export function usd(n) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function aboutGrams(n) {
  return String(Math.round(n));
}

function highlight(food, csv, column, row) {
  return { food, csv, column, value: row[column] };
}

function buildCostco() {
  const bird = proteinRow("Rotisserie chicken (whole, cooked)");
  const edibleG = packageProteinG(bird);
  const servings = 4;
  const perServingUsd = packageCostUsd(bird) / servings;
  const perServingG = edibleG / servings;

  return {
    slug: "costco-rotisserie-chicken-meal-ideas-dinner",
    kicker: "Protein cost for this meal",
    highlight: {
      value: `${bird.protein_g_per_dollar} g per $1`,
      claim: `One study rotisserie bird cost ${usd(packageCostUsd(bird))} and carried about ${aboutGrams(edibleG)} grams of edible protein after bone and skin. Split four ways, that's about ${usd(perServingUsd)} and ${aboutGrams(perServingG)} grams of protein before rice or tortillas. Costco's checkout sticker can be lower. I used the study package.`,
    },
    disclosure: DISCLOSURE,
    proteinHref: PROTEIN_FLAGSHIP_HREF,
    proteinLabel: "See the protein ranking",
    fiberHref: null,
    fiberLabel: null,
    dbHref: FOOD_VALUE_DB_HREF,
    dbLabel: "Search the food value database",
    lines: [
      `Study package: ${usd(packageCostUsd(bird))} bird, ${bird.protein_g_per_dollar} g protein per $1.`,
      `Edible protein: about ${aboutGrams(edibleG)} g on the bird, about ${aboutGrams(perServingG)} g if you split it four ways (${usd(perServingUsd)}).`,
    ],
    highlights: [
      highlight("Rotisserie chicken (whole, cooked)", "protein", "protein_g_per_dollar", bird),
      highlight("Rotisserie chicken (whole, cooked)", "protein", "package_price_usd", bird),
    ],
    derived: {
      edibleProteinG: aboutGrams(edibleG),
      perServingProteinG: aboutGrams(perServingG),
      perServingUsd: usd(perServingUsd),
      packageUsd: usd(packageCostUsd(bird)),
    },
  };
}

function buildBeansAndRice() {
  const canned = proteinRow("Canned black beans");
  const rice = proteinRow("White rice (long grain, dry)");
  const brownRice = proteinRow("Brown rice (dry)");
  const cannedFiber = fiberRow("Canned black beans");
  const cans = 2;
  const beanProteinG = packageProteinG(canned) * cans;
  const beanCost = packageCostUsd(canned, cans);

  return {
    slug: "beans-and-rice-complete-protein-meal",
    kicker: "Protein cost for this meal",
    highlight: {
      value: `${canned.protein_g_per_dollar} g per $1`,
      claim: `Two study cans of black beans cost ${usd(beanCost)} and carried about ${aboutGrams(beanProteinG)} grams of protein on the whole-can basis. That's ${canned.protein_g_per_dollar} grams per dollar. White rice in the same sample returned ${rice.protein_g_per_dollar} grams of protein per dollar. I'm not pricing the pepper or the lime.`,
    },
    disclosure: DISCLOSURE,
    proteinHref: PROTEIN_FLAGSHIP_HREF,
    proteinLabel: "See the protein ranking",
    fiberHref: FIBER_FLAGSHIP_HREF,
    fiberLabel: "See the fiber ranking",
    dbHref: FOOD_VALUE_DB_HREF,
    dbLabel: "Search the food value database",
    lines: [
      `Two ${usd(packageCostUsd(canned))} cans: about ${aboutGrams(beanProteinG)} g protein, ${canned.protein_g_per_dollar} g per $1.`,
      `White rice ${rice.protein_g_per_dollar} g protein per $1. Brown rice ${brownRice.protein_g_per_dollar}. Canned black beans also bought ${cannedFiber.fiber_g_per_dollar} g fiber per $1.`,
    ],
    highlights: [
      highlight("Canned black beans", "protein", "protein_g_per_dollar", canned),
      highlight("Canned black beans", "protein", "package_price_usd", canned),
      highlight("White rice (long grain, dry)", "protein", "protein_g_per_dollar", rice),
      highlight("Brown rice (dry)", "protein", "protein_g_per_dollar", brownRice),
      highlight("Canned black beans", "fiber", "fiber_g_per_dollar", cannedFiber),
    ],
    derived: {
      twoCanUsd: usd(beanCost),
      twoCanProteinG: aboutGrams(beanProteinG),
    },
  };
}

function buildHighProtein() {
  const pintos = proteinRow("Pinto beans (dry)");
  const bacon = proteinRow("Bacon");
  const pintoFiber = fiberRow("Pinto beans (dry)");

  return {
    slug: "high-protein-on-a-budget-complete-guide",
    kicker: "Protein cost for this cart",
    highlight: {
      value: `${pintos.protein_g_per_dollar} g vs ${bacon.protein_g_per_dollar} g`,
      claim: `A dollar of dry pinto beans bought ${pintos.protein_g_per_dollar} grams of protein in the July 2026 sample. A dollar of bacon bought ${bacon.protein_g_per_dollar}. The $20 backbone on this page uses those same package prices.`,
    },
    disclosure: DISCLOSURE,
    proteinHref: PROTEIN_FLAGSHIP_HREF,
    proteinLabel: "See the protein ranking",
    fiberHref: FIBER_FLAGSHIP_HREF,
    fiberLabel: "See the fiber ranking",
    dbHref: FOOD_VALUE_DB_HREF,
    dbLabel: "Search the food value database",
    lines: [
      `Dry pintos: ${usd(packageCostUsd(pintos))} for a ${pintos.package}, ${pintos.protein_g_per_dollar} g protein per $1 and ${pintoFiber.fiber_g_per_dollar} g fiber per $1.`,
    ],
    highlights: [
      highlight("Pinto beans (dry)", "protein", "protein_g_per_dollar", pintos),
      highlight("Bacon", "protein", "protein_g_per_dollar", bacon),
      highlight("Pinto beans (dry)", "protein", "package_price_usd", pintos),
      highlight("Pinto beans (dry)", "fiber", "fiber_g_per_dollar", pintoFiber),
    ],
    derived: {},
  };
}

function buildMealPrep() {
  const drums = proteinRow("Chicken drumsticks (bone-in)");
  const pintos = proteinRow("Pinto beans (dry)");
  const pintoFiber = fiberRow("Pinto beans (dry)");
  const pairUsd = packageCostUsd(drums) + packageCostUsd(pintos);

  return {
    slug: "meal-prep-for-beginners-complete-system",
    kicker: "Protein cost for this prep",
    highlight: {
      value: `${drums.protein_g_per_dollar} g per $1`,
      claim: `A ${drums.package} of bone-in drumsticks cost ${usd(packageCostUsd(drums))} and returned ${drums.protein_g_per_dollar} grams of protein per dollar after the bone. A ${pintos.package} of dry pintos cost ${usd(packageCostUsd(pintos))} and returned ${pintos.protein_g_per_dollar}. Those two Sunday packages are ${usd(pairUsd)}.`,
    },
    disclosure: DISCLOSURE,
    proteinHref: PROTEIN_FLAGSHIP_HREF,
    proteinLabel: "See the protein ranking",
    fiberHref: FIBER_FLAGSHIP_HREF,
    fiberLabel: "See the fiber ranking",
    dbHref: FOOD_VALUE_DB_HREF,
    dbLabel: "Search the food value database",
    lines: [
      `Drumsticks ${drums.protein_g_per_dollar} g protein per $1. Dry pintos ${pintos.protein_g_per_dollar} g protein and ${pintoFiber.fiber_g_per_dollar} g fiber per $1.`,
    ],
    highlights: [
      highlight("Chicken drumsticks (bone-in)", "protein", "protein_g_per_dollar", drums),
      highlight("Chicken drumsticks (bone-in)", "protein", "package_price_usd", drums),
      highlight("Pinto beans (dry)", "protein", "protein_g_per_dollar", pintos),
      highlight("Pinto beans (dry)", "protein", "package_price_usd", pintos),
      highlight("Pinto beans (dry)", "fiber", "fiber_g_per_dollar", pintoFiber),
    ],
    derived: {
      pairUsd: usd(pairUsd),
    },
  };
}

function buildEatHealthy() {
  const pintos = proteinRow("Pinto beans (dry)");
  const bacon = proteinRow("Bacon");
  const peas = fiberRow("Green split peas (dry)");
  const peasProtein = proteinRow("Green split peas (dry)");

  return {
    slug: "eat-healthy-on-a-budget-complete-playbook",
    kicker: "Protein cost for this playbook",
    highlight: {
      value: `${pintos.protein_g_per_dollar} g vs ${bacon.protein_g_per_dollar} g`,
      claim: `Dry pinto beans bought ${pintos.protein_g_per_dollar} grams of protein per dollar. Bacon bought ${bacon.protein_g_per_dollar}. Dry split peas bought ${peas.fiber_g_per_dollar} grams of fiber per dollar. Same grocery sample, July 2026.`,
    },
    disclosure: DISCLOSURE,
    proteinHref: PROTEIN_FLAGSHIP_HREF,
    proteinLabel: "See the protein ranking",
    fiberHref: FIBER_FLAGSHIP_HREF,
    fiberLabel: "See the fiber ranking",
    dbHref: FOOD_VALUE_DB_HREF,
    dbLabel: "Search the food value database",
    lines: [
      `Split peas also returned ${peasProtein.protein_g_per_dollar} g protein per $1, so one pot is buying both nutrients.`,
    ],
    highlights: [
      highlight("Pinto beans (dry)", "protein", "protein_g_per_dollar", pintos),
      highlight("Bacon", "protein", "protein_g_per_dollar", bacon),
      highlight("Green split peas (dry)", "fiber", "fiber_g_per_dollar", peas),
      highlight("Green split peas (dry)", "protein", "protein_g_per_dollar", peasProtein),
    ],
    derived: {},
  };
}

function buildLentilsVsChicken() {
  const lentils = proteinRow("Brown lentils (dry)");
  const breast = proteinRow("Chicken breast (boneless, skinless)");
  const lentilFiber = fiberRow("Brown lentils (dry)");
  const ratio = (Number(lentils.protein_g_per_dollar) / Number(breast.protein_g_per_dollar)).toFixed(1);

  return {
    slug: "lentils-vs-chicken-breast-protein-cost",
    kicker: "Protein cost for these ingredients",
    highlight: {
      value: `${lentils.protein_g_per_dollar} g vs ${breast.protein_g_per_dollar} g`,
      claim: `A ${usd(packageCostUsd(lentils))} bag of dry brown lentils bought ${lentils.protein_g_per_dollar} grams of protein per dollar. Boneless chicken breast bought ${breast.protein_g_per_dollar} at ${usd(packageCostUsd(breast))} a pound. Lentils win ${ratio}x on raw grams.`,
    },
    disclosure: DISCLOSURE,
    proteinHref: PROTEIN_FLAGSHIP_HREF,
    proteinLabel: "See the protein ranking",
    fiberHref: FIBER_FLAGSHIP_HREF,
    fiberLabel: "See the fiber ranking",
    dbHref: FOOD_VALUE_DB_HREF,
    dbLabel: "Search the food value database",
    lines: [
      `Dry brown lentils also bought ${lentilFiber.fiber_g_per_dollar} g fiber per $1. Chicken breast is a protein-only row.`,
    ],
    highlights: [
      highlight("Brown lentils (dry)", "protein", "protein_g_per_dollar", lentils),
      highlight("Brown lentils (dry)", "protein", "package_price_usd", lentils),
      highlight("Chicken breast (boneless, skinless)", "protein", "protein_g_per_dollar", breast),
      highlight("Chicken breast (boneless, skinless)", "protein", "package_price_usd", breast),
      highlight("Brown lentils (dry)", "fiber", "fiber_g_per_dollar", lentilFiber),
    ],
    derived: {
      rawRatio: ratio,
    },
  };
}

function buildCannedVsDry() {
  const pintos = proteinRow("Pinto beans (dry)");
  const canned = proteinRow("Canned black beans");
  const pintoFiber = fiberRow("Pinto beans (dry)");
  const cannedFiber = fiberRow("Canned black beans");

  return {
    slug: "canned-vs-dry-beans-cost",
    kicker: "Protein cost for these ingredients",
    highlight: {
      value: `${pintos.protein_g_per_dollar} g vs ${canned.protein_g_per_dollar} g`,
      claim: `Dry pinto beans bought ${pintos.protein_g_per_dollar} grams of protein per dollar. Canned black beans, the best canned row, bought ${canned.protein_g_per_dollar}. That's the convenience tax in one pair of study packages: ${usd(packageCostUsd(pintos))} for a ${pintos.package} versus ${usd(packageCostUsd(canned))} a can.`,
    },
    disclosure: DISCLOSURE,
    proteinHref: PROTEIN_FLAGSHIP_HREF,
    proteinLabel: "See the protein ranking",
    fiberHref: FIBER_FLAGSHIP_HREF,
    fiberLabel: "See the fiber ranking",
    dbHref: FOOD_VALUE_DB_HREF,
    dbLabel: "Search the food value database",
    lines: [
      `Fiber in the same sample: dry pintos ${pintoFiber.fiber_g_per_dollar} g per $1, canned black beans ${cannedFiber.fiber_g_per_dollar} g per $1.`,
    ],
    highlights: [
      highlight("Pinto beans (dry)", "protein", "protein_g_per_dollar", pintos),
      highlight("Pinto beans (dry)", "protein", "package_price_usd", pintos),
      highlight("Canned black beans", "protein", "protein_g_per_dollar", canned),
      highlight("Canned black beans", "protein", "package_price_usd", canned),
      highlight("Pinto beans (dry)", "fiber", "fiber_g_per_dollar", pintoFiber),
      highlight("Canned black beans", "fiber", "fiber_g_per_dollar", cannedFiber),
    ],
    derived: {},
  };
}

const builders = [
  buildCostco,
  buildBeansAndRice,
  buildHighProtein,
  buildMealPrep,
  buildEatHealthy,
  buildLentilsVsChicken,
  buildCannedVsDry,
];

export const MEAL_PROTEIN_COST = Object.fromEntries(
  builders.map((build) => {
    const callout = build();
    return [callout.slug, callout];
  }),
);

function assertRefreshSafety() {
  for (const slug of Object.keys(MEAL_PROTEIN_COST)) {
    if (isIndexPruned(slug)) {
      throw new Error(`meal-protein-cost: pruned slug is not allowed: ${slug}`);
    }
    if (/sourdough/i.test(slug)) {
      throw new Error(`meal-protein-cost: sourdough slug is not allowed: ${slug}`);
    }
  }
  if (Object.keys(MEAL_PROTEIN_COST).length < 5 || Object.keys(MEAL_PROTEIN_COST).length > 8) {
    throw new Error(
      `meal-protein-cost: expected 5-8 refreshed slugs, got ${Object.keys(MEAL_PROTEIN_COST).length}`,
    );
  }
}

assertRefreshSafety();

/**
 * Live HTML for the two missing pages still has data-slug equal to the
 * filename, so an exact article.id hit should work. Production still shipped
 * pre-refresh HTML for those two paths. Normalize every candidate (id, route
 * slug, file path, `.md` suffix) so a later Content Layer id shape cannot
 * silently drop the callout again.
 */
export function normalizeMealProteinCostSlug(value) {
  return String(value ?? "")
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "")
    .replace(/^.*\//, "")
    .replace(/\.md$/i, "")
    .trim();
}

export function getMealProteinCost(...candidates) {
  for (const raw of candidates.flat()) {
    const key = normalizeMealProteinCostSlug(raw);
    if (key && MEAL_PROTEIN_COST[key]) return MEAL_PROTEIN_COST[key];
  }
  return null;
}

export function mealProteinCostHighlightNumbers(config) {
  return config?.highlights ?? [];
}
