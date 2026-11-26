import { readPublicCsv } from "./public-csv.mjs";

export const PAIR_FILE = "cheapest-complete-protein-pairs-2026.csv";
export const QUALITY_FILE = "protein-quality-per-dollar-2026.csv";

/** Pulse, soy, and peanut rows from the 25-food DIAAS sheet. Names must match the CSV. */
export const PULSE_FOODS = [
  "Brown lentils (dry)",
  "Chickpeas (dry)",
  "Green split peas (dry)",
  "Red lentils (dry)",
  "Black beans (dry)",
  "Navy beans (dry)",
  "Pinto beans (dry)",
  "TVP (textured vegetable protein)",
  "Peanut butter",
  "Tofu (extra firm)",
];

/** Grain rows from the same sheet. Brown rice and barley are not on it. */
export const GRAIN_FOODS = [
  "Whole wheat flour",
  "Old-fashioned rolled oats",
  "Whole wheat spaghetti",
  "White rice (long grain, dry)",
  "100% whole wheat bread",
];

function components(note) {
  const marker = "audited rows:";
  const at = note.indexOf(marker);
  const body = at >= 0 ? note.slice(at + marker.length) : note;
  return body.split(",").map((part) => {
    const match = part.trim().match(/^(.*)\s([0-9]+(?:\.[0-9]+)?)$/);
    if (!match) return null;
    return { food: match[1].trim(), grams: Number(match[2]) };
  }).filter(Boolean);
}

function foodRecord(row) {
  return {
    food: row.food,
    proteinPerDollar: Number(row.protein_g_per_dollar),
    diaas: row.diaas_score,
    adjusted: row.adjusted_g_per_dollar,
    note: row.notes,
  };
}

export function loadProteinPairs() {
  const pairRows = readPublicCsv(`data/${PAIR_FILE}`);
  const qualityRows = readPublicCsv(`data/${QUALITY_FILE}`);
  if (pairRows.length !== 20) {
    throw new Error(`expected 20 protein pairs, got ${pairRows.length}`);
  }
  if (qualityRows.length !== 25) {
    throw new Error(`expected 25 DIAAS foods, got ${qualityRows.length}`);
  }

  const byFood = new Map(qualityRows.map((row) => [row.food, foodRecord(row)]));
  const requireFood = (name) => {
    const food = byFood.get(name);
    if (!food) throw new Error(`DIAAS sheet is missing ${name}`);
    return food;
  };

  const pairs = pairRows.map((row) => {
    const parts = components(row.price_basis);
    if (parts.length !== 2) throw new Error(`could not read both foods in ${row.food}`);
    const average = (parts[0].grams + parts[1].grams) / 2;
    const published = Number(row.value);
    if (!Number.isFinite(published) || Math.abs(average - published) > 0.15) {
      throw new Error(`50/50 split does not match ${row.food}: ${average} vs ${row.value}`);
    }
    return {
      food: row.food,
      value: row.value,
      parts: parts.map((part) => ({
        food: part.food,
        grams: part.grams,
        diaas: byFood.get(part.food) ?? null,
      })),
    };
  });

  const used = new Set([...PULSE_FOODS, ...GRAIN_FOODS]);
  return {
    pairs,
    pulses: PULSE_FOODS.map(requireFood),
    grains: GRAIN_FOODS.map(requireFood),
    others: qualityRows.filter((row) => !used.has(row.food)).map(foodRecord),
  };
}
