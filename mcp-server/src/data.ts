/**
 * Data layer for the Daily Life Hacks Food Value MCP server.
 *
 * Loads the bundled CSVs once at startup and builds the indexes the tools need.
 * There is no network access and no database: the whole corpus is 22 files and
 * 474 rows, so it lives in memory.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Resolve the bundled data directory whether we run from src/ or build/. */
function resolveDataDir(): string {
  const candidates = [
    join(HERE, "..", "data"), // build/  -> mcp-server/data
    join(HERE, "..", "..", "data"), // src/ via ts-node
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(
    `Could not locate the bundled data directory. Looked in: ${candidates.join(", ")}`,
  );
}

export const DATA_DIR = resolveDataDir();

export const SITE = "https://www.daily-life-hacks.com";
export const METHODOLOGY_URL = `${SITE}/methodology/`;
export const DATA_HUB_URL = `${SITE}/data/`;
export const TERMS_URL = `${SITE}/methodology/#data-license`;
export const TERMS_TEXT =
  "Free to use with attribution. Credit \"Daily Life Hacks\" and link back to the " +
  "study page or to https://www.daily-life-hacks.com/data/. Full terms at " +
  "https://www.daily-life-hacks.com/methodology/#data-license";
export const DATASET_VERSION = "2026.1";
export const PRICE_SNAPSHOT = "US national retail prices observed July 2026";

// ---------------------------------------------------------------------------
// CSV parsing (RFC4180-ish: handles quoted fields containing commas)
// ---------------------------------------------------------------------------

export type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const header = rows.shift();
  if (!header) return [];
  return rows
    .filter((r) => r.length === header.length && r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])) as Row);
}

// ---------------------------------------------------------------------------
// Descriptor: dataset file -> study article URL and human title
// ---------------------------------------------------------------------------

export interface DatasetInfo {
  file: string;
  title: string;
  studyUrl: string;
  rows: number;
  columns: string[];
}

/** Study article slug for each dataset file. Mirrors datapackage.json `sources`. */
const STUDY_SLUG: Record<string, string> = {
  "animal-protein-per-dollar-ranked-2026.csv": "animal-protein-per-dollar-ranked",
  "beans-double-win-fiber-protein-2026.csv": "beans-double-win-fiber-protein",
  "breakfast-staples-per-dollar-2026.csv": "breakfast-staples-per-dollar",
  "canned-vs-dry-beans-cost-2026.csv": "canned-vs-dry-beans-cost",
  "cheapest-complete-protein-pairs-2026.csv": "cheapest-complete-protein-pairs",
  "dairy-protein-per-dollar-ranked-2026.csv": "dairy-protein-per-dollar-ranked",
  "eggs-vs-everything-protein-value-2026.csv": "eggs-vs-everything-protein-value",
  "fastfood-protein-per-dollar-2026.csv": "fast-food-protein-per-dollar-ranked",
  "fiber-day-cost-2026.csv": "what-30-grams-of-fiber-costs-per-day",
  "fiber-per-dollar-2026.csv": "fiber-per-dollar-cheapest-high-fiber-foods",
  "grains-fiber-per-dollar-ranked-2026.csv": "grains-fiber-per-dollar-ranked",
  "high-fiber-snacks-per-dollar-2026.csv": "high-fiber-snacks-per-dollar",
  "meat-per-dollar-protein-ranked-2026.csv": "meat-per-dollar-protein-ranked",
  "no-cook-protein-per-dollar-2026.csv": "no-cook-protein-per-dollar",
  "one-dollar-fiber-what-it-buys-2026.csv": "one-dollar-fiber-what-it-buys",
  "one-dollar-protein-what-it-buys-2026.csv": "one-dollar-protein-what-it-buys",
  "plant-protein-per-dollar-ranked-2026.csv": "plant-protein-per-dollar-ranked",
  "produce-fiber-per-dollar-ranked-2026.csv": "produce-fiber-per-dollar-ranked",
  "protein-day-cost-2026.csv": "what-50-grams-of-protein-costs-per-day",
  "protein-per-dollar-2026.csv": "protein-per-dollar-cheapest-protein-sources",
  "protein-quality-per-dollar-2026.csv": "protein-per-dollar-adjusted-for-quality",
  "shelf-stable-pantry-per-dollar-2026.csv": "shelf-stable-pantry-per-dollar",
};

const TITLES: Record<string, string> = {
  "animal-protein-per-dollar-ranked-2026.csv": "Animal Protein per Dollar, Ranked",
  "beans-double-win-fiber-protein-2026.csv": "Beans: Fiber and Protein per Dollar",
  "breakfast-staples-per-dollar-2026.csv": "Breakfast Staples per Dollar",
  "canned-vs-dry-beans-cost-2026.csv": "Canned vs Dry Beans Cost",
  "cheapest-complete-protein-pairs-2026.csv": "Cheapest Complete-Protein Pairs",
  "dairy-protein-per-dollar-ranked-2026.csv": "Dairy Protein per Dollar, Ranked",
  "eggs-vs-everything-protein-value-2026.csv": "Eggs vs Everything: Protein Value",
  "fastfood-protein-per-dollar-2026.csv": "Fast Food Protein per Dollar",
  "fiber-day-cost-2026.csv": "What 30 g of Fiber Costs per Day",
  "fiber-per-dollar-2026.csv": "Fiber per Dollar Index",
  "grains-fiber-per-dollar-ranked-2026.csv": "Grains: Fiber per Dollar, Ranked",
  "high-fiber-snacks-per-dollar-2026.csv": "High-Fiber Snacks per Dollar",
  "meat-per-dollar-protein-ranked-2026.csv": "Meat: Protein per Dollar, Ranked",
  "no-cook-protein-per-dollar-2026.csv": "No-Cook Protein per Dollar",
  "one-dollar-fiber-what-it-buys-2026.csv": "One Dollar of Fiber: What It Buys",
  "one-dollar-protein-what-it-buys-2026.csv": "One Dollar of Protein: What It Buys",
  "plant-protein-per-dollar-ranked-2026.csv": "Plant Protein per Dollar, Ranked",
  "produce-fiber-per-dollar-ranked-2026.csv": "Produce: Fiber per Dollar, Ranked",
  "protein-day-cost-2026.csv": "What 50 g of Protein Costs per Day",
  "protein-per-dollar-2026.csv": "Protein per Dollar Index",
  "protein-quality-per-dollar-2026.csv": "Protein per Dollar, Adjusted for Quality (DIAAS)",
  "shelf-stable-pantry-per-dollar-2026.csv": "Shelf-Stable Pantry per Dollar",
};

export const studyUrl = (file: string): string =>
  STUDY_SLUG[file] ? `${SITE}/${STUDY_SLUG[file]}/` : DATA_HUB_URL;

// ---------------------------------------------------------------------------
// Load everything
// ---------------------------------------------------------------------------

export const DATASETS = new Map<string, Row[]>();
export const DATASET_INFO: DatasetInfo[] = [];

for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith(".csv")).sort()) {
  const rows = parseCsv(readFileSync(join(DATA_DIR, file), "utf8"));
  DATASETS.set(file, rows);
  DATASET_INFO.push({
    file,
    title: TITLES[file] ?? file,
    studyUrl: studyUrl(file),
    rows: rows.length,
    columns: rows.length ? Object.keys(rows[0]) : [],
  });
}

// ---------------------------------------------------------------------------
// Nutrient index: the three files that carry a full, audited per-dollar ranking
// ---------------------------------------------------------------------------

export type Nutrient = "protein" | "fiber" | "protein_quality_adjusted";

export interface NutrientSpec {
  file: string;
  /** Column holding grams of the nutrient per US dollar. */
  valueColumn: string;
  label: string;
  unitLabel: string;
  note: string;
}

export const NUTRIENTS: Record<Nutrient, NutrientSpec> = {
  protein: {
    file: "protein-per-dollar-2026.csv",
    valueColumn: "protein_g_per_dollar",
    label: "protein",
    unitLabel: "g protein per USD",
    note:
      "Raw protein mass. Does not account for protein quality; use " +
      "nutrient='protein_quality_adjusted' for the DIAAS-corrected ranking.",
  },
  fiber: {
    file: "fiber-per-dollar-2026.csv",
    valueColumn: "fiber_g_per_dollar",
    label: "dietary fiber",
    unitLabel: "g fiber per USD",
    note: "Dietary fiber, as-purchased, with USDA refuse percentages removed before ranking.",
  },
  protein_quality_adjusted: {
    file: "protein-quality-per-dollar-2026.csv",
    valueColumn: "adjusted_g_per_dollar",
    label: "DIAAS-adjusted protein",
    unitLabel: "g usable protein per USD",
    note:
      "Protein per dollar multiplied by DIAAS (Digestible Indispensable Amino Acid Score), " +
      "capped at 1.0 for multiplication. Covers the 25 foods that carry a published DIAAS value.",
  },
};

export interface FoodEntry {
  food: string;
  category: string | null;
  gramsPerDollar: number;
  packageSize: string | null;
  packagePriceUsd: number | null;
  priceBasis: string | null;
  /** Extra audited columns present in the source file (per-100g values, DIAAS, etc). */
  detail: Record<string, string | number>;
  sourceFile: string;
  studyUrl: string;
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function buildIndex(nutrient: Nutrient): FoodEntry[] {
  const spec = NUTRIENTS[nutrient];
  const rows = DATASETS.get(spec.file) ?? [];
  const out: FoodEntry[] = [];

  for (const r of rows) {
    const g = num(r[spec.valueColumn]);
    if (g === null || g <= 0) continue;

    const detail: Record<string, string | number> = {};
    for (const key of [
      "protein_g_per_100g",
      "fiber_g_per_100g",
      "package_weight_g",
      "edible_fraction",
      "price_per_100g_usd",
      "protein_g_per_dollar",
      "diaas_score",
      "diaas_method",
      "diaas_source",
      "notes",
      "rank",
    ]) {
      const v = r[key];
      if (v !== undefined && v.trim() !== "") {
        const n = Number(v);
        detail[key] = Number.isFinite(n) && v.trim() !== "" ? n : v;
      }
    }

    out.push({
      food: r.food,
      category: r.category ?? null,
      gramsPerDollar: g,
      packageSize: r.package ?? null,
      packagePriceUsd: num(r.package_price_usd),
      priceBasis: r.price_basis ?? null,
      detail,
      sourceFile: spec.file,
      studyUrl: studyUrl(spec.file),
    });
  }

  return out.sort((a, b) => b.gramsPerDollar - a.gramsPerDollar);
}

export const INDEX: Record<Nutrient, FoodEntry[]> = {
  protein: buildIndex("protein"),
  fiber: buildIndex("fiber"),
  protein_quality_adjusted: buildIndex("protein_quality_adjusted"),
};

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Resolve a loose food name ("black beans", "chicken breast") to an indexed entry.
 * Exact match wins, then whole-phrase substring, then all-token match, then
 * best partial-token overlap. Returns null when nothing plausibly matches.
 */
export function findFood(query: string, nutrient: Nutrient): FoodEntry | null {
  const entries = INDEX[nutrient];
  const q = normalize(query);
  if (!q) return null;

  const exact = entries.find((e) => normalize(e.food) === q);
  if (exact) return exact;

  const phrase = entries.filter((e) => normalize(e.food).includes(q));
  if (phrase.length) {
    return phrase.sort((a, b) => a.food.length - b.food.length)[0];
  }

  const qTokens = q.split(" ");
  const scored = entries
    .map((e) => {
      const eTokens = normalize(e.food).split(" ");
      const hits = qTokens.filter((t) =>
        eTokens.some((et) => et === t || et.startsWith(t) || t.startsWith(et)),
      ).length;
      return { entry: e, score: hits / qTokens.length };
    })
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score || a.entry.food.length - b.entry.food.length);

  return scored.length ? scored[0].entry : null;
}

/** Foods available for a nutrient, used to build helpful error messages. */
export const foodNames = (nutrient: Nutrient): string[] =>
  INDEX[nutrient].map((e) => e.food);

/** The attribution block attached to every tool response. */
export function attribution(sourceFiles: string[]) {
  const files = [...new Set(sourceFiles)];
  return {
    source: "Daily Life Hacks Food Value Data",
    dataset_version: DATASET_VERSION,
    source_datasets: files.map((f) => ({
      file: f,
      download_url: `${DATA_HUB_URL}${f}`,
      study_url: studyUrl(f),
    })),
    methodology_url: METHODOLOGY_URL,
    data_hub_url: DATA_HUB_URL,
    price_snapshot: PRICE_SNAPSHOT,
    terms_url: TERMS_URL,
    terms: TERMS_TEXT,
    credit_line:
      "Data: Daily Life Hacks Food Value Data (https://www.daily-life-hacks.com/data/)",
  };
}

export const round = (n: number, dp = 2): number =>
  Math.round(n * 10 ** dp) / 10 ** dp;
