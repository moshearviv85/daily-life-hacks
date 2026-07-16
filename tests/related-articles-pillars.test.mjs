import assert from "node:assert/strict";
import test from "node:test";

import { scoreRelatedCandidate } from "../src/content/relatedArticleScoring.js";

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
