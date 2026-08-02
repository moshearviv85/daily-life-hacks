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

// A manufacturer-label row is now declared in the dedicated nutrition_source_type
// column on the audited flagship CSVs ("Manufacturer label"), while the derivative
// exports that lack those columns still carry it inline in price_basis ("label
// value"). Both spellings mean the same provenance class, so detect either one
// rather than dropping the signal when a CSV gains proper source columns.
function isProductLabelRow(row, header) {
  const priceBasisIndex = header.indexOf("price_basis");
  const sourceTypeIndex = header.indexOf("nutrition_source_type");

  return (
    (priceBasisIndex >= 0 && /label value/i.test(row[priceBasisIndex] ?? "")) ||
    (sourceTypeIndex >= 0 &&
      /manufacturer label/i.test(row[sourceTypeIndex] ?? ""))
  );
}

function csvProvenanceSignals(relativePath) {
  const lines = read(relativePath).trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const basisIndex = header.indexOf("basis");
  const sourceIndex = header.indexOf("source");
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
    if (isProductLabelRow(row, header)) {
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
  const rows = lines.slice(1).map(parseCsvLine);

  return {
    total: rows.length,
    productLabel: rows.filter((row) => isProductLabelRow(row, header)).length,
  };
}

// A provenance class that has emptied out is still a claim the copy has to make,
// and no page writes "0 unresolved rows"; it writes "no unresolved rows". Building
// the expected wording from the CSV-derived count keeps the assertion honest for
// zero without letting a bare "0" match the "0" inside a number like "10".
const countWord = (count) => (count > 0 ? String(count) : "(?:no|zero)");

// The protein copy writes "10 close proxies"; the fiber copy writes "10 close USDA
// proxies". Same audit class, so the word USDA is optional here. The numbers are
// still pinned to the CSV-derived counts, which is what this claim protects.
const statusClaimFor = (counts) =>
  new RegExp(
    `${counts.exact} exact USDA matches[^.]{0,120}` +
      `${countWord(counts.proxy)} close (?:USDA )?prox(?:y|ies)[^.]{0,120}` +
      `${countWord(counts.unresolved)} unresolved rows?`,
    "i",
  );

// A surface only disclaims re-verification for the classes it actually contains.
// With the protein file's unresolved rows now resolved away, its copy correctly
// says "proxy rows are not independently re-verified" with no "and unresolved".
const reverificationClaimFor = (counts) =>
  counts.unresolved > 0
    ? /proxy and unresolved rows are not independently re-verified/i
    : /proxy rows are not independently re-verified/i;

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

  // Seeded with all three classes so a class that empties out reports 0 rather than
  // vanishing from the object. An absent key would let a deepEqual against a
  // three-key expectation fail for the wrong reason, or quietly pass a `?? 0`.
  const counts = rows.reduce(
    (result, row) => {
      const status = row[statusIndex];
      result[status] = (result[status] ?? 0) + 1;
      return result;
    },
    { exact: 0, proxy: 0, unresolved: 0 },
  );

  return {
    counts,
    total: rows.length,
    statusFor(food) {
      return rows.find((row) => row[foodIndex] === food)?.[statusIndex] ?? "";
    },
    // Full header-keyed record, so provenance columns (source type, FDC id, note)
    // can be asserted directly instead of being re-parsed in each test.
    rowFor(food) {
      const row = rows.find((cells) => cells[foodIndex] === food);
      return row
        ? Object.fromEntries(header.map((key, index) => [key, row[index]]))
        : undefined;
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

test("data catalog scopes USDA grocery provenance and discloses the manufacturer-label TVP source", () => {
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
  // TVP is no longer an unresolved label mismatch. USDA FoodData Central publishes
  // no textured vegetable protein record at all, so the row is a documented
  // non-USDA source: the manufacturer's own label at 52.17 g per 100 g. The catalog
  // must still scope the exception to three datasets and name the label as its
  // source; it must no longer describe it as unresolved.
  assert.match(
    catalog.description,
    /three[^.]{0,100}datasets[^.]{0,120}TVP value sourced to the manufacturer label/i,
  );
  assert.match(catalog.description, /USDA publishes no record for it/i);
  assert.match(main, /publishes\s+no\s+textured\s+vegetable\s+protein\s+record/i);
  assert.match(main, /manufacturer(?:&#39;|&#8217;|'|’)s\s+own\s+label/i);
  assert.match(main, /52\.17\s+grams\s+per\s+100\s+grams/i);
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
    // Same replacement as on /data/: the exception these pages have to disclose is
    // "USDA publishes no TVP record, so that row cites the manufacturer's label",
    // not the retired 50.0-vs-52.2 mismatch. These three pages summarise rather
    // than quote the density, so 52.17 is asserted on /data/ only.
    assert.match(
      main,
      /publishes\s+no\s+textured\s+vegetable\s+protein\s+record/i,
      label,
    );
    assert.match(
      main,
      /manufacturer(?:&#39;|&#8217;|'|’)s\s+own\s+label/i,
      label,
    );
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
  // Machine-readable copy of the same corrected exception.
  assert.match(
    apiSchema.description,
    /three datasets carry a TVP value sourced to the manufacturer label because USDA publishes no record for it/i,
  );
  assert.match(apiSchema.description, /DIAAS rows cite literature or the FAO 2013 report/i);
  assert.doesNotMatch(apiSchema.description, /built from USDA FoodData Central/i);
});

test("TVP studies disclose the manufacturer-label source and derivative joined statuses", () => {
  // Expected counts are the post-T1 audit of the protein CSV (49 rows: 39 exact,
  // 10 proxy, 0 unresolved) and, for the two derivatives, the same statuses joined
  // through the parent food names. Plant protein joins 18 of those foods, eggs
  // joins all 49. TVP moved unresolved -> proxy, which is why plant protein's proxy
  // count went 0 -> 5 and both unresolved columns emptied out.
  const studies = [
    {
      slug: "protein-per-dollar-cheapest-protein-sources",
      csv: "public/data/protein-per-dollar-2026.csv",
      source:
        "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
      derivative: false,
      expected: { exact: 39, proxy: 10, unresolved: 0 },
    },
    {
      slug: "plant-protein-per-dollar-ranked",
      csv: "public/data/plant-protein-per-dollar-ranked-2026.csv",
      source: "src/data/articles/plant-protein-per-dollar-ranked.md",
      derivative: true,
      expected: { exact: 13, proxy: 5, unresolved: 0 },
    },
    {
      slug: "eggs-vs-everything-protein-value",
      csv: "public/data/eggs-vs-everything-protein-value-2026.csv",
      source: "src/data/articles/eggs-vs-everything-protein-value.md",
      derivative: true,
      expected: { exact: 39, proxy: 10, unresolved: 0 },
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
    const statusClaim = statusClaimFor(audit.counts);

    assert.equal(counts.productLabel, 1, `${slug} should have one label row`);
    assert.deepEqual(audit.counts, expected, slug);
    // TVP is a proxy now, not unresolved: the row cites a real published source
    // (the manufacturer's label), it just is not a USDA record.
    assert.equal(
      audit.statusFor("TVP (textured vegetable protein)"),
      "proxy",
      slug,
    );
    assert.match(sourceMarkdown, statusClaim, `${slug} source counts`);
    assert.match(main, statusClaim, `${slug} rendered counts`);
    // Replaces the old "TVP discloses a label mismatch" assertions. There is no
    // mismatch left to disclose, so what these studies must still say is that the
    // row is a proxy, that USDA publishes no TVP record at all, and that the 52.17
    // figure is the manufacturer's own label rather than a USDA value.
    assert.match(main, /TVP is (?:a|one of those) prox(?:y|ies)/i, slug);
    assert.match(
      `${sourceMarkdown}\n${main}`,
      /publishes\s+no\s+(?:textured vegetable protein|TVP)\s+record/i,
      slug,
    );
    assert.match(
      `${sourceMarkdown}\n${main}`,
      /manufacturer(?:&#39;|&#8217;|'|’)?s?(?: own)?\s+(?:label|Nutrition Facts panel)/i,
      slug,
    );
    assert.match(`${sourceMarkdown}\n${main}`, /52\.17/, slug);
    // The retracted 50.0 g per 100 g figure matched neither the label nor any USDA
    // record, so it must not come back as TVP's density anywhere.
    assert.doesNotMatch(
      `${sourceMarkdown}\n${main}`,
      /TVP[^.]{0,160}50\.0 grams per 100 grams/i,
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
      // The caption used to warn that the recorded 50.0 was not label-verified.
      // The corrected 52.17 IS the label value, so the caption now has to carry the
      // non-USDA provenance instead of a verification warning about a dead number.
      assert.match(caption, /TVP is (?:a|one of those) prox(?:y|ies)/i, slug);
      assert.match(
        caption,
        /publishes\s+no\s+(?:textured vegetable protein|TVP)\s+record/i,
        slug,
      );
      assert.match(caption, /52\.17/, slug);
    }
  }

  // Rule-1 replacement at the data layer for the retired "label mismatch" claim.
  // What has to stay true of the one non-USDA row in the flagship protein CSV:
  // it announces that it is not a USDA record, it carries no FoodData Central id
  // it is not entitled to, and it names the manufacturer label as its source.
  const proteinAudit = csvNutritionSourceAudit(
    "public/data/protein-per-dollar-2026.csv",
  );
  const tvp = proteinAudit.rowFor("TVP (textured vegetable protein)");

  assert.ok(tvp, "protein CSV should still carry the TVP row");
  assert.equal(tvp.nutrition_source_status, "proxy");
  assert.equal(tvp.nutrition_source_type, "Manufacturer label");
  assert.equal(
    tvp.nutrition_source_id,
    "",
    "a manufacturer-label row must not claim a FoodData Central id",
  );
  assert.match(tvp.nutrition_source_note, /^NOT A USDA RECORD\b/);
  assert.equal(tvp.protein_g_per_100g, "52.17");
});

test("guides derived from the 49-food protein study retain the TVP exception", () => {
  // Derived from the CSV rather than frozen at 36/5/8. These guides quote the
  // flagship protein audit, so the numbers they owe the reader are whatever that
  // audit currently says (39 exact, 10 proxy, no unresolved rows).
  const counts = csvNutritionSourceAudit(
    "public/data/protein-per-dollar-2026.csv",
  ).counts;

  for (const slug of [
    "eat-healthy-on-a-budget-complete-playbook",
    "high-protein-on-a-budget-complete-guide",
  ]) {
    const main = visibleMain(renderedArticle(slug));
    assert.match(main, new RegExp(`${counts.exact} exact USDA matches`, "i"), slug);
    assert.match(
      main,
      new RegExp(`${countWord(counts.proxy)} close (?:USDA )?proxies`, "i"),
      slug,
    );
    assert.match(
      main,
      new RegExp(`${countWord(counts.unresolved)} unresolved rows?`, "i"),
      slug,
    );
    // The exception the guides must keep is no longer "TVP is unresolved because
    // 50.0 does not match 52.2". It is "TVP is a proxy because USDA has no record
    // for it, so the 52.17 figure comes off the manufacturer's label".
    assert.match(
      main,
      /TVP[^.]{0,80}prox(?:y|ies)[^.]{0,200}publishes no (?:textured vegetable protein|TVP) record/i,
      slug,
    );
    assert.match(main, /52\.17/, slug);
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
      // Exact counts stay exact here: this test IS the per-CSV status audit.
      // Post-T1 the fiber file resolves 42 rows to exact FDC records and 9 to
      // proxies, and deliberately keeps 2 unresolved (popcorn kernels, whose
      // 12.9 g/100g is derived rather than published, and frozen shelled edamame,
      // which moved proxy -> unresolved).
      counts: { exact: 42, proxy: 9, unresolved: 2 },
      total: 53,
    },
    {
      slug: "protein-per-dollar-cheapest-protein-sources",
      source:
        "src/data/articles/protein-per-dollar-cheapest-protein-sources.md",
      csv: "public/data/protein-per-dollar-2026.csv",
      // T1 resolved every previously unresolved protein row: 39 exact FDC records
      // and 10 proxies, one of which (TVP) is a manufacturer label because USDA
      // publishes no textured vegetable protein record.
      counts: { exact: 39, proxy: 10, unresolved: 0 },
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
      // countWord keeps the claim assertable when a class empties out: the copy
      // says "no unresolved rows", never "0 unresolved rows".
      const statusClaim = new RegExp(
        `${countWord(count)}[^.]{0,80}${statusWord}`,
        "i",
      );
      assert.match(source, statusClaim, `${study.slug} source ${status}`);
      assert.match(rendered, statusClaim, `${study.slug} rendered ${status}`);
    }

    assert.match(
      publicClaims,
      /proxy[^.]{0,160}(?:not|isn't)[^.]{0,100}(?:exact|independently re-verified)/i,
      `${study.slug} should define the limit of a proxy`,
    );
    // Only demanded of a study that still has unresolved rows. The protein file no
    // longer has any, so there is no unresolved limit for it to define; the proxy
    // limit above is still required of both.
    if (study.counts.unresolved > 0) {
      assert.match(
        publicClaims,
        /unresolved[^.]{0,180}(?:not|no)[^.]{0,100}(?:match|independently re-verified)/i,
        `${study.slug} should define the limit of an unresolved row`,
      );
    }
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

  // Popcorn kept unresolved status deliberately. Its 12.9 g per 100 g is DERIVED
  // from FDC 167959 (air-popped) by a popping-yield conversion to the as-sold
  // kernel basis; no published record supplies 12.9, so nothing can resolve it.
  // The copy therefore must not promote it to a resolved USDA proxy.
  assert.equal(fiberAudit.statusFor("Popcorn kernels"), "unresolved");
  assert.match(
    fiberClaims,
    /popcorn[^.]{0,60}(?:is|remains|stays) unresolved/i,
    "fiber copy should still call popcorn unresolved",
  );
  assert.doesNotMatch(
    fiberClaims,
    /popcorn is (?:now )?a proxy/i,
    "fiber copy must not present the derived popcorn figure as a resolved USDA proxy",
  );
});

test("fiber derivatives preserve the popcorn observation only as an unresolved derived value", () => {
  // Joined statuses recomputed after T1 resolved 18 of the 19 open fiber rows.
  // Each derivative now carries exactly one unresolved row, and in all three that
  // row is popcorn kernels.
  const studies = [
    {
      slug: "high-fiber-snacks-per-dollar",
      source: "src/data/articles/high-fiber-snacks-per-dollar.md",
      csv: "public/data/high-fiber-snacks-per-dollar-2026.csv",
      expected: { exact: 7, proxy: 2, unresolved: 1 },
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
      expected: { exact: 12, proxy: 2, unresolved: 1 },
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
    const statusClaim = statusClaimFor(audit.counts);

    assert.deepEqual(audit.counts, study.expected, study.slug);
    assert.equal(audit.statusFor("Popcorn kernels"), "unresolved", study.slug);
    assert.match(source, statusClaim, `${study.slug} source audit counts`);
    assert.match(main, statusClaim, `${study.slug} rendered audit counts`);
    assert.match(caption, statusClaim, `${study.slug} source caption`);
    // The disclosure moved from "USDA's 14.5 is air-popped while we priced unpopped
    // kernels" to naming the record it was derived from: FDC 167959 (air-popped),
    // converted onto the unpopped-kernel basis, landing at 12.9 g/100g.
    assert.match(
      `${source}\n${main}`,
      /FDC 167959[^.]{0,120}air-popped popcorn[^.]{0,200}unpopped[- ]kernel/i,
      `${study.slug} derived-basis disclosure`,
    );
    // The recorded result is now 51.3 g per dollar, and because 12.9 is our own
    // conversion rather than a published figure, the row stays unresolved.
    assert.match(
      `${source}\n${main}`,
      /51\.3[^.]{0,160}(?:unresolved|derived|our calculation|not verified)/i,
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
  // The 23 grocery rows behind these menus join to the post-T1 fiber audit as 18
  // exact and 5 proxy. None of them is unresolved now, which is exactly the point
  // of this test: the menu never leaned on the popcorn row.
  assert.deepEqual(audit.counts, { exact: 18, proxy: 5, unresolved: 0 });
  assert.equal(audit.foods.includes("Popcorn kernels"), false);
  // Built from the join rather than hardcoded, so the article stays pinned to
  // whatever the parent audit currently says about these same 23 rows.
  assert.match(
    source,
    new RegExp(
      `${audit.total} grocery rows[\\s\\S]{0,250}${audit.counts.exact} exact` +
        `[\\s\\S]{0,250}${countWord(audit.counts.proxy)} close prox(?:y|ies)` +
        `[\\s\\S]{0,250}${countWord(audit.counts.unresolved)} unresolved rows`,
      "i",
    ),
  );
  assert.match(
    source,
    /Pearled barley, 23g dry[^|]*\|\s*3\.6 g\s*\|\s*\$0\.06/i,
  );
  assert.doesNotMatch(source, /Popcorn,\s*25g kernels/i);
});

test("public data tools expose popcorn's unresolved derived value wherever it appears", () => {
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
  // Popcorn's published figures are read out of the CSV instead of frozen at
  // 57.7 / 14.5 / rank 5. The unit error (USDA's air-popped fiber density divided
  // by the price of unpopped kernels) was corrected to a derived kernel-basis
  // 12.9 g/100g, 51.3 g per dollar, rank 7. What these surfaces owe the reader is
  // whatever the CSV currently publishes, plus the unresolved status.
  const fiberAudit = csvNutritionSourceAudit(
    "public/data/fiber-per-dollar-2026.csv",
  );
  const popcorn = fiberAudit.rowFor("Popcorn kernels");

  assert.ok(popcorn, "fiber CSV should still carry the popcorn row");
  assert.equal(fiberAudit.statusFor("Popcorn kernels"), "unresolved");

  for (const [surface, main, row] of [
    ["calculator", calculatorMain, calculatorRow],
    ["statistics", statisticsMain, statisticsRow],
    ["food database", databaseMain, databaseRow],
  ]) {
    assert.ok(row, `${surface} should render the popcorn row`);
    assert.match(
      row,
      new RegExp(popcorn.fiber_g_per_dollar.replace(".", "\\.")),
      `${surface} recorded value`,
    );
    assert.match(
      row,
      /(?:unresolved|recorded,\s*(?:not verified|unresolved))/i,
      `${surface} status`,
    );
    // The reason changed from a bare form mismatch to a stated derivation: the
    // published 12.9 is our conversion of FDC 167959's air-popped value onto the
    // as-sold kernel basis, and each surface has to say it is not a USDA figure.
    assert.match(
      `${main}\n${row}`,
      /12\.9[\s\S]{0,60}DERIVED, not quoted[\s\S]{0,80}FDC 167959[\s\S]{0,120}air-popped/i,
      `${surface} derived-basis reason`,
    );
    assert.match(
      `${main}\n${row}`,
      /Treat it as our calculation, not as a USDA figure/i,
      `${surface} must not present the derived value as a USDA figure`,
    );
    assert.doesNotMatch(
      main,
      /Nutrition values (?:use|from) USDA FoodData Central\./i,
      `${surface} must not imply every row is USDA-resolved`,
    );
  }

  assert.match(calculatorMain, /Source match/i);
  // Derived from the fiber CSV instead of frozen at 38/4/11: the calculator
  // summarises the same audit, so its numbers must track it (42 exact, 9 proxy,
  // 2 unresolved after T1).
  assert.match(
    calculatorMain,
    new RegExp(`${fiberAudit.counts.exact} exact matches`, "i"),
  );
  assert.match(
    calculatorMain,
    new RegExp(`${countWord(fiberAudit.counts.proxy)} close proxies`, "i"),
  );
  assert.match(
    calculatorMain,
    new RegExp(`${countWord(fiberAudit.counts.unresolved)} unresolved rows?`, "i"),
  );
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

  // Rank read from the CSV, not frozen at 5. Correcting the unit error dropped
  // popcorn from rank 5 to rank 7, behind pearled barley and navy beans.
  assert.match(statisticsRow, new RegExp(`>${popcorn.rank}</td>`, "i"));
  assert.match(statisticsMain, /published rank and recorded values/i);
  assert.match(
    statisticsMain,
    /unresolved\s+rows\s+cannot\s+establish a verified winner/i,
  );

  assert.match(databaseMain, /Nutrition source match/i);
  // Density read from the CSV, not frozen at 14.5g: the published per-100g figure
  // is now the derived kernel-basis 12.9g.
  assert.match(
    databaseRow,
    new RegExp(`${popcorn.fiber_g_per_100g.replace(".", "\\.")}g`, "i"),
  );
  assert.match(databaseRow, /Recorded,\s*unresolved/i);
  assert.match(databaseSource, /\["Fiber source match"/);
  assert.match(databaseSource, /fiberSourceStatus/);
});

test("flagship provenance metadata carries CSV-derived audit limits across every surface", () => {
  const studies = [
    {
      slug: "fiber-per-dollar-cheapest-high-fiber-foods",
      // Post-T1 per-CSV audit: 42 exact, 9 proxy, 2 deliberately unresolved.
      csv: "public/data/fiber-per-dollar-2026.csv",
      expected: { exact: 42, proxy: 9, unresolved: 2 },
      extraClaim: null,
    },
    {
      slug: "protein-per-dollar-cheapest-protein-sources",
      // Post-T1 per-CSV audit: 39 exact, 10 proxy, nothing unresolved left.
      csv: "public/data/protein-per-dollar-2026.csv",
      expected: { exact: 39, proxy: 10, unresolved: 0 },
      // The old claim guarded a mismatch that no longer exists. The exception that
      // still has to reach every surface is that TVP is a proxy sourced to the
      // manufacturer label at 52.17 g/100g because USDA has no record for it.
      extraClaim:
        /TVP is a proxy:[^.]{0,200}sourced to the manufacturer label at 52\.17 grams per 100 grams/i,
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
    const statusClaim = statusClaimFor(audit.counts);
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
      // Scoped to the classes the study actually has. With no unresolved protein
      // rows left, its surfaces correctly say "proxy rows are not independently
      // re-verified"; the fiber surfaces still have to name both classes.
      assert.match(
        text,
        reverificationClaimFor(audit.counts),
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

  // Combined post-T1 audit of the two flagship CSVs (53 fiber + 49 protein = 102
  // rows): 81 exact, 19 proxy, 2 unresolved. T1 closed 18 of the 19 open rows.
  assert.deepEqual(combined, { exact: 81, proxy: 19, unresolved: 2 });

  // The methodology sentence is specifically about rows that expose an FDC ID and a
  // direct record link, which is NOT the same set as exact+proxy. TVP is proxy-status
  // but label-sourced, so it is resolved and still has no FDC ID to link. Counting
  // exact+proxy here would demand the page claim 100 links when only 99 exist.
  const fdcLinkedRows = [
    "public/data/fiber-per-dollar-2026.csv",
    "public/data/protein-per-dollar-2026.csv",
  ].reduce((total, path) => {
    const lines = read(path).trim().split(/\r?\n/);
    const header = parseCsvLine(lines[0]);
    const idIndex = header.indexOf("nutrition_source_id");
    return (
      total +
      lines
        .slice(1)
        .map(parseCsvLine)
        .filter((row) => /^FDC \d+$/.test((row[idIndex] ?? "").trim())).length
    );
  }, 0);
  assert.equal(fdcLinkedRows, 99);

  for (const text of [source, rendered]) {
    assert.match(text, new RegExp(`${fdcLinkedRows}[^.]{0,80}rows`, "i"));
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
