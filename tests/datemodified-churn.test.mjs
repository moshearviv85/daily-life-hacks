import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  DATEMODIFIED_FILE_LIMIT,
  dateModifiedChurn,
  extractDateModified,
} from "../scripts/check-datemodified-churn.mjs";

test("dateModified parser ignores the publication date", () => {
  const markdown = `---
title: "Example"
date: 2026-04-28
dateModified: 2026-07-20
---
body
`;
  assert.equal(extractDateModified(markdown), "2026-07-20");
  assert.equal(extractDateModified("---\ndate: 2026-04-28\n---\n"), null);
});

test("more than five dateModified edits fail unless the PR is a content refresh", () => {
  const entries = Array.from({ length: DATEMODIFIED_FILE_LIMIT + 1 }, (_, index) => ({
    path: `src/data/articles/example-${index}.md`,
    before: "2026-07-20",
    after: "2026-11-01",
  }));
  assert.equal(dateModifiedChurn(entries, []).ok, false);
  assert.equal(dateModifiedChurn(entries.slice(0, DATEMODIFIED_FILE_LIMIT), []).ok, true);
  assert.equal(dateModifiedChurn(entries, ["content-refresh"]).ok, true);
  assert.equal(
    dateModifiedChurn(
      [{ path: "src/data/articles/a.md", before: "2026-07-20", after: "2026-07-20" }],
      [],
    ).changed.length,
    0,
  );
});

test("this branch does not churn dateModified", () => {
  const result = spawnSync(process.execPath, ["scripts/check-datemodified-churn.mjs"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /dateModified churn: \d+ article file/);
});
