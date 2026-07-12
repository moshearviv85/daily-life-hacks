/**
 * Score one candidate for the article-page "Keep Reading" section.
 *
 * Pillars are intentionally exclusive: a page may surface only the pillar
 * selected for its cluster. Pages without a cluster do not inherit a pillar.
 * Ordinary siblings still rank by shared tags and category.
 */
export function scoreRelatedCandidate({
  candidateId,
  candidateTags,
  candidateCategory,
  currentTags,
  currentCategory,
  pillarSlugs,
  preferredPillar,
}) {
  const isPillar = pillarSlugs.has(candidateId);
  if (isPillar && candidateId !== preferredPillar) return null;

  const sharedTags = candidateTags.reduce(
    (count, tag) => count + (currentTags.has(tag.trim().toLowerCase()) ? 1 : 0),
    0,
  );
  const sameCategory = candidateCategory === currentCategory ? 1 : 0;
  const preferredPillarBoost = candidateId === preferredPillar ? 40 : 0;

  return sharedTags * 10 + sameCategory * 3 + preferredPillarBoost;
}
