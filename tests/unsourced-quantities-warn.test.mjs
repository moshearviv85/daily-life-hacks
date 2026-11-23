import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { findUnsourcedQuantities } from "../scripts/warn-unsourced-quantities.mjs";

test("a gram in a paragraph with no link is flagged", () => {
  const hits = findUnsourcedQuantities(`---
title: "Example"
---

Navy beans have 22 grams of protein per 100 grams.

Cooked lentils have [18 grams](https://fdc.nal.usda.gov/food-details/172421/nutrients).
`);
  assert.equal(hits.length, 1);
  assert.match(hits[0], /22 grams/);
});

test("the quantity scan is warning-only", () => {
  const result = spawnSync(process.execPath, ["scripts/warn-unsourced-quantities.mjs"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /unsourced g\/% warning: \d+ paragraph/);
});
