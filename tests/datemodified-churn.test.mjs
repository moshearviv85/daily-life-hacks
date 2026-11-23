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

test("more than five dateModified advances fail unless the PR is a content refresh with substantiveUpdate", () => {
  const advanced = (index, substantive) => ({
    path: `src/data/articles/example-${index}.md`,
    before: "2026-07-20",
    after: "2026-11-01",
    beforePublic: "2026-07-20",
    afterPublic: "2026-11-01",
    afterSubstantive: substantive ? "2026-11-01" : null,
  });
  const entries = Array.from({ length: DATEMODIFIED_FILE_LIMIT + 1 }, (_, index) =>
    advanced(index, false),
  );
  const stamped = entries.map((entry, index) => advanced(index, true));
  assert.equal(dateModifiedChurn(entries, []).ok, false);
  assert.equal(dateModifiedChurn(entries, ["content-refresh"]).ok, false);
  assert.equal(dateModifiedChurn(stamped, []).ok, false);
  assert.equal(dateModifiedChurn(stamped, ["content-refresh"]).ok, true);
  assert.equal(
    dateModifiedChurn(stamped.slice(0, DATEMODIFIED_FILE_LIMIT), []).ok,
    true,
  );
  assert.equal(
    dateModifiedChurn(entries.slice(0, DATEMODIFIED_FILE_LIMIT), []).ok,
    false,
  );
  assert.equal(
    dateModifiedChurn(
      [{ path: "src/data/articles/a.md", before: "2026-07-20", after: "2026-07-20" }],
      [],
    ).changed.length,
    0,
  );
  assert.deepEqual(
    dateModifiedChurn(
      [
        {
          path: "src/data/articles/removed.md",
          before: "2026-07-20",
          after: null,
          deleted: true,
        },
        {
          path: "src/data/articles/restored.md",
          before: "2026-11-23",
          after: "2026-07-20",
          beforePublic: "2026-11-23",
          afterPublic: "2026-07-20",
        },
        {
          path: "src/data/articles/kept.md",
          before: "2026-07-20",
          after: "2026-11-23",
          beforePublic: "2026-07-20",
          afterPublic: "2026-11-23",
          afterSubstantive: "2026-11-23",
        },
      ],
      [],
    ).changed.map((entry) => entry.path),
    ["src/data/articles/kept.md"],
  );
});

// A pull request that changes dateModified in more than five articles still
// needs the content-refresh label. The CI script reads that label. This test
// only rejects a date change that has no other edit in the same file.
test("this branch does not churn dateModified without a body edit", () => {
  const result = spawnSync(process.execPath, ["scripts/check-datemodified-churn.mjs"], {
    encoding: "utf8",
    env: { ...process.env, PR_LABELS: "" },
  });
  if (result.status === 0) {
    assert.match(result.stdout, /dateModified churn: \d+ article file/);
    return;
  }

  const changed = [...(result.stderr || "").matchAll(/^- (src\/data\/articles\/\S+\.md):/gm)].map(
    (match) => match[1],
  );
  assert.ok(changed.length > DATEMODIFIED_FILE_LIMIT, result.stderr || result.stdout);
  for (const path of changed) {
    const diff = spawnSync("git", ["diff", "-U0", "origin/main", "--", path], { encoding: "utf8" });
    assert.equal(diff.status, 0, diff.stderr);
    const bodyLines = diff.stdout
      .split("\n")
      .filter((line) => /^[+-]/.test(line) && !line.startsWith("+++") && !line.startsWith("---"));
    const nonDate = bodyLines.filter((line) => !/^[+-]dateModified:/.test(line));
    assert.ok(
      nonDate.length > 0,
      `${path} changes dateModified without another edit`,
    );
  }
});
