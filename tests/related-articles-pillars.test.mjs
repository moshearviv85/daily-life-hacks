import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveArticleCluster,
  scoreRelatedCandidate,
} from "../src/content/relatedArticleScoring.js";

const pillars = new Set([
  "how-to-eat-more-fiber-on-a-budget-complete-guide",
  "eat-healthy-on-a-budget-complete-playbook",
  "high-protein-on-a-budget-complete-guide",
  "meal-prep-for-beginners-complete-system",
]);

function score(candidateId, preferredPillar = null) {
  return scoreRelatedCandidate({
    candidateId,
    candidateTags: ["meal prep"],
    candidateCategory: "tips",
    currentTags: new Set(["meal prep"]),
    currentCategory: "tips",
    pillarSlugs: pillars,
    preferredPillar,
  });
}

test("at most the preferred cluster pillar can enter related articles", () => {
  for (const preferredPillar of [null, ...pillars]) {
    const includedPillars = [...pillars].filter(
      (candidateId) => score(candidateId, preferredPillar) !== null,
    );

    assert.ok(includedPillars.length <= 1);
    assert.notEqual(includedPillars.length, 3);
    if (preferredPillar) assert.deepEqual(includedPillars, [preferredPillar]);
  }
});

test("an unassigned article does not receive a pillar by force", () => {
  for (const candidateId of pillars) {
    assert.equal(score(candidateId, null), null);
  }
});

test("ordinary siblings retain shared-tag and category relevance", () => {
  assert.equal(score("batch-cooking-for-beginners-weekly-guide", null), 13);
});

const clusters = [
  { id: "budget-fiber", parentPillar: [...pillars][0] },
  { id: "weekly-budget-shopping", parentPillar: [...pillars][1] },
  { id: "budget-protein", parentPillar: [...pillars][2] },
  { id: "meal-prep-food-storage", parentPillar: [...pillars][3] },
];

function resolve(overrides = {}) {
  return resolveArticleCluster({
    articleId: "legacy-article",
    explicitCluster: undefined,
    explicitParentPillar: undefined,
    clusters,
    inferLegacy: () => clusters[3],
    legacyText: "meal prep",
    ...overrides,
  });
}

test("explicit cluster wins over conflicting parent and legacy inference", () => {
  const result = resolve({
    explicitCluster: "budget-fiber",
    explicitParentPillar: clusters[2].parentPillar,
  });

  assert.equal(result.cluster.id, "budget-fiber");
  assert.equal(result.source, "frontmatter-cluster");
});

test("explicit parent drives selection when cluster is absent", () => {
  const result = resolve({ explicitParentPillar: clusters[2].parentPillar });

  assert.equal(result.cluster.id, "budget-protein");
  assert.equal(result.source, "frontmatter-parent");
});

test("canonical pillar slug resolves without keyword guessing", () => {
  const result = resolve({
    articleId: clusters[1].parentPillar,
    legacyText: "no matching words",
  });

  assert.equal(result.cluster.id, "weekly-budget-shopping");
  assert.equal(result.source, "pillar-slug");
});

test("unrelated pillars cannot leak into an explicitly assigned cluster", () => {
  const resolution = resolve({ explicitCluster: "budget-protein" });
  const preferred = resolution.cluster.parentPillar;
  const included = [...pillars].filter(
    (candidateId) => score(candidateId, preferred) !== null,
  );

  assert.deepEqual(included, [clusters[2].parentPillar]);
});
