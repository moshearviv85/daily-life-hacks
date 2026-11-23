/**
 * Ingredient cost from the study CSVs already published under public/data.
 * A food is priced only when its fdc_id is on a row whose package weight
 * is a column or an unambiguous weight in the package text.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const dataDir = join(root, "public/data");
const OZ_G = 28.349523125;
const LB_G = 453.59237;

const SOURCE_PRIORITY = [
  "fiber-per-dollar-2026.csv",
  "protein-per-dollar-2026.csv",
  "breakfast-staples-per-dollar-2026.csv",
  "canned-vs-dry-beans-cost-2026.csv",
  "beans-double-win-fiber-protein-2026.csv",
];

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
    if (character === '"') quoted = true;
    else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else field += character;
  }
  if (field.length || record.length) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }
  const [headers, ...rows] = records;
  if (!headers) return [];
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

export function packageGrams(row) {
  const column = Number(row.package_weight_g);
  if (Number.isFinite(column) && column > 0) {
    const edible = Number(row.edible_fraction);
    const factor = Number.isFinite(edible) && edible > 0 && edible <= 1 ? edible : 1;
    return column * factor;
  }
  const pkg = row.package || "";
  const edible = pkg.match(/\((\d+(?:\.\d+)?)\s*g\s+edible\)/i);
  if (edible) return Number(edible[1]);
  if (/^per\s*lb\b/i.test(pkg.trim())) return LB_G;
  const match = pkg.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|pounds?|oz|ounces?|g|kg)\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "g") return amount;
  if (unit === "kg") return amount * 1000;
  if (unit.startsWith("lb") || unit.startsWith("pound")) return amount * LB_G;
  return amount * OZ_G;
}

function monthLabel(priceBasis, filename) {
  const named = String(priceBasis || "").match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
  if (named) return `${named[1][0].toUpperCase()}${named[1].slice(1).toLowerCase()} ${named[2]}`;
  const short = String(priceBasis || "").match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(20\d{2})\b/i);
  if (short) {
    const full = {
      jan: "January", feb: "February", mar: "March", apr: "April", may: "May", jun: "June",
      jul: "July", aug: "August", sep: "September", oct: "October", nov: "November", dec: "December",
    }[short[1].toLowerCase()];
    return `${full} ${short[2]}`;
  }
  if (/2026/.test(filename) || /2026/.test(priceBasis || "")) return "July 2026";
  return null;
}

let priceIndex;

export function loadIngredientPrices() {
  if (priceIndex) return priceIndex;
  const byId = new Map();
  const files = readdirSync(dataDir).filter((name) => name.endsWith(".csv"));
  files.sort((a, b) => {
    const ai = SOURCE_PRIORITY.indexOf(a);
    const bi = SOURCE_PRIORITY.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  for (const filename of files) {
    const rows = parseCsv(readFileSync(join(dataDir, filename), "utf8"));
    for (const row of rows) {
      const fdcId = String(row.fdc_id || "").trim();
      const price = Number(row.package_price_usd);
      if (!fdcId || !Number.isFinite(price) || price <= 0) continue;
      if (byId.has(fdcId)) continue;
      const grams = packageGrams(row);
      if (!grams) continue;
      const priceBasis = (row.price_basis || "").trim();
      byId.set(fdcId, {
        fdcId: Number(fdcId),
        food: row.food || "",
        pricePerGram: price / grams,
        priceBasis,
        month: monthLabel(priceBasis, filename),
        source: filename,
      });
    }
  }
  priceIndex = byId;
  return byId;
}

export function costForRows(rows, servings) {
  const prices = loadIngredientPrices();
  const priced = [];
  const unpriced = [];
  let dollars = 0;
  for (const row of rows) {
    const price = prices.get(String(row.fdcId));
    if (!price) {
      unpriced.push(row.item);
      continue;
    }
    const lineDollars = row.grams * price.pricePerGram;
    dollars += lineDollars;
    priced.push({
      item: row.item,
      food: price.food,
      dollars: lineDollars,
      priceBasis: price.priceBasis,
      month: price.month,
    });
  }
  if (!priced.length || !servings) return null;
  const perServing = dollars / servings;
  const bases = [...new Set(priced.map((row) => row.priceBasis).filter(Boolean))];
  const months = [...new Set(priced.map((row) => row.month).filter(Boolean))];
  return {
    perServing,
    bases,
    month: months.join("; "),
    priced,
    unpriced,
    complete: unpriced.length === 0,
  };
}

export function formatCostLine(cost) {
  if (!cost) return "";
  const money = `$${cost.perServing.toFixed(2)}`;
  const basis = cost.bases.join("; ");
  const when = cost.month ? `, ${cost.month}` : "";
  if (cost.complete) {
    return `Ingredient cost per serving: ${money} (prices: ${basis}${when}).`;
  }
  const names = cost.priced.map((row) => row.food || row.item).slice(0, 4);
  const listed = names.length < cost.priced.length ? `${names.join(", ")}, and ${cost.priced.length - names.length} more` : names.join(", ");
  return `Ingredient cost per serving: ${money} for ${listed} (prices: ${basis}${when}). The other ingredients aren't in the priced studies, so this isn't the whole plate.`;
}
