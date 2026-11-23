import assert from "node:assert/strict";
import test from "node:test";

import {
  isPerDollarOrBudgetStudy,
  resolveArticleCluster,
  scoreRelatedCandidate,
} from "../src/content/relatedArticleScoring.js";

const pillars = new Set([
  "how-to-eat-more-fiber-on-a-budget-complete-guide",
  "eat-healthy-on-a-budget-complete-playbook",
  "high-protein-on-a-budget-complete-guide",
  "meal-prep-for-beginners-complete-system",
]);

const repeatedBudgetCards = new Set([
  "how-to-eat-more-fiber-on-a-budget-complete-guide",
  "high-protein-on-a-budget-complete-guide",
]);

function score(candidateId, preferredPillar = null, overrides = {}) {
  return scoreRelatedCandidate({
    candidateId,
    candidateTags: ["meal prep"],
    candidateCategory: "tips",
    currentTags: new Set(["meal prep"]),
    currentCategory: "tips",
    pillarSlugs: pillars,
    preferredPillar,
    ...overrides,
  });
}

test("at most the preferred cluster pillar can enter related articles", () => {
  for (const preferredPillar of [null, ...pillars]) {
    const includedPillars = [...pillars].filter(
      (candidateId) => score(candidateId, preferredPillar) !== null,
    );

    assert.ok(includedPillars.length <= 1);
    assert.notEqual(includedPillars.length, 3);
    const blockedOnUntaggedTips =
      !preferredPillar || isPerDollarOrBudgetStudy({ id: preferredPillar });
    if (blockedOnUntaggedTips) {
      assert.deepEqual(includedPillars, []);
    } else {
      assert.deepEqual(includedPillars, [preferredPillar]);
    }
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

test("generic tags add nothing and one specific tag cannot cross categories", () => {
  assert.equal(
    score("other-article", null, {
      candidateCategory: "nutrition",
      candidateTags: ["fiber", "lentils"],
      currentCategory: "recipes",
      currentTags: new Set(["fiber", "oats"]),
      genericTags: new Set(["fiber"]),
    }),
    null,
  );
  assert.equal(
    score("other-article", null, {
      candidateCategory: "nutrition",
      candidateTags: ["lentils", "oats"],
      currentCategory: "recipes",
      currentTags: new Set(["lentils", "oats"]),
      genericTags: new Set(["fiber"]),
    }),
    20,
  );
  assert.equal(
    score("other-article", null, {
      candidateCategory: "nutrition",
      candidateTags: ["alpha"],
      currentCategory: "recipes",
      currentTags: new Set(["beta"]),
      currentCluster: "budget-fiber",
      candidateCluster: "budget-fiber",
    }),
    0,
  );
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
    (candidateId) =>
      score(candidateId, preferred, {
        currentCategory: "nutrition",
        currentTags: new Set(["protein per dollar"]),
        currentCluster: "budget-protein",
        candidateCluster: "budget-protein",
        candidateCategory: "nutrition",
      }) !== null,
  );

  assert.deepEqual(included, [clusters[2].parentPillar]);
});

test("per-dollar and budget studies stay off recipe, storage, and tips pages unless budget-tagged", () => {
  const studies = [
    ...repeatedBudgetCards,
    "protein-per-dollar-cheapest-protein-sources",
    "low-sodium-budget-foods-ranked",
    "what-30-grams-of-fiber-costs-per-day",
  ];

  for (const candidateId of studies) {
    assert.equal(isPerDollarOrBudgetStudy({ id: candidateId }), true);
    assert.equal(
      score(candidateId, candidateId, {
        currentCategory: "recipes",
        currentTags: new Set(["dinner"]),
        candidateCategory: "nutrition",
        candidateTags: ["dinner", "beans"],
        currentCluster: "budget-protein",
        candidateCluster: "budget-protein",
      }),
      null,
    );
    assert.equal(
      score(candidateId, candidateId, {
        currentCategory: "tips",
        currentTags: new Set(["meal prep"]),
        currentCluster: "meal-prep-food-storage",
        candidateCluster: "meal-prep-food-storage",
      }),
      null,
    );
    assert.equal(
      score(candidateId, candidateId, {
        currentId: "how-to-store-fresh-herbs-to-last-longer",
        currentCategory: "nutrition",
        currentTags: new Set(["food storage"]),
        candidateCategory: "nutrition",
        candidateTags: ["food storage", "herbs"],
        currentCluster: "budget-fiber",
        candidateCluster: "budget-fiber",
      }),
      null,
    );
    assert.ok(
      score(candidateId, candidateId, {
        currentCategory: "recipes",
        currentTags: new Set(["budget meals", "dinner"]),
        candidateCategory: "recipes",
        candidateTags: ["budget meals", "dinner"],
      }) > 0,
    );
    assert.ok(
      score(candidateId, candidateId, {
        currentCategory: "nutrition",
        currentTags: new Set(["fiber", "beans"]),
        candidateCategory: "nutrition",
        candidateTags: ["fiber", "beans"],
      }) > 0,
    );
  }
});
