/**
 * Build src/data/fdc-cache.json from the published SR Legacy CSV.
 *
 *   FDC_SR_DIR=/tmp/fdc/FoodData_Central_sr_legacy_food_csv_2018-04 \
 *     node scripts/build-fdc-cache.mjs
 *
 * Descriptions come from src/lib/recipe-fdc-rules.mjs. A description that
 * is missing or duplicated fails the script. Ids are read from the CSV.
 */
import { createReadStream, existsSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { FOOD_RULES } from "../src/lib/recipe-fdc-rules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srDir = process.env.FDC_SR_DIR
  || "/tmp/fdc/FoodData_Central_sr_legacy_food_csv_2018-04";
const outPath = join(root, "src/data/fdc-cache.json");

const NUTRIENT_IDS = {
  kcal: ["1008"],
  protein: ["1003"],
  fiber: ["1079"],
  sodium: ["1093"],
  sugar: ["2000", "1063"],
};

function parseCsvLine(line) {
  const cells = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const character = line[i];
    if (quoted) {
      if (character === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      cells.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  cells.push(field);
  return cells;
}

async function loadCsv(filename, onRow) {
  const stream = createReadStream(join(srDir, filename), { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;
  for await (const line of lines) {
    if (!line) continue;
    const cells = parseCsvLine(line);
    if (!headers) {
      headers = cells;
      continue;
    }
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    onRow(row);
  }
}

const overlayPath = join(root, "src/data/fdc-branded-overlay.json");
const overlayFoods = existsSync(overlayPath)
  ? JSON.parse(readFileSync(overlayPath, "utf8"))
  : [];
const overlayDescriptions = new Set(overlayFoods.map((food) => food.description));
const wanted = [...new Set(FOOD_RULES.map((rule) => rule.description))].filter(
  (description) => !overlayDescriptions.has(description),
);
const idByDescription = new Map();
const descriptionById = new Map();

await loadCsv("food.csv", (row) => {
  if (!wanted.includes(row.description)) return;
  const existing = idByDescription.get(row.description);
  if (existing && existing !== row.fdc_id) {
    throw new Error(`Duplicate description ${row.description}: ${existing} and ${row.fdc_id}`);
  }
  idByDescription.set(row.description, row.fdc_id);
  descriptionById.set(row.fdc_id, row.description);
});

const missing = wanted.filter((description) => !idByDescription.has(description));
if (missing.length) {
  console.error(`Missing ${missing.length} SR Legacy descriptions:`);
  for (const description of missing) console.error(`- ${description}`);
  process.exit(1);
}

const ids = new Set(idByDescription.values());
const nutrients = new Map();
await loadCsv("food_nutrient.csv", (row) => {
  if (!ids.has(row.fdc_id)) return;
  const bucket = nutrients.get(row.fdc_id) || {};
  bucket[row.nutrient_id] = Number(row.amount);
  nutrients.set(row.fdc_id, bucket);
});

const portions = new Map();
await loadCsv("food_portion.csv", (row) => {
  if (!ids.has(row.fdc_id)) return;
  const list = portions.get(row.fdc_id) || [];
  list.push({
    amount: Number(row.amount),
    modifier: row.modifier || row.portion_description || "",
    grams: Number(row.gram_weight),
  });
  portions.set(row.fdc_id, list);
});

function pickNutrient(bag, keys) {
  for (const key of keys) {
    if (bag && bag[key] != null && !Number.isNaN(bag[key])) {
      return { id: Number(key), amount: bag[key] };
    }
  }
  return null;
}

const foods = {};
for (const [description, fdcId] of idByDescription) {
  const bag = nutrients.get(fdcId) || {};
  const picked = {};
  const nutrientIds = {};
  for (const [name, keys] of Object.entries(NUTRIENT_IDS)) {
    const found = pickNutrient(bag, keys);
    picked[name] = found ? found.amount : null;
    if (found) nutrientIds[name] = found.id;
  }
  if (picked.kcal == null) {
    throw new Error(`FDC ${fdcId} (${description}) has no energy (1008)`);
  }
  foods[fdcId] = {
    fdcId: Number(fdcId),
    description,
    dataType: "SR Legacy",
    nutrientsPer100g: picked,
    nutrientIds,
    portions: (portions.get(fdcId) || []).filter((portion) => portion.grams > 0 && portion.amount > 0),
  };
}

for (const food of overlayFoods) {
  if (!food?.fdcId || !food.description) {
    throw new Error("Branded overlay entry is missing fdcId or description");
  }
  foods[String(food.fdcId)] = food;
}

const cache = {
  source: "USDA FoodData Central SR Legacy CSV, April 2018 release",
  downloadedFrom: "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip",
  apiSpotCheck: {
    date: "2026-11-23",
    endpoint: "https://api.nal.usda.gov/fdc/v1/food/{fdcId}?api_key=DEMO_KEY",
    note: "Portion gram weights and kcal, protein, fiber, sodium, and total sugars for these ids matched this cache on 2026-11-23.",
    ids: [171413, 169640, 175238, 173801],
  },
  foods,
};

writeFileSync(outPath, `${JSON.stringify(cache, null, 2)}\n`);
console.log(`Wrote ${Object.keys(foods).length} foods to ${outPath}`);
