import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath) => readFileSync(join(root, relativePath), "utf8");
const renderedArticle = (slug) => read(`dist/${slug}/index.html`);
const articleHeader = (html) =>
  html.match(/<header class="mb-8">([\s\S]*?)<\/header>/)?.[0] ?? "";
const visibleMain = (html) =>
  html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? "";
const sourceCaption = (html) =>
  visibleMain(html).match(/<p><em>Source(?: audit)?:[\s\S]*?<\/em><\/p>/i)?.[0] ?? "";
const datasetCatalogRow = (html, slug) =>
  (visibleMain(html).match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []).find((row) =>
    row.includes(`href="/${slug}/"`),
  ) ?? "";
const tableRowContaining = (html, text) =>
  (html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []).find((row) =>
    row.includes(text),
  ) ?? "";

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell);
  return cells;
}

function fastFoodTopFiveVerification() {
  const lines = read("public/data/fastfood-protein-per-dollar-2026.csv")
    .trim()
    .split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const sourceIndex = header.indexOf("source");
  const topFiveSources = lines
    .slice(1, 6)
    .map(parseCsvLine)
    .map((row) => row[sourceIndex]);

  return {
    independentCount: topFiveSources.filter((source) => /\bindependent\b/i.test(source))
      .length,
    sameChainRecheckCount: topFiveSources.filter((source) =>
      /re-verified via McDonald's item API/i.test(source),
    ).length,
  };
}

function csvSourceClasses(relativePath) {
  return csvProvenanceSignals(relativePath).filter((sourceClass) =>
    ["grocery", "restaurant"].includes(sourceClass),
  );
}

function csvProvenanceSignals(relativePath) {
  const lines = read(relativePath).trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const basisIndex = header.indexOf("basis");
  const sourceIndex = header.indexOf("source");
  const priceBasisIndex = header.indexOf("price_basis");
  const diaasSourceIndex = header.indexOf("diaas_source");
  const signals = new Set();

  for (const row of lines.slice(1).map(parseCsvLine)) {
    const basis = row[basisIndex] ?? "";
    if (/^parent CSV:/i.test(basis)) signals.add("grocery");
    if (/chain nutrition|official nutrition/i.test(basis)) {
      signals.add("restaurant");
    }
    if (sourceIndex >= 0 && /nutrition|\.com\b|official/i.test(row[sourceIndex] ?? "")) {
      signals.add("restaurant");
    }
    if (priceBasisIndex >= 0 && /label value/i.test(row[priceBasisIndex] ?? "")) {
      signals.add("product-label");
    }
    if (diaasSourceIndex >= 0 && (row[diaasSourceIndex] ?? "").trim()) {
      signals.add("research");
    }
  }

  return [...signals].sort();
}

function csvProductLabelCounts(relativePath) {
  const lines = read(relativePath).trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const priceBasisIndex = header.indexOf("price_basis");
  const rows = lines.slice(1).map(parseCsvLine);

  return {
    total: rows.length,
    productLabel: rows.filter((row) =>
      /label value/i.test(row[priceBasisIndex] ?? ""),
    ).length,
  };
}

function csvNutritionSourceAudit(relativePath) {
  const lines = read(relativePath).trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const foodIndex = header.indexOf("food");
  const statusIndex = header.indexOf("nutrition_source_status");
  const rows = lines.slice(1).map(parseCsvLine);

  assert.notEqual(foodIndex, -1, `${relativePath} should declare a food column`);
  assert.notEqual(
    statusIndex,
    -1,
    `${relativePath} should declare nutrition_source_status`,
  );

  const counts = rows.reduce((result, row) => {
    const status = row[statusIndex];
    result[status] = (result[status] ?? 0) + 1;
    return result;
  }, {});

  return {
    counts,
    total: rows.length,
    statusFor(food) {
      return rows.find((row) => row[foodIndex] === food)?.[statusIndex] ?? "";
    },
  };
}

function joinedNutritionSourceAudit(
  derivativePath,
  parentPath = "public/data/protein-per-dollar-2026.csv",
) {
  const parentLines = read(parentPath).trim().split(/\r?\n/);
  const parentHeader = parseCsvLine(parentLines[0]);
  const parentFoodIndex = parentHeader.indexOf("food");
  const parentStatusIndex = parentHeader.indexOf("nutrition_source_status");
  const statusByFood = new Map(
    parentLines
      .slice(1)
      .map(parseCsvLine)
      .map((row) => [row[parentFoodIndex], row[parentStatusIndex]]),
  );
  const derivativeLines = read(derivativePath).trim().split(/\r?\n/);
  const derivativeHeader = parseCsvLine(derivativeLines[0]);
  const derivativeFoodIndex = derivativeHeader.indexOf("food");
  const foods = derivativeLines
    .slice(1)
    .map(parseCsvLine)
    .map((row) => row[derivativeFoodIndex]);
  const unmatched = foods.filter((food) => !statusByFood.has(food));
  const counts = { exact: 0, proxy: 0, unresolved: 0 };

  assert.deepEqual(
    unmatched,
    [],
    `${derivativePath} should join every food to ${parentPath}`,
  );
  for (const food of foods) {
    counts[statusByFood.get(food)] += 1;
  }

  return {
    counts,
    total: foods.length,
    statusFor(food) {
      return foods.includes(food) ? statusByFood.get(food) ?? "" : "";
    },
  };
}

function joinedMenuNutritionSourceAudit(
  derivativePath,
  parentPath = "public/data/fiber-per-dollar-2026.csv",
) {
  const parentLines = read(parentPath).trim().split(/\r?\n/);
  const parentHeader = parseCsvLine(parentLines[0]);
  const parentFoodIndex = parentHeader.indexOf("food");
  const parentStatusIndex = parentHeader.indexOf("nutrition_source_status");
  const statusByFood = new Map(
    parentLines
      .slice(1)
      .map(parseCsvLine)
      .map((row) => [row[parentFoodIndex], row[parentStatusIndex]]),
  );
  const derivativeLines = read(derivativePath).trim().split(/\r?\n/);
  const derivativeHeader = parseCsvLine(derivativeLines[0]);
  const basisIndex = derivativeHeader.indexOf("basis");
  const foods = derivativeLines
    .slice(1)
    .map(parseCsvLine)
    .map((row) => row[basisIndex])
    .filter((basis) => /^parent CSV:/i.test(basis))
    .map((basis) => basis.replace(/^parent CSV:\s*/i, ""));
  const unmatched = foods.filter((food) => !statusByFood.has(food));
  const counts = { exact: 0, proxy: 0, unresolved: 0 };

  assert.deepEqual(
    unmatched,
    [],
    `${derivativePath} should join every grocery basis to ${parentPath}`,
  );
  for (const food of foods) {
    counts[statusByFood.get(food)] += 1;
  }

  return { counts, total: foods.length, foods };
}

function jsonLdNodes(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => JSON.parse(match[1]))
    .flatMap((value) => value["@graph"] ?? [value]);
}

function registeredDatasets() {
  const registry = read("src/content/datasets.ts");
  const body =
    registry.match(/export const DATASETS:[\s\S]*?=\s*\{([\s\S]*?)\n\};/)?.[1] ??
    "";
  const starts = [...body.matchAll(/^\s{2}"([^"]+)":\s*\{/gm)];

  return starts.map((match, index) => {
    const entry = body.slice(
      match.index,
      starts[index + 1]?.index ?? body.length,
    );
    return {
      slug: match[1],
      csv: entry.match(/csv:\s*"([^"]+)"/)?.[1] ?? "",
      declaredClass:
        entry.match(/nutritionSourceClass:\s*"([^"]+)"/)?.[1] ?? "grocery",
    };
  });
}

test("dataset metadata defaults grocery studies to USDA and explicitly overrides fast food", () => {
  const registry = read("src/content/datasets.ts");
  const fastFoodBlock =
    registry.match(
      /"fast-food-protein-per-dollar-ranked":\s*\{([\s\S]*?)\n\s{2}\},/,
    )?.[1] ?? "";

  assert.match(registry, /export interface DatasetProvenance/);
  assert.match(
    registry,
    /return dataset\.provenance \?\? DEFAULT_GROCERY_DATASET_PROVENANCE/,
  );
  assert.match(
    registry,
    /DEFAULT_GROCERY_DATASET_PROVENANCE[\s\S]*?nutritionSource: "USDA FoodData Central"/,
  );
  assert.match(
    fastFoodBlock,
    /nutritionSource: "each chain's published nutrition data"/,
  );
  assert.doesNotMatch(fastFoodBlock, /USDA|FoodData Central/i);
});

test("rendered fast-food header attributes nutrition to restaurant chains, never USDA", () => {
  const header = articleHeader(
    renderedArticle("fast-food-protein-per-dollar-ranked"),
  );

  assert.match(
    header,
    /Nutrition values from\s*each chain(?:'|&#39;)s published nutrition data\./i,
  );
  assert.doesNotMatch(header, /USDA|FoodData Central/i);
});

test("ordinary rendered grocery studies retain the USDA source link", () => {
  const slug = "animal-protein-per-dollar-ranked";
  const header = articleHeader(renderedArticle(slug));

  assert.match(
    header,
    /Nutrition values from\s*<a[^>]+href="https:\/\/fdc\.nal\.usda\.gov\/"[^>]*>\s*USDA FoodData Central\s*<\/a>\./i,
    slug,
  );
});

test("data catalog scopes USDA grocery provenance and discloses the unresolved TVP value", () => {
  const html = read("dist/data/index.html");
  const main = visibleMain(html);
  const catalog = jsonLdNodes(html).find(
    (node) => node["@type"] === "DataCatalog",
  );
  const universalGroceryUsda =
    /\b(?:all|each|every)\b[^.]{0,120}\b(?:grocery|food)\b[^.]{0,120}\bUSDA\b/i;
  const unqualifiedGroceryUsda =
    /\bGrocery (?:rows|nutrition(?: numbers)?) (?:use|uses|come|comes) (?:from )?USDA\b/i;

  assert.ok(catalog, "rendered /data/ should include a DataCatalog node");
  assert.match(
    main,
    /three[^.]{0,100}datasets[^.]{0,100}recorded TVP product-label value/i,
  );
  assert.match(
    catalog.description,
    /three[^.]{0,100}datasets[^.]{0,100}unresolved recorded TVP product-label value/i,
  );
  assert.match(main, /unresolved[^.]{0,160}52\.2[^.]{0,160}50\.0/i);
  assert.match(main, /Grocery nutrition numbers generally come from/i);
  assert.match(main, /fast-food study uses each chain's published nutrition data/i);
  assert.doesNotMatch(main, universalGroceryUsda);
  assert.doesNotMatch(catalog.description, universalGroceryUsda);
  assert.doesNotMatch(main, unqualifiedGroceryUsda);
  assert.doesNotMatch(catalog.description, unqualifiedGroceryUsda);
});

test("API, Guides, and Research expose all four source classes without USDA-only claims", () => {
  const globalPages = [
    ["API docs", read("dist/api-docs/index.html")],
    ["Guides", read("dist/guides/index.html")],
    ["Research", read("dist/research/index.html")],
  ];
  const universalUsdaOnly =
    /\b(?:all|each|every)\b[^.]{0,160}\b(?:nutrition|nutrient|row|food|number|dataset)s?\b[^.]{0,160}\bUSDA\b/i;

  for (const [label, html] of globalPages) {
    const main = visibleMain(html);
    assert.match(main, /USDA FoodData Central/i, label);
    assert.match(main, /chain-published/i, label);
    assert.match(
      main,
      /three[^.]{0,100}datasets[^.]{0,100}recorded TVP product-label value/i,
      label,
    );
    assert.match(main, /unresolved[^.]{0,160}52\.2[^.]{0,160}50\.0/i, label);
    assert.match(main, /DIAAS/i, label);
    assert.match(main, /FAO\s+2013/i, label);
    assert.doesNotMatch(main, universalUsdaOnly, label);
    assert.doesNotMatch(main, /Nutrients are USDA FoodData Central/i, label);
    assert.doesNotMatch(main, /Every number[^.]{0,160}\bUSDA\b/i, label);
  }

  const apiSchema = jsonLdNodes(globalPages[0][1]).find(
    (node) => node["@type"] === "WebAPI",
  );
  assert.ok(apiSchema, "rendered /api-docs/ should include a WebAPI node");
  assert.match(apiSchema.description, /USDA FoodData Central/i);
  assert.match(apiSchema.description, /chain-published nutrition/i);
  assert.match(
    apiSchema.description,
    /three datasets carry one unresolved recorded TVP product-label value/i,
  );
  assert.match(apiSchema.description, /DIAAS rows cite literature or the FAO 2013 report/i);
  assert.doesNotMatch(apiSchema.description, /built from USDA FoodData Central/i);
});

test("TVP studies disclose the unresolved label mismatch and derivative joined statuses", () => {
  const studies = [
    {
      slug: "protein-per-dollar-cheapest-protein-sources",
      csv: "public/data/protein-per-dollar-2026.csv",
      source:
        "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
      derivative: false,
      expected: { exact: 36, proxy: 5, unresolved: 8 },
    },
    {
      slug: "plant-protein-per-dollar-ranked",
      csv: "public/data/plant-protein-per-dollar-ranked-2026.csv",
      source: "src/data/articles/plant-protein-per-dollar-ranked.md",
      derivative: true,
      expected: { exact: 13, proxy: 0, unresolved: 5 },
    },
    {
      slug: "eggs-vs-everything-protein-value",
      csv: "public/data/eggs-vs-everything-protein-value-2026.csv",
      source: "src/data/articles/eggs-vs-everything-protein-value.md",
      derivative: true,
      expected: { exact: 36, proxy: 5, unresolved: 8 },
    },
  ];
  const universalUsdaOnly =
    /\b(?:all|each|every)\b[^.]{0,160}\b(?:food|row|protein|nutrition)s?\b[^.]{0,160}\bUSDA\b/i;

  for (const { slug, csv, source, derivative, expected } of studies) {
    const counts = csvProductLabelCounts(csv);
    const html = renderedArticle(slug);
    const main = visibleMain(html);
    const sourceMarkdown = read(source);
    const audit = derivative
      ? joinedNutritionSourceAudit(csv)
      : csvNutritionSourceAudit(csv);
    const statusClaim = new RegExp(
      `${audit.counts.exact} exact USDA matches[^.]{0,120}` +
        `${audit.counts.proxy} close USDA prox(?:y|ies)[^.]{0,120}` +
        `${audit.counts.unresolved} unresolved rows?`,
      "i",
    );

    assert.equal(counts.productLabel, 1, `${slug} should have one label row`);
    assert.deepEqual(audit.counts, expected, slug);
    assert.equal(
      audit.statusFor("TVP (textured vegetable protein)"),
      "unresolved",
      slug,
    );
    assert.match(sourceMarkdown, statusClaim, `${slug} source counts`);
    assert.match(main, statusClaim, `${slug} rendered counts`);
    assert.match(
      main,
      /TVP[^.]{0,200}unresolved/i,
      slug,
    );
    assert.match(
      `${sourceMarkdown}\n${main}`,
      /TVP[^.]{0,220}(?:recorded product-label value|recorded 50\.0)[^.]{0,220}(?:no longer matches|current product page)/i,
      slug,
    );
    assert.doesNotMatch(
      `${sourceMarkdown}\n${main}`,
      /USDA FoodData Central for \d+ rows;\s*TVP uses 50\.0 grams per 100 grams from the product nutrition label/i,
      slug,
    );
    assert.doesNotMatch(main, universalUsdaOnly, slug);
    assert.doesNotMatch(
      main,
      /Protein values in this table come from USDA FoodData Central, and every price/i,
      slug,
    );
    assert.doesNotMatch(
      main,
      /Source:\s*USDA FoodData Central\s*\+\s*single-store prices/i,
      slug,
    );

    if (derivative) {
      const caption = sourceCaption(html);
      assert.match(caption, statusClaim, slug);
      assert.match(caption, /50\.0 is not label-verified/i, slug);
    } else {
      assert.match(main, /TVP[^.]{0,200}unresolved/i, slug);
    }
  }
});

test("guides derived from the 49-food protein study retain the TVP exception", () => {
  for (const slug of [
    "eat-healthy-on-a-budget-complete-playbook",
    "high-protein-on-a-budget-complete-guide",
  ]) {
    const main = visibleMain(renderedArticle(slug));
    assert.match(main, /36 exact USDA matches/i, slug);
    assert.match(main, /5 close USDA proxies/i, slug);
    assert.match(main, /8 unresolved rows/i, slug);
    assert.match(
      main,
      /TVP[^.]{0,160}unresolved[^.]{0,160}50\.0[^.]{0,160}52\.2/i,
      slug,
    );
    assert.doesNotMatch(main, /all from USDA nutrition data/i, slug);
    assert.doesNotMatch(
      main,
      /priced 49 common grocery foods against USDA protein data and ranked every one/i,
      slug,
    );
  }
});

test("eggs and plant derivative articles do not invent first-person experience", () => {
  for (const { slug, source } of [
    {
      slug: "eggs-vs-everything-protein-value",
      source: "src/data/articles/eggs-vs-everything-protein-value.md",
    },
    {
      slug: "plant-protein-per-dollar-ranked",
      source: "src/data/articles/plant-protein-per-dollar-ranked.md",
    },
  ]) {
    const publicBody = `${read(source)}\n${visibleMain(renderedArticle(slug))}`;

    assert.doesNotMatch(
      publicBody,
      /\b(?:for my money|I(?:'d| would) point|my regular rotation|better than I expected)\b/i,
      slug,
    );
  }
});

test("mixed menu-plan provenance is derived from CSV rows and rendered without USDA-only fallback", () => {
  const registry = read("src/content/datasets.ts");
  const catalogHtml = read("dist/data/index.html");
  const catalog = jsonLdNodes(catalogHtml).find(
    (node) => node["@type"] === "DataCatalog",
  );
  const mixedDatasets = [
    {
      slug: "what-30-grams-of-fiber-costs-per-day",
      csv: "public/data/fiber-day-cost-2026.csv",
      chainLabel: /restaurant chains(?:'|&#39;) published nutrition data/i,
    },
    {
      slug: "what-50-grams-of-protein-costs-per-day",
      csv: "public/data/protein-day-cost-2026.csv",
      chainLabel: /McDonald(?:'|&#39;)s published nutrition data/i,
    },
  ];

  assert.ok(catalog, "rendered /data/ should include a DataCatalog node");

  for (const { slug, csv, chainLabel } of mixedDatasets) {
    assert.deepEqual(
      csvSourceClasses(csv),
      ["grocery", "restaurant"],
      `${slug} should contain both source classes in its CSV`,
    );

    const registryBlock =
      registry.match(new RegExp(`"${slug}":\\s*\\{([\\s\\S]*?)\\n\\s{2}\\},`))?.[1] ??
      "";
    assert.match(registryBlock, /nutritionSourceClass: "mixed"/, slug);

    const header = articleHeader(renderedArticle(slug));
    assert.match(header, /Nutrition values from\s+USDA FoodData Central/i, slug);
    assert.match(header, chainLabel, slug);

    const schemaDataset = catalog.dataset.find(
      (dataset) =>
        dataset["@id"] ===
        `https://www.daily-life-hacks.com/${slug}/#dataset`,
    );
    assert.ok(schemaDataset, `missing catalog Dataset node for ${slug}`);
    assert.match(schemaDataset.description, /Nutrition source: USDA FoodData Central/i);
    assert.match(schemaDataset.description, chainLabel, slug);
  }

  assert.match(
    catalog.description,
    /mixed menu-plan datasets combine USDA and restaurant sources/i,
  );
});

test("every registered CSV declares every detectable non-USDA provenance class", () => {
  const datasets = registeredDatasets();
  const classCounts = {};

  // Floor, not an exact count. The real assertion is the per-dataset loop below;
  // pinning an exact total only broke the suite every time a legitimate study was
  // added (it went red at 23 when the sodium study shipped). A floor still catches
  // a dataset silently disappearing from the registry.
  assert.ok(
    datasets.length >= 22,
    `expected at least 22 registered datasets, found ${datasets.length}`,
  );

  for (const dataset of datasets) {
    assert.match(dataset.csv, /^\/data\/.+\.csv$/, dataset.slug);
    const signals = csvProvenanceSignals(`public${dataset.csv}`);
    const expectedClass = signals.includes("research")
      ? "mixed-research"
      : signals.includes("product-label")
        ? "mixed-label"
        : signals.includes("grocery") && signals.includes("restaurant")
          ? "mixed"
          : signals.includes("restaurant")
            ? "restaurant"
            : "grocery";

    assert.equal(
      dataset.declaredClass,
      expectedClass,
      `${dataset.slug} has CSV signals [${signals.join(", ")}]`,
    );
    classCounts[expectedClass] = (classCounts[expectedClass] ?? 0) + 1;
  }

  // Per-class floors, not a frozen snapshot. The real assertion is the per-dataset
  // equality inside the loop; this only guards that each provenance class is still
  // represented, so losing all restaurant or research datasets is still caught.
  // An exact distribution went red the moment a legitimate grocery study shipped
  // (grocery 15 -> 16), which tested "the catalog never changes", not provenance.
  for (const [cls, floor] of Object.entries({
    grocery: 15,
    "mixed-label": 3,
    mixed: 2,
    "mixed-research": 1,
    restaurant: 1,
  })) {
    assert.ok(
      (classCounts[cls] ?? 0) >= floor,
      `provenance class "${cls}" should have at least ${floor} dataset(s), found ${classCounts[cls] ?? 0}`,
    );
  }
  assert.deepEqual(
    Object.keys(classCounts).sort(),
    ["grocery", "mixed", "mixed-label", "mixed-research", "restaurant"],
    "an unrecognised provenance class appeared",
  );
});

test("DIAAS provenance names field-level research sources without calling all of them peer reviewed", () => {
  const rows = read("public/data/protein-quality-per-dollar-2026.csv")
    .trim()
    .split(/\r?\n/)
    .map(parseCsvLine);
  const sourceIndex = rows[0].indexOf("diaas_source");
  const sources = rows.slice(1).map((row) => row[sourceIndex]);
  const slug = "protein-per-dollar-adjusted-for-quality";
  const header = articleHeader(renderedArticle(slug));
  const dataHtml = read("dist/data/index.html");
  const catalog = jsonLdNodes(dataHtml).find(
    (node) => node["@type"] === "DataCatalog",
  );
  const schemaDataset = catalog.dataset.find(
    (dataset) =>
      dataset["@id"] ===
      `https://www.daily-life-hacks.com/${slug}/#dataset`,
  );
  const methodology = read("dist/methodology/index.html");

  assert.equal(sources.length, 25);
  assert.equal(sources.every(Boolean), true);
  assert.equal(new Set(sources).size, 17);
  assert.equal(csvProvenanceSignals("public/data/protein-quality-per-dollar-2026.csv").includes("research"), true);

  assert.match(header, /Nutrition values from[\s\S]*USDA FoodData Central/i);
  assert.match(
    header,
    /DIAAS values use the row-level literature and institutional sources cited in the raw CSV/i,
  );
  assert.ok(schemaDataset, "missing DIAAS Dataset node from /data/ JSON-LD");
  assert.match(schemaDataset.description, /Nutrition source: USDA FoodData Central/i);
  assert.match(
    schemaDataset.description,
    /DIAAS values use the row-level literature and institutional sources cited in the raw CSV/i,
  );

  assert.match(methodology, /Protein-quality inputs:/i);
  assert.match(methodology, /diaas_source/i);
  assert.match(methodology, /individual journal studies, review articles, and the FAO 2013 report/i);
  assert.match(methodology, /FAO report is an institutional report/i);
  assert.doesNotMatch(methodology, /all[^.]{0,80}peer-reviewed/i);
});

test("methodology separates grocery and restaurant provenance without universal verification claims", () => {
  const html = read("dist/methodology/index.html");

  assert.match(html, /one calculation framework, but not one source list/i);
  assert.match(html, /Grocery nutrition:/i);
  assert.match(html, /Restaurant nutrition and prices:/i);
  assert.doesNotMatch(html, /Every data study[^<]*same rules/i);
  assert.doesNotMatch(
    html,
    /Before any study goes live[^<]*every value[^<]*two independent USDA pulls/i,
  );
});

test("primary grocery studies disclose the exact CSV source-audit status counts", () => {
  const studies = [
    {
      slug: "fiber-per-dollar-cheapest-high-fiber-foods",
      source:
        "src/data/articles/fiber-per-dollar-cheapest-high-fiber-foods.md",
      csv: "public/data/fiber-per-dollar-2026.csv",
      counts: { exact: 38, proxy: 4, unresolved: 11 },
      total: 53,
    },
    {
      slug: "protein-per-dollar-cheapest-protein-sources",
      source:
        "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
      csv: "public/data/protein-per-dollar-2026.csv",
      counts: { exact: 36, proxy: 5, unresolved: 8 },
      total: 49,
    },
  ];
  const universalVerificationClaims = [
    /all (?:fiber|protein) values were re-verified/i,
    /re-verified every (?:fiber|protein) value/i,
    /every (?:fiber|protein) value[^.]{0,120}(?:verified|matched)/i,
    /(?:fiber|protein) (?:numbers|values)[^.]{0,120}for (?:each|all|48) rows[^.]{0,120}USDA/i,
  ];

  for (const study of studies) {
    const audit = csvNutritionSourceAudit(study.csv);
    const source = read(study.source);
    const rendered = visibleMain(renderedArticle(study.slug));
    const publicClaims = `${source}\n${rendered}`;

    assert.deepEqual(audit.counts, study.counts, study.slug);
    assert.equal(audit.total, study.total, study.slug);

    for (const [status, count] of Object.entries(study.counts)) {
      const statusWord = status === "proxy" ? "prox(?:y|ies)" : status;
      const statusClaim = new RegExp(`${count}[^.]{0,80}${statusWord}`, "i");
      assert.match(source, statusClaim, `${study.slug} source ${status}`);
      assert.match(rendered, statusClaim, `${study.slug} rendered ${status}`);
    }

    assert.match(
      publicClaims,
      /proxy[^.]{0,160}(?:not|isn't)[^.]{0,100}(?:exact|independently re-verified)/i,
      `${study.slug} should define the limit of a proxy`,
    );
    assert.match(
      publicClaims,
      /unresolved[^.]{0,180}(?:not|no)[^.]{0,100}(?:match|independently re-verified)/i,
      `${study.slug} should define the limit of an unresolved row`,
    );
    for (const claim of universalVerificationClaims) {
      assert.doesNotMatch(publicClaims, claim, study.slug);
    }
  }

  const fiberAudit = csvNutritionSourceAudit(
    "public/data/fiber-per-dollar-2026.csv",
  );
  const fiberClaims = `${read(studies[0].source)}\n${visibleMain(
    renderedArticle(studies[0].slug),
  )}`;

  assert.equal(fiberAudit.statusFor("Popcorn kernels"), "unresolved");
  assert.match(fiberClaims, /popcorn is unresolved/i);
});

test("fiber derivatives preserve the popcorn observation only as an unresolved form mismatch", () => {
  const studies = [
    {
      slug: "high-fiber-snacks-per-dollar",
      source: "src/data/articles/high-fiber-snacks-per-dollar.md",
      csv: "public/data/high-fiber-snacks-per-dollar-2026.csv",
      expected: { exact: 6, proxy: 0, unresolved: 4 },
    },
    {
      slug: "grains-fiber-per-dollar-ranked",
      source: "src/data/articles/grains-fiber-per-dollar-ranked.md",
      csv: "public/data/grains-fiber-per-dollar-ranked-2026.csv",
      expected: { exact: 9, proxy: 1, unresolved: 1 },
    },
    {
      slug: "one-dollar-fiber-what-it-buys",
      source: "src/data/articles/one-dollar-fiber-what-it-buys.md",
      csv: "public/data/one-dollar-fiber-what-it-buys-2026.csv",
      expected: { exact: 12, proxy: 1, unresolved: 2 },
    },
  ];
  const dataHtml = read("dist/data/index.html");
  const catalog = jsonLdNodes(dataHtml).find(
    (node) => node["@type"] === "DataCatalog",
  );

  assert.ok(catalog, "rendered /data/ should include a DataCatalog node");

  for (const study of studies) {
    const audit = joinedNutritionSourceAudit(
      study.csv,
      "public/data/fiber-per-dollar-2026.csv",
    );
    const source = read(study.source);
    const html = renderedArticle(study.slug);
    const main = visibleMain(html);
    const caption = sourceCaption(html);
    const header = articleHeader(html);
    const row = datasetCatalogRow(dataHtml, study.slug);
    const articleDataset = jsonLdNodes(html).find(
      (node) => node["@type"] === "Dataset",
    );
    const catalogDataset = catalog.dataset.find(
      (dataset) =>
        dataset["@id"] ===
        `https://www.daily-life-hacks.com/${study.slug}/#dataset`,
    );
    const statusClaim = new RegExp(
      `${audit.counts.exact} exact USDA matches[^.]{0,120}` +
        `${audit.counts.proxy} close USDA prox(?:y|ies)[^.]{0,120}` +
        `${audit.counts.unresolved} unresolved rows?`,
      "i",
    );

    assert.deepEqual(audit.counts, study.expected, study.slug);
    assert.equal(audit.statusFor("Popcorn kernels"), "unresolved", study.slug);
    assert.match(source, statusClaim, `${study.slug} source audit counts`);
    assert.match(main, statusClaim, `${study.slug} rendered audit counts`);
    assert.match(caption, statusClaim, `${study.slug} source caption`);
    assert.match(
      `${source}\n${main}`,
      /14\.5[^.]{0,100}air-popped popcorn[^.]{0,160}unpopped kernels/i,
      `${study.slug} direct form mismatch`,
    );
    assert.match(
      `${source}\n${main}`,
      /57\.7[^.]{0,100}(?:recorded|not verified|unverified|cannot)/i,
      `${study.slug} recorded-result boundary`,
    );
    assert.match(header, statusClaim, `${study.slug} article header`);
    assert.match(row, statusClaim, `${study.slug} catalog row`);
    assert.match(
      articleDataset?.description ?? "",
      statusClaim,
      `${study.slug} article Dataset JSON-LD`,
    );
    assert.match(
      catalogDataset?.description ?? "",
      statusClaim,
      `${study.slug} catalog Dataset JSON-LD`,
    );
  }
});

test("popcorn form mismatch is not restated as a verified USDA winner in derived copy", () => {
  const affectedSources = [
    "src/data/articles/high-fiber-snacks-per-dollar.md",
    "src/data/articles/grains-fiber-per-dollar-ranked.md",
    "src/data/articles/whole-wheat-flour-vs-quinoa-fiber-cost.md",
    "src/data/articles/cheap-lunch-ideas-cost-per-box.md",
    "src/data/articles/popcorn-vs-almonds-fiber-cost.md",
    "src/data/articles/one-dollar-fiber-what-it-buys.md",
    "src/data/articles/eat-healthy-on-a-budget-complete-playbook.md",
    "src/data/articles/fiber-per-dollar-cheapest-high-fiber-foods.md",
    "src/data/articles/popcorn-vs-potato-chips-fiber-comparison.md",
    "src/data/articles/produce-fiber-per-dollar-ranked.md",
    "src/data/articles/how-to-eat-more-fiber-on-a-budget-complete-guide.md",
  ];
  const prohibitedClaims = [
    /Plain popcorn kernels, at 57\.7 grams of fiber per dollar based on USDA/i,
    /Popcorn kernels deliver 57\.7 grams of fiber per dollar\./i,
    /Popcorn was the cheapest fiber we priced/i,
    /popcorn kernels[^.]{0,80}lead at 57\.7 grams per dollar/i,
    /Only popcorn beats carrots/i,
    /popcorn kernels ranked fifth overall at about 58 grams/i,
    /Popcorn kernels deliver nearly twenty times the fiber/i,
    /two pound bag of kernels[^.]{0,100}holds roughly 132 grams of fiber/i,
    /Popcorn is the budget MVP here/i,
  ];

  for (const sourcePath of affectedSources) {
    const source = read(sourcePath);
    for (const claim of prohibitedClaims) {
      assert.doesNotMatch(source, claim, sourcePath);
    }
  }
});

test("the cheapest fiber menu no longer depends on the unresolved popcorn row", () => {
  const audit = joinedMenuNutritionSourceAudit(
    "public/data/fiber-day-cost-2026.csv",
  );
  const source = read(
    "src/data/articles/what-30-grams-of-fiber-costs-per-day.md",
  );

  assert.equal(audit.total, 23);
  assert.deepEqual(audit.counts, { exact: 16, proxy: 1, unresolved: 6 });
  assert.equal(audit.foods.includes("Popcorn kernels"), false);
  assert.match(
    source,
    /23 grocery rows[\s\S]{0,250}16 exact[\s\S]{0,250}1 close proxy[\s\S]{0,250}6 unresolved rows/i,
  );
  assert.match(
    source,
    /Pearled barley, 23g dry[^|]*\|\s*3\.6 g\s*\|\s*\$0\.06/i,
  );
  assert.doesNotMatch(source, /Popcorn,\s*25g kernels/i);
});

test("public data tools expose popcorn's unresolved form mismatch wherever its values appear", () => {
  const calculatorHtml = read(
    "dist/tools/fiber-per-dollar-calculator/index.html",
  );
  const calculatorMain = visibleMain(calculatorHtml);
  const calculatorRow = tableRowContaining(calculatorMain, "Popcorn kernels");
  const calculatorSource = read(
    "src/pages/tools/fiber-per-dollar-calculator.astro",
  );
  const statisticsHtml = read("dist/statistics/index.html");
  const statisticsMain = visibleMain(statisticsHtml);
  const statisticsRow = tableRowContaining(statisticsMain, "Popcorn kernels");
  const databaseHtml = read("dist/food-value-database/index.html");
  const databaseMain = visibleMain(databaseHtml);
  const databaseRow =
    (databaseMain.match(
      /<tr\b[^>]*data-food-id="popcorn-kernels"[\s\S]*?<\/tr>/i,
    ) ?? [])[0] ?? "";
  const databaseSource = read(
    "src/pages/food-value-database/index.astro",
  );

  for (const [surface, main, row] of [
    ["calculator", calculatorMain, calculatorRow],
    ["statistics", statisticsMain, statisticsRow],
    ["food database", databaseMain, databaseRow],
  ]) {
    assert.ok(row, `${surface} should render the popcorn row`);
    assert.match(row, /57\.7/, `${surface} recorded value`);
    assert.match(
      row,
      /(?:unresolved|recorded,\s*(?:not verified|unresolved))/i,
      `${surface} status`,
    );
    assert.match(
      `${main}\n${row}`,
      /14\.5[^.]{0,120}air-popped popcorn[^.]{0,180}unpopped kernels/i,
      `${surface} mismatch reason`,
    );
    assert.doesNotMatch(
      main,
      /Nutrition values (?:use|from) USDA FoodData Central\./i,
      `${surface} must not imply every row is USDA-resolved`,
    );
  }

  assert.match(calculatorMain, /Source match/i);
  assert.match(calculatorMain, /38 exact matches/i);
  assert.match(calculatorMain, /4 close proxies/i);
  assert.match(calculatorMain, /11 unresolved rows/i);
  assert.match(
    calculatorSource,
    /No verified winner: at least one selected row is unresolved/i,
  );
  assert.match(calculatorSource, /Goal cost not calculated/i);
  assert.match(
    calculatorSource,
    /sourceStatus === "exact"[\s\S]{0,120}\.slice\(\)/,
    "calculator winner badges should use exact-source rows only",
  );
  assert.match(
    calculatorSource,
    /!exists && food && !isUnresolved\(food\)/,
    "calculator basket should exclude unresolved projections",
  );

  assert.match(statisticsRow, />5<\/td>/i);
  assert.match(statisticsMain, /published rank and recorded values/i);
  assert.match(
    statisticsMain,
    /unresolved rows\s+cannot\s+establish a verified winner/i,
  );

  assert.match(databaseMain, /Nutrition source match/i);
  assert.match(databaseRow, /14\.5g/i);
  assert.match(databaseRow, /Recorded,\s*unresolved/i);
  assert.match(databaseSource, /\["Fiber source match"/);
  assert.match(databaseSource, /fiberSourceStatus/);
});

test("flagship provenance metadata carries CSV-derived audit limits across every surface", () => {
  const studies = [
    {
      slug: "fiber-per-dollar-cheapest-high-fiber-foods",
      csv: "public/data/fiber-per-dollar-2026.csv",
      expected: { exact: 38, proxy: 4, unresolved: 11 },
      extraClaim: null,
    },
    {
      slug: "protein-per-dollar-cheapest-protein-sources",
      csv: "public/data/protein-per-dollar-2026.csv",
      expected: { exact: 36, proxy: 5, unresolved: 8 },
      extraClaim:
        /TVP is unresolved[^.]{0,160}recorded product-label value no longer matches the current product page/i,
    },
  ];
  const dataHtml = read("dist/data/index.html");
  const catalog = jsonLdNodes(dataHtml).find(
    (node) => node["@type"] === "DataCatalog",
  );

  assert.ok(catalog, "rendered /data/ should include a DataCatalog node");

  for (const study of studies) {
    const audit = csvNutritionSourceAudit(study.csv);
    const articleHtml = renderedArticle(study.slug);
    const header = articleHeader(articleHtml);
    const row = datasetCatalogRow(dataHtml, study.slug);
    const articleDataset = jsonLdNodes(articleHtml).find(
      (node) => node["@type"] === "Dataset",
    );
    const catalogDataset = catalog.dataset.find(
      (dataset) =>
        dataset["@id"] ===
        `https://www.daily-life-hacks.com/${study.slug}/#dataset`,
    );
    const statusClaim = new RegExp(
      `${audit.counts.exact} exact USDA matches[^.]{0,120}` +
        `${audit.counts.proxy} close USDA prox(?:y|ies)[^.]{0,120}` +
        `${audit.counts.unresolved} unresolved rows`,
      "i",
    );
    const surfaces = {
      header,
      "visible catalog row": row,
      "article Dataset JSON-LD": articleDataset?.description ?? "",
      "catalog Dataset JSON-LD": catalogDataset?.description ?? "",
    };

    assert.deepEqual(audit.counts, study.expected, study.slug);
    assert.ok(articleDataset, `${study.slug} article is missing Dataset JSON-LD`);
    assert.ok(catalogDataset, `${study.slug} is missing from DataCatalog JSON-LD`);

    for (const [surface, text] of Object.entries(surfaces)) {
      assert.match(
        text,
        /Primary nutrition source:\s*(?:<a[^>]*>\s*)?USDA FoodData Central/i,
        `${study.slug} ${surface}`,
      );
      assert.match(text, statusClaim, `${study.slug} ${surface}`);
      assert.match(
        text,
        /proxy and unresolved rows are not independently re-verified/i,
        `${study.slug} ${surface}`,
      );
      assert.doesNotMatch(
        text,
        /Nutrition values from\s*(?:<a[^>]*>)?USDA FoodData Central/i,
        `${study.slug} ${surface} must not imply full USDA resolution`,
      );
      assert.doesNotMatch(
        text,
        /Nutrition source:\s*USDA FoodData Central\.(?![\s\S]*\b(?:exact|proxy|unresolved)\b)/i,
        `${study.slug} ${surface} must not stop at a USDA-only claim`,
      );
      if (study.extraClaim) {
        assert.match(text, study.extraClaim, `${study.slug} ${surface}`);
      }
    }
  }
});

test("methodology reports the flagship FDC-link coverage derived from both CSVs", () => {
  const audits = [
    csvNutritionSourceAudit("public/data/fiber-per-dollar-2026.csv"),
    csvNutritionSourceAudit("public/data/protein-per-dollar-2026.csv"),
  ];
  const combined = audits.reduce(
    (result, audit) => {
      result.exact += audit.counts.exact ?? 0;
      result.proxy += audit.counts.proxy ?? 0;
      result.unresolved += audit.counts.unresolved ?? 0;
      return result;
    },
    { exact: 0, proxy: 0, unresolved: 0 },
  );
  const linked = combined.exact + combined.proxy;
  const source = read("src/pages/methodology.astro");
  const rendered = visibleMain(read("dist/methodology/index.html"));
  const publicClaims = `${source}\n${rendered}`;

  assert.deepEqual(combined, { exact: 74, proxy: 9, unresolved: 19 });
  assert.equal(linked, 83);

  for (const text of [source, rendered]) {
    assert.match(text, new RegExp(`${linked}[^.]{0,80}rows`, "i"));
    assert.match(text, new RegExp(`${combined.exact}[^.]{0,80}exact`, "i"));
    assert.match(text, new RegExp(`${combined.proxy}[^.]{0,80}prox`, "i"));
    assert.match(
      text,
      new RegExp(`${combined.unresolved}[^.]{0,80}unresolved`, "i"),
    );
  }

  assert.match(
    publicClaims,
    /proxy[^.]{0,160}not[^.]{0,100}(?:exact|verification)/i,
  );
  assert.match(
    publicClaims,
    /unresolved[^.]{0,160}(?:do not|can't|cannot)[^.]{0,100}exact record lookup/i,
  );
  assert.doesNotMatch(
    publicClaims,
    /current public exports[^.]*don't include FoodData Central IDs/i,
  );
  assert.doesNotMatch(
    publicClaims,
    /readers can inspect the values but can't reproduce an exact record lookup/i,
  );
});

test("public top-five verification claims match the CSV's documented source notes", () => {
  const { independentCount, sameChainRecheckCount } =
    fastFoodTopFiveVerification();
  const article = renderedArticle("fast-food-protein-per-dollar-ranked");
  const methodology = read("dist/methodology/index.html");
  const publicPages = `${article}\n${methodology}`;
  const documentedClaim = new RegExp(
    `documents independent second-source checks for\\s+${independentCount}\\s+of\\s+the\\s+top\\s+5\\s+items`,
    "i",
  );

  assert.equal(independentCount, 2);
  assert.equal(sameChainRecheckCount, 1);
  assert.match(article, documentedClaim);
  assert.match(methodology, documentedClaim);
  assert.doesNotMatch(
    publicPages,
    /For the top five items[^.]*re-verified[^.]*independent source/i,
  );
  assert.doesNotMatch(
    publicPages,
    /second-source check for the top five items only/i,
  );
});

test("Dataset measurementTechnique points both source classes to the corrected methodology", () => {
  const methodologyUrl = "https://www.daily-life-hacks.com/methodology/";
  const fastFood = renderedArticle("fast-food-protein-per-dollar-ranked");
  const grocery = renderedArticle("fiber-per-dollar-cheapest-high-fiber-foods");
  const catalog = read("dist/data/index.html");
  const technique = `"measurementTechnique":"${methodologyUrl}"`;

  assert.match(fastFood, new RegExp(technique));
  assert.match(grocery, new RegExp(technique));

  // Compare against the number of Dataset nodes actually in the catalog rather
  // than a frozen literal. The point is "every Dataset node carries it", which is
  // what breaks if a new study ships without the methodology link. Hardcoding 22
  // asserted something else entirely: that the catalog never grows.
  const datasetNodes = catalog.match(/"@type":"Dataset"/g)?.length ?? 0;
  const withTechnique = catalog.match(new RegExp(technique, "g"))?.length ?? 0;

  assert.ok(datasetNodes >= 22, `expected at least 22 Dataset nodes, found ${datasetNodes}`);
  assert.equal(
    withTechnique,
    datasetNodes,
    `every catalog Dataset node should point to the source-class-aware methodology (${withTechnique}/${datasetNodes} do)`,
  );
});
