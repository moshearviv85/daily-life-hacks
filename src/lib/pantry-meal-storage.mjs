/**
 * Weekly batch cost next to the fridge rows already published on the site.
 * Protein-per-dollar figures are read from the CSVs. Fridge days are the
 * rows named on the meat, grains, and pantry pages. This file does not
 * invent a longer clock.
 */
import { readDataCsv, money } from "./produce-grain-fiber-index.mjs";

export const PANTRY_FILE = "shelf-stable-pantry-per-dollar-2026.csv";
export const MEAT_FILE = "meat-per-dollar-protein-ranked-2026.csv";
export const BEANS_FILE = "canned-vs-dry-beans-cost-2026.csv";

export const REFERENCE = { people: 4, gramsPerPerson: 50, days: 7 };

const SPECS = [
  {
    id: "flour",
    food: "Whole wheat flour",
    source: "pantry",
    modes: [
      {
        id: "pantry",
        label: "Leave it in the cupboard",
        fridgeMin: null,
        fridgeMax: null,
        chart: false,
        note: "The pantry page says flour needs no fridge. It doesn't date the flour, and it says a loaf doesn't get the pasta clock. This planner won't invent fridge days for bread.",
      },
    ],
  },
  {
    id: "lentils",
    food: "Brown lentils (dry)",
    source: "pantry",
    alsoInBeans: true,
    modes: [
      {
        id: "dry",
        label: "Leave the bag dry",
        fridgeMin: null,
        fridgeMax: null,
        chart: false,
        note: "Dry lentils stay in the cupboard. The fridge clock starts after you cook them.",
      },
      {
        id: "cooked",
        label: "Cook the batch on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: true,
        chartLabel: "Cooked lentils",
        note: "FoodKeeper doesn't name cooked lentils. The grains page puts plain cooked beans on leftovers without meat, 3 to 4 days. Lentils use that row here.",
      },
    ],
  },
  {
    id: "black-beans",
    food: "Black beans (dry)",
    source: "pantry",
    alsoInBeans: true,
    modes: [
      {
        id: "dry",
        label: "Leave the bag dry",
        fridgeMin: null,
        fridgeMax: null,
        chart: false,
        note: "Dry beans stay in the cupboard until you cook them.",
      },
      {
        id: "cooked",
        label: "Cook the batch on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: true,
        chartLabel: "Cooked dry black beans",
        note: "Plain cooked beans are leftovers without meat: 3 to 4 days. That's the grains page, and it matches the FSIS leftovers row.",
      },
    ],
  },
  {
    id: "canned-black",
    food: "Canned black beans",
    source: "pantry",
    alsoInBeans: true,
    modes: [
      {
        id: "unopened",
        label: "Leave the can unopened",
        fridgeMin: null,
        fridgeMax: null,
        chart: false,
        note: "Unopened low-acid canned beans are 2 to 5 years on the shelf, from the pantry page.",
      },
      {
        id: "opened",
        label: "Open the cans for the week",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: true,
        chartLabel: "Opened canned black beans",
        note: "After opening, low-acid canned beans are 3 to 4 days in the refrigerator. The pantry page is the source.",
      },
    ],
  },
  {
    id: "oats",
    food: "Old-fashioned rolled oats",
    source: "pantry",
    modes: [
      {
        id: "dry",
        label: "Leave the canister dry",
        fridgeMin: null,
        fridgeMax: null,
        chart: false,
        note: "Dry oats stay in the cupboard. A cooked pot isn't a named row.",
      },
      {
        id: "cooked",
        label: "Cook the week's oats on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: false,
        note: "Cooked oatmeal has no named row on the grains page. A cooked pot uses the 3 to 4 day leftovers row.",
      },
    ],
  },
  {
    id: "spaghetti",
    food: "Whole wheat spaghetti",
    source: "pantry",
    modes: [
      {
        id: "dry",
        label: "Leave the box dry",
        fridgeMin: null,
        fridgeMax: null,
        chart: false,
        note: "Dried pasta is 2 years on the shelf, from the pantry page.",
      },
      {
        id: "cooked",
        label: "Boil the week on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: true,
        chartDays: 5,
        chartLabel: "Cooked spaghetti, FoodKeeper upper day",
        note: "The pantry page says cooked rice and pasta are 3 to 4 days in the fridge. FoodKeeper's pasta row, on the grains page, says 3 to 5. The warning here uses day 4. The chart's extra day is the named upper end, not permission.",
      },
    ],
  },
  {
    id: "rice",
    food: "Brown rice (dry)",
    source: "pantry",
    modes: [
      {
        id: "dry",
        label: "Leave the bag dry",
        fridgeMin: null,
        fridgeMax: null,
        chart: false,
        note: "Dry rice is 2 years on the shelf, from the pantry page.",
      },
      {
        id: "cooked",
        label: "Cook the week on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: true,
        chartDays: 6,
        chartLabel: "Cooked brown rice, FoodKeeper upper day",
        note: "The pantry page says 3 to 4 days after cooking. FoodKeeper's cooked-rice row says 4 to 6. The warning here uses day 4. The chart marks day 6 so you can see the longer row without treating it as the leftovers rule.",
      },
    ],
  },
  {
    id: "drumsticks",
    food: "Chicken drumsticks (bone-in)",
    source: "meat",
    modes: [
      {
        id: "raw",
        label: "Keep the bag raw",
        fridgeMin: 1,
        fridgeMax: 2,
        chart: true,
        chartLabel: "Raw drumsticks",
        note: "Raw chicken pieces are 1 to 2 days. The meat page uses the cold-storage chart.",
      },
      {
        id: "cooked",
        label: "Cook the batch on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: true,
        chartLabel: "Cooked drumsticks",
        note: "Cooked poultry is 3 to 4 days at 40°F or below. The sale price doesn't add a day.",
      },
    ],
  },
  {
    id: "breast",
    food: "Chicken breast (boneless, skinless)",
    source: "meat",
    modes: [
      {
        id: "raw",
        label: "Keep it raw",
        fridgeMin: 1,
        fridgeMax: 2,
        chart: false,
        note: "Raw chicken pieces are 1 to 2 days, same chart as the drumsticks.",
      },
      {
        id: "cooked",
        label: "Cook the batch on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: true,
        chartLabel: "Cooked chicken breast",
        note: "Cooked poultry is 3 to 4 days. Breast doesn't get a longer row because it cost more.",
      },
    ],
  },
  {
    id: "ground-beef",
    food: "Ground beef (80/20)",
    source: "meat",
    modes: [
      {
        id: "raw",
        label: "Keep it raw",
        fridgeMin: 1,
        fridgeMax: 2,
        chart: true,
        chartLabel: "Raw ground beef",
        note: "Raw ground meat is 1 to 2 days on the cold-storage chart.",
      },
      {
        id: "cooked",
        label: "Brown the batch on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: true,
        chartLabel: "Cooked ground beef",
        note: "Cooked meat is 3 to 4 days. Thirty grams of this row costs more than drumsticks. The clock is the same once it's cooked.",
      },
    ],
  },
  {
    id: "pork",
    food: "Pork shoulder butt roast (boneless)",
    source: "meat",
    modes: [
      {
        id: "raw",
        label: "Keep the roast raw",
        fridgeMin: 3,
        fridgeMax: 5,
        chart: true,
        chartLabel: "Raw pork shoulder",
        note: "Raw pork roasts are on the 3 to 5 day row for fresh chops and roasts. That row ends when you cook it.",
      },
      {
        id: "cooked",
        label: "Cook the roast on Sunday",
        fridgeMin: 3,
        fridgeMax: 4,
        chart: false,
        note: "A cooked shoulder is leftovers: 3 to 4 days. The raw roast's extra days don't carry over.",
      },
    ],
  },
];

function indexByFood(rows) {
  return new Map(rows.map((row) => [row.food, row]));
}

export function loadPlannerFoods(root = process.cwd()) {
  const files = {
    pantry: indexByFood(readDataCsv(root, PANTRY_FILE)),
    meat: indexByFood(readDataCsv(root, MEAT_FILE)),
    beans: indexByFood(readDataCsv(root, BEANS_FILE)),
  };
  return SPECS.map((spec) => {
    const row = files[spec.source].get(spec.food);
    if (!row) throw new Error(`missing ${spec.food} in ${spec.source}`);
    const proteinPerDollar = Number(row.value);
    if (!Number.isFinite(proteinPerDollar) || proteinPerDollar <= 0) {
      throw new Error(`bad protein per dollar for ${spec.food}`);
    }
    if (spec.alsoInBeans) {
      const other = files.beans.get(spec.food);
      if (!other) throw new Error(`missing bean cross-check for ${spec.food}`);
      if (Number(other.value) !== proteinPerDollar) {
        throw new Error(`bean file disagrees on ${spec.food}`);
      }
    }
    return {
      id: spec.id,
      food: spec.food,
      source: spec.source,
      proteinPerDollar,
      valueLabel: row.value,
      package: row.package,
      packagePrice: Number(row.package_price_usd),
      modes: spec.modes,
    };
  });
}

export function quote(food, mode, people, gramsPerPerson, days) {
  const protein = people * gramsPerPerson * days;
  const cost = protein / food.proteinPerDollar;
  const fridgeMax = mode.fridgeMax;
  const riskDays = fridgeMax == null ? 0 : Math.max(0, days - fridgeMax);
  const safeDays = fridgeMax == null ? days : Math.min(days, fridgeMax);
  return {
    protein,
    cost,
    riskDays,
    riskCost: (people * gramsPerPerson * riskDays) / food.proteinPerDollar,
    safeDays,
    safeCost: (people * gramsPerPerson * safeDays) / food.proteinPerDollar,
  };
}

export function chartPoints(foods = loadPlannerFoods()) {
  const { people, gramsPerPerson, days } = REFERENCE;
  const protein = people * gramsPerPerson * days;
  const points = [];
  for (const food of foods) {
    for (const mode of food.modes) {
      if (!mode.chart) continue;
      const fridgeDays = mode.chartDays ?? mode.fridgeMax;
      if (fridgeDays == null) throw new Error(`chart mode missing days for ${food.food}`);
      points.push({
        label: mode.chartLabel,
        food: food.food,
        fridgeDays,
        cost: protein / food.proteinPerDollar,
        proteinPerDollar: food.proteinPerDollar,
      });
    }
  }
  return points.sort((a, b) => a.fridgeDays - b.fridgeDays || a.cost - b.cost);
}

export function fridgeLabel(mode) {
  if (mode.fridgeMin == null || mode.fridgeMax == null) return "No fridge row";
  if (mode.fridgeMin === mode.fridgeMax) return `${mode.fridgeMax} days`;
  return `${mode.fridgeMin} to ${mode.fridgeMax} days`;
}

export { money };
