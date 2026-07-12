import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  auditArticleFiles,
  loadClusterRegistry,
  readClusterFrontmatter,
} from "../scripts/audit-content-clusters.mjs";


const ROOT = path.resolve(import.meta.dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "audit-content-clusters.mjs");
const PARENTS = new Set([
  "how-to-eat-more-fiber-on-a-budget-complete-guide",
  "high-protein-on-a-budget-complete-guide",
  "eat-healthy-on-a-budget-complete-playbook",
  "meal-prep-for-beginners-complete-system",
]);


function article(frontmatter) {
  return `---\ntitle: Test article\n${frontmatter}\n---\nBody\n`;
}


function writeTempArticle(directory, slug, frontmatter) {
  const file = path.join(directory, `${slug}.md`);
  fs.writeFileSync(file, article(frontmatter), "utf8");
  return file;
}


test("registry starts with the four controlled Batch B branch clusters", () => {
  const registry = loadClusterRegistry(
    path.join(ROOT, "src", "content", "clusters.ts"),
  );

  assert.deepEqual(
    registry.map((entry) => entry.id),
    [
      "budget-fiber",
      "budget-protein",
      "weekly-budget-shopping",
      "meal-prep-food-storage",
    ],
  );
  assert.deepEqual(
    registry.map((entry) => entry.parentPillar),
    [...PARENTS],
  );
});


test("frontmatter parser accepts quoted and unquoted controlled values", () => {
  assert.deepEqual(
    readClusterFrontmatter(
      article(
        'cluster: "budget-fiber"\nparentPillar: how-to-eat-more-fiber-on-a-budget-complete-guide',
      ),
    ),
    {
      cluster: "budget-fiber",
      parentPillar: "how-to-eat-more-fiber-on-a-budget-complete-guide",
    },
  );
});


test("valid spoke and parent assignments pass the bounded audit", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-clusters-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const spoke = writeTempArticle(
    directory,
    "budget-spoke",
    "cluster: weekly-budget-shopping\nparentPillar: eat-healthy-on-a-budget-complete-playbook",
  );
  const parent = writeTempArticle(
    directory,
    "eat-healthy-on-a-budget-complete-playbook",
    "cluster: weekly-budget-shopping",
  );

  const result = auditArticleFiles([spoke, parent], {
    knownArticleSlugs: PARENTS,
  });

  assert.equal(result.articlesWithIssues, 0);
});


test("audit reports missing, unknown, mismatched, and self-referential metadata", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-clusters-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const missing = writeTempArticle(directory, "missing", "category: tips");
  const unknown = writeTempArticle(
    directory,
    "unknown",
    "cluster: mystery-cluster\nparentPillar: mystery-parent",
  );
  const self = writeTempArticle(
    directory,
    "budget-spoke",
    "cluster: budget-fiber\nparentPillar: budget-spoke",
  );
  const mismatch = writeTempArticle(
    directory,
    "mismatch",
    "cluster: budget-fiber\nparentPillar: meal-prep-for-beginners-complete-system",
  );

  const result = auditArticleFiles([missing, unknown, self, mismatch], {
    knownArticleSlugs: PARENTS,
  });

  assert.equal(result.counts.missing_cluster, 1);
  assert.equal(result.counts.unknown_cluster, 1);
  assert.equal(result.counts.unknown_parent, 2);
  assert.equal(result.counts.self_referential_parent, 1);
  assert.equal(result.counts.parent_mismatch, 2);
});


test("strict CLI requires a bounded file list and fails only that batch", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dlh-clusters-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const invalid = writeTempArticle(directory, "invalid", "category: tips");
  const valid = writeTempArticle(
    directory,
    "valid",
    "cluster: meal-prep-food-storage\nparentPillar: meal-prep-for-beginners-complete-system",
  );

  const unbounded = spawnSync(process.execPath, [SCRIPT, "--strict"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const failed = spawnSync(process.execPath, [SCRIPT, "--strict", "--files", invalid], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const passed = spawnSync(process.execPath, [SCRIPT, "--strict", "--files", valid], {
    cwd: ROOT,
    encoding: "utf8",
  });

  assert.equal(unbounded.status, 2);
  assert.match(unbounded.stderr, /requires --files/);
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /missing_cluster=1/);
  assert.equal(passed.status, 0);
});


test("Astro schema keeps explicit cluster metadata optional and controlled", () => {
  const schema = fs.readFileSync(path.join(ROOT, "src", "content.config.ts"), "utf8");

  assert.match(schema, /cluster: z\.enum\(CONTENT_CLUSTER_IDS\)\.optional\(\)/);
  assert.match(
    schema,
    /parentPillar: z\.enum\(CONTENT_PARENT_PILLARS\)\.optional\(\)/,
  );
});
