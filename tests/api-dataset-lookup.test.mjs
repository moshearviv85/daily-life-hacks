import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { resolveDataset } from "../functions/api/v1/_lib.js";

const ROOT = new URL("..", import.meta.url).pathname;
const index = JSON.parse(readFileSync(join(ROOT, "public/data/api-index-v1.json"), "utf8"));

test("a shared live slug stays on the study that owns the page", () => {
  const fiberDay = resolveDataset(index.datasets, "what-30-grams-of-fiber-costs-per-day");
  const proteinQuality = resolveDataset(index.datasets, "protein-per-dollar-adjusted-for-quality");
  assert.equal(fiberDay?.id, "fiber-day-cost-2026");
  assert.equal(proteinQuality?.id, "protein-quality-per-dollar-2026");
});

test("redirected slugs still select the folded dataset, and file ids still win", () => {
  assert.equal(
    resolveDataset(index.datasets, "fiber-per-dollar-cheapest-high-fiber-foods")?.id,
    "fiber-per-dollar-2026",
  );
  assert.equal(
    resolveDataset(index.datasets, "protein-per-dollar-cheapest-protein-sources")?.id,
    "protein-per-dollar-2026",
  );
  assert.equal(
    resolveDataset(index.datasets, "canned-vs-dry-beans-cost")?.id,
    "canned-vs-dry-beans-cost-2026",
  );
  assert.equal(
    resolveDataset(index.datasets, "grains-fiber-per-dollar-ranked")?.id,
    "grains-fiber-per-dollar-ranked-2026",
  );
  assert.equal(resolveDataset(index.datasets, "fiber-per-dollar-2026")?.id, "fiber-per-dollar-2026");
  assert.equal(resolveDataset(index.datasets, "not-a-dataset"), null);
});
