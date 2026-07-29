/**
 * Build the single JSON index that /api/v1/* serves (growth method #25).
 *
 * WHY A BUILD-TIME INDEX INSTEAD OF READING CSVs AT THE EDGE
 * ---------------------------------------------------------
 * A Pages Function cannot read the repo's filesystem. It can only fetch assets,
 * so "read the CSVs per request" means 22 sequential asset fetches plus 22 CSV
 * parses on every single request. That is 22 subrequests against the Workers
 * 50-subrequest limit, for data that changes roughly once a quarter.
 *
 * So we do the parsing here, once per deploy, and ship one pre-typed JSON file.
 * The function fetches exactly one asset and caches the parsed object on the
 * module scope, so the second request in a warm isolate costs zero fetches.
 *
 * Source of truth is public/data/datapackage.json (Frictionless descriptor) for
 * the field schemas and public/data/*.csv for the numbers. Nothing here invents
 * a value: every metric key is derived from the field description the
 * datapackage already publishes, and rows that carry no per-dollar metric
 * (the day-cost menu rows) keep a null instead of a computed guess.
 *
 * Output: public/data/api-index-v1.json  (also a legitimate public download)
 * Run: node scripts/build-api-index.mjs   (wired into `npm run prebuild`)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "public", "data");
const OUT_FILE = join(DATA_DIR, "api-index-v1.json");

const SITE = "https://www.daily-life-hacks.com";

/* ------------------------------------------------------------------ *
 * CSV parsing (RFC 4180 subset: quoted fields, embedded commas/quotes)
 * ------------------------------------------------------------------ */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/* ------------------------------------------------------------------ *
 * Metric mapping — derived from the datapackage field descriptions
 * ------------------------------------------------------------------ */
/**
 * Returns the canonical metric key for a numeric field, or null when the field
 * is not a per-dollar metric. Explicit column names win; the generic `value`
 * column is resolved from its published description, which always says which
 * nutrient it counts.
 */
function metricKeyFor(field) {
  const name = field.name;
  const desc = (field.description || "").toLowerCase();

  if (name === "protein_g_per_dollar") return "protein_g_per_dollar";
  if (name === "fiber_g_per_dollar") return "fiber_g_per_dollar";
  if (name === "adjusted_g_per_dollar") return "quality_adjusted_protein_g_per_dollar";

  if (name === "value") {
    const perDollar = desc.includes("per us dollar");
    if (!perDollar) return null;
    const hasProtein = desc.includes("protein");
    const hasFiber = desc.includes("fiber");
    if (hasProtein && hasFiber) return "combined_g_per_dollar";
    if (hasProtein) return "protein_g_per_dollar";
    if (hasFiber) return "fiber_g_per_dollar";
  }

  return null;
}

const NUTRIENTS_BY_METRIC = {
  protein_g_per_dollar: ["protein"],
  fiber_g_per_dollar: ["fiber"],
  quality_adjusted_protein_g_per_dollar: ["protein"],
  combined_g_per_dollar: ["protein", "fiber"],
};

/** Nutrient amount columns (not per-dollar) still tell us what a row measures. */
const NUTRIENT_AMOUNT_FIELDS = {
  protein_g: "protein",
  protein_g_per_100g: "protein",
  fiber_g: "fiber",
  fiber_g_per_100g: "fiber",
};

function coerce(value, type) {
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "" || raw === undefined || raw === null) return null;
  if (type === "number" || type === "integer") {
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
  return String(raw);
}

/* ------------------------------------------------------------------ *
 * DATASETS (src/content/datasets.ts) gives us the study article per CSV
 * ------------------------------------------------------------------ */
async function loadDatasetsModule() {
  const tsPath = join(ROOT, "src", "content", "datasets.ts");
  const source = readFileSync(tsPath, "utf8");
  const { code } = await transform(source, { loader: "ts", format: "esm" });
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`;
  return import(dataUrl);
}

async function main() {
  const descriptor = JSON.parse(readFileSync(join(DATA_DIR, "datapackage.json"), "utf8"));
  const {
    DATASETS,
    DATA_LICENSE_URL,
    DATA_TERMS_URL,
    STUDY_DATASET_ORDER,
  } = await loadDatasetsModule();

  /** csv filename -> article slug */
  const slugByCsv = new Map();
  for (const [slug, meta] of Object.entries(DATASETS)) {
    slugByCsv.set(meta.csv.replace("/data/", ""), slug);
  }

  const orderIndex = new Map(STUDY_DATASET_ORDER.map((slug, i) => [slug, i]));

  const datasets = {};
  const rows = [];

  for (const resource of descriptor.resources) {
    const fileName = resource.path;
    const articleSlug = slugByCsv.get(fileName) ?? null;
    const meta = articleSlug ? DATASETS[articleSlug] : null;

    const fields = resource.schema.fields;
    const typeByField = new Map(fields.map((f) => [f.name, f.type]));

    const metricFields = [];
    for (const field of fields) {
      const key = metricKeyFor(field);
      if (key) metricFields.push({ column: field.name, key });
    }

    // The dataset's headline metric is whatever the `value` column counts, and
    // for the wide files (fiber-per-dollar, protein-per-dollar) it is the
    // explicit *_g_per_dollar column. First match in file order wins.
    const primaryMetric =
      metricFields.find((m) => m.column === "value")?.key ??
      metricFields[0]?.key ??
      null;

    const datasetNutrients = new Set();
    for (const m of metricFields) {
      for (const n of NUTRIENTS_BY_METRIC[m.key] || []) datasetNutrients.add(n);
    }
    for (const field of fields) {
      const n = NUTRIENT_AMOUNT_FIELDS[field.name];
      if (n) datasetNutrients.add(n);
    }

    const csvRows = parseCsv(readFileSync(join(DATA_DIR, fileName), "utf8"));
    const header = csvRows[0];
    const body = csvRows.slice(1);

    for (const cells of body) {
      const record = {};
      header.forEach((column, i) => {
        record[column] = coerce(cells[i], typeByField.get(column) || "string");
      });

      const metrics = {};
      for (const m of metricFields) {
        const v = record[m.column];
        if (typeof v === "number") metrics[m.key] = v;
      }

      const rowNutrients = new Set();
      for (const key of Object.keys(metrics)) {
        for (const n of NUTRIENTS_BY_METRIC[key] || []) rowNutrients.add(n);
      }
      for (const [column, n] of Object.entries(NUTRIENT_AMOUNT_FIELDS)) {
        if (typeof record[column] === "number") rowNutrients.add(n);
      }

      // `food` is the item name in every file except the fast-food one, where
      // the chain and the menu item are separate columns.
      const food = record.food ?? record.item ?? null;
      const category = record.category ?? record.chain ?? record.day ?? null;

      rows.push({
        dataset: resource.name,
        food,
        category,
        nutrients: [...rowNutrients].sort(),
        metrics,
        package: record.package || null,
        price_usd:
          record.package_price_usd ?? record.price_usd ?? record.cost_usd ?? null,
        price_basis: record.price_basis ?? record.basis ?? record.source ?? null,
        rank: typeof record.rank === "number" ? record.rank : null,
        fields: record,
      });
    }

    datasets[resource.name] = {
      id: resource.name,
      name: meta?.name ?? resource.title,
      title: resource.title,
      description: meta?.description ?? resource.description,
      long_description: resource.description,
      rows: body.length,
      nutrients: [...datasetNutrients].sort(),
      primary_metric: primaryMetric,
      metrics: metricFields.map((m) => m.key),
      temporal_coverage: meta?.temporal ?? "2026",
      spatial_coverage: "United States",
      csv_url: `${SITE}/data/${fileName}`,
      study_url: articleSlug ? `${SITE}/${articleSlug}/` : null,
      article_slug: articleSlug,
      api_url: `${SITE}/api/v1/foods?dataset=${resource.name}`,
      bytes: resource.bytes,
      hash: resource.hash,
      schema: fields.map((f) => ({
        name: f.name,
        type: f.type,
        description: f.description,
      })),
      order: articleSlug && orderIndex.has(articleSlug) ? orderIndex.get(articleSlug) : 999,
    };

    if (body.length !== resource.rowCount) {
      console.warn(
        `[build-api-index] row count drift in ${fileName}: CSV has ${body.length}, datapackage says ${resource.rowCount}`,
      );
    }
  }

  const index = {
    api_version: "v1",
    data_version: descriptor.version,
    data_created: descriptor.created,
    // Use the release timestamp, not the wall clock. Identical source data must
    // produce a byte-identical public index on every build.
    generated_at: descriptor.created,
    generator: "scripts/build-api-index.mjs",
    name: descriptor.name,
    title: descriptor.title,
    homepage: descriptor.homepage,
    methodology_url: `${SITE}/methodology/`,
    terms_url: DATA_TERMS_URL,
    license: "CC BY 4.0",
    license_url: DATA_LICENSE_URL,
    license_scope:
      "Daily Life Hacks selection, arrangement, calculations, field descriptions, and explanatory material; upstream facts and third-party material retain their own status and terms.",
    datapackage_url: `${SITE}/data/datapackage.json`,
    docs_url: `${SITE}/api-docs/`,
    openapi_url: `${SITE}/openapi.json`,
    attribution:
      "Data: Daily Life Hacks, https://www.daily-life-hacks.com/data/",
    attribution_html:
      '<a href="https://www.daily-life-hacks.com/data/">Data: Daily Life Hacks</a>',
    sources: descriptor.sources,
    dataset_count: Object.keys(datasets).length,
    row_count: rows.length,
    datasets,
    rows,
  };

  writeFileSync(OUT_FILE, JSON.stringify(index), "utf8");

  const bytes = Buffer.byteLength(JSON.stringify(index), "utf8");
  console.log(
    `[build-api-index] ${index.dataset_count} datasets, ${index.row_count} rows, ${(bytes / 1024).toFixed(1)} KB -> public/data/api-index-v1.json`,
  );
}

main().catch((err) => {
  console.error("[build-api-index] failed:", err);
  process.exit(1);
});
