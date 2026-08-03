/**
 * Fail closed when the public data catalog and the standalone distribution
 * package drift apart.
 *
 * Run after scripts/build-api-index.mjs. This is read-only: it validates the
 * generated files but never "fixes" a package by silently rewriting metadata.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DATA = join(ROOT, "public", "data");
const DIST_ROOT = join(ROOT, "dist-datasets");
const MCP_DATA_ROOT = join(ROOT, "mcp-server", "data");
const TERMS_URL = "https://www.daily-life-hacks.com/data-reuse/";
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function canonicalCsvBytes(path) {
  return Buffer.from(readFileSync(path, "utf8").replace(/\r\n/g, "\n"), "utf8");
}

function sha256Csv(path) {
  return `sha256:${createHash("sha256").update(canonicalCsvBytes(path)).digest("hex")}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function comparableResource(resource) {
  return {
    ...resource,
    path: basename(resource.path),
  };
}

export function validateDataFoundation() {
  const errors = [];
  const publicPackage = json(join(PUBLIC_DATA, "datapackage.json"));
  const distPackage = json(join(DIST_ROOT, "datapackage.json"));
  const apiIndex = json(join(PUBLIC_DATA, "api-index-v1.json"));
  const registrySource = readFileSync(join(ROOT, "src", "content", "datasets.ts"), "utf8");
  const articleRoute = readFileSync(join(ROOT, "src", "pages", "[slug].astro"), "utf8");
  const methodology = readFileSync(join(ROOT, "src", "pages", "methodology.astro"), "utf8");
  const reusePage = readFileSync(join(ROOT, "src", "pages", "data-reuse.astro"), "utf8");
  const citation = readFileSync(join(DIST_ROOT, "CITATION.cff"), "utf8");

  const publicResources = publicPackage.resources || [];
  const distResources = distPackage.resources || [];
  const publicByName = new Map(publicResources.map((resource) => [resource.name, resource]));
  const distByName = new Map(distResources.map((resource) => [resource.name, resource]));

  if (publicResources.length !== 24) {
    errors.push(`public datapackage has ${publicResources.length} resources, expected 24`);
  }
  if (distResources.length !== publicResources.length) {
    errors.push(
      `standalone datapackage has ${distResources.length} resources, public has ${publicResources.length}`,
    );
  }

  const registryCsvs = [
    ...registrySource.matchAll(/csv:\s*"\/data\/([^"]+\.csv)"/g),
  ].map((match) => match[1]);
  if (new Set(registryCsvs).size !== publicResources.length) {
    errors.push(
      `Dataset registry has ${new Set(registryCsvs).size} CSVs, datapackage has ${publicResources.length}`,
    );
  }

  let rowTotal = 0;
  for (const resource of publicResources) {
    const publicCsv = join(PUBLIC_DATA, resource.path);
    const distCsv = join(DIST_ROOT, "data", basename(resource.path));
    const csvRows = parseCsv(readFileSync(publicCsv, "utf8"));
    const header = csvRows[0] || [];
    const body = csvRows.slice(1);
    rowTotal += body.length;

    if (body.length !== resource.rowCount) {
      errors.push(
        `${resource.name}: public CSV has ${body.length} rows, descriptor says ${resource.rowCount}`,
      );
    }
    if (canonicalCsvBytes(publicCsv).byteLength !== resource.bytes) {
      errors.push(`${resource.name}: public descriptor byte count is stale`);
    }
    if (sha256Csv(publicCsv) !== resource.hash) {
      errors.push(`${resource.name}: public descriptor hash is stale`);
    }

    const schemaFields = resource.schema?.fields || [];
    if (schemaFields.length !== header.length) {
      errors.push(
        `${resource.name}: schema has ${schemaFields.length} fields, CSV has ${header.length}`,
      );
    }
    schemaFields.forEach((field, index) => {
      if (field.name !== header[index]) {
        errors.push(
          `${resource.name}: schema field ${index + 1} is ${field.name}, CSV header is ${header[index]}`,
        );
      }
      if (!field.description || field.description.length < 20) {
        errors.push(`${resource.name}.${field.name}: field description is missing or too short`);
      }
    });

    const distResource = distByName.get(resource.name);
    if (!distResource) {
      errors.push(`${resource.name}: missing from standalone datapackage`);
      continue;
    }
    if (
      JSON.stringify(comparableResource(resource)) !==
      JSON.stringify(comparableResource(distResource))
    ) {
      errors.push(`${resource.name}: public and standalone resource metadata differ`);
    }
    if (sha256Csv(publicCsv) !== sha256Csv(distCsv)) {
      errors.push(`${resource.name}: public and standalone CSV contents differ`);
    }

    // The MCP server ships its own copy of these CSVs and nothing kept it in
    // sync, so it silently served pre-correction values (the popcorn unit error
    // and the unsupported TVP density) for as long as they existed upstream.
    // Only files it actually mirrors are checked; it does not carry every CSV.
    const mcpCsv = join(MCP_DATA_ROOT, basename(resource.path));
    if (existsSync(mcpCsv) && sha256Csv(publicCsv) !== sha256Csv(mcpCsv)) {
      errors.push(
        `${resource.name}: mcp-server/data copy is stale against public/data`,
      );
    }
  }

  for (const resource of distResources) {
    if (!publicByName.has(resource.name)) {
      errors.push(`${resource.name}: standalone-only resource has no public counterpart`);
    }
  }

  if (rowTotal !== 622) {
    errors.push(`CSV row total is ${rowTotal}, expected 622`);
  }
  if (apiIndex.dataset_count !== publicResources.length) {
    errors.push(
      `API index has ${apiIndex.dataset_count} datasets, datapackage has ${publicResources.length}`,
    );
  }
  if (apiIndex.row_count !== rowTotal || apiIndex.rows?.length !== rowTotal) {
    errors.push(
      `API index row count is ${apiIndex.row_count}/${apiIndex.rows?.length}, CSV total is ${rowTotal}`,
    );
  }
  if (apiIndex.data_version !== publicPackage.version) {
    errors.push(
      `API data version ${apiIndex.data_version} differs from package ${publicPackage.version}`,
    );
  }
  if (!registrySource.includes(`DATA_VERSION = "${publicPackage.version}"`)) {
    errors.push("Dataset registry version differs from the public data package");
  }
  const releaseDay = String(publicPackage.created || "").slice(0, 10);
  if (!registrySource.includes(`DATA_RELEASE_DATE = "${releaseDay}"`)) {
    errors.push("Dataset registry release date differs from the public data package");
  }
  if (apiIndex.generated_at !== publicPackage.created) {
    errors.push(
      "API index isn't reproducible: generated_at must equal the versioned package release timestamp",
    );
  }

  for (const resource of publicResources) {
    const indexed = apiIndex.datasets?.[resource.name];
    if (!indexed) {
      errors.push(`${resource.name}: missing from API index`);
      continue;
    }
    if (indexed.hash !== resource.hash || indexed.bytes !== resource.bytes) {
      errors.push(`${resource.name}: API index hash or byte count is stale`);
    }
    if (!indexed.name || indexed.description?.length < 50 || indexed.description.length > 5000) {
      errors.push(`${resource.name}: Google Dataset name/description requirements aren't met`);
    }
    if (!indexed.csv_url || !indexed.study_url || !indexed.schema?.length) {
      errors.push(`${resource.name}: API discovery metadata is incomplete`);
    }
  }

  for (const descriptor of [publicPackage, distPackage]) {
    const license = descriptor.licenses?.find((item) => item.name === "CC-BY-4.0");
    if (!license || license.path !== LICENSE_URL) {
      errors.push("data package is missing the machine-readable CC BY 4.0 license");
    }
  }
  if (!publicPackage.description?.includes(TERMS_URL)) {
    errors.push("public datapackage doesn't point to the current reuse terms");
  }
  if (!methodology.includes('id="data-license"')) {
    errors.push("reuse-terms anchor is missing from /methodology/");
  }
  if (
    !/selection,\s+arrangement,\s+calculations,\s+field descriptions/.test(reusePage) ||
    !reusePage.includes("third-party content remain")
  ) {
    errors.push("reuse page doesn't preserve the owned-rights and third-party scope boundary");
  }
  if (!citation.includes("Creative Commons Attribution 4.0 International")) {
    errors.push("CITATION.cff doesn't identify the CC BY 4.0 license");
  }
  if (
    apiIndex.license_url !== LICENSE_URL ||
    apiIndex.terms_url !== TERMS_URL ||
    !apiIndex.license_scope?.includes("third-party material")
  ) {
    errors.push("API index license metadata is missing or incomplete");
  }

  for (const required of [
    '"@type": "Dataset"',
    'identifier: `${articleUrl}#dataset`',
    "version: DATA_VERSION",
    '"@type": "DataDownload"',
    'encodingFormat: "text/csv"',
    "contentUrl:",
    "license:",
  ]) {
    if (!articleRoute.includes(required)) {
      errors.push(`canonical Dataset schema is missing: ${required}`);
    }
  }

  return {
    errors,
    datasetCount: publicResources.length,
    rowCount: rowTotal,
    dataVersion: publicPackage.version,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateDataFoundation();
  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `data foundation OK: ${result.datasetCount} datasets, ${result.rowCount} rows, version ${result.dataVersion}`,
    );
  }
}
