import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const toolPaths = [
  "src/pages/tools/fiber-per-dollar-calculator.astro",
  "src/pages/tools/grocery-unit-price-calculator/index.astro",
  "src/pages/tools/grocery-budget-calculator/index.astro",
];

test("data provenance records only the confirmed coarse snapshot", () => {
  const provenance = JSON.parse(read("public/data/dataset-provenance.json"));

  assert.equal(provenance.priceObservation, "July 2026");
  assert.equal(provenance.geography, "United States");
  assert.match(provenance.coverage, /BLS national average prices/i);
  assert.match(provenance.coverage, /Walmart national listings/i);
  assert.equal(provenance.methodologyUrl, "/methodology/");
  assert.match(provenance.reviewCadence, /Quarterly price re-audit/i);

  for (const id of [
    "fiber-per-dollar-2026",
    "protein-per-dollar-2026",
    "fiber-day-cost-2026",
    "protein-day-cost-2026",
  ]) {
    assert.ok(provenance.datasets[id], `missing provenance for ${id}`);
    assert.match(provenance.datasets[id].csvUrl, /^\/data\/.+\.csv$/);
  }

  assert.doesNotMatch(JSON.stringify(provenance), /nextReview|sourceUrl|observedAt/);
});

test("reusable provenance card makes date, coverage, files, and limits visible", () => {
  const component = read("src/components/DataProvenance.astro");

  assert.match(component, /Prices observed/);
  assert.match(component, /Market coverage/);
  assert.match(component, /Review schedule/);
  assert.match(component, /Download the numbers/);
  assert.match(component, /The honest limits/);
  assert.match(component, /full methodology/);
  assert.match(component, /deployment timestamp/i);
});

test("all current research-backed tools use the provenance card", () => {
  for (const path of toolPaths) {
    const source = read(path);
    assert.match(source, /import DataProvenance from/);
    assert.match(source, /<DataProvenance/);
  }
});

test("HTTP Last-Modified is never presented as data freshness", () => {
  const sources = [
    read("src/components/DataProvenance.astro"),
    ...toolPaths.map(read),
  ].join("\n");

  assert.doesNotMatch(sources, /headers\s*\.\s*get\s*\(\s*["']last-modified["']\s*\)/i);
  assert.doesNotMatch(sources, /last[- ]modified/i);
  assert.doesNotMatch(sources, /file last updated/i);
});
