import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateDataFoundation } from "../scripts/verify-data-foundation.mjs";

const read = (path) => readFileSync(path, "utf8");

test("public, API, and standalone data packages reconcile exactly", () => {
  const result = validateDataFoundation();

  assert.deepEqual(result.errors, []);
  assert.equal(result.datasetCount, 24);
  assert.equal(result.rowCount, 622);
  assert.equal(result.dataVersion, "2026.2");
});

test("statistics hub is derived from the release instead of hand-copying winners", () => {
  const page = read("src/pages/statistics/index.astro");

  assert.match(page, /import dataIndex from/);
  assert.match(page, /ranked\("fiber-per-dollar-2026", "fiber_g_per_dollar"\)/);
  assert.match(page, /ranked\("protein-per-dollar-2026", "protein_g_per_dollar"\)/);
  assert.match(page, /summarizeDays\("fiber-day-cost-2026", "fiber_g"\)/);
  assert.match(page, /summarizeDays\("protein-day-cost-2026", "protein_g"\)/);
  assert.match(page, /dataIndex\.row_count/);
  assert.match(page, /href="\/data\/"/);
  assert.match(page, /href="\/data-reuse\/"/);
  assert.doesNotMatch(page, /\u2014/);
});

test("dataset downloads emit a privacy-safe GA4 event from every primary surface", () => {
  const layout = read("src/layouts/BaseLayout.astro");
  const surfaces = [
    read("src/pages/data/index.astro"),
    read("src/pages/research/index.astro"),
    read("src/pages/statistics/index.astro"),
    read("src/pages/[slug].astro"),
    read("src/pages/food-value-database/index.astro"),
  ];

  assert.match(layout, /window\.gtag\('event', 'dataset_download'/);
  assert.match(layout, /dataset_id: datasetId/);
  assert.match(layout, /file_type: 'csv'/);
  assert.match(layout, /source_page: location\.pathname/);
  assert.match(layout, /\^\\\/data\\\/\[\^\/\]\+\\\.csv\$/);
  assert.match(layout, /url\.pathname\.split\('\/'\)/);
  assert.doesNotMatch(
    layout.match(/window\.gtag\('event', 'dataset_download', \{[\s\S]*?\}\);/)?.[0] ?? "",
    /search|query|referrer|textContent|innerText/,
  );

  for (const surface of surfaces) {
    assert.match(surface, /data-dataset-download/);
    assert.match(surface, /data-dataset-id/);
  }
});

test("API index generation is reproducible for one versioned data release", () => {
  const builder = read("scripts/build-api-index.mjs");

  assert.match(builder, /generated_at: descriptor\.created/);
  assert.doesNotMatch(builder, /generated_at: new Date/);
  assert.match(
    read("package.json"),
    /build-api-index\.mjs && node scripts\/verify-data-foundation\.mjs/,
  );
});

test("BLS monthly refresh regenerates registration files when CSVs change", () => {
  const workflow = read(".github/workflows/bls-monthly-refresh.yml");

  assert.match(workflow, /python scripts\/build_datapackage\.py/);
  assert.match(workflow, /node scripts\/build-api-index\.mjs/);
  assert.match(workflow, /node scripts\/verify-data-foundation\.mjs/);
  assert.match(workflow, /dist-datasets\/data\/bls-nutrition-per-dollar-latest\.csv/);
  assert.doesNotMatch(
    workflow,
    /Registration files \(datapackage, API index, dist mirror\) are NOT regenerated/,
  );
});
