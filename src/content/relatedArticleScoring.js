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

/**
 * Resolve cluster ownership in priority order: explicit cluster, explicit
 * parent, canonical pillar slug, then legacy inference. Registry data is
 * injected from clusters.ts so there is only one source of truth.
 */
export function resolveArticleCluster({
  articleId,
  explicitCluster,
  explicitParentPillar,
  clusters,
  inferLegacy,
  legacyText,
}) {
  if (explicitCluster) {
    const match = clusters.find((cluster) => cluster.id === explicitCluster);
    if (match) return { cluster: match, source: "frontmatter-cluster" };
  }

  if (explicitParentPillar) {
    const match = clusters.find(
      (cluster) => cluster.parentPillar === explicitParentPillar,
    );
    if (match) return { cluster: match, source: "frontmatter-parent" };
  }

  const pillarMatch = clusters.find(
    (cluster) => cluster.parentPillar === articleId,
  );
  if (pillarMatch) return { cluster: pillarMatch, source: "pillar-slug" };

  const inferred = inferLegacy(legacyText);
  return inferred ? { cluster: inferred, source: "legacy-fallback" } : null;
}
