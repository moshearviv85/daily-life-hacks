/**
 * Assemble the owner-upload bundle for Zenodo and a dataset refresh.
 *
 * Writes dataset-release/<YYYY-MM>/ (not dist/ and not build/). The folder
 * holds every study CSV, a README, CITATION.cff, and .zenodo.json.
 * Nothing here is uploaded. The owner runs the upload from their own accounts.
 *
 *   node scripts/build-dataset-release.mjs
 */

import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DATA = join(ROOT, "public", "data");
const SITE = "https://www.daily-life-hacks.com";
const REDIRECTED = [
  "/fiber-per-dollar-cheapest-high-fiber-foods",
  "/protein-per-dollar-cheapest-protein-sources",
  "/grains-fiber-per-dollar-ranked",
  "/produce-fiber-per-dollar-ranked",
  "/high-fiber-snacks-per-dollar",
  "/one-dollar-fiber-what-it-buys",
  "/dairy-protein-per-dollar-ranked",
  "/meat-per-dollar-protein-ranked",
  "/plant-protein-per-dollar-ranked",
  "/no-cook-protein-per-dollar",
  "/shelf-stable-pantry-per-dollar",
  "/one-dollar-protein-what-it-buys",
];

const MONTHS = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sept: "09",
  sep: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
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
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ""));
}

function pricedMonth(files) {
  const counts = new Map();
  const pattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\.?\s+(20\d{2})\b/gi;
  for (const file of files) {
    const rows = parseCsv(readFileSync(join(PUBLIC_DATA, file), "utf8"));
    const header = rows[0] ?? [];
    const indexes = header
      .map((name, index) => ({ name, index }))
      .filter(({ name }) => /price_basis|basis|source/i.test(name))
      .map(({ index }) => index);
    for (const cells of rows.slice(1)) {
      for (const index of indexes) {
        const cell = cells[index] ?? "";
        for (const match of cell.matchAll(pattern)) {
          const key = `${match[2]}-${MONTHS[match[1].toLowerCase()]}`;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
  }
  let best = "";
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  if (!best) throw new Error("No priced month found in study CSV price fields");
  return best;
}

function monthLabel(key) {
  const [year, month] = key.split("-");
  const full = {
    "01": "January",
    "02": "February",
    "03": "March",
    "04": "April",
    "05": "May",
    "06": "June",
    "07": "July",
    "08": "August",
    "09": "September",
    "10": "October",
    "11": "November",
    "12": "December",
  }[month];
  if (!full) throw new Error(`Unknown priced month ${key}`);
  return `${full} ${year}`;
}

function mentionsRedirect(text, slug) {
  const path = slug.startsWith("/") ? slug : `/${slug}`;
  return new RegExp(`${path}(?!-2026)(/|"|'|\\s|$)`).test(text);
}

function assertLive(url) {
  for (const slug of REDIRECTED) {
    if (mentionsRedirect(url, slug)) {
      throw new Error(`Release README would link a redirected URL: ${url}`);
    }
  }
}

function main() {
  const descriptor = JSON.parse(readFileSync(join(PUBLIC_DATA, "datapackage.json"), "utf8"));
  const files = descriptor.resources.map((resource) => resource.path);
  const monthKey = pricedMonth(files);
  const label = monthLabel(monthKey);
  const outDir = join(ROOT, "dataset-release", monthKey);
  const dataDir = join(outDir, "data");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });

  for (const file of files) {
    copyFileSync(join(PUBLIC_DATA, file), join(dataDir, file));
  }
  copyFileSync(join(ROOT, "public", "CITATION.cff"), join(outDir, "CITATION.cff"));

  const sections = descriptor.resources.map((resource) => {
    const study = resource.sources?.[0]?.path ?? `${SITE}/methodology/`;
    assertLive(study);
    const fields = (resource.schema?.fields ?? [])
      .map((field) => `| \`${field.name}\` | ${field.type} | ${String(field.description ?? "").replace(/\|/g, "/")} |`)
      .join("\n");
    return [
      `### ${resource.title}`,
      "",
      resource.description,
      "",
      `- **File:** \`data/${resource.path}\``,
      `- **Rows:** ${resource.rowCount} (header excluded)`,
      `- **Priced month:** ${label}`,
      `- **Study:** ${study}`,
      "",
      "| Column | Type | What it means |",
      "| --- | --- | --- |",
      fields,
      "",
    ].join("\n");
  });

  const readme = [
    "# Daily Life Hacks Food Value Data",
    "",
    `**Publisher:** Daily Life Hacks (organization). Priced month: ${label}. Version ${descriptor.version}.`,
    "",
    `This folder is the upload bundle for the public CSVs. It is generated by \`scripts/build-dataset-release.mjs\` and is not published by that script.`,
    "",
    `- Methodology: ${SITE}/methodology/`,
    `- Reuse terms: ${SITE}/data-reuse/`,
    `- Catalog: ${SITE}/data/`,
    `- Citation file: \`CITATION.cff\``,
    "",
    "## License",
    "",
    "To the extent Daily Life Hacks owns copyright or database rights in the selection, arrangement, calculations, field descriptions, and explanatory material, those contributions are licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) (CC BY 4.0). USDA FoodData Central and Bureau of Labor Statistics material remains subject to its own status and terms. Retailer names, product names, trademarks, and chain nutrition material stay with their owners.",
    "",
    "Attribute Daily Life Hacks and the CC BY 4.0 license, and say if you changed the material. The same scope is on the reuse page.",
    "",
    "## Column dictionary",
    "",
    `Prices in these files were observed in ${label} unless a row's \`price_basis\` names a different month. That priced month is the most common month written in the price fields.`,
    "",
    ...sections,
    "## How to cite",
    "",
    "The author is the organization Daily Life Hacks. There is no personal name on the citation.",
    "",
    "```",
    `Daily Life Hacks. (2026). Daily Life Hacks Food Value Data (Version ${descriptor.version}) [Data set]. ${SITE}/methodology/`,
    "```",
    "",
  ].join("\n");

  for (const slug of REDIRECTED) {
    if (mentionsRedirect(readme, slug)) {
      throw new Error(`README still mentions redirected slug ${slug}`);
    }
  }

  writeFileSync(join(outDir, "README.md"), readme, "utf8");

  const zenodo = {
    title: "Daily Life Hacks Food Value Data",
    upload_type: "dataset",
    description: readme.split("## Column dictionary")[0].trim(),
    license: "cc-by-4.0",
    version: descriptor.version,
    language: "eng",
    access_right: "open",
    keywords: [
      "grocery prices",
      "nutrition",
      "protein per dollar",
      "fiber per dollar",
      "USDA FoodData Central",
    ],
    creators: [
      {
        name: "Daily Life Hacks",
        affiliation: "Daily Life Hacks",
        type: "Organizational",
      },
    ],
    related_identifiers: [
      {
        identifier: `${SITE}/methodology/`,
        relation: "isDocumentedBy",
        scheme: "url",
      },
      {
        identifier: `${SITE}/data-reuse/`,
        relation: "isSupplementTo",
        scheme: "url",
      },
    ],
  };
  const creatorNames = JSON.stringify(zenodo.creators);
  if (/David|Miller|given-names|family-names/.test(creatorNames)) {
    throw new Error("Zenodo creators must be the organization only");
  }
  writeFileSync(join(outDir, ".zenodo.json"), `${JSON.stringify(zenodo, null, 2)}\n`, "utf8");
  console.log(`[build-dataset-release] ${files.length} CSVs -> dataset-release/${monthKey}/`);
}

main();
