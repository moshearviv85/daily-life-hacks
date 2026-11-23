/**
 * The two budget pillars were repeating as related cards on dozens of
 * unrelated recipes and tips. They may appear only on indexable nutrition
 * pages that also carry a budget or per-dollar tag. That is inside the
 * allowed set (nutrition, or a budget/per-dollar tag, never recipes or tips)
 * and keeps each card title on 20 built pages or fewer.
 */
export const REPEATED_BUDGET_CARD_IDS = new Set([
  "how-to-eat-more-fiber-on-a-budget-complete-guide",
  "high-protein-on-a-budget-complete-guide",
]);

export function hasBudgetOrPerDollarTag(tags) {
  for (const tag of tags || []) {
    const normalized = String(tag).trim().toLowerCase();
    if (normalized.includes("per dollar") || normalized.includes("per-dollar")) {
      return true;
    }
    if (/(^|[^a-z0-9])budget([^a-z0-9]|$)/.test(normalized)) return true;
  }
  return false;
}

export function repeatedBudgetCardAllowed({
  candidateId,
  currentCategory,
  currentTags,
  currentIndexPruned = false,
}) {
  if (!REPEATED_BUDGET_CARD_IDS.has(candidateId)) return true;
  if (currentIndexPruned) return false;
  const category = String(currentCategory || "").trim().toLowerCase();
  if (category === "recipes" || category === "tips") return false;
  if (category !== "nutrition") return false;
  return hasBudgetOrPerDollarTag(currentTags);
}

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
  currentIndexPruned = false,
}) {
  if (
    !repeatedBudgetCardAllowed({
      candidateId,
      currentCategory,
      currentTags,
      currentIndexPruned,
    })
  ) {
    return null;
  }

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
